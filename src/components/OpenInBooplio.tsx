import { useRef } from "react";
import { Smartphone } from "lucide-react";
import { openTemplateUrl, fallbackAppUrl, type TemplateLink } from "../handoff";
import type { Dent } from "../types";
export function OpenInBooplio({ dent, fallback }: { dent: Dent; fallback?: TemplateLink }) {
  const badge = useRef<HTMLSpanElement>(null);
  const lift = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !badge.current) return;
    badge.current.getAnimations().forEach(a => a.cancel());
    badge.current.animate([
      { opacity: 1, transform: "translate(-50%, 0) scale(1)" },
      { opacity: 1, transform: "translate(-50%, -32px) scale(1.06)", offset: 0.18 },
      { opacity: 0, transform: `translate(-50%, -${window.innerHeight}px) scale(.16)` },
    ], { duration: 540, easing: "cubic-bezier(.22,.8,.3,1)" });
  };
  return <div className="handoff-launch">
    <span ref={badge} className="handoff-badge" aria-hidden="true"><Smartphone size={20} />{dent.title}</span>
    <a className="button lime full" href={fallback ? fallbackAppUrl(fallback, /Android/i.test(navigator.userAgent) && /Chrome\//.test(navigator.userAgent)) : openTemplateUrl(dent)} onPointerDown={e => { if (e.button === 0) lift(); }} onKeyDown={e => { if (e.key === "Enter") lift(); }}>
      <Smartphone size={18} />Open in Booplio
    </a>
  </div>;
}
