import { createInterface } from "node:readline/promises";
import { readFile, writeFile } from "node:fs/promises";
const rl = createInterface({ input: process.stdin, output: process.stdout });
try {
  console.log(
    "Copy the public web app configuration from Firebase Project settings. Do not enter service account credentials.",
  );
  const fields = [
    ["VITE_FIREBASE_PROJECT_ID", "Project ID"],
    ["VITE_FIREBASE_API_KEY", "Web API key"],
    ["VITE_FIREBASE_AUTH_DOMAIN", "Auth domain"],
    ["VITE_FIREBASE_STORAGE_BUCKET", "Storage bucket"],
    ["VITE_FIREBASE_MESSAGING_SENDER_ID", "Messaging sender ID"],
    ["VITE_FIREBASE_APP_ID", "App ID"],
  ];
  const values = {};
  for (const [key, label] of fields) {
    const value = (await rl.question(`${label}: `)).trim();
    if (!value || /[\r\n"']/u.test(value)) throw new Error(`Invalid ${label}.`);
    values[key] = value;
  }
  if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(values.VITE_FIREBASE_PROJECT_ID))
    throw new Error("Check your Firebase project ID.");
  try {
    await readFile(".env.local");
    const overwrite = await rl.question(
      ".env.local already exists. Replace it? [y/N] ",
    );
    if (overwrite.toLowerCase() !== "y") process.exit(0);
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }
  const text = Object.entries(values)
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
  await writeFile(
    ".env.local",
    `${text}\nVITE_FIREBASE_FUNCTIONS_REGION=us-central1\nVITE_USE_EMULATORS=false\n`,
  );
  await writeFile(
    ".firebaserc",
    JSON.stringify(
      { projects: { default: values.VITE_FIREBASE_PROJECT_ID } },
      null,
      2,
    ) + "\n",
  );
  console.log(
    "Configuration saved. Next: npm run build, then npx firebase login and npx firebase deploy.",
  );
} catch (e) {
  console.error(e.message);
  process.exitCode = 1;
} finally {
  rl.close();
}
