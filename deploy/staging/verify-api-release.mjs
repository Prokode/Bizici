import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { cp, mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

// Run the packaged API away from the checkout, without node_modules, credentials
// or a database. A successful build alone cannot detect missing runtime imports.
assert.ok(process.argv[2] && process.argv[3], "Usage: node verify-api-release.mjs <api-directory> <data-directory>");
const apiDirectory = path.resolve(process.argv[2]);
const dataDirectory = path.resolve(process.argv[3]);
const isolated = await mkdtemp(path.join(tmpdir(), "bizici-api-release-"));
let child;
try {
  await cp(apiDirectory, path.join(isolated, "api"), { recursive: true });
  await cp(dataDirectory, path.join(isolated, "_data"), { recursive: true });
  const probe = createServer();
  await new Promise((resolve, reject) => {
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", resolve);
  });
  const port = probe.address().port;
  await new Promise((resolve, reject) => probe.close(error => error ? reject(error) : resolve()));
  child = spawn(process.execPath, [path.join(isolated, "api/index.mjs")], {
    cwd: isolated,
    env: {
      PATH: process.env.PATH,
      NODE_ENV: "production",
      PORT: String(port),
      API_HOST: "127.0.0.1",
      REQUIRE_DB_READY: "false",
      LOG_LEVEL: "silent",
      // Syntactically valid test placeholders, never real credentials. An
      // anonymous health check must not call Clerk or require CI secrets.
      CLERK_PUBLISHABLE_KEY: `pk_test_${Buffer.from("release-smoke.clerk.accounts.dev$").toString("base64")}`,
      CLERK_SECRET_KEY: "sk_test_release_smoke_only",
    },
    stdio: ["ignore", "ignore", "pipe"],
  });
  let stderr = "";
  let spawnError;
  child.stderr.on("data", chunk => { stderr = (stderr + chunk.toString()).slice(-8000); });
  child.on("error", error => { spawnError = error; });
  let reached = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (spawnError) throw spawnError;
    if (child.exitCode !== null) throw new Error(`Packaged API exited (${child.exitCode}): ${stderr}`);
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/healthz`, { signal: AbortSignal.timeout(500) });
      const body = await response.json();
      // Database readiness may deliberately return 503 without credentials.
      // In either case we must reach the actual health controller.
      if ([200, 503].includes(response.status) && typeof body.status === "string") {
        reached = true;
        break;
      }
    } catch { /* Allow startup time; never retry an exited process. */ }
    await delay(100);
  }
  assert.ok(reached, `Packaged API did not respond to health checks: ${stderr}`);
  console.log("Standalone API release starts and responds without node_modules.");
} finally {
  if (child && child.exitCode === null && child.pid) {
    const exited = new Promise(resolve => child.once("exit", resolve));
    child.kill("SIGKILL");
    await exited;
  }
  await rm(isolated, { recursive: true, force: true });
}
