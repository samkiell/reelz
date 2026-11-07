/**
 * Reelz Unit Tests: Schemas, Auth, Storage, and Database.
 */
import { ScriptDocumentSchema, SceneSchema, VideoCreateInputSchema } from "../src/lib/schemas.js";
import { hashPassword, comparePassword, createSessionToken, verifySessionToken } from "../src/lib/auth.js";
import { getVideoStorageDir, getVideoOutputPath } from "../src/lib/storage.js";
import { db } from "../src/lib/db.js";

async function runUnitTests() {
  console.log("=== REELZ AUTOMATED UNIT TESTS ===");
  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`✔ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`✖ [FAIL] ${testName}`);
      failed++;
    }
  }

  // 1. SCHEMAS
  console.log("\n[1] Testing Schemas...");
  const validScene = {
    id: "scene_1",
    order: 1,
    narration: "Spoken line for scene one.",
    onScreenText: "HERO TEXT",
    mediaKeywords: ["cat", "purr"],
  };
  const sceneResult = SceneSchema.safeParse(validScene);
  assert(sceneResult.success, "SceneSchema parses valid scene");

  const invalidScene = { order: 1, narration: "" };
  assert(!SceneSchema.safeParse(invalidScene).success, "SceneSchema rejects empty narration and missing onScreenText");

  const validScript = {
    title: "Why Cats Purr",
    description: "The mystery of purring",
    hook: "Cats don't just purr when happy.",
    scenes: [validScene],
    hashtags: ["#cats", "#pets"],
  };
  assert(ScriptDocumentSchema.safeParse(validScript).success, "ScriptDocumentSchema parses valid document");
  assert(!ScriptDocumentSchema.safeParse({ title: "" }).success, "ScriptDocumentSchema rejects empty title");

  // 2. AUTH
  console.log("\n[2] Testing Authentication...");
  const password = "SuperSecretPassword123!";
  const hash = await hashPassword(password);
  assert(hash && hash.startsWith("$2"), "hashPassword generates valid bcrypt hash");
  assert(await comparePassword(password, hash), "comparePassword verifies correct password");
  assert(!(await comparePassword("WrongPassword", hash)), "comparePassword rejects wrong password");

  const sessionToken = await createSessionToken({ userId: "u123", username: "samkiel", role: "admin" });
  assert(typeof sessionToken === "string" && sessionToken.length > 20, "createSessionToken generates JWT");

  const payload = await verifySessionToken(sessionToken);
  assert(payload?.userId === "u123" && payload?.username === "samkiel", "verifySessionToken parses valid payload");
  assert((await verifySessionToken("invalid.token.here")) === null, "verifySessionToken rejects invalid token");

  // 3. STORAGE & PATH TRAVERSAL PREVENTIONS
  console.log("\n[3] Testing Storage Paths...");
  const safeDir = getVideoStorageDir("video_123");
  assert(safeDir.endsWith("video_123"), "getVideoStorageDir resolves sanitized ID");

  const traversalDir = getVideoStorageDir("../../../etc/passwd");
  assert(!traversalDir.includes(".."), "getVideoStorageDir strips directory traversal characters");

  const mp4Path = getVideoOutputPath("video_123");
  assert(mp4Path.endsWith("final.mp4"), "getVideoOutputPath targets final.mp4");

  // 4. DATABASE CONNECTIVITY
  console.log("\n[4] Testing Database Connectivity...");
  try {
    const userCount = await db.user.count();
    assert(typeof userCount === "number", `Database connection to SQLite verified (Users: ${userCount})`);
  } catch (dbErr) {
    assert(false, `Database connection failed: ${dbErr.message}`);
  }

  console.log("\n=================================");
  console.log(`TOTAL: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("=================================");

  if (failed > 0) process.exit(1);
}

runUnitTests().catch((err) => {
  console.error("Test runner error:", err);
  process.exit(1);
});

