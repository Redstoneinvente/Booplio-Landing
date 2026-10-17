import { createRequire } from "node:module";
const require = createRequire(
  new URL("../functions/package.json", import.meta.url),
);
const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const [projectId, email] = process.argv.slice(2);
if (!projectId || !email || !email.includes("@"))
  throw new Error("Usage: node scripts/set-admin.mjs PROJECT_ID YOUR_EMAIL");
initializeApp({ credential: applicationDefault(), projectId });
const user = await getAuth().getUserByEmail(email);
await getAuth().setCustomUserClaims(user.uid, {
  ...user.customClaims,
  admin: true,
});
console.log(
  "Moderator role granted. Sign out of the website and sign back in.",
);
