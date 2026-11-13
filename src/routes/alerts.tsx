import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, CheckCircle2, ClipboardCheck, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { PageHero } from "@/components/ig/PageHero";
import { Reveal } from "@/components/ig/Reveal";
import { useDemo, type Alert } from "@/lib/demo-store";
import { formatAgo } from "@/lib/telemetry";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Inspection Log — IntelliGuard" },
      { name: "description", content: "Telemetry-triggered inspection prompts and technician observations for every machine." },
      { property: "og:title", content: "Inspection Log — IntelliGuard" },
      { property: "og:description", content: "Review open inspection prompts and record what technicians found on site." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AlertsPage,
});

const ACTIONS = ["No action required", "Lubrication topped up", "Bolts re-torqued", "Alignment corrected", "Filter replaced", "Battery replacement scheduled", "Escalated to maintenance lead"];

function AlertsPage() {
  const { alerts, machines, getMachine, simulateAlert, openAlerts, now } = useDemo();
  const [machine, setMachine] = useState("all");
  const [channel, setChannel] = useState("all");
  const [state, setState] = useState("all");
  const [active, setActive] = useState<Alert | null>(null);

  const rows = alerts.filter(
    (a) => (machine === "all" || a.machineId === machine) && (channel === "all" || a.channel === channel) && (state === "all" || a.status === state),
  );

  return (
    <>
      <PageHero
        preset="alerts"
        kicker="Inspection log // event recorder"
        title={["Equipment", "inspection prompts."]}
        description="Readings that crossed a baseline envelope, and what technicians found when they checked. Alerts are prompts to inspect — never confirmed diagnoses."
        actions={
          <Button
            variant="ink"
            size="pill"
            onClick={() => {
              const a = simulateAlert();
              if (a) toast.warning(`New prompt · ${getMachine(a.machineId)?.name}`, { description: `${a.channel}: ${a.value} (envelope ${a.threshold})` });
            }}
          >
            <Plus /> Simulate incoming alert
          </Button>
        }
        aside={
          <div className="glass grid w-full max-w-sm grid-cols-3 gap-2 rounded-card-sm p-2 lg:w-80">
            {[
              { l: "Open", v: openAlerts, hot: true },
              { l: "Reviewed", v: alerts.length - openAlerts },
              { l: "Total", v: alerts.length },
            ].map((x) => (
              <div key={x.l} className={cn("rounded-control p-3", x.hot ? "bg-ink text-ink-foreground" : "bg-surface/70")}>
                <div className={cn("num text-3xl font-semibold", x.hot && "text-hazard")}>{x.v}</div>
                <div className="font-mono text-[10px] uppercase tracking-wider opacity-60">{x.l}</div>
              </div>
            ))}
          </div>
        }
      />
      <div className="shell flex flex-col gap-8 py-12">
        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect label="Asset" value={machine} onChange={setMachine} options={[["all", "All equipment"], ...machines.map((m) => [m.id, `${m.id} — ${m.name}`] as [string, string])]} />
          <FilterSelect label="Channel" value={channel} onChange={setChannel} options={[["all", "All channels"], ["Vibration", "Vibration"], ["Temperature", "Temperature"], ["Telemetry", "Telemetry link"]]} />
          <FilterSelect label="State" value={state} onChange={setState} options={[["all", "All states"], ["open", "Action open"], ["ack", "Inspected"]]} />
        </div>
        <ul className="flex flex-col gap-3">
          {rows.map((a, i) => {
            const m = getMachine(a.machineId);
            return (
              <li key={a.id}>
                <Reveal delay={Math.min(i, 6) * 60} y={14}>
                  <div className={cn("tick-corners grid gap-5 rounded-card-sm border p-6 lg:grid-cols-12 lg:items-center", a.status === "open" ? "border-hazard/40 bg-hazard-soft" : "border-line")}>
                    <div className="lg:col-span-2">
                      <span className={cn("inline-flex rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-wider", a.status === "open" ? "bg-hazard text-hazard-foreground" : "bg-surface text-muted-foreground")}>
                        {a.status === "open" ? "Action open" : "Inspected"}
                      </span>
                      <div className="mt-2 font-mono text-[11px] text-muted-foreground">
                        {a.id} · {formatAgo(now - a.t)}
                      </div>
                    </div>
                    <div className="lg:col-span-4">
                      <Link to="/machines/$machineId" params={{ machineId: a.machineId }} className="group inline-flex items-center gap-1 text-lg font-medium hover:text-hazard">
                        {m?.name} <ArrowUpRight className="size-4 opacity-50 group-hover:opacity-100" />
                      </Link>
                      <p className="text-sm text-muted-foreground">{a.message}</p>
                    </div>
                    <div className="lg:col-span-3">
                      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{a.channel}</div>
                      <div className={cn("num text-xl font-semibold", a.status === "open" && "text-hazard")}>{a.value}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">Envelope {a.threshold}</div>
                    </div>
                    <div className="lg:col-span-3 lg:text-right">
                      {a.status === "open" ? (
                        <Button variant="ink" size="pill" onClick={() => setActive(a)}>
                          <ClipboardCheck /> Log inspection
                        </Button>
                      ) : (
                        <div className="text-sm lg:ml-auto lg:max-w-64">
                          <div className="flex items-center gap-1.5 font-medium lg:justify-end">
                            <CheckCircle2 className="size-4 text-signal" /> {a.note?.action}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">“{a.note?.observation}” — {a.note?.technician}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </Reveal>
              </li>
            );
          })}
          {rows.length === 0 && <li className="py-16 text-center text-sm text-muted-foreground">No prompts match these filters.</li>}
        </ul>
      </div>
      <InspectionDialog alert={active} onClose={() => setActive(null)} />
    </>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-10 w-auto min-w-44 gap-2 rounded-full" aria-label={label}>
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(([v, l]) => (
          <SelectItem key={v} value={v}>
            {l}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function InspectionDialog({ alert, onClose }: { alert: Alert | null; onClose: () => void }) {
  const { acknowledge, getMachine } = useDemo();
  const [technician, setTechnician] = useState("");
  const [observation, setObservation] = useState("");
  const [action, setAction] = useState<string>("No action required");
  const m = alert ? getMachine(alert.machineId) : undefined;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!alert || !technician.trim() || !observation.trim()) return;
    acknowledge(alert.id, { technician: technician.trim(), observation: observation.trim(), action, t: Date.now() });
    toast.success("Inspection logged", { description: `${m?.name} · ${action}` });
    setTechnician("");
    setObservation("");
    onClose();
  }

  return (
    <Dialog open={!!alert} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-card sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl tracking-tight">Log physical inspection</DialogTitle>
          <DialogDescription>
            {m?.name} · {alert?.channel} {alert?.value}. Record what you found on site.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="tech">Technician name</Label>
            <Input id="tech" value={technician} onChange={(e) => setTechnician(e.target.value)} required maxLength={60} className="rounded-control" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="obs">Observations</Label>
            <Textarea id="obs" value={observation} onChange={(e) => setObservation(e.target.value)} required maxLength={500} rows={4} placeholder="e.g. Bearing noise audible at drive end; grease level low." className="rounded-control" />
          </div>
          <div className="grid gap-2">
            <Label>Action taken</Label>
            <Select value={action} onValueChange={setAction}>
              <SelectTrigger className="rounded-control">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTIONS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" variant="hazard" size="pill" className="mt-2">
            Save inspection note
          </Button>
          <p className="text-center text-xs text-muted-foreground">Saved on this device only (prototype).</p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
