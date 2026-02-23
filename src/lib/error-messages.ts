/**
 * Maps raw blockchain/contract errors to user-friendly messages.
 */
export function normalizeTxError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);

  if (/insufficient funds| insufficient balance|not enough funds/i.test(msg)) {
    return "Insufficient funds. Add POL to your wallet for gas and escrow.";
  }
  if (/user rejected|user denied|rejected the request/i.test(msg)) {
    return "Transaction was rejected. Please try again when ready.";
  }
  if (/rate limit|Request exceeds defined limit|429/i.test(msg)) {
    return "Too many requests. Please wait a moment and try again.";
  }
  if (/network|fetch failed|ECONNREFUSED|ETIMEDOUT|NetworkError/i.test(msg)) {
    return "Network error. Check your connection and try again.";
  }
  if (/wrong network|chain mismatch|unsupported chain/i.test(msg)) {
    return "Wrong network. Please switch to Polygon Amoy in your wallet.";
  }
  if (/nonce too low|replacement fee too low/i.test(msg)) {
    return "Transaction already submitted. Refresh and try again if needed.";
  }
  if (/exceeds the configured cap|tx fee.*exceeds/i.test(msg)) {
    return "Transaction fee exceeds your wallet cap. In MetaMask: Settings → Advanced → increase 'Maximum fee' or disable the fee cap, then try again.";
  }
  if (/execution reverted|revert/i.test(msg)) {
    if (/Only freelancer/i.test(msg)) return "Only the designated freelancer can perform this action.";
    if (/Only client/i.test(msg)) return "Only the project client can perform this action.";
    if (/Invalid state|Invalid status/i.test(msg)) return "Invalid action for current project status.";
    if (/Review still active/i.test(msg)) return "Review period is still active. Wait for it to expire.";
    if (/CID required|description required/i.test(msg)) return "Required field is missing.";
    if (/insufficient allowance|ERC20: insufficient allowance|allowance/i.test(msg)) return "USDC approval failed. Please try again.";
    if (/insufficient balance|ERC20: transfer amount exceeds balance/i.test(msg)) return "Insufficient USDC balance. Add USDC to your wallet.";
    return "Transaction failed. Please check the project status and try again.";
  }

  return msg.length > 120 ? `${msg.slice(0, 120)}…` : msg;
}
