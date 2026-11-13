import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, ArrowUpRight, Factory, RefreshCw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FactoryBackdrop } from "@/components/ig/FactoryBackdrop";
import { LineReveal, Reveal, useCountUp, useIntroReady, WordReveal } from "@/components/ig/Reveal";
import { StatusPill } from "@/components/ig/StatusPill";
import { Sparkline } from "@/components/ig/Charts";
import { useDemo, type LiveMachine } from "@/lib/demo-store";
import { formatAgo, generateSeries, type MachineStatus } from "@/lib/telemetry";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "IntelliGuard — Workshop Equipment Overview" },
      {
        name: "description",
        content: "Live 3D view of machine health across your workshop: vibration, temperature and sensor node status at a glance.",
      },
      { property: "og:title", content: "IntelliGuard — Workshop Equipment Overview" },
      {
        property: "og:description",
        content: "Spot unusual machine readings and decide what to inspect next. Prototype with simulated telemetry.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Overview,
});

function Overview() {
  return (
    <>
      <Hero />
      <About />
      <Band />
      <Stats />
      <EquipmentMatrix />
      <Prompts />
    </>
  );
}

/* ------------------------------ hero ------------------------------ */

function Hero() {
  const ready = useIntroReady();
  const { machines } = useDemo();
  const live = machines.filter((m) => m.status !== "offline").length;
  return (
    <section id="home" className="relative isolate overflow-hidden rounded-b-card bg-scene">
      <FactoryBackdrop preset="overview" />
      <div className="bg-veil pointer-events-none absolute inset-0 z-[1]" />
      <div className="bg-veil-side pointer-events-none absolute inset-0 z-[1]" />
      <div
        className={cn(
          "watermark absolute inset-x-0 bottom-24 z-[1] text-center text-background/40 transition-all delay-300 duration-1000",
          ready ? "translate-y-0 opacity-100" : "translate-y-5 opacity-0",
        )}
      >
        INTELLIGUARD
      </div>
      <div className="shell relative z-20 flex flex-col gap-10 pb-16 pt-40 lg:grid lg:min-h-[100svh] lg:grid-cols-12 lg:items-center lg:gap-10 lg:pb-28">
        <div className="flex flex-col gap-7 lg:col-span-7">
          <Reveal gate delay={200} y={10}>
            <span className="eyebrow">
              <span className="size-1.5 rounded-full bg-hazard" /> Workshop network <span className="text-foreground/30">/</span> 05 sensor nodes
            </span>
          </Reveal>
          <LineReveal
            gate
            delay={250}
            lines={["Know your machines.", "Before the", <span className="text-hazard">shift changes.</span>]}
            className="max-w-[18ch] text-5xl font-semibold leading-[0.95] tracking-tight sm:text-6xl md:text-7xl"
          />
          <Reveal gate delay={550}>
            <p className="max-w-lg text-base text-foreground/70 sm:text-lg">
              A live view of equipment health across your workshop — built to help your team spot unusual readings and decide what to inspect next.
            </p>
          </Reveal>
          <Reveal gate delay={650}>
            <div className="flex items-center gap-3 text-sm font-medium text-foreground/70">
              <span className="flex -space-x-1">
                {machines.map((m) => (
                  <span
                    key={m.id}
                    className={cn(
                      "size-3 rounded-full ring-2 ring-background",
                      m.status === "warning" ? "bg-hazard" : m.status === "offline" ? "bg-offline" : "bg-signal",
                    )}
                  />
                ))}
              </span>
              {live} of {machines.length} nodes streaming telemetry
            </div>
          </Reveal>
          <Reveal gate delay={750}>
            <div className="flex flex-wrap gap-3">
              <Button asChild variant="ink" size="pill">
                <Link to="/alerts">
                  Open inspection log <ArrowRight />
                </Link>
              </Button>
              <Button asChild variant="glass" size="pill">
                <a href="#equipment">View equipment</a>
              </Button>
            </div>
          </Reveal>
        </div>
        <div className="flex flex-col items-start gap-6 lg:col-span-5 lg:items-end">
          <Reveal gate delay={400} y={16} scale={0.96} className="w-full max-w-sm lg:w-80">
            <HeroCard />
          </Reveal>
          <Reveal gate delay={550} y={14} className="w-full max-w-sm lg:w-80">
            <div className="glass rounded-card-sm p-4">
              <div className="mb-3 flex justify-between font-mono text-[10px] uppercase tracking-widest text-foreground/50">
                <span>Node topology</span>
                <span>HUB-01</span>
              </div>
              <ul className="grid grid-cols-1 gap-1.5 text-xs">
                {machines.map((m) => (
                  <li key={m.id}>
                    <Link
                      to="/machines/$machineId"
                      params={{ machineId: m.id }}
                      className="flex items-center justify-between rounded-lg px-2 py-1.5 transition-colors hover:bg-background/70"
                    >
                      <span className="flex items-center gap-2">
                        <Dot status={m.status} />
                        <span className="font-mono">{m.nodeId}</span>
                      </span>
                      <span className="truncate pl-3 text-foreground/60">{m.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </div>
      <Reveal gate delay={900} y={0} className="relative z-20">
        <div className="shell flex items-center justify-between gap-3 border-t border-foreground/10 py-5 font-mono text-[11px] font-medium uppercase tracking-wider text-foreground/60">
          <span className="flex items-center gap-2">
            <span className="size-1.5 animate-blink rounded-full bg-signal" /> Simulation running
          </span>
          <span className="hidden sm:inline">Bay A · Bay B · Bay C · Utility · East Pit</span>
          <a href="#about" className="inline-flex items-center gap-2 hover:text-foreground">
            Scroll to explore <ArrowDown className="size-3.5" />
          </a>
        </div>
      </Reveal>
    </section>
  );
}

function Dot({ status }: { status: MachineStatus }) {
  return (
    <span
      className={cn(
        "size-2 rounded-full",
        status === "warning" ? "bg-hazard" : status === "offline" ? "bg-offline" : "bg-signal",
      )}
    />
  );
}

function HeroCard() {
  const { machines, formatTemp, tempUnit } = useDemo();
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setI((x) => (x + 1) % machines.length), 3200);
    return () => window.clearInterval(id);
  }, [machines.length]);
  const m = machines[i];
  if (!m) return null;
  const hotTemp = m.temp > m.tempThreshold;
  return (
    <Link
      to="/machines/$machineId"
      params={{ machineId: m.id }}
      className="glass flex gap-2 rounded-card-sm p-2 transition-transform hover:-translate-y-0.5"
    >
      <div className="grid aspect-square w-24 shrink-0 place-items-center rounded-control bg-ink text-ink-foreground">
        <div className="text-center">
          <div className={cn("num text-2xl font-semibold", m.status === "warning" && "text-hazard")}>
            {m.status === "offline" ? "—" : hotTemp ? formatTemp(m.temp) : m.vib.toFixed(2)}
          </div>
          <div className="font-mono text-[10px] text-ink-muted">{hotTemp ? tempUnit : "mm/s"}</div>
        </div>
      </div>
      <div className="flex flex-1 flex-col justify-between rounded-control bg-surface/70 p-3">
        <div key={m.id} className="min-h-[3.25rem] animate-in fade-in slide-in-from-bottom-1 duration-500">
          <div className="font-mono text-[10px] font-medium uppercase tracking-wider text-foreground/45">
            {m.nodeId} · {m.location}
          </div>
          <div className="text-sm font-medium leading-snug">{m.name}</div>
        </div>
        <div className="flex items-center justify-between">
          <StatusPill status={m.status} />
          <div className="flex gap-1">
            {machines.map((x, k) => (
              <span key={x.id} className={cn("h-1 rounded-full transition-all", k === i ? "w-4 bg-ink" : "w-1 bg-foreground/20")} />
            ))}
          </div>
        </div>
      </div>
    </Link>
  );
}

/* ------------------------------ about ------------------------------ */

function About() {
  return (
    <section id="about" className="shell grid items-center gap-12 py-20 lg:grid-cols-2 lg:py-28">
      <div className="relative min-h-56 lg:min-h-80">
        <Factory className="absolute -left-4 top-1/2 size-48 -translate-y-1/2 text-foreground/[0.07] sm:size-64 lg:size-80" strokeWidth={1} />
        <span className="eyebrow relative">The idea</span>
        <Reveal className="absolute bottom-0 left-0 flex items-center gap-3 text-sm text-foreground/70" y={12}>
          <Factory className="size-6 text-foreground" />
          <span className="max-w-56">Small factories, assembly lines and pump stations.</span>
        </Reveal>
      </div>
      <div className="flex flex-col gap-10">
        <WordReveal
          className="text-2xl font-medium leading-snug tracking-tight sm:text-3xl"
          text="IntelliGuard listens to vibration and heat on every machine, so your team knows"
          muted="what to inspect next — a prompt for a physical check, never a diagnosis."
        />
        <Reveal delay={200} y={12}>
          <div className="flex flex-wrap items-end justify-between gap-6 border-t border-line pt-6">
            <div>
              <div className="mb-2 text-sm text-foreground/45">Prototype notice</div>
              <div className="flex flex-wrap gap-2 font-mono text-[11px] uppercase tracking-wider">
                <span className="rounded-full bg-hazard px-3 py-1.5 text-hazard-foreground">Simulated readings</span>
                <span className="rounded-full bg-surface px-3 py-1.5 text-foreground/70">Non-diagnostic</span>
                <span className="rounded-full bg-surface px-3 py-1.5 text-foreground/70">ISO 10816 bands</span>
              </div>
            </div>
            <Button asChild variant="line" size="pill">
              <Link to="/reports">
                Shift report <ArrowRight />
              </Link>
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function Band() {
  const tiles = [
    { label: "Sense", cls: "bg-surface text-foreground" },
    { label: "Flag", cls: "bg-gradient-hazard text-hazard-foreground" },
    { label: <ArrowRight className="size-9 sm:size-12" />, cls: "bg-ink text-ink-foreground" },
    { label: "Inspect", cls: "bg-surface/60 text-foreground/80" },
  ];
  return (
    <section>
      <ul className="shell flex flex-col gap-3 py-10 sm:flex-row sm:gap-4">
        {tiles.map((t, i) => (
          <li key={i} className="flex-1">
            <Reveal delay={i * 120} y={28}>
              <div
                className={cn(
                  "spring-hover grid h-24 place-items-center rounded-full text-3xl font-medium hover:scale-[1.03] sm:h-40 sm:text-4xl",
                  t.cls,
                )}
              >
                {t.label}
              </div>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------ stats ------------------------------ */

function Stat({ value, suffix = "", label, note, delay, tone }: { value: number; suffix?: string; label: string; note: string; delay: number; tone?: "hazard" | "muted" }) {
  const [ref, v] = useCountUp(value);
  return (
    <Reveal delay={delay} className="flex flex-col gap-2 border-t border-ink-line pt-6">
      <div ref={ref} className={cn("num text-6xl font-semibold tracking-tight sm:text-7xl", tone === "hazard" && "text-hazard", tone === "muted" && "text-ink-muted")}>
        {v}
        {suffix}
      </div>
      <div className="text-sm font-medium">{label}</div>
      <div className="text-xs text-ink-muted">{note}</div>
    </Reveal>
  );
}

function Stats() {
  const { machines } = useDemo();
  const count = (s: MachineStatus) => machines.filter((m) => m.status === s).length;
  return (
    <section className="shell py-10">
      <Reveal y={30}>
        <div className="relative overflow-hidden rounded-card bg-ink px-6 py-14 text-ink-foreground sm:px-12 lg:py-20">
          <div className="blueprint pointer-events-none absolute inset-0 opacity-[0.15] invert" />
          <div className="relative mb-12 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div>
              <span className="eyebrow text-ink-muted">By the numbers</span>
              <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight sm:text-5xl">Today on the workshop floor.</h2>
            </div>
            <p className="max-w-sm text-sm text-ink-muted">
              Broadband vibration velocity and casing temperature, sampled every 60 seconds from each node.
            </p>
          </div>
          <div className="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <Stat value={machines.length} label="Monitored assets" note="Active simulated transducer channels" delay={0} />
            <Stat value={count("normal")} label="Nominal envelope" note="Within vibration & thermal bounds" delay={90} />
            <Stat value={count("warning")} label="Inspect recommended" note="Elevated readings — physical check" delay={180} tone="hazard" />
            <Stat value={count("offline")} label="Offline / stale" note="Packet timeout over 4 hours" delay={270} tone="muted" />
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ------------------------------ equipment ------------------------------ */

function EquipmentMatrix() {
  const { machines, now, simulatePacket, formatTemp, tempUnit } = useDemo();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | MachineStatus>("all");
  const rows = machines.filter(
    (m) =>
      (filter === "all" || m.status === filter) &&
      `${m.name} ${m.location} ${m.id} ${m.nodeId} ${m.type}`.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <section id="equipment" className="shell scroll-mt-8 py-20">
      <div className="mb-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
        <div>
          <span className="eyebrow">Equipment telemetry matrix</span>
          <LineReveal as="h2" lines={["Every machine,", "one glance."]} className="mt-3 text-4xl font-semibold leading-[0.98] tracking-tight sm:text-5xl" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter equipment or bay…"
              className="h-10 w-60 rounded-full pl-9"
              aria-label="Filter equipment"
            />
          </div>
          <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
            <SelectTrigger className="h-10 w-48 rounded-full" aria-label="Filter by status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All states</SelectItem>
              <SelectItem value="normal">Nominal</SelectItem>
              <SelectItem value="warning">Inspection recommended</SelectItem>
              <SelectItem value="offline">Offline / stale</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="line"
            size="pill"
            className="h-10"
            onClick={() => {
              simulatePacket();
              toast.success("Telemetry packet ingested", { description: "Fresh readings from 4 live nodes." });
            }}
          >
            <RefreshCw /> Simulate packet
          </Button>
        </div>
      </div>
      <div className="hidden grid-cols-12 gap-4 border-b border-line px-5 pb-3 font-mono text-[10px] uppercase tracking-widest text-muted-foreground lg:grid">
        <span className="col-span-3">Machine & node</span>
        <span className="col-span-2">State</span>
        <span className="col-span-3">Vibration RMS · 24h</span>
        <span className="col-span-3">Surface temp · 24h</span>
        <span className="col-span-1 text-right">Ping</span>
      </div>
      <div>
        {rows.map((m, i) => (
          <Reveal key={m.id} delay={i * 80} y={14}>
            <Row m={m} now={now} formatTemp={formatTemp} tempUnit={tempUnit} />
          </Reveal>
        ))}
        {rows.length === 0 && <div className="py-16 text-center text-sm text-muted-foreground">No equipment matches that filter.</div>}
      </div>
    </section>
  );
}

function Row({ m, now, formatTemp, tempUnit }: { m: LiveMachine; now: number; formatTemp: (c: number) => string; tempUnit: string }) {
  const series = useMemo(
    () => generateSeries(m, 24, now, { vib: m.vib, temp: m.temp }, 48, m.effectiveStale),
    [m, now],
  );
  const vibHot = m.vib > m.vibThreshold;
  const tempHot = m.temp > m.tempThreshold;
  const off = m.status === "offline";
  return (
    <div>
      <Link
        to="/machines/$machineId"
        params={{ machineId: m.id }}
        className="group relative grid grid-cols-2 items-center gap-4 overflow-hidden border-b border-line px-5 py-5 transition-colors duration-300 hover:rounded-card-sm hover:border-transparent hover:bg-ink hover:text-ink-foreground lg:grid-cols-12"
      >
        <div className="col-span-2 lg:col-span-3">
          <div className="font-mono text-[11px] text-muted-foreground group-hover:text-ink-muted">
            {m.id} · {m.nodeId}
          </div>
          <div className="text-lg font-medium">{m.name}</div>
          <div className="text-xs text-muted-foreground group-hover:text-ink-muted">
            {m.type} · {m.location}
          </div>
        </div>
        <div className="lg:col-span-2">
          <StatusPill status={m.status} />
        </div>
        <div className="flex items-center gap-3 lg:col-span-3">
          <Sparkline series={series} k="vib" threshold={m.vibThreshold} tone={off ? "offline" : vibHot ? "hazard" : "signal"} />
          <div className={cn("num font-mono text-sm", vibHot && "text-hazard")}>
            {off ? "—" : m.vib.toFixed(2)} <span className="text-[10px] text-muted-foreground">mm/s</span>
          </div>
        </div>
        <div className="flex items-center gap-3 lg:col-span-3">
          <Sparkline series={series} k="temp" threshold={m.tempThreshold} tone={off ? "offline" : tempHot ? "hazard" : "signal"} />
          <div className={cn("num font-mono text-sm", tempHot && "text-hazard")}>
            {off ? "—" : formatTemp(m.temp)} <span className="text-[10px] text-muted-foreground">{tempUnit}</span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 lg:col-span-1 lg:justify-end">
          <span className="whitespace-nowrap font-mono text-[11px] text-muted-foreground group-hover:text-ink-muted">{formatAgo(now - m.lastPacket)}</span>
          <ArrowUpRight className="size-5 transition-transform group-hover:rotate-45" />
        </div>
      </Link>
    </div>
  );
}

/* ------------------------------ prompts ------------------------------ */

function Prompts() {
  const { alerts, getMachine, now } = useDemo();
  const open = alerts.filter((a) => a.status === "open").slice(0, 3);
  const recent = alerts.filter((a) => a.status === "ack").slice(0, Math.max(0, 3 - open.length));
  const cards = [...open, ...recent];
  return (
    <section className="shell py-10">
      <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <span className="eyebrow">Recent inspection prompts</span>
          <LineReveal as="h2" lines={["What needs a", "human check."]} className="mt-3 text-4xl font-semibold leading-[0.98] tracking-tight sm:text-5xl" />
        </div>
        <Button asChild variant="line" size="pill">
          <Link to="/alerts">
            All prompts <ArrowRight />
          </Link>
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((a, i) => {
          const m = getMachine(a.machineId);
          return (
            <Reveal key={a.id} delay={i * 90} y={24}>
              <Link
                to="/machines/$machineId"
                params={{ machineId: a.machineId }}
                className="group flex h-full min-h-72 flex-col justify-between rounded-card bg-ink p-7 text-ink-foreground transition-transform duration-300 hover:-translate-y-1"
              >
                <div className="flex items-start justify-between">
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-wider",
                      a.status === "open" ? "bg-hazard text-hazard-foreground" : "bg-ink-foreground/10 text-ink-muted",
                    )}
                  >
                    {a.status === "open" ? "Action open" : "Inspected"} · {a.channel}
                  </span>
                  <ArrowUpRight className="size-5 transition-transform group-hover:rotate-45" />
                </div>
                <div>
                  <div className="num text-4xl font-semibold tracking-tight">{a.value}</div>
                  <div className="mt-1 font-mono text-[11px] text-ink-muted">Envelope {a.threshold}</div>
                  <div className="mt-6 text-lg font-medium">{m?.name}</div>
                  <p className="mt-1 text-sm text-ink-muted">{a.message}</p>
                  <div className="mt-4 font-mono text-[11px] text-ink-muted">{formatAgo(now - a.t)}</div>
                </div>
              </Link>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
