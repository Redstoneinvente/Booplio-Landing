import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { getAuth } from "firebase-admin/auth";
import {
  onCall,
  onRequest,
  HttpsError,
  CallableRequest,
} from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { setGlobalOptions } from "firebase-functions/v2";
import { randomUUID, createHash } from "node:crypto";
import { z } from "zod";
import {
  metadataSchema,
  idSchema,
  validateHtml,
  newerVersion,
  searchTokens,
} from "./validation.js";
import { readFileSync, createReadStream } from "node:fs";
import { boundedHtml, publicDownloadHandler, maximumTemplateBytes } from "./template-download.js";
initializeApp();
setGlobalOptions({
  region: "us-central1",
  maxInstances: 10,
  memory: "256MiB",
  timeoutSeconds: 60,
});
const db = getFirestore();
const bucket = () => getStorage().bucket();
const stamp = () => FieldValue.serverTimestamp();
const settings = { enforceAppCheck: process.env.ENFORCE_APP_CHECK === "true" };
function auth(req: CallableRequest, verified = false) {
  if (!req.auth)
    throw new HttpsError("unauthenticated", "Sign in to continue.");
  if (verified && req.auth.token.email_verified !== true)
    throw new HttpsError(
      "permission-denied",
      "Verify your email before sharing a dent.",
    );
  return req.auth.uid;
}
function admin(req: CallableRequest) {
  auth(req);
  if (req.auth?.token.admin !== true)
    throw new HttpsError("permission-denied", "Moderator access required.");
}
function parse<T>(schema: z.ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success)
    throw new HttpsError(
      "invalid-argument",
      result.error.issues[0]?.message || "Check your details.",
    );
  return result.data;
}
async function rate(req: CallableRequest, action: string, maximum: number) {
  const identity = req.auth?.uid || req.rawRequest.ip || "unknown";
  const key = createHash("sha256")
    .update(
      `${process.env.GCLOUD_PROJECT}:${identity}:${action}:${new Date().toISOString().slice(0, 10)}`,
    )
    .digest("hex");
  const ref = db.collection("rateLimits").doc(key);
  await db.runTransaction(async (tx) => {
    const d = await tx.get(ref);
    const count = d.data()?.count || 0;
    if (count >= maximum)
      throw new HttpsError(
        "resource-exhausted",
        "Daily limit reached. Please try again tomorrow.",
      );
    tx.set(ref, {
      count: count + 1,
      expiresAt: Timestamp.fromMillis(Date.now() + 2 * 86400000),
    });
  });
}
export const saveProfile = onCall(settings, async (req) => {
  const uid = auth(req);
  await rate(req, "profile", 30);
  const data = parse(
    z
      .object({
        displayName: z.string().trim().min(2).max(40),
        handle: z
          .string()
          .trim()
          .toLowerCase()
          .regex(/^[a-z0-9_]{3,24}$/),
        bio: z.string().trim().max(240),
      })
      .strict(),
    req.data,
  );
  if (
    ["booplio", "admin", "support", "moderator", "system"].includes(
      data.handle,
    ) &&
    req.auth?.token.admin !== true
  )
    throw new HttpsError(
      "invalid-argument",
      "That username is reserved. Try another.",
    );
  const profileRef = db.doc(`profiles/${uid}`),
    handleRef = db.doc(`handles/${data.handle}`);
  await db.runTransaction(async (tx) => {
    const [existing, handle] = await Promise.all([
      tx.get(profileRef),
      tx.get(handleRef),
    ]);
    if (handle.exists && handle.data()?.uid !== uid)
      throw new HttpsError(
        "already-exists",
        "That username is taken. Try another.",
      );
    if (existing.exists && existing.data()?.handle !== data.handle)
      tx.delete(db.doc(`handles/${existing.data()?.handle}`));
    tx.set(handleRef, { uid });
    tx.set(profileRef, {
      ...data,
      uid,
      updatedAt: stamp(),
      createdAt: existing.data()?.createdAt || stamp(),
    });
  });
  return { uid, ...data };
});
export const saveDraft = onCall(settings, async (req) => {
  const uid = auth(req, true);
  await rate(req, "draft", 80);
  const input = parse(
    z
      .object({
        id: idSchema.optional(),
        metadata: metadataSchema,
        html: z.string().max(1048576).optional(),
      })
      .strict(),
    req.data,
  );
  const profile = await db.doc(`profiles/${uid}`).get();
  if (!profile.exists)
    throw new HttpsError(
      "failed-precondition",
      "Set up your creator profile first.",
    );
  const id = input.id || randomUUID(),
    ref = db.doc(`drafts/${id}`);
  const old = await ref.get();
  if (input.id && !old.exists) throw new HttpsError("not-found", "Draft unavailable. Create a new draft instead.");
  if (old.exists && old.data()?.ownerId !== uid)
    throw new HttpsError(
      "permission-denied",
      "This draft belongs to someone else.",
    );
  let filePath: string = old.data()?.filePath || "";
  let bytes: number = old.data()?.bytes || 0;
  if (input.html !== undefined) {
    let html: string;
    try {
      html = validateHtml(input.html);
    } catch (e) {
      throw new HttpsError("invalid-argument", (e as Error).message);
    }
    filePath = `private/${uid}/${id}/${randomUUID()}.html`;
    bytes = Buffer.byteLength(html, "utf8");
    await bucket()
      .file(filePath)
      .save(html, {
        resumable: false,
        metadata: {
          contentType: "text/html; charset=utf-8",
          cacheControl: "private, no-store",
        },
      });
  }
  if (!filePath)
    throw new HttpsError("invalid-argument", "Choose a dent file.");
  await ref.set({
    ...input.metadata,
    ownerId: uid,
    ownerName: profile.data()?.displayName,
    ownerHandle: profile.data()?.handle,
    dentId: old.data()?.dentId || id,
    filePath,
    bytes,
    status: "draft",
    reviewNote: "",
    revision: randomUUID(),
    updatedAt: stamp(),
    createdAt: old.data()?.createdAt || stamp(),
  });
  return { id };
});
export const editDent = onCall(settings, async (req) => {
  const uid = auth(req, true);
  const id = parse(idSchema, req.data?.id);
  const live = await db.doc(`dents/${id}`).get();
  if (!live.exists || live.data()?.ownerId !== uid)
    throw new HttpsError("permission-denied", "This dent is unavailable.");
  const dent = live.data()!;
  const ref = db.doc(`drafts/${id}`);
  const old = await ref.get();
  if (!old.exists || old.data()?.status === "approved") {
    const version = await db
      .doc(`dents/${id}/versions/${dent.currentRevision}`)
      .get();
    await ref.set({
      ...metadataSchema.parse(
        Object.fromEntries(
          Object.keys(metadataSchema.shape).map((k) => [k, dent[k]]),
        ),
      ),
      dentId: id,
      ownerId: uid,
      ownerName: dent.ownerName,
      ownerHandle: dent.ownerHandle,
      filePath: version.data()?.filePath,
      bytes: dent.bytes,
      status: "draft",
      reviewNote: "",
      revision: randomUUID(),
      createdAt: stamp(),
      updatedAt: stamp(),
    });
  }
  return { id };
});
export const submitDraft = onCall(settings, async (req) => {
  const uid = auth(req, true);
  const id = parse(idSchema, req.data?.id);
  await rate(req, "submit", 20);
  await db.runTransaction(async (tx) => {
    const ref = db.doc(`drafts/${id}`),
      draft = await tx.get(ref);
    if (!draft.exists || draft.data()?.ownerId !== uid)
      throw new HttpsError("permission-denied", "Draft unavailable.");
    const data = draft.data()!;
    if (!["draft", "changes"].includes(data.status))
      throw new HttpsError(
        "failed-precondition",
        "Save your draft before submitting.",
      );
    const live = await tx.get(db.doc(`dents/${data.dentId}`));
    if (live.exists && !newerVersion(data.version, live.data()!.version))
      throw new HttpsError(
        "failed-precondition",
        "Use a version higher than the published version.",
      );
    tx.update(ref, {
      status: "pending",
      submittedAt: stamp(),
      updatedAt: stamp(),
      reviewNote: "",
    });
  });
  return { submitted: true };
});
export const moderateDent = onCall(settings, async (req) => {
  admin(req);
  const data = parse(
    z
      .object({
        id: idSchema,
        action: z.enum(["approve", "reject"]),
        note: z.string().trim().max(1000),
        revision: z.string(),
      })
      .strict(),
    req.data,
  );
  await db.runTransaction(async (tx) => {
    const ref = db.doc(`drafts/${data.id}`),
      draft = await tx.get(ref);
    if (
      !draft.exists ||
      draft.data()?.status !== "pending" ||
      draft.data()?.revision !== data.revision
    )
      throw new HttpsError(
        "failed-precondition",
        "This submission changed. Refresh before reviewing.",
      );
    const d = draft.data()!;
    if (data.action === "reject") {
      if (!data.note)
        throw new HttpsError(
          "invalid-argument",
          "Explain what needs changing.",
        );
      tx.update(ref, {
        status: "changes",
        reviewNote: data.note,
        updatedAt: stamp(),
      });
      return;
    }
    const liveRef = db.doc(`dents/${d.dentId}`),
      old = await tx.get(liveRef);
    if (old.exists && !newerVersion(d.version, old.data()!.version))
      throw new HttpsError(
        "failed-precondition",
        "A newer version is already live.",
      );
    const metadata = metadataSchema.parse(
      Object.fromEntries(
        Object.keys(metadataSchema.shape).map((k) => [k, d[k]]),
      ),
    );
    tx.set(liveRef, {
      ...metadata,
      ownerId: d.ownerId,
      ownerName: d.ownerName,
      ownerHandle: d.ownerHandle,
      bytes: d.bytes,
      searchTokens: searchTokens(metadata, d.ownerName, d.ownerHandle),
      currentRevision: d.revision,
      status: "published",
      downloads: old.data()?.downloads || 0,
      createdAt: old.data()?.createdAt || stamp(),
      updatedAt: stamp(),
    });
    tx.set(liveRef.collection("versions").doc(d.revision), {
      version: d.version,
      releaseNotes: d.releaseNotes,
      filePath: d.filePath,
      bytes: d.bytes,
      createdAt: stamp(),
    });
    tx.update(ref, {
      status: "approved",
      reviewNote: data.note,
      updatedAt: stamp(),
    });
  });
  return { done: true };
});
export const setDentVisibility = onCall(settings, async (req) => {
  const uid = auth(req);
  const data = parse(
    z.object({ id: idSchema, published: z.boolean() }).strict(),
    req.data,
  );
  await db.runTransaction(async (tx) => {
    const ref = db.doc(`dents/${data.id}`),
      d = await tx.get(ref);
    if (
      !d.exists ||
      (d.data()?.ownerId !== uid && req.auth?.token.admin !== true)
    )
      throw new HttpsError("permission-denied", "Dent unavailable.");
    if (req.auth?.token.admin !== true && d.data()?.moderatorHidden)
      throw new HttpsError(
        "permission-denied",
        "This dent was hidden by a moderator.",
      );
    tx.update(ref, {
      status: data.published ? "published" : "unpublished",
      ...(req.auth?.token.admin === true
        ? { moderatorHidden: !data.published }
        : {}),
      updatedAt: stamp(),
    });
  });
  return { done: true };
});
const starterDirectory = new URL("./starters/", import.meta.url);
const starterManifest = JSON.parse(readFileSync(new URL("manifest.json", starterDirectory), "utf8")) as Record<string, string>;
export const templateDownload = onRequest({ invoker: "public" }, publicDownloadHandler(async (id) => {
  if (Object.hasOwn(starterManifest, id)) {
    return boundedHtml(createReadStream(new URL(starterManifest[id], starterDirectory)));
  }
  const live = await db.doc(`dents/${id}`).get();
  if (!live.exists || live.data()?.status !== "published" || live.data()?.moderatorHidden === true) return null;
  const revision = live.data()!.currentRevision;
  if (typeof revision !== "string" || !/^[A-Za-z0-9-]+$/.test(revision)) return null;
  const version = await db.doc(`dents/${id}/versions/${revision}`).get();
  const data = version.data();
  if (!data || typeof data.filePath !== "string" || data.bytes > maximumTemplateBytes) return null;
  const file = bucket().file(data.filePath);
  const [metadata] = await file.getMetadata();
  if (!Number.isFinite(Number(metadata.size)) || Number(metadata.size) > maximumTemplateBytes) throw new Error("oversized");
  const buffer = await boundedHtml(file.createReadStream());
  const current = await live.ref.get();
  if (current.data()?.status !== "published" || current.data()?.moderatorHidden === true || current.data()?.currentRevision !== revision) return null;
  return buffer;
}));
export const getDentFile = onCall(settings, async (req) => {
  const input = parse(
    z
      .object({
        id: idSchema,
        source: z.enum(["draft", "published"]).default("published"),
        revision: z
          .string()
          .regex(/^[a-zA-Z0-9-]+$/)
          .optional(),
        download: z.boolean().default(false),
      })
      .strict(),
    req.data,
  );
  await rate(req, "file", 300);
  let filePath: string, title: string, version: string;
  if (input.source === "draft") {
    const uid = auth(req),
      draft = await db.doc(`drafts/${input.id}`).get();
    if (
      !draft.exists ||
      (draft.data()?.ownerId !== uid && req.auth?.token.admin !== true)
    )
      throw new HttpsError("permission-denied", "Draft unavailable.");
    ({ filePath, title, version } = draft.data()! as {
      filePath: string;
      title: string;
      version: string;
    });
  } else {
    const live = await db.doc(`dents/${input.id}`).get();
    if (
      !live.exists ||
      (live.data()?.status !== "published" &&
        live.data()?.ownerId !== req.auth?.uid &&
        req.auth?.token.admin !== true)
    )
      throw new HttpsError("not-found", "This dent is no longer available.");
    title = live.data()!.title;
    const v = await db
      .doc(
        `dents/${input.id}/versions/${input.revision || live.data()!.currentRevision}`,
      )
      .get();
    if (!v.exists) throw new HttpsError("not-found", "Version unavailable.");
    filePath = v.data()!.filePath;
    version = v.data()!.version;
    if (input.download) {
      const key = createHash("sha256")
        .update(
          `${input.id}:${req.rawRequest.ip}:${new Date().toISOString().slice(0, 10)}`,
        )
        .digest("hex");
      const counted = db.doc(`downloadReceipts/${key}`);
      await db.runTransaction(async (tx) => {
        if (!(await tx.get(counted)).exists) {
          tx.create(counted, {
            expiresAt: Timestamp.fromMillis(Date.now() + 2 * 86400000),
          });
          tx.update(live.ref, { downloads: FieldValue.increment(1) });
        }
      });
    }
  }
  const [buffer] = await bucket().file(filePath).download();
  if (buffer.byteLength > 1024 * 1024)
    throw new HttpsError("failed-precondition", "File is too large.");
  return {
    html: buffer.toString("utf8"),
    filename: `${title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 60)}-${version}.html`,
  };
});
export const saveToCollection = onCall(settings, async (req) => {
  const uid = auth(req);
  const d = parse(
    z
      .object({
        id: idSchema,
        saved: z.boolean(),
        collection: z.string().trim().min(1).max(40).default("Favorites"),
      })
      .strict(),
    req.data,
  );
  const ref = db.doc(`users/${uid}/saves/${d.id}`);
  if (d.saved) {
    const dent = await db.doc(`dents/${d.id}`).get();
    const builtin = [
      "starter-citrus-charge",
      "starter-orbit-volume",
      "starter-sunny-side",
      "starter-quiet-waves",
      "starter-focus-ring",
      "starter-petal-flow",
      "starter-mono-meter",
      "starter-leaf-breath",
    ].includes(d.id);
    if (!builtin && (!dent.exists || dent.data()?.status !== "published"))
      throw new HttpsError("not-found", "Dent unavailable.");
    const previous = await ref.get();
    await ref.set({
      dentId: d.id,
      collection: d.collection,
      savedVersion:
        previous.data()?.savedVersion ||
        (builtin ? "1.0.0" : dent.data()?.version),
      createdAt: previous.data()?.createdAt || stamp(),
    });
  } else await ref.delete();
  return { done: true };
});
export const followCreator = onCall(settings, async (req) => {
  const uid = auth(req);
  const d = parse(
    z
      .object({
        creatorId: z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/),
        follow: z.boolean(),
      })
      .strict(),
    req.data,
  );
  if (d.creatorId === uid)
    throw new HttpsError("invalid-argument", "You cannot follow yourself.");
  const ref = db.doc(`users/${uid}/following/${d.creatorId}`);
  if (d.follow) {
    if (!(await db.doc(`profiles/${d.creatorId}`).get()).exists)
      throw new HttpsError("not-found", "Creator unavailable.");
    await ref.set({ creatorId: d.creatorId, createdAt: stamp() });
  } else await ref.delete();
  return { done: true };
});
export const reportDent = onCall(settings, async (req) => {
  const uid = auth(req);
  await rate(req, "report", 10);
  const d = parse(
    z
      .object({
        dentId: idSchema,
        reason: z.enum([
          "Broken or misleading",
          "Copied work",
          "Inappropriate content",
          "Unsafe behavior",
          "Other",
        ]),
        details: z.string().trim().max(2000),
      })
      .strict(),
    req.data,
  );
  if (!(await db.doc(`dents/${d.dentId}`).get()).exists)
    throw new HttpsError("not-found", "Dent unavailable.");
  const id = `${uid}_${d.dentId}`;
  await db
    .doc(`reports/${id}`)
    .set({ ...d, reporterId: uid, status: "open", createdAt: stamp() });
  return { done: true };
});
export const resolveReport = onCall(settings, async (req) => {
  admin(req);
  const d = parse(
    z.object({ id: z.string().max(256), hideDent: z.boolean() }).strict(),
    req.data,
  );
  const ref = db.collection("reports").doc(d.id),
    report = await ref.get();
  if (!report.exists) throw new HttpsError("not-found", "Report unavailable.");
  const batch = db.batch();
  batch.update(ref, {
    status: "resolved",
    resolvedAt: stamp(),
    resolvedBy: req.auth!.uid,
  });
  if (d.hideDent)
    batch.update(db.doc(`dents/${report.data()!.dentId}`), {
      status: "unpublished",
      moderatorHidden: true,
      updatedAt: stamp(),
    });
  await batch.commit();
  return { done: true };
});
export const deleteAccount = onCall(settings, async (req) => {
  const uid = auth(req);
  if (Date.now() / 1000 - Number(req.auth?.token.auth_time) > 300)
    throw new HttpsError(
      "failed-precondition",
      "Sign out and sign in again before deleting your account.",
    );
  const [dents, drafts, profile] = await Promise.all([
    db.collection("dents").where("ownerId", "==", uid).get(),
    db.collection("drafts").where("ownerId", "==", uid).get(),
    db.doc(`profiles/${uid}`).get(),
  ]);
  for (const d of dents.docs) await db.recursiveDelete(d.ref);
  for (const d of drafts.docs) await d.ref.delete();
  await db.recursiveDelete(db.doc(`users/${uid}`));
  if (profile.exists)
    await db.doc(`handles/${profile.data()!.handle}`).delete();
  await db.doc(`profiles/${uid}`).delete();
  await bucket().deleteFiles({ prefix: `private/${uid}/` });
  await getAuth().deleteUser(uid);
  return { done: true };
});
export const cleanupExpiredReceipts = onSchedule("every 24 hours", async () => {
  for (const name of ["rateLimits", "downloadReceipts"]) {
    const q = await db
      .collection(name)
      .where("expiresAt", "<", Timestamp.now())
      .limit(400)
      .get();
    const batch = db.batch();
    q.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
});

export const deleteDraft = onCall(settings, async (req) => {
  const uid = auth(req);
  const id = parse(idSchema, req.data?.id);
  await db.runTransaction(async (tx) => {
    const ref = db.doc(`drafts/${id}`),
      snapshot = await tx.get(ref);
    if (!snapshot.exists || snapshot.data()?.ownerId !== uid)
      throw new HttpsError("permission-denied", "Draft unavailable.");
    if (snapshot.data()?.status === "approved")
      throw new HttpsError(
        "failed-precondition",
        "Published release records cannot be deleted as drafts.",
      );
    tx.delete(ref);
  });
  return { done: true };
});
