import { useEffect, useState } from "react";
import { Logo } from "./Logo";

const FILL_MS = 1300;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Full-screen intro: "calibrating" counter 000 → 100, then slides up. */
export function PageLoader({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    document.documentElement.style.overflow = "hidden";
    let raf = 0;
    const start = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / FILL_MS);
      setProgress(Math.round(ease(p) * 100));
      if (p < 1) raf = requestAnimationFrame(step);
      else setLeaving(true);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!leaving) return;
    const id = window.setTimeout(() => {
      document.documentElement.style.overflow = "";
      setGone(true);
      onDone();
    }, 750);
    return () => window.clearTimeout(id);
  }, [leaving, onDone]);

  if (gone) return null;
  const steps = ["Gateway HUB-01", "ESP-NOW 2.4 GHz", "5 transducer nodes", "Baseline envelopes"];
  return (
    <div
      className="fixed inset-0 z-[120] flex flex-col items-center justify-center gap-8 rounded-b-card bg-ink text-ink-foreground transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)]"
      style={{ transform: leaving ? "translateY(-100%)" : "translateY(0%)" }}
      aria-label="Loading IntelliGuard"
      role="status"
    >
      <div
        className="flex flex-col items-center gap-5 text-center transition-all duration-500"
        style={{ opacity: leaving ? 0 : 1, transform: leaving ? "translateY(-12px)" : "none" }}
      >
        <div className="flex items-center gap-3 text-2xl font-semibold tracking-tight sm:text-3xl">
          <Logo className="size-8 text-hazard" />
          IntelliGuard
        </div>
        <p className="max-w-[28ch] text-sm text-ink-muted">Calibrating sensor nodes across the workshop floor.</p>
      </div>
      <div className="flex w-[min(22rem,72vw)] flex-col gap-3">
        <div className="h-px w-full bg-ink-line">
          <div className="h-full bg-hazard transition-[width] duration-100 ease-out" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex justify-between font-mono text-xs font-medium uppercase tracking-wider text-ink-muted">
          <span>{steps[Math.min(3, Math.floor(progress / 26))]}</span>
          <span className="num text-ink-foreground">{String(progress).padStart(3, "0")}</span>
        </div>
      </div>
    </div>
  );
}
