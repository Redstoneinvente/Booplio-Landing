import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { ShieldCheck, Eye, Check, X, Flag } from "lucide-react";
import { db, call, errorMessage } from "../firebase";
import { useStore } from "../store";
import { type Dent } from "../types";
import {
  PageHeading,
  Empty,
  BusyButton,
  Modal,
  PhoneArt,
} from "../components/UI";
import { LivePreview } from "../components/Preview";
import { dentFile } from "../files";
type Report = { id: string; dentId: string; reason: string; details: string };
export function Moderation() {
  const { admin, authLoading, toast } = useStore();
  const [items, setItems] = useState<Dent[]>([]),
    [reports, setReports] = useState<Report[]>([]),
    [notes, setNotes] = useState<Record<string, string>>({}),
    [preview, setPreview] = useState<{ dent: Dent; html: string } | null>(null),
    [err, setErr] = useState("");
  useEffect(() => {
    if (!db || !admin) return;
    const off = onSnapshot(
      query(collection(db, "drafts"), where("status", "==", "pending")),
      (s) => setItems(s.docs.map((d) => ({ id: d.id, ...d.data() }) as Dent)),
      (e) => setErr(errorMessage(e)),
    );
    const off2 = onSnapshot(
      query(collection(db, "reports"), where("status", "==", "open")),
      (s) =>
        setReports(s.docs.map((d) => ({ id: d.id, ...d.data() }) as Report)),
      (e) => setErr(errorMessage(e)),
    );
    return () => {
      off();
      off2();
    };
  }, [admin]);
  if (authLoading) return <div className="content-wrap">Loading…</div>;
  if (!admin)
    return (
      <div className="content-wrap">
        <Empty title="This corner is for moderators.">
          Sign in with a moderator account to review submissions.
        </Empty>
      </div>
    );
  return (
    <div className="content-wrap narrow-wide">
      <PageHeading
        eyebrow="KEEPING OUR LITTLE CORNER LOVELY"
        title="Community review."
        description="Review creator files, check their behavior and give helpful feedback."
      />
      {err && <div className="notice error">{err}</div>}
      <h2 className="section-heading">
        <ShieldCheck />
        Submissions ({items.length})
      </h2>
      {!items.length && (
        <Empty title="All caught up.">
          No little creations waiting for a look.
        </Empty>
      )}
      <div className="moderation-list">
        {items.map((d) => (
          <article className="settings-card" key={d.id}>
            <div className="moderation-summary">
              <PhoneArt dent={d} />
              <div>
                <h2>{d.title}</h2>
                <Link to={`/creator/${d.ownerId}`}>@{d.ownerHandle}</Link>
                <p>{d.description}</p>
                <div className="chips">
                  <span>{d.category}</span>
                  <span>v{d.version}</span>
                  <span>{d.license}</span>
                </div>
                <p className="fine-print">Revision: {d.revision}</p>
              </div>
            </div>
            <div className="form-stack">
              <BusyButton
                className="button secondary"
                action={async () => {
                  const f = await dentFile(d, false, "draft");
                  setPreview({ dent: d, html: f.html });
                }}
              >
                <Eye size={17} />
                Run isolated preview
              </BusyButton>
              <p className="fine-print">
                Review the file’s behavior, attribution, event response and edge
                layouts. A working preview does not prove the code is safe.
              </p>
              <label>
                Review note
                <textarea
                  maxLength={1000}
                  placeholder="Helpful feedback for the creator…"
                  value={notes[d.id] || ""}
                  onChange={(e) =>
                    setNotes((n) => ({ ...n, [d.id]: e.target.value }))
                  }
                />
              </label>
              <div className="row">
                <BusyButton
                  action={async () => {
                    await call("moderateDent", {
                      id: d.id,
                      action: "approve",
                      note: notes[d.id] || "",
                      revision: d.revision,
                    });
                    toast("Approved. A lovely new dent is live.");
                  }}
                >
                  <Check size={18} />
                  Approve & publish
                </BusyButton>
                <BusyButton
                  className="button secondary"
                  disabled={!notes[d.id]?.trim()}
                  action={async () => {
                    await call("moderateDent", {
                      id: d.id,
                      action: "reject",
                      note: notes[d.id],
                      revision: d.revision,
                    });
                    toast("Feedback sent to the creator’s studio.");
                  }}
                >
                  <X size={17} />
                  Request changes
                </BusyButton>
              </div>
            </div>
          </article>
        ))}
      </div>
      <h2 className="section-heading">
        <Flag />
        Reports ({reports.length})
      </h2>
      {reports.map((r) => (
        <article className="settings-card form-stack" key={r.id}>
          <h3>{r.reason}</h3>
          <Link to={`/dent/${r.dentId}`}>View reported dent</Link>
          <p className="pre-line">
            {r.details || "No additional details provided."}
          </p>
          <div className="row">
            <BusyButton
              className="button secondary"
              action={async () => {
                await call("resolveReport", { id: r.id, hideDent: false });
                toast("Report resolved.");
              }}
            >
              Dismiss report
            </BusyButton>
            <BusyButton
              className="button danger-button"
              action={async () => {
                await call("resolveReport", { id: r.id, hideDent: true });
                toast("Dent hidden and report resolved.");
              }}
            >
              Hide dent & resolve
            </BusyButton>
          </div>
        </article>
      ))}
      {preview && (
        <Modal
          title={`Review ${preview.dent.title}`}
          onClose={() => setPreview(null)}
        >
          <LivePreview dent={preview.dent} html={preview.html} />
          <details>
            <summary>Read the source</summary>
            <pre className="source-view">{preview.html}</pre>
          </details>
        </Modal>
      )}
    </div>
  );
}
