import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Upload,
  Check,
  FileCode2,
  Plus,
  Eye,
  Pencil,
  ChevronRight,
} from "lucide-react";
import { useStore } from "../store";
import { db, call, errorMessage } from "../firebase";
import {
  blankMetadata,
  categories,
  categoryLabels,
  licenseLabels,
  bytesLabel,
  type Dent,
  type Metadata,
} from "../types";
import {
  BusyButton,
  Empty,
  PageHeading,
  PhoneArt,
  Modal,
} from "../components/UI";
import { LivePreview } from "../components/Preview";
import { dentFile } from "../files";
import { validHtml } from "../preview";
export function Studio() {
  const { user, profile, authLoading, toast } = useStore();
  const [live, setLive] = useState<Dent[]>([]),
    [drafts, setDrafts] = useState<Dent[]>([]),
    [tab, setTab] = useState("published"),
    [err, setErr] = useState("");
  const nav = useNavigate();
  useEffect(() => {
    if (!db || !user) return;
    const off = onSnapshot(
      query(collection(db, "dents"), where("ownerId", "==", user.uid)),
      (s) => setLive(s.docs.map((d) => ({ id: d.id, ...d.data() }) as Dent)),
      (e) => setErr(errorMessage(e)),
    );
    const off2 = onSnapshot(
      query(collection(db, "drafts"), where("ownerId", "==", user.uid)),
      (s) => setDrafts(s.docs.map((d) => ({ id: d.id, ...d.data() }) as Dent)),
      (e) => setErr(errorMessage(e)),
    );
    return () => {
      off();
      off2();
    };
  }, [user]);
  if (authLoading)
    return (
      <div className="content-wrap">
        <p className="loading-line">Opening your studio…</p>
      </div>
    );
  if (!user || !profile)
    return (
      <div className="content-wrap">
        <Empty
          title={
            user ? "Give your creations a name." : "Made something lovely?"
          }
          action={
            <Link className="button" to="/account">
              {user
                ? "Set up your creator profile"
                : "Sign in to start creating"}
              <ArrowUpRight size={18} />
            </Link>
          }
        >
          {user
            ? "Choose your public name and username before sharing a dent."
            : "Your little ideas deserve a home. Share a free dent with the whole community."}
        </Empty>
      </div>
    );
  const items =
    tab === "published"
      ? live
      : tab === "pending"
        ? drafts.filter((d) => d.status === "pending")
        : drafts.filter((d) => ["draft", "changes"].includes(d.status));
  return (
    <div className="content-wrap narrow-wide">
      <PageHeading
        eyebrow="A LITTLE HTML. A LOT OF YOU."
        title="My creator studio."
        description="Your ideas, from first little spark to everyone’s next favorite."
        action={
          <Link className="button" to="/studio/new">
            <Plus size={18} />
            New dent
          </Link>
        }
      />
      <div className="studio-stats">
        <div>
          <strong>{live.filter((d) => d.status === "published").length}</strong>
          <span>Published dents</span>
        </div>
        <div>
          <strong>
            {
              drafts.filter((d) => ["draft", "changes"].includes(d.status))
                .length
            }
          </strong>
          <span>Little works in progress</span>
        </div>
        <div>
          <strong>
            {live.reduce((n, d) => n + (d.downloads || 0), 0).toLocaleString()}
          </strong>
          <span>Downloads & little smiles</span>
        </div>
      </div>
      <div className="tabs">
        <button
          className={tab === "published" ? "active" : ""}
          onClick={() => setTab("published")}
        >
          Published
        </button>
        <button
          className={tab === "drafts" ? "active" : ""}
          onClick={() => setTab("drafts")}
        >
          Drafts
        </button>
        <button
          className={tab === "pending" ? "active" : ""}
          onClick={() => setTab("pending")}
        >
          In review
        </button>
      </div>
      {err && <div className="notice error">{err}</div>}
      {!items.length ? (
        <Empty
          title="Every lovely thing starts somewhere."
          action={
            <Link className="button lime" to="/studio/new">
              Create your first dent <Plus size={18} />
            </Link>
          }
        >
          No{" "}
          {tab === "pending"
            ? "submissions waiting for review"
            : tab === "drafts"
              ? "drafts"
              : "published dents"}{" "}
          here yet.
        </Empty>
      ) : (
        <div className="studio-list">
          {items.map((d) => (
            <article className="studio-row" key={d.id}>
              <div className="studio-thumbnail">
                <PhoneArt dent={d} />
              </div>
              <div className="studio-row-copy">
                <h3>{d.title}</h3>
                <span className={`status status-${d.status}`}>
                  {
                    (
                      {
                        published: "Live",
                        unpublished: "Unpublished",
                        draft: "Draft",
                        pending: "In review",
                        changes: "Changes needed",
                      } as Record<string, string>
                    )[d.status]
                  }
                </span>
                <span className="fine-print">
                  v{d.version}
                  {d.downloads !== undefined
                    ? ` · ${d.downloads} downloads`
                    : ""}
                </span>
                {d.reviewNote && <p>{d.reviewNote}</p>}
              </div>
              <div className="studio-row-actions">
                {tab === "published" ? (
                  <>
                    <BusyButton
                      className="button secondary small"
                      action={async () => {
                        const r = await call<{ id: string }>("editDent", {
                          id: d.id,
                        });
                        nav(`/studio/edit/${r.id}`);
                      }}
                    >
                      <Pencil size={15} />
                      Edit / update
                    </BusyButton>
                    <BusyButton
                      className="text-link small"
                      action={async () => {
                        await call("setDentVisibility", {
                          id: d.id,
                          published: d.status !== "published",
                        });
                        toast(
                          d.status === "published"
                            ? "Dent unpublished."
                            : "Your dent is live again.",
                        );
                      }}
                    >
                      {d.status === "published" ? "Unpublish" : "Republish"}
                    </BusyButton>
                    <Link
                      to={`/dent/${d.id}`}
                      className="icon-button"
                      aria-label={`View ${d.title}`}
                    >
                      <Eye size={18} />
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      to={`/studio/edit/${d.id}`}
                      className="button secondary small"
                    >
                      Edit draft <ChevronRight size={16} />
                    </Link>
                    <BusyButton
                      className="text-link small danger"
                      action={async () => {
                        if (
                          !confirm("Delete this draft? It cannot be recovered.")
                        )
                          return;
                        await call("deleteDraft", { id: d.id });
                        toast("Draft deleted.");
                      }}
                    >
                      Delete draft
                    </BusyButton>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
      <div className="studio-help">
        <FileCode2 size={25} />
        <div>
          <h3>A little help getting started?</h3>
          <p>Grab the starter file and learn how Booplio talks to your dent.</p>
        </div>
        <Link className="text-link" to="/guide">
          Creator guide <ArrowUpRight size={16} />
        </Link>
      </div>
    </div>
  );
}
export function Editor() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user, profile, toast } = useStore();
  const [step, setStep] = useState(1),
    [meta, setMeta] = useState<Metadata>({ ...blankMetadata }),
    [html, setHtml] = useState(""),
    [filename, setFilename] = useState(""),
    [fileBytes, setFileBytes] = useState(0),
    [draftId, setDraftId] = useState(id || ""),
    [loaded, setLoaded] = useState(!id),
    [existingFile, setExistingFile] = useState(false),
    [preview, setPreview] = useState(false),
    [consent, setConsent] = useState(false),
    [tagText, setTagText] = useState(""),
    [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!id || !db) return;
    let active = true;
    void getDoc(doc(db, "drafts", id))
      .then((d) => {
        if (!active) return;
        if (!d.exists()) throw new Error("Draft not found.");
        const data = d.data() as Dent;
        if (data.ownerId !== user?.uid)
          throw new Error("This draft belongs to another creator.");
        const m = Object.fromEntries(
          Object.keys(blankMetadata).map((k) => [k, data[k as keyof Dent]]),
        ) as Metadata;
        setMeta(m);
        setTagText(m.tags.join(", "));
        setExistingFile(true);
        setFilename(`${data.title}.html`);
        setFileBytes(data.bytes);
        setDraftId(id);
        setLoaded(true);
      })
      .catch((e) => {
        setErr(errorMessage(e));
        setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, [id, user?.uid]);
  if (!user || !profile)
    return (
      <div className="content-wrap">
        <Empty
          title="Your creator corner awaits."
          action={
            <Link to="/account" className="button">
              Sign in & set up your profile
            </Link>
          }
        >
          Add a name before sharing your little creation.
        </Empty>
      </div>
    );
  if (!loaded)
    return (
      <div className="content-wrap">
        <p className="loading-line">Opening your little work in progress…</p>
      </div>
    );
  const update = <K extends keyof Metadata>(key: K, value: Metadata[K]) =>
    setMeta((m) => ({ ...m, [key]: value }));
  const data = () => ({
    ...meta,
    tags: tagText
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 6),
  });
  const valid =
    meta.title.trim().length >= 3 &&
    meta.description.trim().length >= 12 &&
    /^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(meta.version) &&
    /^\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(meta.minimumVersion) &&
    (html || existingFile);
  const save = async () => {
    const r = await call<{ id: string }>("saveDraft", {
      ...(draftId ? { id: draftId } : {}),
      metadata: data(),
      ...(html ? { html } : {}),
    });
    setDraftId(r.id);
    setExistingFile(true);
    setHtml("");
    return r.id;
  };
  const loadPreview = async () => {
    if (!html) {
      const f = await dentFile({ id: draftId } as Dent, false, "draft");
      setHtml(f.html);
    }
    setPreview(true);
  };
  const previewDent = {
    ...meta,
    id: draftId,
    ownerId: user.uid,
    ownerName: profile.displayName,
    ownerHandle: profile.handle,
    status: "draft",
    bytes: fileBytes,
  } as Dent;
  const readFile = async (f?: File) => {
    if (!f) return;
    try {
      if (!/\.html?$/i.test(f.name))
        throw new Error("Choose an .html dent file.");
      if (f.size > 1024 * 1024)
        throw new Error("Dent files must be 1 MiB or smaller.");
      const raw = new TextDecoder("utf-8", { fatal: true }).decode(
        await f.arrayBuffer(),
      );
      setHtml(validHtml(raw));
      setFilename(f.name);
      setFileBytes(f.size);
      setErr("");
    } catch (e) {
      setErr(errorMessage(e));
    }
  };
  return (
    <div className="content-wrap editor-page">
      <Link className="back-link" to="/studio">
        <ArrowLeft size={17} />
        Back to my studio
      </Link>
      <div className="steps">
        {["Your file", "The little details", "Review & share"].map((s, i) => (
          <div
            className={step === i + 1 ? "current" : step > i + 1 ? "done" : ""}
            key={s}
          >
            <span>{step > i + 1 ? <Check size={16} /> : i + 1}</span>
            {s}
          </div>
        ))}
      </div>
      <div className="editor-layout">
        <section className="editor-main">
          <PageHeading
            eyebrow="MADE BY YOU. FREE FOR EVERYONE."
            title={
              step === 1
                ? "Start with your dent."
                : step === 2
                  ? "Give it some personality."
                  : "Ready for the world?"
            }
            description={
              step === 1
                ? "Your next little creation starts with a self-contained HTML file."
                : step === 2
                  ? "Tell everyone what makes your dent a little different."
                  : "One last look before it joins the community."
            }
          />
          {err && (
            <div className="notice error" role="alert">
              {err}
            </div>
          )}
          {step === 1 ? (
            <>
              <div
                className="upload-area"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  void readFile(e.dataTransfer.files[0]);
                }}
              >
                <span className="empty-icon">
                  <Upload size={30} />
                </span>
                <h2>Drop your little masterpiece.</h2>
                <p>Self-contained HTML · up to 1 MiB</p>
                <button
                  className="button secondary"
                  onClick={() => fileRef.current?.click()}
                >
                  Choose dent file <Plus size={17} />
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".html,.htm,text/html"
                  hidden
                  onChange={(e) => void readFile(e.target.files?.[0])}
                />
              </div>
              {filename && (
                <div className="file-result">
                  <FileCode2 size={28} />
                  <div>
                    <strong>{filename}</strong>
                    <small>{bytesLabel(fileBytes)} · UTF-8 HTML</small>
                  </div>
                  <span className="pill green">
                    <Check size={14} />
                    File ready
                  </span>
                </div>
              )}
              <div className="notice">
                <div>
                  <strong>A little note about dent files</strong>
                  <p>
                    Keep images, fonts, CSS and JavaScript inside your HTML.
                    Booplio’s templates have no network access. Passing file
                    checks does not mean the design is safe or compatible.
                  </p>
                </div>
              </div>
              <Link className="text-link" to="/guide">
                Need a starting point? Grab the creator guide{" "}
                <ArrowUpRight size={16} />
              </Link>
            </>
          ) : step === 2 ? (
            <div className="form-stack">
              <label>
                Dent name
                <input
                  maxLength={64}
                  value={meta.title}
                  placeholder="Citrus Charge"
                  onChange={(e) => update("title", e.target.value)}
                />
              </label>
              <label>
                Description
                <textarea
                  rows={4}
                  maxLength={4000}
                  value={meta.description}
                  placeholder="A bright little burst of energy for your screen…"
                  onChange={(e) => update("description", e.target.value)}
                />
                <small>
                  At least 12 characters. Tell people what it does and how to
                  use it.
                </small>
              </label>
              <div className="form-grid">
                <label>
                  Category
                  <select
                    value={meta.category}
                    onChange={(e) =>
                      update("category", e.target.value as Metadata["category"])
                    }
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {categoryLabels[c]}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Style
                  <select
                    value={meta.style}
                    onChange={(e) =>
                      update("style", e.target.value as Metadata["style"])
                    }
                  >
                    {["playful", "minimal", "neon", "retro"].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Screen edge
                  <select
                    value={meta.edge}
                    onChange={(e) =>
                      update("edge", e.target.value as Metadata["edge"])
                    }
                  >
                    {["any", "left", "right", "top", "bottom"].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Accent color
                  <input
                    type="color"
                    value={meta.accent}
                    onChange={(e) => update("accent", e.target.value)}
                  />
                </label>
              </div>
              <label>
                Cover backdrop
                <select
                  value={meta.wallpaper}
                  onChange={(e) =>
                    update("wallpaper", e.target.value as Metadata["wallpaper"])
                  }
                >
                  {[
                    "sunset",
                    "meadow",
                    "midnight",
                    "peach",
                    "lavender",
                    "ocean",
                  ].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
                <small>
                  The listing artwork is illustrative. The interactive preview
                  runs your actual file.
                </small>
              </label>
              <label>
                Tags
                <input
                  value={tagText}
                  maxLength={150}
                  placeholder="minimal, colorful, liquid"
                  onChange={(e) => setTagText(e.target.value)}
                />
                <small>
                  Up to six comma-separated tags, 24 characters each.
                </small>
              </label>
              <div className="form-grid">
                <label>
                  Version
                  <input
                    value={meta.version}
                    placeholder="1.0.0"
                    onChange={(e) => update("version", e.target.value)}
                  />
                </label>
                <label>
                  Minimum Booplio version
                  <input
                    value={meta.minimumVersion}
                    placeholder="2.4.2"
                    onChange={(e) => update("minimumVersion", e.target.value)}
                  />
                </label>
              </div>
              <label>
                What’s new? (optional)
                <textarea
                  maxLength={2000}
                  value={meta.releaseNotes}
                  onChange={(e) => update("releaseNotes", e.target.value)}
                />
              </label>
              <label>
                License
                <select
                  value={meta.license}
                  onChange={(e) =>
                    update("license", e.target.value as Metadata["license"])
                  }
                >
                  {Object.entries(licenseLabels).map(([key, value]) => (
                    <option value={key} key={key}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={meta.reducedMotion}
                  onChange={(e) => update("reducedMotion", e.target.checked)}
                />
                My design supports reduced motion
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={meta.customColors}
                  onChange={(e) => update("customColors", e.target.checked)}
                />
                My design supports the preview’s accent color setting
              </label>
            </div>
          ) : (
            <div className="form-stack">
              <div className="review-preview">
                <PhoneArt dent={previewDent} />
                <div>
                  <h2>{meta.title}</h2>
                  <p>
                    {categoryLabels[meta.category]} · v{meta.version}
                  </p>
                  <span className="pill green">Free. Always.</span>
                </div>
              </div>
              <div className="checklist">
                <span>
                  <Check size={18} />
                  HTML file attached
                </span>
                <span>
                  <Check size={18} />
                  Listing details complete
                </span>
                <span>
                  <Check size={18} />
                  Compatibility and license set
                </span>
              </div>
              <button
                className="button secondary"
                onClick={() =>
                  void loadPreview().catch((e) => toast(errorMessage(e)))
                }
              >
                <Eye size={18} />
                Test the actual preview
              </button>
              <label className="checkbox consent">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                />
                I own this work or have permission to share it under the
                selected license.
              </label>
              <div className="notice">
                <HeartIcon />
                <p>
                  Every dent on Booplio is free. Your submission will be
                  reviewed before it goes live.
                </p>
              </div>
            </div>
          )}
          <div className="editor-actions">
            {step > 1 ? (
              <button
                className="button secondary"
                onClick={() => setStep((s) => s - 1)}
              >
                <ArrowLeft size={16} />
                Back
              </button>
            ) : (
              <span />
            )}
            <div className="row">
              {step > 1 && (
                <BusyButton
                  className="button secondary"
                  disabled={!valid}
                  action={async () => {
                    await save();
                    toast(
                      "Draft saved. Come back whenever inspiration strikes.",
                    );
                  }}
                >
                  Save draft
                </BusyButton>
              )}
              {step < 3 ? (
                <BusyButton
                  disabled={step === 1 ? !(html || existingFile) : !valid}
                  action={async () => {
                    if (step === 2) await save();
                    setStep((s) => s + 1);
                  }}
                >
                  {step === 1 ? "Add the details" : "Review your dent"}
                  <ArrowRight size={17} />
                </BusyButton>
              ) : (
                <BusyButton
                  disabled={!consent || !valid}
                  action={async () => {
                    const current = await save();
                    await call("submitDraft", { id: current });
                    nav("/studio");
                    toast(
                      "Submitted! We’ll review your little creation before it goes live.",
                    );
                  }}
                >
                  Submit for review <ArrowUpRight size={17} />
                </BusyButton>
              )}
            </div>
          </div>
        </section>
        <aside className="editor-sidebar">
          <span className="eyebrow">YOUR LISTING PREVIEW</span>
          <PhoneArt dent={previewDent} />
          <h2>{meta.title || "Something lovely."}</h2>
          <p>by {profile.displayName}</p>
          <span className="pill green">Always free</span>
          <p className="fine-print">
            This artwork represents your chosen cover style. Test your HTML to
            see the actual design.
          </p>
          <div className="studio-tip">
            <h3>A good little checklist.</h3>
            <p>
              Try all four edges. Test a shallow dent. Keep text readable.
              Respect reduced motion. Make it lovely at every level.
            </p>
          </div>
        </aside>
      </div>
      {preview && (
        <Modal
          title="Try your little creation"
          onClose={() => setPreview(false)}
        >
          <LivePreview dent={previewDent} html={html} />
        </Modal>
      )}
    </div>
  );
}
function HeartIcon() {
  return <span className="love-symbol">♡</span>;
}
