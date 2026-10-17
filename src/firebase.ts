import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import {
  getFunctions,
  connectFunctionsEmulator,
  httpsCallable,
} from "firebase/functions";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
const e = import.meta.env;
export const configured = Boolean(
  e.VITE_FIREBASE_API_KEY &&
    e.VITE_FIREBASE_PROJECT_ID &&
    e.VITE_FIREBASE_APP_ID,
);
const app = configured
  ? initializeApp({
      apiKey: e.VITE_FIREBASE_API_KEY,
      authDomain: e.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: e.VITE_FIREBASE_PROJECT_ID,
      storageBucket: e.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: e.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: e.VITE_FIREBASE_APP_ID,
    })
  : null;
export const auth = app ? getAuth(app) : null;
export const db = app ? getFirestore(app) : null;
const functions = app
  ? getFunctions(app, e.VITE_FIREBASE_FUNCTIONS_REGION || "us-central1")
  : null;
if (app && e.VITE_FIREBASE_APPCHECK_SITE_KEY)
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(e.VITE_FIREBASE_APPCHECK_SITE_KEY),
    isTokenAutoRefreshEnabled: true,
  });
if (
  app &&
  auth &&
  db &&
  functions &&
  e.VITE_USE_EMULATORS === "true" &&
  ["localhost", "127.0.0.1"].includes(location.hostname)
) {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}
export async function call<T = unknown>(
  name: string,
  data: unknown,
): Promise<T> {
  if (!functions)
    throw new Error(
      "Community accounts and uploads are opening soon. You can still explore and download the starter dents.",
    );
  return (await httpsCallable<unknown, T>(functions, name)(data)).data;
}
export function errorMessage(error: unknown): string {
  const code = (error as { code?: string })?.code;
  if (code === "auth/popup-closed-by-user")
    return "Sign-in closed. Try again when you’re ready.";
  if (code === "auth/popup-blocked")
    return "Your browser blocked the sign-in window. Allow popups and try again.";
  if (code === "auth/unauthorized-domain")
    return "Sign-in is not enabled for this website address yet.";
  if (
    code === "auth/invalid-action-code" ||
    code === "auth/expired-action-code"
  )
    return "That sign-in link expired or has already been used. Request a new one.";
  if (code === "permission-denied" || code === "functions/permission-denied")
    return (error as Error).message || "You do not have access to this item.";
  if (
    code === "unavailable" ||
    code === "functions/unavailable" ||
    code === "auth/network-request-failed"
  )
    return "Could not connect. Check your connection and try again.";
  return error instanceof Error
    ? error.message.replace(/^Firebase: /, "")
    : "Something went wrong. Please try again.";
}
