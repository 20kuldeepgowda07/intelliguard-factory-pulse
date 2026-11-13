import { ClientOnly } from "@tanstack/react-router";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useDemo } from "@/lib/demo-store";
import { cn } from "@/lib/utils";
import type { ScenePreset, SceneNode } from "./FactoryScene";

const FactoryScene = lazy(() => import("./FactoryScene"));

function Fallback() {
  return <div className="absolute inset-0 bg-scene blueprint" aria-hidden />;
}

/** Full-bleed 3D factory floor; client-only, paused while scrolled out of view. */
export function FactoryBackdrop({
  preset = "overview",
  focusId,
  labels = true,
}: {
  preset?: ScenePreset;
  focusId?: string | undefined;
  labels?: boolean;
}) {
  const { machines, formatTemp, tempUnit } = useDemo();
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => setActive(entries[0]?.isIntersecting ?? true), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const statusKey = machines.map((m) => m.id + m.status).join("|");
  const readingKey = machines.map((m) => `${m.vib}${m.temp}`).join("|");
  const labelRefs = useRef<Record<string, HTMLElement | null>>({});
  const nodes = useMemo<SceneNode[]>(
    () =>
      machines.map((m) => ({
        id: m.id,
        kind: m.kind,
        status: m.status,
        nodeId: m.nodeId,
        reading:
          m.status === "offline"
            ? "NO PACKET"
            : m.temp > m.tempThreshold
              ? `${formatTemp(m.temp)} ${tempUnit} ▲`
              : `${m.vib.toFixed(2)} mm/s${m.vib > m.vibThreshold ? " ▲" : ""}`,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [statusKey, readingKey, tempUnit],
  );

  return (
    <div ref={ref} className="absolute inset-0" aria-hidden>
      <Fallback />
      <ClientOnly fallback={null}>
        <Suspense fallback={null}>
          <div className="absolute inset-0 animate-in fade-in duration-1000">
            <FactoryScene nodes={nodes} preset={preset} focusId={focusId} labels={labels} active={active} labelRefs={labelRefs} />
          </div>
          {labels && (
            <div className="pointer-events-none absolute inset-0 z-[2] overflow-hidden">
              {nodes.map((n) => (
                <div
                  key={n.id}
                  ref={(el) => {
                    labelRefs.current[n.id] = el;
                  }}
                  className="absolute left-0 top-0 opacity-0 transition-opacity duration-300 will-change-transform"
                >
                  <div
                    className={cn(
                      "flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 font-mono text-[11px] font-medium shadow-sm backdrop-blur-md",
                      n.id === focusId ? "border-ink bg-ink text-ink-foreground" : "border-line bg-glass text-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "size-1.5 rounded-full",
                        n.status === "warning" ? "animate-blink bg-hazard" : n.status === "offline" ? "bg-offline" : "bg-signal",
                      )}
                    />
                    {n.nodeId}
                    <span className="opacity-40">·</span>
                    <span className={n.status === "warning" ? "text-hazard" : ""}>{n.reading}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Suspense>
      </ClientOnly>
    </div>
  );
}
