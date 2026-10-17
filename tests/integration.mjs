import assert from "node:assert/strict";
const project = "demo-booplio";
const authBase = `http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1`;
const fireBase = `http://127.0.0.1:8080/v1/projects/${project}/databases/(default)/documents`;
async function create(email) {
  const r = await fetch(`${authBase}/accounts:signUp?key=fake-api-key`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      password: "test-only-strong-password",
      returnSecureToken: true,
    }),
  });
  const d = await r.json();
  assert.ok(r.ok, JSON.stringify(d));
  return d;
}
async function updateUser(uid, claims) {
  const r = await fetch(`${authBase}/accounts:update?key=fake-api-key`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer owner",
    },
    body: JSON.stringify({
      localId: uid,
      emailVerified: true,
      customAttributes: JSON.stringify(claims),
    }),
  });
  assert.ok(r.ok, await r.text());
}
async function token(email) {
  const r = await fetch(
    `${authBase}/accounts:signInWithPassword?key=fake-api-key`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password: "test-only-strong-password",
        returnSecureToken: true,
      }),
    },
  );
  const d = await r.json();
  assert.ok(d.idToken, JSON.stringify(d));
  return d.idToken;
}
process.env.GCLOUD_PROJECT = project;
process.env.FIREBASE_CONFIG = JSON.stringify({
  projectId: project,
  storageBucket: `${project}.appspot.com`,
});
const handlers = await import("../functions/lib/index.js");
const { getAuth } = await import(
  "../functions/node_modules/firebase-admin/lib/auth/index.js"
);
async function invoke(name, data, jwt) {
  try {
    const token = jwt ? await getAuth().verifyIdToken(jwt) : null;
    const result = await handlers[name].run({
      data,
      auth: token ? { uid: token.uid, token } : undefined,
      rawRequest: { ip: "127.0.0.1" },
    });
    return { status: 200, body: { result } };
  } catch (error) {
    return {
      status: 400,
      body: { error: { code: error.code, message: error.message } },
    };
  }
}
async function success(name, data, jwt) {
  const r = await invoke(name, data, jwt);
  assert.ok(r.status === 200, `${name}: ${JSON.stringify(r.body)}`);
  return r.body.result;
}
async function denied(name, data, jwt) {
  const r = await invoke(name, data, jwt);
  assert.ok(r.status >= 400, `${name} unexpectedly succeeded`);
}
const suffix = Date.now(),
  a = await create(`alice-${suffix}@example.com`),
  b = await create(`bob-${suffix}@example.com`),
  m = await create(`mod-${suffix}@example.com`);
await updateUser(a.localId, {});
await updateUser(b.localId, {});
await updateUser(m.localId, { admin: true });
const alice = await token(a.email),
  bob = await token(b.email),
  mod = await token(m.email);
await success(
  "saveProfile",
  { displayName: "Alice", handle: `alice_${suffix}`, bio: "Test creator" },
  alice,
);
const metadata = {
  title: "Integration Charge",
  description: "A little charge for our integration test.",
  category: "charging",
  tags: ["minimal"],
  style: "minimal",
  edge: "any",
  accent: "#d7f77a",
  wallpaper: "sunset",
  minimumVersion: "2.4.2",
  version: "1.0.0",
  releaseNotes: "First release",
  license: "CC0-1.0",
  reducedMotion: true,
  customColors: false,
};
await denied("saveDraft", { metadata, html: "<html>Hello</html>" });
const d = await success(
  "saveDraft",
  { metadata, html: "<!doctype html><body>Version one</body>" },
  alice,
);
assert.ok(d.id);
await denied("getDentFile", { id: d.id, source: "draft" }, bob);
await denied(
  "saveDraft",
  { id: d.id, metadata, html: "<html>stolen</html>" },
  bob,
);
await success("submitDraft", { id: d.id }, alice);
const getDraft = async () => {
  const r = await fetch(`${fireBase}/drafts/${d.id}`, {
    headers: { Authorization: "Bearer owner" },
  });
  return r.json();
};
let draft = await getDraft();
let revision = draft.fields.revision.stringValue;
await denied(
  "moderateDent",
  { id: d.id, action: "approve", note: "", revision },
  alice,
);
await denied("getDentFile", { id: d.id });
await success(
  "moderateDent",
  { id: d.id, action: "approve", note: "Looks good", revision },
  mod,
);
const first = await success("getDentFile", { id: d.id, download: true });
assert.ok(first.html.includes("Version one"));
await success(
  "saveToCollection",
  { id: d.id, saved: true, collection: "Favorites" },
  bob,
);
await success(
  "saveDraft",
  {
    id: d.id,
    metadata: { ...metadata, version: "1.1.0" },
    html: "<!doctype html><body>Version two</body>",
  },
  alice,
);
await success("submitDraft", { id: d.id }, alice);
const during = await success("getDentFile", { id: d.id });
assert.ok(
  during.html.includes("Version one"),
  "pending update replaced live version",
);
draft = await getDraft();
revision = draft.fields.revision.stringValue;
await success(
  "moderateDent",
  { id: d.id, action: "approve", note: "", revision },
  mod,
);
const second = await success("getDentFile", { id: d.id });
assert.ok(second.html.includes("Version two"));
await success(
  "reportDent",
  {
    dentId: d.id,
    reason: "Broken or misleading",
    details: "Integration report",
  },
  bob,
);
await success("setDentVisibility", { id: d.id, published: false }, mod);
await denied("getDentFile", { id: d.id });
await denied("setDentVisibility", { id: d.id, published: true }, alice);
await success("setDentVisibility", { id: d.id, published: true }, mod);
await success("deleteAccount", {}, alice);
await denied("getDentFile", { id: d.id });
console.log(
  "PASS: sign-in claims, profile, draft ownership, moderation, anonymous download, collections, live version preservation, reports, moderator takedown and account deletion.",
);
