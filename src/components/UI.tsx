import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  Zap,
  Volume2,
  Sun,
  Camera,
  Headphones,
  ArrowUpRight,
  Bookmark,
  Download,
  X,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import type { Category, Dent } from "../types";
import { useStore } from "../store";
import { errorMessage } from "../firebase";
export const CategoryIcon = ({
  kind,
  size = 20,
}: {
  kind: Category;
  size?: number;
}) => {
  const Icon = {
    charging: Zap,
    volume: Volume2,
    brightness: Sun,
    camera: Camera,
    headphones: Headphones,
  }[kind];
  return <Icon size={size} />;
};
export function Empty({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Sparkles size={30} />
      </span>
      <h2>{title}</h2>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function ButtonLink({
  to,
  children,
  secondary = false,
}: {
  to: string;
  children: ReactNode;
  secondary?: boolean;
}) {
  return (
    <Link className={`button ${secondary ? "secondary" : ""}`} to={to}>
      {children}
      <ArrowRight size={17} />
    </Link>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function PhoneArt({
  dent,
  large = false,
}: {
  dent: Dent;
  large?: boolean;
}) {
  return (
    <div
      className={`phone-art wallpaper-${dent.wallpaper} ${large ? "large" : ""}`}
      style={{ "--accent": dent.accent } as React.CSSProperties}
    >
      <div className="art-sun" />
      <div className="mountain back" />
      <div className="mountain front" />
      <div className="art-grain" />
      <div className="phone-edge" />
      <div className={`dent-visual ${dent.style} ${dent.category}`}>
        <div className="dent-core">
          <span className="dent-bubble b1" />
          <span className="dent-bubble b2" />
          <span className="dent-bubble b3" />
          <span className="dent-fill" />
          {dent.category === "volume" || dent.category === "headphones" ? (
            <div className="equalizer">
              {[0, 1, 2, 3, 4].map((i) => (
                <i key={i} />
              ))}
            </div>
          ) : dent.category === "camera" ? (
            <div className="focus-rings">
              <i />
              <i />
              <span>2×</span>
            </div>
          ) : dent.category === "brightness" ? (
            <Sun size={28} />
          ) : null}
        </div>
      </div>
      <span className="art-label">
        {dent.category === "charging"
          ? "a little energy."
          : dent.category === "volume"
            ? "find your rhythm."
            : dent.category === "brightness"
              ? "hello, sunshine."
              : dent.category === "camera"
                ? "a closer look."
                : "good things sound better."}
      </span>
    </div>
  );
}
export function SaveButton({ dent }: { dent: Dent }) {
  const { saved, toggleSave, toast, user } = useStore();
  const active = saved.some((s) => s.id === dent.id);
  return (
    <button
      className={`icon-button save-button ${active ? "active" : ""}`}
      aria-label={active ? "Remove from saved" : "Save dent"}
      onClick={() => {
        if (!user) {
          location.hash = "/account";
          return;
        }
        void toggleSave(dent).catch((e) => toast(errorMessage(e)));
      }}
    >
      <Bookmark size={20} fill={active ? "currentColor" : "none"} />
    </button>
  );
}
export function DentCard({ dent }: { dent: Dent }) {
  return (
    <article className="dent-card">
      <Link
        className="card-art"
        to={`/dent/${dent.id}`}
        aria-label={`View ${dent.title}`}
      >
        <PhoneArt dent={dent} />
        {!dent.builtin && (
          <span className="cover-caption">Cover illustration</span>
        )}
        <span className="free-pill">
          Free
          <ArrowUpRight size={12} />
        </span>
      </Link>
      <div className="card-info">
        <div>
          <Link to={`/dent/${dent.id}`} className="card-title">
            {dent.title}
          </Link>
          <Link className="creator-link" to={`/creator/${dent.ownerId}`}>
            <span className="tiny-avatar" style={{ background: dent.accent }}>
              {dent.ownerName[0]}
            </span>
            {dent.ownerName}
            {dent.builtin && (
              <span className="official-dot" title="Booplio starter">
                ✳
              </span>
            )}
          </Link>
        </div>
        <SaveButton dent={dent} />
      </div>
      <div className="card-meta">
        <span>
          {dent.builtin ? (
            "Starter dent"
          ) : (
            <>
              <Download size={13} />
              {Intl.NumberFormat(undefined, { notation: "compact" }).format(
                dent.downloads || 0,
              )}
            </>
          )}
        </span>
        <span>
          {dent.style} <span className="dot">·</span>{" "}
          {dent.category === "headphones" ? "audio" : dent.category}
        </span>
      </div>
    </article>
  );
}
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-top">
        <h2>{title}</h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function BusyButton({
  children,
  action,
  className = "button",
  disabled = false,
}: {
  children: ReactNode;
  action: () => Promise<unknown>;
  className?: string;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const { toast } = useStore();
  return (
    <button
      className={className}
      disabled={busy || disabled}
      onClick={async () => {
        setBusy(true);
        try {
          await action();
        } catch (e) {
          toast(errorMessage(e));
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? (
        <>
          <span className="spinner" /> Working…
        </>
      ) : (
        children
      )}
    </button>
  );
}
