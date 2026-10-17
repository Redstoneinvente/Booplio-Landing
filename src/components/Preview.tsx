import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { previewDocument, dentUpdate } from "../preview";
import type { Dent } from "../types";
import { useStore } from "../store";
export function LivePreview({ dent, html }: { dent: Dent; html: string }) {
  const { reduced } = useStore();
  const iframe = useRef<HTMLIFrameElement>(null);
  const [level, setLevel] = useState(64),
    [edge, setEdge] = useState("right"),
    [depth, setDepth] = useState(76),
    [connected, setConnected] = useState(true),
    [accent, setAccent] = useState(dent.accent),
    [running, setRunning] = useState(true),
    [key, setKey] = useState(0),
    [ready, setReady] = useState(false);
  const update = () =>
    iframe.current?.contentWindow?.postMessage(
      dentUpdate(dent.category, level, edge, connected, accent),
      "*",
    );
  useEffect(() => {
    if (ready && running) update();
  }, [level, edge, connected, accent, ready, running]);
  useEffect(() => {
    if (!running || !ready) return;
    const timer = setInterval(update, 100);
    return () => clearInterval(timer);
  }, [running, ready, level, edge, connected, accent]);
  return (
    <div className="preview-workspace">
      <div className={`preview-phone wallpaper-${dent.wallpaper}`}>
        <div className="preview-clock">
          09:41<small>A little more you.</small>
        </div>
        {running && (
          <div
            className={`preview-dent edge-${edge}`}
            style={{ "--depth": `${depth}px` } as React.CSSProperties}
          >
            <iframe
              key={key}
              ref={iframe}
              sandbox="allow-scripts"
              referrerPolicy="no-referrer"
              title={`${dent.title} isolated preview`}
              srcDoc={previewDocument(html, reduced)}
              onLoad={() => setReady(true)}
            />
          </div>
        )}
        <div className="preview-home-bar" />
      </div>
      <div className="preview-controls">
        <div className="row between">
          <h3>Make it yours</h3>
          <span className="pill">Preview</span>
        </div>
        <label>
          {dent.category === "camera" ? "Zoom level" : "Level"}{" "}
          <strong>{level}%</strong>
          <input
            type="range"
            min="0"
            max="100"
            value={level}
            onChange={(e) => setLevel(+e.target.value)}
          />
        </label>
        <label>
          Edge
          <select value={edge} onChange={(e) => setEdge(e.target.value)}>
            {["right", "left", "top", "bottom"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          Depth <strong>{depth}px</strong>
          <input
            type="range"
            min="28"
            max="120"
            value={depth}
            onChange={(e) => setDepth(+e.target.value)}
          />
        </label>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={connected}
            onChange={(e) => setConnected(e.target.checked)}
          />
          Connected
        </label>
        {dent.customColors && (
          <label>
            Accent color
            <input
              type="color"
              value={accent}
              onChange={(e) => setAccent(e.target.value)}
            />
          </label>
        )}
        <div className="row">
          <button
            className="button secondary small"
            onClick={() => setRunning((x) => !x)}
          >
            {running ? <Pause size={16} /> : <Play size={16} />}{" "}
            {running ? "Stop preview" : "Run preview"}
          </button>
          <button
            className="icon-button"
            onClick={() => {
              setReady(false);
              setKey((k) => k + 1);
              setRunning(true);
            }}
            aria-label="Reload preview"
          >
            <RotateCcw size={18} />
          </button>
        </div>
        <p className="fine-print">
          Sample values only. Actual animation, clipping and gestures depend on
          your phone. Stop the preview at any time.
        </p>
      </div>
    </div>
  );
}
