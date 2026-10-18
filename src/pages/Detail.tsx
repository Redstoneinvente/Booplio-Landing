import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  orderBy,
  query,
} from "firebase/firestore";
import {
  ArrowLeft,
  Download,
  Share2,
  Play,
  Flag,
  Check,
  Smartphone,
  Palette,
  ExternalLink,
} from "lucide-react";
import { useStore } from "../store";
import { db, call, errorMessage } from "../firebase";
import { dentFile, saveFile, recordDownload } from "../files";
import {
  type Dent,
  type Version,
  dateLabel,
  bytesLabel,
  categoryLabels,
  licenseLabels,
} from "../types";
import {
  PhoneArt,
  SaveButton,
  Modal,
  BusyButton,
  Empty,
  DentCard,
} from "../components/UI";
import { OpenInBooplio } from "../components/OpenInBooplio";
import type { TemplateLink } from "../handoff";
import { LivePreview } from "../components/Preview";
export function Detail({ templateId, handoff }: { templateId?: string; handoff?: TemplateLink } = {}) {
  const params = useParams();
  const id = templateId || params.id;
  const { dents, user, toast } = useStore();
  const [dent, setDent] = useState<Dent | null>(
      dents.find((d) => d.id === id) || null,
    ),
    [loading, setLoading] = useState(true),
    [err, setErr] = useState(""),
    [preview, setPreview] = useState<string | null>(null),
    [downloaded, setDownloaded] = useState(false),
    [report, setReport] = useState(false),
    [reason, setReason] = useState("Broken or misleading"),
    [details, setDetails] = useState(""),
    [tab, setTab] = useState("about"),
    [versions, setVersions] = useState<Version[]>([]);
  useEffect(() => {
    let active = true;
    setPreview(null);
    setDownloaded(false);
    setErr("");
    setLoading(true);
    setTab("about");
    setVersions([]);
    const existing = dents.find((d) => d.id === id);
    setDent(existing || null);
    if (existing?.builtin) {
      setLoading(false);
      return;
    }
    if (!db || !id) {
      setLoading(false);
      return;
    }
    void getDoc(doc(db, "dents", id))
      .then((d) => {
        if (active) {
          setDent(d.exists() ? ({ id: d.id, ...d.data() } as Dent) : null);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (active) {
          setErr(errorMessage(e));
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [id]);
  const loadVersions = async () => {
    setTab("versions");
    if (dent?.builtin || !db || !id) return;
    try {
      const s = await getDocs(
        query(
          collection(db, "dents", id, "versions"),
          orderBy("createdAt", "desc"),
        ),
      );
      setVersions(s.docs.map((d) => ({ id: d.id, ...d.data() }) as Version));
    } catch (e) {
      toast(errorMessage(e));
    }
  };
  if (loading && !dent)
    return (
      <div className="content-wrap">
        <p className="loading-line">
          <span className="spinner" /> Finding your dent…
        </p>
      </div>
    );
  if (!dent)
    return (
      <div className="content-wrap">
        <Empty
          title="This little dent wandered off."
          action={
            <Link className="button" to="/search">
              Browse dents
            </Link>
          }
        >
          {err || "It may have been removed or unpublished."}
        </Empty>
      </div>
    );
  const download = async (revision?: string) => {
    const f = await dentFile(dent, true, "published", revision);
    saveFile(f.html, f.filename);
    recordDownload({
      ...dent,
      version: versions.find((v) => v.id === revision)?.version || dent.version,
    });
    setDownloaded(true);
  };
  return (
    <div className="content-wrap detail-page">
      <Link to="/search" className="back-link">
        <ArrowLeft size={17} />
        Back to dents
      </Link>
      <div className="detail-layout">
        <div className="detail-visual">
          <PhoneArt dent={dent} large />
          <button
            className="button preview-button"
            onClick={() =>
              void dentFile(dent)
                .then((f) => setPreview(f.html))
                .catch((e) => toast(errorMessage(e)))
            }
          >
            <Play size={17} />
            Try it out
          </button>
        </div>
        <div className="detail-copy">
          <div className="row between">
            <span className="pill green">Free. Always.</span>
            <div className="row">
              <SaveButton dent={dent} />
              <button
                className="icon-button"
                aria-label="Share dent"
                onClick={async () => {
                  try {
                    if (navigator.share)
                      await navigator.share({
                        title: dent.title,
                        url: location.href,
                      });
                    else {
                      await navigator.clipboard.writeText(location.href);
                      toast("Link copied. Share a little joy.");
                    }
                  } catch (e) {
                    if ((e as Error).name !== "AbortError")
                      toast(errorMessage(e));
                  }
                }}
              >
                <Share2 size={19} />
              </button>
            </div>
          </div>
          <h1>{dent.title}</h1>
          <Link to={`/creator/${dent.ownerId}`} className="detail-creator">
            <span className="avatar" style={{ background: dent.accent }}>
              {dent.ownerName[0]}
            </span>
            <span>
              Made by <strong>{dent.ownerName}</strong>
              <small>@{dent.ownerHandle}</small>
            </span>
            <ArrowLeft className="rotate" size={17} />
          </Link>
          <div className="chips">
            <span>{categoryLabels[dent.category]}</span>
            <span>{dent.style}</span>
            <span>v{dent.version}</span>
          </div>
          <p className="detail-description">
            {dent.description.split("\n")[0]}
          </p>
          <div className="feature-facts">
            <span>
              <Smartphone size={18} />
              Booplio {dent.minimumVersion}+
            </span>
            <span>
              <Check size={18} />
              {dent.edge === "any" ? "Every screen edge" : `${dent.edge} edge`}
            </span>
            {dent.reducedMotion && (
              <span>
                <Check size={18} />
                Reduced motion
              </span>
            )}
            {dent.customColors && (
              <span>
                <Palette size={18} />
                Custom colors
              </span>
            )}
          </div>
          <OpenInBooplio dent={dent} fallback={handoff ? { ...handoff, kind: dent.category, name: dent.title } : undefined} />
          <p className="fine-print center">Booplio 2.7.0+ · Review and confirm in the app</p>
          {handoff && <div className="notice"><div><strong>A little dent, ready for your phone.</strong><p>Tap Open in Booplio to continue. If the app doesn’t open, download the HTML file below and import it in Custom dent designs. Creator designs contain custom code. Only import designs you trust.</p></div></div>}
          <BusyButton action={() => download()} className="button secondary full">
            <Download size={18} />
            {handoff ? "Download HTML" : "Download free"}
          </BusyButton>
          <p className="fine-print center">
            HTML dent file {dent.bytes ? `· ${bytesLabel(dent.bytes)}` : ""} ·
            No account needed
          </p>
          {downloaded && (
            <div className="notice success">
              <Check size={18} />
              <div>
                <strong>Your dent is ready.</strong>
                <p>
                  Open Booplio → Settings → Custom dent designs → choose{" "}
                  {categoryLabels[dent.category]} → Import your downloaded HTML
                  file.
                </p>
              </div>
            </div>
          )}
          <p className="import-note">
            You can also import the downloaded file in Custom dent designs.{" "}
            <Link to="/guide">
              Show me how <ArrowLeft className="rotate" size={13} />
            </Link>
          </p>
        </div>
      </div>
      <div className="detail-bottom">
        <div>
          <div className="tabs">
            <button
              className={tab === "about" ? "active" : ""}
              onClick={() => setTab("about")}
            >
              About this dent
            </button>
            <button
              className={tab === "versions" ? "active" : ""}
              onClick={() => void loadVersions()}
            >
              Version history
            </button>
          </div>
          {tab === "about" ? (
            <div className="prose">
              <p className="pre-line">{dent.description}</p>
              <h3>Make it your own</h3>
              <p>
                Import this design for{" "}
                {categoryLabels[dent.category].toLowerCase()} in Booplio. Keep
                native gestures and placement, with a whole new look inside your
                dent.
              </p>
              <h3>License & credit</h3>
              <p>
                {licenseLabels[dent.license]}.{" "}
                <a
                  href={`https://creativecommons.org/${dent.license === "CC0-1.0" ? "publicdomain/zero/1.0" : dent.license === "CC-BY-4.0" ? "licenses/by/4.0" : "licenses/by-sa/4.0"}/`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Read the license <ExternalLink size={13} />
                </a>
              </p>
            </div>
          ) : (
            <div className="version-list">
              {dent.builtin ? (
                <div className="version-row">
                  <strong>v{dent.version}</strong>
                  <p>First release. A little something to get you started.</p>
                  <BusyButton
                    action={() => download()}
                    className="button secondary small"
                  >
                    Download
                  </BusyButton>
                </div>
              ) : (
                versions.map((v) => (
                  <div className="version-row" key={v.id}>
                    <strong>v{v.version}</strong>
                    <span>{dateLabel(v.createdAt)}</span>
                    <p>{v.releaseNotes || "A fresh little update."}</p>
                    <BusyButton
                      action={() => download(v.id)}
                      className="button secondary small"
                    >
                      <Download size={15} />
                      Download
                    </BusyButton>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
        <aside className="detail-aside">
          <h3>The little details</h3>
          <dl>
            <div>
              <dt>Category</dt>
              <dd>{categoryLabels[dent.category]}</dd>
            </div>
            <div>
              <dt>Version</dt>
              <dd>{dent.version}</dd>
            </div>
            <div>
              <dt>Added</dt>
              <dd>
                {dent.builtin ? "Booplio starter" : dateLabel(dent.createdAt)}
              </dd>
            </div>
            <div>
              <dt>Downloads</dt>
              <dd>
                {dent.builtin
                  ? "Ready to try"
                  : (dent.downloads || 0).toLocaleString()}
              </dd>
            </div>
          </dl>
          {!dent.builtin && (
            <button
              className="text-link muted"
              onClick={() =>
                user ? setReport(true) : location.assign("#/account")
              }
            >
              <Flag size={15} />
              Report this dent
            </button>
          )}
          <p className="fine-print">
            Community designs contain creator-written code. Preview and import
            designs you trust.
          </p>
        </aside>
      </div>
      <section className="similar">
        <div className="section-heading">
          <h2>A little more to love.</h2>
          <Link to={`/search?category=${dent.category}`}>
            Explore more <ArrowLeft className="rotate" size={15} />
          </Link>
        </div>
        <div className="dent-grid">
          {dents
            .filter((d) => d.id !== dent.id)
            .slice(0, 4)
            .map((d) => (
              <DentCard key={d.id} dent={d} />
            ))}
        </div>
      </section>
      {preview !== null && (
        <Modal title={`Try ${dent.title}`} onClose={() => setPreview(null)}>
          <LivePreview dent={dent} html={preview} />
        </Modal>
      )}
      {report && (
        <Modal title="Something off?" onClose={() => setReport(false)}>
          <p>Tell us what needs a look. Your report stays private.</p>
          <div className="form-stack">
            <label>
              Reason
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              >
                {[
                  "Broken or misleading",
                  "Copied work",
                  "Inappropriate content",
                  "Unsafe behavior",
                  "Other",
                ].map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </label>
            <label>
              Details (optional)
              <textarea
                maxLength={2000}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
              />
            </label>
            <BusyButton
              action={async () => {
                await call("reportDent", { dentId: dent.id, reason, details });
                setReport(false);
                toast(
                  "Report submitted. Thanks for looking out for the community.",
                );
              }}
            >
              Send report
            </BusyButton>
          </div>
        </Modal>
      )}
    </div>
  );
}
