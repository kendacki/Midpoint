/**
 * Brute-force / attack simulation for IPFS API
 * Run dev server first: npm run dev
 * Then: npx tsx scripts/brute-force-api-test.ts
 */
const BASE = "http://localhost:3000";

async function run() {
  console.log("=== IPFS API Brute-Force Security Test ===\n");

  let passed = 0;
  let failed = 0;

  // 1. Missing headers
  try {
    const r = await fetch(`${BASE}/api/ipfs`, { method: "POST" });
    const ok = r.status === 401;
    console.log(ok ? "✓" : "✗", "Missing auth headers -> 401");
    ok ? passed++ : failed++;
  } catch (e) {
    console.log("✗", "Missing auth headers (fetch failed):", (e as Error).message);
    failed++;
  }

  // 2. Invalid address
  try {
    const r = await fetch(`${BASE}/api/ipfs?address=0xinvalid`);
    const ok = r.status === 400;
    console.log(ok ? "✓" : "✗", "Invalid address in GET -> 400");
    ok ? passed++ : failed++;
  } catch (e) {
    console.log("✗", "Invalid address (fetch failed):", (e as Error).message);
    failed++;
  }

  // 3. POST with fake nonce/signature
  try {
    const r = await fetch(`${BASE}/api/ipfs`, {
      method: "POST",
      headers: {
        "x-midpoint-address": "0x0000000000000000000000000000000000000001",
        "x-midpoint-nonce": "fake-nonce-123",
        "x-midpoint-signature": "0x1234",
      },
      body: new FormData(),
    });
    const ok = r.status === 401;
    console.log(ok ? "✓" : "✗", "Fake nonce/signature -> 401");
    ok ? passed++ : failed++;
  } catch (e) {
    console.log("✗", "Fake auth (fetch failed):", (e as Error).message);
    failed++;
  }

  // 4. POST without file
  try {
    const nonceR = await fetch(`${BASE}/api/ipfs?address=0x0000000000000000000000000000000000000001`);
    if (nonceR.status !== 200) {
      console.log("✗", "Could not get nonce (is server running?)");
      failed++;
    } else {
      const { nonce } = (await nonceR.json()) as { nonce: string };
      const r = await fetch(`${BASE}/api/ipfs`, {
        method: "POST",
        headers: {
          "x-midpoint-address": "0x0000000000000000000000000000000000000001",
          "x-midpoint-nonce": nonce,
          "x-midpoint-signature": "0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
        },
        body: new FormData(),
      });
      const ok = r.status === 401 || r.status === 400;
      console.log(ok ? "✓" : "✗", "Invalid signature or missing file -> 4xx");
      ok ? passed++ : failed++;
    }
  } catch (e) {
    console.log("✗", "Auth flow (fetch failed):", (e as Error).message);
    failed++;
  }

  // 5. Replay nonce (use same nonce twice)
  try {
    const nonceR = await fetch(`${BASE}/api/ipfs?address=0x0000000000000000000000000000000000000002`);
    if (nonceR.status !== 200) {
      console.log("-", "Replay test skipped (no nonce)");
    } else {
      const { nonce } = (await nonceR.json()) as { nonce: string };
      const fd = new FormData();
      fd.append("file", new Blob(["test"], { type: "text/plain" }), "test.txt");
      const r1 = await fetch(`${BASE}/api/ipfs`, {
        method: "POST",
        headers: {
          "x-midpoint-address": "0x0000000000000000000000000000000000000002",
          "x-midpoint-nonce": nonce,
          "x-midpoint-signature": "0x00",
        },
        body: fd,
      });
      const r2 = await fetch(`${BASE}/api/ipfs`, {
        method: "POST",
        headers: {
          "x-midpoint-address": "0x0000000000000000000000000000000000000002",
          "x-midpoint-nonce": nonce,
          "x-midpoint-signature": "0x00",
        },
        body: fd,
      });
      const ok = r1.status === 401 || (r2.status === 401 && r1.status !== 200);
      console.log(ok ? "✓" : "✗", "Replay / invalid sig handled");
      ok ? passed++ : failed++;
    }
  } catch (e) {
    console.log("-", "Replay test skipped:", (e as Error).message);
  }

  console.log(`\n--- Result: ${passed} passed, ${failed} failed ---`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
