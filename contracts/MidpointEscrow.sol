// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract MidpointEscrow is ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @dev Polygon Amoy whitelisted USDC (faucet token). Only this token is accepted for createProjectERC20.
    address public immutable allowedUsdcToken;

    constructor(address _usdcToken) {
        require(_usdcToken != address(0), "USDC token required");
        allowedUsdcToken = _usdcToken;
    }

    enum Status {
        AwaitingSubmission,
        UnderReview,
        Disputed,
        Resolved
    }

    struct Project {
        address client;
        address freelancer;
        address token; // address(0) means native POL
        uint256 totalAmount;
        uint256 remainingAmount;
        uint256 reviewDeadline;
        uint256 disputeStartTime;
        uint32 burnedIntervals;
        Status status;
        bool exists;
    }

    struct SettlementProposal {
        address proposer;
        uint256 freelancerCutBps;
    }

    uint256 public constant REVIEW_WINDOW = 14 days;
    uint256 public constant DECAY_INTERVAL = 7 days;
    uint256 public constant DECAY_PERCENT = 5; // 5% every interval
    uint256 public constant BPS_DENOMINATOR = 10_000;
    address public constant BURN_ADDRESS = 0x000000000000000000000000000000000000dEaD;

    uint256 public nextProjectId = 1;

    mapping(uint256 => Project) public projects;
    mapping(uint256 => string) public submissionCids;
    mapping(uint256 => string) public projectDescriptions;
    mapping(uint256 => SettlementProposal) public settlementProposals;

    event ProjectCreated(
        uint256 indexed projectId,
        address indexed client,
        address indexed freelancer,
        address token,
        uint256 amount,
        string description
    );
    event WorkSubmitted(uint256 indexed projectId, string ipfsCid, uint256 reviewDeadline);
    event ProjectDisputed(uint256 indexed projectId, uint256 disputeStartTime);
    event DisputeDecayApplied(uint256 indexed projectId, uint256 burnedAmount, uint32 totalIntervalsBurned);
    event SettlementProposed(uint256 indexed projectId, address indexed proposer, uint256 freelancerCutBps);
    event ProjectResolved(uint256 indexed projectId, uint256 freelancerAmount, uint256 clientAmount, uint256 burnedAmount);
    event TimeoutClaimed(uint256 indexed projectId, uint256 amount);
    event ReviewApproved(uint256 indexed projectId, uint256 amount);

    modifier onlyClient(uint256 projectId) {
        require(msg.sender == projects[projectId].client, "Only client");
        _;
    }

    modifier onlyFreelancer(uint256 projectId) {
        require(msg.sender == projects[projectId].freelancer, "Only freelancer");
        _;
    }

    modifier onlyProjectParty(uint256 projectId) {
        Project memory project = projects[projectId];
        require(msg.sender == project.client || msg.sender == project.freelancer, "Only project party");
        _;
    }

    modifier projectExists(uint256 projectId) {
        require(projects[projectId].exists, "Project not found");
        _;
    }

    function createProjectNative(address freelancer, string calldata description)
        external
        payable
        nonReentrant
        returns (uint256 projectId)
    {
        require(msg.value > 0, "Value required");
        return _createProject(address(0), freelancer, msg.value, description);
    }

    function createProjectERC20(address token, address freelancer, uint256 amount, string calldata description)
        external
        nonReentrant
        returns (uint256 projectId)
    {
        require(token == allowedUsdcToken, "Token not whitelisted");
        require(amount > 0, "Amount required");
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        return _createProject(token, freelancer, amount, description);
    }

    function submitWork(uint256 projectId, string calldata ipfsCid)
        external
        projectExists(projectId)
        onlyFreelancer(projectId)
    {
        Project storage project = projects[projectId];
        require(project.status == Status.AwaitingSubmission, "Invalid state");
        require(bytes(ipfsCid).length > 0, "CID required");

        project.status = Status.UnderReview;
        project.reviewDeadline = block.timestamp + REVIEW_WINDOW;
        submissionCids[projectId] = ipfsCid;

        emit WorkSubmitted(projectId, ipfsCid, project.reviewDeadline);
    }

    function approveSubmission(uint256 projectId)
        external
        nonReentrant
        projectExists(projectId)
        onlyClient(projectId)
    {
        Project storage project = projects[projectId];
        require(project.status == Status.UnderReview, "Invalid state");

        uint256 payout = project.remainingAmount;
        project.remainingAmount = 0;
        project.status = Status.Resolved;

        _transferFunds(project.token, project.freelancer, payout);
        emit ReviewApproved(projectId, payout);
        emit ProjectResolved(projectId, payout, 0, project.totalAmount - payout);
    }

    function claimTimeoutPayment(uint256 projectId)
        external
        nonReentrant
        projectExists(projectId)
        onlyFreelancer(projectId)
    {
        Project storage project = projects[projectId];
        require(project.status == Status.UnderReview, "Invalid state");
        require(block.timestamp > project.reviewDeadline, "Review still active");

        uint256 payout = project.remainingAmount;
        project.remainingAmount = 0;
        project.status = Status.Resolved;

        _transferFunds(project.token, project.freelancer, payout);
        emit TimeoutClaimed(projectId, payout);
        emit ProjectResolved(projectId, payout, 0, project.totalAmount - payout);
    }

    function dispute(uint256 projectId) external projectExists(projectId) onlyClient(projectId) {
        Project storage project = projects[projectId];
        require(project.status == Status.UnderReview, "Invalid state");

        project.status = Status.Disputed;
        project.disputeStartTime = block.timestamp;
        settlementProposals[projectId] = SettlementProposal({proposer: address(0), freelancerCutBps: 0});

        emit ProjectDisputed(projectId, project.disputeStartTime);
    }

    function applyDecayBurn(uint256 projectId) external nonReentrant projectExists(projectId) {
        Project storage project = projects[projectId];
        require(project.status == Status.Disputed, "Not disputed");

        uint256 burned = _applyDecay(projectId, project);
        require(burned > 0, "Nothing to burn");
    }

    function mutualSettlement(uint256 projectId, uint256 freelancerCutBps)
        external
        nonReentrant
        projectExists(projectId)
        onlyProjectParty(projectId)
    {
        require(freelancerCutBps <= BPS_DENOMINATOR, "Invalid split");
        Project storage project = projects[projectId];
        require(project.status == Status.Disputed, "Not disputed");

        SettlementProposal storage proposal = settlementProposals[projectId];

        if (proposal.proposer == address(0) || proposal.proposer == msg.sender) {
            proposal.proposer = msg.sender;
            proposal.freelancerCutBps = freelancerCutBps;
            emit SettlementProposed(projectId, msg.sender, freelancerCutBps);
            return;
        }

        require(proposal.freelancerCutBps == freelancerCutBps, "Split mismatch");

        _applyDecay(projectId, project);

        uint256 remaining = project.remainingAmount;
        uint256 freelancerAmount = (remaining * freelancerCutBps) / BPS_DENOMINATOR;
        uint256 clientAmount = remaining - freelancerAmount;

        project.remainingAmount = 0;
        project.status = Status.Resolved;
        delete settlementProposals[projectId];

        _transferFunds(project.token, project.freelancer, freelancerAmount);
        _transferFunds(project.token, project.client, clientAmount);

        emit ProjectResolved(projectId, freelancerAmount, clientAmount, project.totalAmount - remaining);
    }

    function previewDecayBurn(uint256 projectId) external view projectExists(projectId) returns (uint256) {
        Project memory project = projects[projectId];
        if (project.status != Status.Disputed || project.remainingAmount == 0) return 0;

        uint256 elapsedIntervals = (block.timestamp - project.disputeStartTime) / DECAY_INTERVAL;
        if (elapsedIntervals <= project.burnedIntervals) return 0;

        uint256 newIntervals = elapsedIntervals - project.burnedIntervals;
        uint256 burnAmount = (project.totalAmount * DECAY_PERCENT * newIntervals) / 100;

        return burnAmount > project.remainingAmount ? project.remainingAmount : burnAmount;
    }

    function _createProject(address token, address freelancer, uint256 amount, string calldata description)
        internal
        returns (uint256 projectId)
    {
        require(freelancer != address(0), "Freelancer required");
        require(freelancer != msg.sender, "Invalid freelancer");
        require(bytes(description).length > 0, "Description required");

        projectId = nextProjectId++;
        projects[projectId] = Project({
            client: msg.sender,
            freelancer: freelancer,
            token: token,
            totalAmount: amount,
            remainingAmount: amount,
            reviewDeadline: 0,
            disputeStartTime: 0,
            burnedIntervals: 0,
            status: Status.AwaitingSubmission,
            exists: true
        });
        projectDescriptions[projectId] = description;

        emit ProjectCreated(projectId, msg.sender, freelancer, token, amount, description);
    }

    function _applyDecay(uint256 projectId, Project storage project) internal returns (uint256 burned) {
        if (project.remainingAmount == 0) return 0;

        uint256 elapsedIntervals = (block.timestamp - project.disputeStartTime) / DECAY_INTERVAL;
        if (elapsedIntervals <= project.burnedIntervals) return 0;

        uint256 newIntervals = elapsedIntervals - project.burnedIntervals;
        uint256 burnAmount = (project.totalAmount * DECAY_PERCENT * newIntervals) / 100;
        burned = burnAmount > project.remainingAmount ? project.remainingAmount : burnAmount;

        project.burnedIntervals = uint32(elapsedIntervals);

        if (burned > 0) {
            project.remainingAmount -= burned;
            _transferFunds(project.token, BURN_ADDRESS, burned);
            emit DisputeDecayApplied(projectId, burned, project.burnedIntervals);

            if (project.remainingAmount == 0) {
                project.status = Status.Resolved;
                delete settlementProposals[projectId];
                emit ProjectResolved(projectId, 0, 0, project.totalAmount);
            }
        }
    }

    function _transferFunds(address token, address to, uint256 amount) internal {
        if (amount == 0) return;
        if (token == address(0)) {
            (bool sent,) = payable(to).call{value: amount}("");
            require(sent, "Native transfer failed");
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
    }
}
