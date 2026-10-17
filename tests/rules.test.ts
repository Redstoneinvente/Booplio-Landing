import { readFileSync } from "node:fs";
import { beforeAll, afterAll, describe, it } from "vitest";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { ref, uploadString, getBytes } from "firebase/storage";
let env: RulesTestEnvironment;
const emulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
describe.skipIf(!emulator)("marketplace access boundaries", () => {
  beforeAll(async () => {
    env = await initializeTestEnvironment({
      projectId: "demo-booplio",
      firestore: { rules: readFileSync("firestore.rules", "utf8") },
      storage: { rules: readFileSync("storage.rules", "utf8") },
    });
    await env.withSecurityRulesDisabled(async (c) => {
      const d = c.firestore();
      await setDoc(doc(d, "dents/public-dent"), {
        status: "published",
        ownerId: "alice",
      });
      await setDoc(doc(d, "dents/hidden-dent"), {
        status: "unpublished",
        ownerId: "alice",
      });
      await setDoc(doc(d, "drafts/private-draft"), {
        status: "draft",
        ownerId: "alice",
      });
      await setDoc(doc(d, "profiles/alice"), { displayName: "Alice" });
      await setDoc(doc(d, "users/alice/saves/public-dent"), {
        dentId: "public-dent",
      });
      await setDoc(doc(d, "reports/report-one"), {
        reporterId: "alice",
        status: "open",
      });
      await setDoc(doc(d, "rateLimits/private-rate"), { count: 1 });
    });
  }, 30000);
  afterAll(async () => {
    await env?.cleanup();
  });
  it("allows anonymous public catalog queries and profiles", async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertSucceeds(
      getDocs(
        query(collection(db, "dents"), where("status", "==", "published")),
      ),
    );
    await assertSucceeds(getDoc(doc(db, "profiles/alice")));
  });
  it("denies anonymous drafts, unpublished dents and broad catalog reads", async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "drafts/private-draft")));
    await assertFails(getDoc(doc(db, "dents/hidden-dent")));
    await assertFails(getDocs(collection(db, "dents")));
  });
  it("allows owners and moderators to read drafts but denies other creators", async () => {
    await assertSucceeds(
      getDoc(
        doc(
          env.authenticatedContext("alice").firestore(),
          "drafts/private-draft",
        ),
      ),
    );
    await assertSucceeds(
      getDoc(
        doc(
          env.authenticatedContext("mod", { admin: true }).firestore(),
          "drafts/private-draft",
        ),
      ),
    );
    await assertFails(
      getDoc(
        doc(
          env.authenticatedContext("bob").firestore(),
          "drafts/private-draft",
        ),
      ),
    );
  });
  it("keeps saved collections private", async () => {
    await assertSucceeds(
      getDoc(
        doc(
          env.authenticatedContext("alice").firestore(),
          "users/alice/saves/public-dent",
        ),
      ),
    );
    await assertFails(
      getDoc(
        doc(
          env.authenticatedContext("bob").firestore(),
          "users/alice/saves/public-dent",
        ),
      ),
    );
  });
  it("keeps reports visible only to moderators", async () => {
    await assertFails(
      getDoc(
        doc(
          env.authenticatedContext("alice").firestore(),
          "reports/report-one",
        ),
      ),
    );
    await assertSucceeds(
      getDoc(
        doc(
          env.authenticatedContext("mod", { admin: true }).firestore(),
          "reports/report-one",
        ),
      ),
    );
  });
  it("denies client publication, role changes and counter tampering", async () => {
    const db = env.authenticatedContext("alice", { admin: true }).firestore();
    await assertFails(
      setDoc(doc(db, "dents/public-dent"), {
        status: "published",
        downloads: 9999,
      }),
    );
    await assertFails(setDoc(doc(db, "profiles/alice"), { admin: true }));
    await assertFails(setDoc(doc(db, "rateLimits/private-rate"), { count: 0 }));
  });
  it("blocks direct Storage reads and writes even for signed-in owners", async () => {
    const storage = env.authenticatedContext("alice").storage();
    await assertFails(
      uploadString(
        ref(storage, "private/alice/test.html"),
        "<html>test</html>",
      ),
    );
    await assertFails(getBytes(ref(storage, "private/alice/test.html")));
  });
});
