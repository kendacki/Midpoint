import { NextResponse } from "next/server";

const PINATA_PIN_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS";

export async function POST(request: Request) {
  try {
    const pinataJwt = process.env.PINATA_JWT;
    if (!pinataJwt) {
      return NextResponse.json({ error: "PINATA_JWT is not configured" }, { status: 500 });
    }

    const incomingFormData = await request.formData();
    const file = incomingFormData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file upload" }, { status: 400 });
    }

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(PINATA_PIN_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${pinataJwt}`,
      },
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
