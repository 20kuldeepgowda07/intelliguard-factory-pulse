import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, Info, WifiOff } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHero } from "@/components/ig/PageHero";
import { Reveal } from "@/components/ig/Reveal";
import { StatusPill } from "@/components/ig/StatusPill";
import { TelemetryChart } from "@/components/ig/Charts";
import { useDemo, type LiveMachine } from "@/lib/demo-store";
import { formatAgo, generateSeries, MACHINES, peakAccel, toFahrenheit, WINDOWS, type WindowKey } from "@/lib/telemetry";
import { cn } from "@/lib/utils";
import { Segmented } from "@/components/ig/Segmented";

export const Route = createFileRoute("/machines/$machineId")({
  loader: ({ params }) => {
    const m = MACHINES.find((x) => x.id === params.machineId);
    if (!m) throw notFound();
    return { id: m.id, name: m.name, location: m.location };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.name ?? "Machine"} — IntelliGuard telemetry` },
      {
        name: "description",
        content: `Vibration, temperature and sensor node telemetry for ${loaderData?.name ?? "this machine"} in ${loaderData?.location ?? "the workshop"}.`,
      },
      { property: "og:title", content: `${loaderData?.name ?? "Machine"} — IntelliGuard telemetry` },
      { property: "og:description", content: "Interactive vibration and thermal trends with inspection thresholds." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  notFoundComponent: () => (
    <div className="shell pb-10 pt-40 text-center">
      <h1 className="text-3xl font-semibold">Machine not found</h1>
      <Link to="/" className="mt-4 inline-block text-hazard underline">Back to overview</Link>
    </div>
  ),
  component: MachineDetails,
});

function MachineDetails() {
  const { machineId } = Route.useParams();
  const { getMachine, machines, toggleStale, now, formatTemp, tempUnit, prefs } = useDemo();
  const navigate = useNavigate();
  const m = getMachine(machineId)!;
  const [win, setWin] = useState<WindowKey>("24H");
  const [channel, setChannel] = useState<"vib" | "temp">(m.temp > m.tempThreshold ? "temp" : "vib");
  // Each machine opens on the channel that is prompting an inspection.
  useEffect(() => {
    setChannel(m.temp > m.tempThreshold ? "temp" : "vib");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m.id]);

  const series = useMemo(
    () => generateSeries(m, WINDOWS[win], now, { vib: m.vib, temp: m.temp }, win === "1H" ? 60 : 120, m.effectiveStale),
    [m, win, now],
  );
  const chartData = useMemo(
    () =>
      series.map((s) => ({
        ...s,
        vib: s.vib === null ? null : prefs.vibMetric === "peak" ? peakAccel(s.vib) : s.vib,
        temp: s.temp === null ? null : prefs.tempUnit === "F" ? toFahrenheit(s.temp) : s.temp,
      })),
    [series, prefs],
  );
  const off = m.status === "offline";
  const vibUnit = prefs.vibMetric === "peak" ? "g" : "mm/s";
  const vibThr = prefs.vibMetric === "peak" ? peakAccel(m.vibThreshold) : m.vibThreshold;
  const tempThr = prefs.tempUnit === "F" ? toFahrenheit(m.tempThreshold) : m.tempThreshold;

  return (
    <>
      <PageHero
        key={m.id}
        preset="focus"
        focusId={m.id}
        kicker={`Asset telemetry // ${m.id} · ${m.nodeId}`}
        title={[m.name, <span className="text-foreground/45">{m.location}</span>]}
        description={
          <>
            {m.type} · {m.rpm} RPM · {m.powerKw} kW · Last packet{" "}
            <span className="font-mono">{formatAgo(now - m.lastPacket)}</span>
          </>
        }
        actions={
          <>
            <Button asChild variant="ink" size="pill">
              <Link to="/reports">
                Shift report <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="glass" size="pill">
              <Link to="/alerts">Alert history</Link>
            </Button>
          </>
        }
        aside={
          <div className="glass w-full max-w-sm rounded-card-sm p-5 lg:w-80">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-widest text-foreground/50">Probe #1</span>
              <StatusPill status={m.status} />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <Spec k="Transducer" v={m.transducer} />
              <Spec k="Band" v="10–1000 Hz" />
              <Spec k="Battery" v={`${m.battery}%`} />
              <Spec k="RSSI" v={`${m.rssi} dBm`} />
            </dl>
          </div>
        }
      />

      <div className="shell flex flex-col gap-10 py-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">Equipment channel</span>
            <Select value={m.id} onValueChange={(v) => navigate({ to: "/machines/$machineId", params: { machineId: v } })}>
              <SelectTrigger className="h-10 w-64 rounded-full" aria-label="Select equipment">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {machines.map((x) => (
                  <SelectItem key={x.id} value={x.id}>
                    {x.id} — {x.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {m.staleHours < 4 && (
            <Button variant="line" size="pill" className="h-10" onClick={() => toggleStale(m.id)}>
              <WifiOff /> {m.effectiveStale >= 4 ? "Restore live telemetry" : "Simulate stalled node"}
            </Button>
          )}
        </div>

        {off && (
          <div className="flex gap-4 rounded-card-sm border border-line bg-surface p-5">
            <WifiOff className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
            <div>
              <div className="font-medium">Telemetry stream stalled</div>
              <p className="mt-1 text-sm text-muted-foreground">
                No packets from {m.nodeId} for {m.effectiveStale.toFixed(1)} hours. Values below are the last values received and the chart shows the gap — check the node battery and wireless link before trusting these readings.
              </p>
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Vibration RMS velocity" value={m.vib.toFixed(2)} unit="mm/s" hint={`Inspect above ${m.vibThreshold.toFixed(2)} mm/s`} hot={m.vib > m.vibThreshold} stale={off} note="Broadband energy per ISO 10816-3 severity bands." />
          <Metric label="Peak acceleration" value={peakAccel(m.vib).toFixed(2)} unit="g" hint="Nominal envelope < 2.5 g" hot={peakAccel(m.vib) > 2.5} stale={off} note="Shock impacts from bearing races or gear mesh." />
          <Metric label="Casing surface temp" value={formatTemp(m.temp)} unit={tempUnit} hint={`Inspect above ${formatTemp(m.tempThreshold)} ${tempUnit}`} hot={m.temp > m.tempThreshold} stale={off} note="Contact thermistor on the bearing housing." />
          <Metric label="Run hours" value={m.runHours.toLocaleString("en-US")} unit="h" hint={`${m.rpm} RPM · ${m.powerKw} kW`} note="Accumulated since node commissioning." />
        </div>

        <Reveal>
          <div className="tick-corners rounded-card border border-line p-5 sm:p-8">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="eyebrow">Telemetry trend</span>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                  {channel === "vib" ? (prefs.vibMetric === "peak" ? "Peak acceleration" : "Vibration RMS velocity") : "Casing surface temperature"}
                </h2>
              </div>
              <div className="flex flex-wrap gap-2">
                <Segmented
                  value={channel}
                  onChange={(v) => setChannel(v as "vib" | "temp")}
                  options={[
                    { v: "vib", l: "Vibration" },
                    { v: "temp", l: "Temperature" },
                  ]}
                />
                <Segmented value={win} onChange={(v) => setWin(v as WindowKey)} options={(Object.keys(WINDOWS) as WindowKey[]).map((k) => ({ v: k, l: k }))} />
              </div>
            </div>
            <TelemetryChart
              series={[{ label: m.id, data: chartData, tone: "signal" }]}
              k={channel}
              threshold={channel === "vib" ? vibThr : tempThr}
              unit={channel === "vib" ? vibUnit : tempUnit}
              format={(v) => (channel === "vib" ? v.toFixed(2) : v.toFixed(1))}
            />
          </div>
        </Reveal>

        <Meaning m={m} />
      </div>
    </>
  );
}

function Spec({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-wider text-foreground/45">{k}</dt>
      <dd className="mt-0.5 font-medium">{v}</dd>
    </div>
  );
}

function Metric({ label, value, unit, hint, note, hot, stale }: { label: string; value: string; unit: string; hint: string; note: string; hot?: boolean; stale?: boolean }) {
  return (
    <div className={cn("tick-corners flex flex-col gap-3 rounded-card-sm border p-6", hot && !stale ? "border-hazard/40 bg-hazard-soft" : "border-line bg-background")}>
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{label}</span>
      <div className="flex items-baseline gap-1.5">
        <span className={cn("num text-4xl font-semibold tracking-tight", hot && !stale && "text-hazard", stale && "text-muted-foreground")}>{value}</span>
        <span className="font-mono text-xs text-muted-foreground">{unit}</span>
      </div>
      <span className={cn("font-mono text-[11px]", hot && !stale ? "text-hazard" : "text-foreground/60")}>{stale ? "Last known value · stale" : hint}</span>
      <p className="text-xs text-muted-foreground">{note}</p>
    </div>
  );
}

function Meaning({ m }: { m: LiveMachine }) {
  const items =
    m.status === "offline"
      ? [
          "The sensor node may have a flat battery or lost its wireless link.",
          "Readings shown are the last values received — they may not reflect the machine now.",
          "Walk to the machine, confirm it is running normally, and check the node LED.",
        ]
      : m.status === "warning"
        ? m.vib > m.vibThreshold
          ? [
              "Vibration has risen above this machine's usual envelope.",
              "Common physical checks: listen for bearing noise, check coupling alignment, torque foundation bolts.",
              "Check lubrication level before ordering parts or stopping production.",
            ]
          : [
              "Casing temperature is running warmer than this machine's usual envelope.",
              "Common physical checks: blocked cooling airflow, seal flush, lubrication level, motor load.",
              "Confirm with a handheld thermometer before acting on the reading.",
            ]
        : [
            "Readings are inside the configured baseline envelopes.",
            "No inspection is being prompted — keep to the normal maintenance schedule.",
            "Baselines are demo values; tune thresholds in Settings for real equipment.",
          ];
  const Icon = m.status === "normal" ? Info : AlertTriangle;
  return (
    <Reveal>
      <div className="grid gap-8 rounded-card bg-ink p-8 text-ink-foreground sm:p-12 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Icon className={cn("size-8", m.status === "warning" ? "text-hazard" : "text-ink-muted")} />
          <h2 className="mt-4 text-3xl font-semibold tracking-tight">What this may mean</h2>
          <p className="mt-2 text-sm text-ink-muted">A prompt for a human check — not a confirmed diagnosis or a prediction of failure.</p>
        </div>
        <ol className="flex flex-col gap-4 lg:col-span-8">
          {items.map((t, i) => (
            <li key={i} className="flex gap-5 border-t border-ink-line pt-4">
              <span className="font-mono text-xs text-hazard">0{i + 1}</span>
              <span className="text-lg">{t}</span>
            </li>
          ))}
        </ol>
      </div>
    </Reveal>
  );
}
