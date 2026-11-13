import { useMemo, useRef, useState } from "react";
import type { Sample } from "@/lib/telemetry";
import { cn } from "@/lib/utils";

type Key = "vib" | "temp";

function segments(points: { x: number; y: number | null }[]) {
  const out: string[] = [];
  let cur: string[] = [];
  for (const p of points) {
    if (p.y === null) {
      if (cur.length) out.push(cur.join(" "));
      cur = [];
    } else cur.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
  }
  if (cur.length) out.push(cur.join(" "));
  return out;
}

export function Sparkline({
  series,
  k,
  threshold,
  tone = "signal",
  className,
}: {
  series: Sample[];
  k: Key;
  threshold: number;
  tone?: "signal" | "hazard" | "offline";
  className?: string;
}) {
  const W = 120;
  const H = 32;
  const vals = series.map((s) => s[k]).filter((v): v is number => v !== null);
  const min = Math.min(...vals, threshold) * 0.92;
  const max = Math.max(...vals, threshold) * 1.04;
  const y = (v: number) => H - ((v - min) / (max - min || 1)) * H;
  const segs = segments(series.map((s, i) => ({ x: (i / (series.length - 1)) * W, y: s[k] === null ? null : y(s[k]!) })));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={cn("h-8 w-28 overflow-visible", className)} preserveAspectRatio="none" aria-hidden>
      <line x1={0} x2={W} y1={y(threshold)} y2={y(threshold)} className="stroke-hazard" strokeWidth={1} strokeDasharray="3 3" opacity={0.6} />
      {segs.map((p, i) => (
        <polyline
          key={i}
          points={p}
          fill="none"
          strokeWidth={1.5}
          strokeLinejoin="round"
          className={tone === "hazard" ? "stroke-hazard" : tone === "offline" ? "stroke-offline" : "stroke-signal"}
        />
      ))}
    </svg>
  );
}

export interface ChartSeries {
  label: string;
  data: Sample[];
  tone: "signal" | "ink";
}

export function TelemetryChart({
  series,
  k,
  threshold,
  unit,
  format = (v) => v.toFixed(2),
  height = 280,
}: {
  series: ChartSeries[];
  k: Key;
  threshold: number;
  unit: string;
  format?: (v: number) => string;
  height?: number;
}) {
  const W = 900;
  const H = height;
  const pad = { l: 44, r: 16, t: 16, b: 28 };
  const ref = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const base = series[0]?.data ?? [];
  const { min, max } = useMemo(() => {
    const vals = series.flatMap((s) => s.data.map((d) => d[k])).filter((v): v is number => v !== null);
    const lo = Math.min(...vals, threshold);
    const hi = Math.max(...vals, threshold);
    const span = hi - lo || 1;
    return { min: lo - span * 0.15, max: hi + span * 0.15 };
  }, [series, k, threshold]);

  const x = (i: number) => pad.l + (i / Math.max(1, base.length - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - (v - min) / (max - min)) * (H - pad.t - pad.b);
  const ticks = Array.from({ length: 4 }, (_, i) => min + ((max - min) * (i + 0.5)) / 4);

  const gapStart = base.findIndex((d) => d[k] === null);
  const hoverSample = hover !== null ? base[hover] : null;

  function onMove(e: React.PointerEvent) {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (base.length - 1));
    setHover(Math.max(0, Math.min(base.length - 1, i)));
  }

  const timeFmt = (t: number) =>
    new Date(t).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="relative">
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full touch-none select-none"
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
        role="img"
        aria-label={`Telemetry chart in ${unit}`}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="stroke-line" strokeWidth={1} />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" className="fill-muted-foreground font-mono text-[10px]">
              {format(t)}
            </text>
          </g>
        ))}
        {gapStart >= 0 && (
          <g>
            <rect
              x={x(gapStart)}
              y={pad.t}
              width={W - pad.r - x(gapStart)}
              height={H - pad.t - pad.b}
              className="fill-surface"
            />
            <text x={x(gapStart) + 10} y={pad.t + 18} className="fill-muted-foreground font-mono text-[10px] uppercase">
              No packets · telemetry gap
            </text>
          </g>
        )}
        <line
          x1={pad.l}
          x2={W - pad.r}
          y1={y(threshold)}
          y2={y(threshold)}
          className="stroke-hazard"
          strokeWidth={1.5}
          strokeDasharray="6 5"
        />
        <text x={W - pad.r} y={y(threshold) - 6} textAnchor="end" className="fill-hazard font-mono text-[10px] font-medium">
          INSPECT ABOVE {format(threshold)} {unit}
        </text>
        {series.map((s, si) =>
          segments(s.data.map((d, i) => ({ x: x(i), y: d[k] === null ? null : y(d[k]!) }))).map((p, i) => (
            <polyline
              key={`${si}-${i}`}
              points={p}
              fill="none"
              strokeWidth={si === 0 ? 2 : 1.5}
              strokeLinejoin="round"
              strokeDasharray={si === 0 ? undefined : "4 3"}
              className={s.tone === "signal" ? "stroke-signal" : "stroke-foreground"}
              opacity={si === 0 ? 1 : 0.55}
            />
          )),
        )}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => {
          const i = Math.round(f * (base.length - 1));
          return base[i] ? (
            <text
              key={f}
              x={x(i)}
              y={H - 8}
              textAnchor={f === 0 ? "start" : f === 1 ? "end" : "middle"}
              className="fill-muted-foreground font-mono text-[10px]"
            >
              {f === 1 ? "now" : timeFmt(base[i].t)}
            </text>
          ) : null;
        })}
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} className="stroke-foreground" strokeWidth={1} opacity={0.3} />
            {series.map((s, si) => {
              const v = s.data[hover]?.[k];
              return v != null ? (
                <circle
                  key={si}
                  cx={x(hover)}
                  cy={y(v)}
                  r={4}
                  className={s.tone === "signal" ? "fill-signal stroke-background" : "fill-foreground stroke-background"}
                  strokeWidth={2}
                />
              ) : null;
            })}
          </g>
        )}
      </svg>
      {hoverSample && hover !== null && (
        <div
          className="pointer-events-none absolute top-2 z-10 min-w-40 -translate-x-1/2 rounded-control bg-ink px-3 py-2 font-mono text-[11px] text-ink-foreground shadow-lift"
          style={{ left: `${(x(hover) / W) * 100}%` }}
        >
          <div className="text-ink-muted">{timeFmt(hoverSample.t)}</div>
          {series.map((s) => {
            const v = s.data[hover]?.[k];
            return (
              <div key={s.label} className="mt-1 flex justify-between gap-4">
                <span className="text-ink-muted">{s.label}</span>
                <span className={v != null && v > threshold ? "text-hazard" : ""}>
                  {v == null ? "no packet" : `${format(v)} ${unit}`}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
