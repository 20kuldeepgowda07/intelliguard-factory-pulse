import { createFileRoute } from "@tanstack/react-router";
import { Printer } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHero } from "@/components/ig/PageHero";
import { Reveal } from "@/components/ig/Reveal";
import { Segmented } from "@/components/ig/Segmented";
import { TelemetryChart } from "@/components/ig/Charts";
import { useDemo } from "@/lib/demo-store";
import { generateSeries, summarize } from "@/lib/telemetry";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Shift Reports & Trends — IntelliGuard" },
      { name: "description", content: "Compare machine trends and print a workshop shift handover report with measured and calculated values." },
      { property: "og:title", content: "Shift Reports & Trends — IntelliGuard" },
      { property: "og:description", content: "Multi-asset trend comparison and printable shift handover sheets." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Reports,
});

const PERIODS = { "8H": { h: 8, l: "Current shift (8h)" }, "24H": { h: 24, l: "Last 24 hours" }, "7D": { h: 168, l: "Last 7 days" } } as const;
type Period = keyof typeof PERIODS;

function Reports() {
  const { machines, now, formatTemp, tempUnit } = useDemo();
  const [period, setPeriod] = useState<Period>("24H");
  const [primary, setPrimary] = useState("M-101");
  const [compare, setCompare] = useState("M-103");
  const hours = PERIODS[period].h;

  const data = useMemo(
    () =>
      machines.map((m) => {
        const s = generateSeries(m, hours, now, { vib: m.vib, temp: m.temp }, 144, m.effectiveStale);
        return { m, s, sum: summarize(s, m) };
      }),
    [machines, hours, now],
  );
  const p = data.find((d) => d.m.id === primary)!;
  const c = data.find((d) => d.m.id === compare)!;
  const f2 = (v: number | null) => (v === null ? "—" : v.toFixed(2));
  const ft = (v: number | null) => (v === null ? "—" : formatTemp(v));
  const stamp = new Date(now).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });

  return (
    <>
      <PageHero
        preset="reports"
        kicker="Analytical export // comparative audit"
        title={["Shift reports", "& trends."]}
        description="Raw measured samples kept separate from calculated summaries — so a sustained rise is never confused with a single spike."
        actions={
          <Button variant="ink" size="pill" onClick={() => window.print()}>
            <Printer /> Print shift report
          </Button>
        }
      />

      <div className="print-only px-2 pb-4">
        <div className="text-xl font-bold">INTELLIGUARD · WORKSHOP SHIFT TELEMETRY REPORT</div>
        <div className="mt-1 text-xs">PROTOTYPE DEMO EXPORT · ALL READINGS ARE SIMULATED · NOT A CERTIFIED TEST DOCUMENT</div>
        <div className="mt-3 grid grid-cols-4 gap-2 text-xs">
          <div>Generated: {stamp}</div>
          <div>Window: {PERIODS[period].l}</div>
          <div>Assets: {primary} vs {compare}</div>
          <div>Status: Simulated testbed</div>
        </div>
      </div>

      <div className="shell flex flex-col gap-10 py-12">
        <div className="no-print flex flex-wrap items-center gap-3">
          <Segmented value={period} onChange={(v) => setPeriod(v as Period)} options={(Object.keys(PERIODS) as Period[]).map((k) => ({ v: k, l: PERIODS[k].l }))} />
          <AssetSelect label="Primary" value={primary} onChange={setPrimary} />
          <AssetSelect label="Compare" value={compare} onChange={setCompare} />
        </div>

        <Reveal>
          <div className="print-flat tick-corners rounded-card border border-line p-5 sm:p-8">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <span className="eyebrow">Vibration RMS · {PERIODS[period].l}</span>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                  {p.m.name} <span className="text-muted-foreground">vs</span> {c.m.name}
                </h2>
              </div>
              <div className="flex gap-4 font-mono text-[11px] uppercase tracking-wider">
                <span className="flex items-center gap-2"><span className="h-0.5 w-5 bg-signal" /> {p.m.id}</span>
                <span className="flex items-center gap-2"><span className="h-0.5 w-5 bg-foreground/50" /> {c.m.id}</span>
                <span className="flex items-center gap-2 text-hazard"><span className="h-0.5 w-5 bg-hazard" /> Threshold</span>
              </div>
            </div>
            <TelemetryChart
              series={[
                { label: p.m.id, data: p.s, tone: "signal" },
                { label: c.m.id, data: c.s, tone: "ink" },
              ]}
              k="vib"
              threshold={p.m.vibThreshold}
              unit="mm/s"
            />
          </div>
        </Reveal>

        <Reveal>
          <ReportTable
            n="01"
            title="Measured sample values"
            sub="Direct transducer readings — no smoothing or interpolation."
            head={["Equipment", "Min RMS", "Peak RMS", `Min temp ${tempUnit}`, `Peak temp ${tempUnit}`, "Latest RMS"]}
            rows={data.map(({ m, sum }) => [
              m.name,
              f2(sum.minVib),
              { v: f2(sum.maxVib), hot: (sum.maxVib ?? 0) > m.vibThreshold },
              ft(sum.minTemp),
              { v: ft(sum.maxTemp), hot: (sum.maxTemp ?? 0) > m.tempThreshold },
              m.status === "offline" ? "stale" : m.vib.toFixed(2),
            ])}
          />
        </Reveal>

        <Reveal>
          <ReportTable
            n="02"
            title="Calculated summaries"
            sub="Averages and threshold-crossing share over the selected window."
            head={["Equipment", "Mean RMS", `Mean temp ${tempUnit}`, "Envelope", "Time above (%)", "Packet reliability"]}
            rows={data.map(({ m, sum }) => [
              m.name,
              f2(sum.meanVib),
              ft(sum.meanTemp),
              `${m.vibThreshold.toFixed(2)} mm/s · ${formatTemp(m.tempThreshold)}${tempUnit}`,
              { v: `${Math.max(sum.pctVibAbove, sum.pctTempAbove).toFixed(1)}%`, hot: Math.max(sum.pctVibAbove, sum.pctTempAbove) > 0 },
              { v: `${sum.reliability.toFixed(1)}%`, hot: sum.reliability < 95 },
            ])}
          />
        </Reveal>

        <div className="print-flat rounded-card bg-surface p-8 sm:p-10">
          <span className="eyebrow">03 · Handover</span>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Physical inspection sign-off</h2>
          <p className="mt-1 text-sm text-muted-foreground">Completed by hand by the maintenance technician after the on-site check.</p>
          <div className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {["Technician name", "Employee / badge ID", "Inspection date & shift", "Lubrication / alignment state", "Findings / actions taken", "Signature"].map((l) => (
              <div key={l} className="border-b border-foreground/30 pb-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                {l}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function AssetSelect({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const { machines } = useDemo();
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-10 w-auto min-w-56 gap-2 rounded-full" aria-label={`${label} asset`}>
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {machines.map((m) => (
          <SelectItem key={m.id} value={m.id}>
            {m.id} — {m.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

type Cell = string | { v: string; hot: boolean };

function ReportTable({ n, title, sub, head, rows }: { n: string; title: string; sub: string; head: string[]; rows: Cell[][] }) {
  return (
    <div className="print-flat overflow-hidden rounded-card border border-line">
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-line p-6 sm:p-8">
        <div>
          <span className="eyebrow">{n} · {title}</span>
          <p className="mt-2 text-sm text-muted-foreground">{sub}</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="bg-surface text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {head.map((h) => (
                <th key={h} className="px-6 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-line">
                {r.map((cell, j) => {
                  const v = typeof cell === "string" ? cell : cell.v;
                  const hot = typeof cell !== "string" && cell.hot;
                  return (
                    <td key={j} className={cn("px-6 py-4", j === 0 ? "font-medium" : "num font-mono", hot && "text-hazard")}>
                      {v}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
