import { NextResponse } from "next/server";
import { recoverMessageAddress, isAddress, isAddressEqual, type Address } from "viem";

const PINATA_PIN_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS";
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_MAX_UPLOADS = 20;
const WALLET_RATE_LIMIT_MAX_UPLOADS = 15;
const NONCE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const nonceStore = new Map<string, { address: Address; expiresAt: number }>();
const ipRateLimitStore = new Map<string, number[]>();
const walletRateLimitStore = new Map<string, number[]>();

const allowedMimeTypes = new Set([
  "application/pdf",
  "application/json",
  "application/zip",
  "application/x-zip-compressed",
  "application/x-rar-compressed",
  "application/octet-stream",
  "text/plain",
  "text/markdown",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

function getSigningMessage(nonce: string) {
  return `Midpoint IPFS upload authorization.\nNonce: ${nonce}`;
}

function getClientIp(request: Request) {
  const fromForwarded = request.headers.get("x-forwarded-for");
  if (fromForwarded) return fromForwarded.split(",")[0]?.trim() ?? "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}

function isRateLimited(ip: string) {
  const now = Date.now();
  const recent = (ipRateLimitStore.get(ip) ?? []).filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX_UPLOADS) {
    ipRateLimitStore.set(ip, recent);
    return true;
  }
  recent.push(now);
  ipRateLimitStore.set(ip, recent);
  return false;
}

function isWalletRateLimited(address: Address) {
  const now = Date.now();
  const key = address.toLowerCase();
  const recent = (walletRateLimitStore.get(key) ?? []).filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= WALLET_RATE_LIMIT_MAX_UPLOADS) {
    walletRateLimitStore.set(key, recent);
    return true;
  }
  recent.push(now);
  walletRateLimitStore.set(key, recent);
  return false;
}

function consumeNonce(nonce: string, address: Address) {
  const entry = nonceStore.get(nonce);
  if (!entry) return false;
  if (entry.expiresAt < Date.now()) {
    nonceStore.delete(nonce);
    return false;
  }
  if (!isAddressEqual(entry.address, address)) return false;
  nonceStore.delete(nonce);
  return true;
}

export async function POST(request: Request) {
  try {
    const pinataJwt = process.env.PINATA_JWT;
    const pinataApiKey = process.env.PINATA_API_KEY;
    const pinataApiSecret = process.env.PINATA_API_SECRET;

    if (!pinataJwt && !(pinataApiKey && pinataApiSecret)) {
      return NextResponse.json(
        { error: "Configure PINATA_JWT or both PINATA_API_KEY and PINATA_API_SECRET" },
        { status: 500 }
      );
    }

    const ip = getClientIp(request);
    if (isRateLimited(ip)) {
      return NextResponse.json({ error: "Too many uploads. Please try again later." }, { status: 429 });
    }

    const nonce = request.headers.get("x-midpoint-nonce");
    const signature = request.headers.get("x-midpoint-signature");
    const addressHeader = request.headers.get("x-midpoint-address");

    if (!nonce || !signature || !addressHeader || !isAddress(addressHeader)) {
      return NextResponse.json({ error: "Missing or invalid wallet authentication headers." }, { status: 401 });
    }

    const address = addressHeader as Address;
    const nonceOk = consumeNonce(nonce, address);
    if (!nonceOk) {
      return NextResponse.json({ error: "Expired or invalid upload nonce." }, { status: 401 });
    }

    const message = getSigningMessage(nonce);
    const recoveredAddress = await recoverMessageAddress({
      message,
      signature: signature as `0x${string}`,
    });

    if (!isAddressEqual(recoveredAddress, address)) {
      return NextResponse.json({ error: "Wallet signature verification failed." }, { status: 401 });
    }
    if (isWalletRateLimited(address)) {
      return NextResponse.json({ error: "Too many uploads for this wallet. Please try again later." }, { status: 429 });
    }

    const incomingFormData = await request.formData();
    const file = incomingFormData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file upload" }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: "File exceeds 20MB limit." }, { status: 413 });
    }
    if (!allowedMimeTypes.has(file.type)) {
      return NextResponse.json({ error: `Unsupported file type: ${file.type || "unknown"}` }, { status: 415 });
    }

    const formData = new FormData();
    formData.append("file", file);

    const headers: Record<string, string> = {};
    if (pinataJwt) {
      headers.Authorization = `Bearer ${pinataJwt}`;
    } else {
      headers["pinata_api_key"] = pinataApiKey as string;
      headers["pinata_secret_api_key"] = pinataApiSecret as string;
    }

    const response = await fetch(PINATA_PIN_URL, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!response.ok) {
      const pinataError = await response.text();
      return NextResponse.json({ error: `Pinata upload failed: ${pinataError}` }, { status: response.status });
    }

    const payload = (await response.json()) as { IpfsHash: string };
    return NextResponse.json({ cid: payload.IpfsHash });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unexpected upload error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const addressParam = searchParams.get("address");
  if (!addressParam || !isAddress(addressParam)) {
    return NextResponse.json({ error: "Invalid address." }, { status: 400 });
  }

  const nonce = crypto.randomUUID();
  nonceStore.set(nonce, {
    address: addressParam as Address,
    expiresAt: Date.now() + NONCE_TTL_MS,
  });

  return NextResponse.json({ nonce, message: getSigningMessage(nonce) });
}
