import { createFileRoute } from "@tanstack/react-router";
import { BatteryLow, BatteryMedium, BatteryFull, RotateCcw, Save, Wifi } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHero } from "@/components/ig/PageHero";
import { Reveal } from "@/components/ig/Reveal";
import { StatusPill } from "@/components/ig/StatusPill";
import { useDemo } from "@/lib/demo-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings & Sensor Nodes — IntelliGuard" },
      { name: "description", content: "Review prototype sensor nodes, tune inspection thresholds and set display units." },
      { property: "og:title", content: "Settings & Sensor Nodes — IntelliGuard" },
      { property: "og:description", content: "Node inventory, alert envelopes and workshop display preferences." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { machines, reset } = useDemo();
  return (
    <>
      <PageHero
        preset="gateway"
        kicker="Hardware provisioning // threshold matrix"
        title={["Settings &", "sensor nodes."]}
        description="Simulated wireless accelerometer and thermistor nodes reporting to gateway HUB-01. Thresholds here decide when IntelliGuard prompts an inspection."
        actions={
          <Button
            variant="glass"
            size="pill"
            onClick={() => {
              reset();
              toast.success("Demo data reset", { description: "Thresholds, labels and alerts restored." });
            }}
          >
            <RotateCcw /> Reset demo data
          </Button>
        }
      />
      <div className="shell flex flex-col gap-10 py-12">
        <Reveal>
          <div className="overflow-hidden rounded-card border border-line">
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line p-6 sm:p-8">
              <div>
                <span className="eyebrow">Prototype sensor node testbed</span>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">{machines.length} simulated nodes</h2>
              </div>
              <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                <Wifi className="size-4 text-signal" /> Gateway ESP-NOW · 2.4 GHz
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="bg-surface text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    {["Node", "Asset", "Transducer", "Power", "Signal", "Firmware", "State"].map((h) => (
                      <th key={h} className="px-6 py-3 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {machines.map((m) => {
                    const Bat = m.battery < 15 ? BatteryLow : m.battery < 70 ? BatteryMedium : BatteryFull;
                    const bars = m.rssi > -60 ? 4 : m.rssi > -70 ? 3 : m.rssi > -85 ? 2 : 1;
                    return (
                      <tr key={m.id} className="border-t border-line">
                        <td className="px-6 py-4 font-mono font-medium">{m.nodeId}</td>
                        <td className="px-6 py-4">
                          <div className="font-medium">{m.name}</div>
                          <div className="text-xs text-muted-foreground">{m.location}</div>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">{m.transducer}</td>
                        <td className="px-6 py-4">
                          <span className={cn("flex items-center gap-1.5 font-mono", m.battery < 15 && "text-hazard")}>
                            <Bat className="size-4" /> {m.battery}%
                          </span>
                          <div className="text-xs text-muted-foreground">{m.supply}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="flex items-end gap-0.5">
                            {[1, 2, 3, 4].map((b) => (
                              <span key={b} className={cn("w-1 rounded-sm", b <= bars ? "bg-signal" : "bg-surface-2")} style={{ height: 4 + b * 3 }} />
                            ))}
                            <span className="ml-2 font-mono text-xs">{m.rssi} dBm</span>
                          </span>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs">{m.firmware}</td>
                        <td className="px-6 py-4"><StatusPill status={m.status} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </Reveal>
        <div className="grid gap-6 lg:grid-cols-2">
          <ThresholdForm />
          <Preferences />
        </div>
        <p className="rounded-card-sm bg-surface p-6 text-sm text-muted-foreground">
          <b className="text-foreground">Non-production device management.</b> This prototype has no device attestation, secure firmware provisioning or laboratory sensor calibration. In a real installation, sensor mounting, frequency response and wireless coverage need dedicated engineering validation.
        </p>
      </div>
    </>
  );
}

function ThresholdForm() {
  const { machines, updateMachine } = useDemo();
  const [id, setId] = useState(machines[0]?.id ?? "M-101");
  const m = machines.find((x) => x.id === id)!;
  const [form, setForm] = useState({ name: m.name, location: m.location, vib: String(m.vibThreshold), temp: String(m.tempThreshold) });
  useEffect(() => {
    setForm({ name: m.name, location: m.location, vib: String(m.vibThreshold), temp: String(m.tempThreshold) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, m.name, m.location, m.vibThreshold, m.tempThreshold]);

  function save(e: React.FormEvent) {
    e.preventDefault();
    const vib = Number(form.vib);
    const temp = Number(form.temp);
    if (!form.name.trim() || !(vib > 0 && vib < 50) || !(temp > 0 && temp < 200)) {
      toast.error("Check the values", { description: "Vibration 0–50 mm/s, temperature 0–200 °C." });
      return;
    }
    updateMachine(id, { name: form.name.trim().slice(0, 60), location: form.location.trim().slice(0, 40), vibThreshold: vib, tempThreshold: temp });
    toast.success("Envelope saved", { description: `${form.name} now prompts above ${vib} mm/s or ${temp} °C.` });
  }

  return (
    <Reveal>
      <form onSubmit={save} className="tick-corners flex h-full flex-col gap-5 rounded-card border border-line p-6 sm:p-8">
        <div>
          <span className="eyebrow">Calibration envelopes</span>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Machine configuration</h2>
        </div>
        <div className="grid gap-2">
          <Label>Equipment</Label>
          <Select value={id} onValueChange={setId}>
            <SelectTrigger className="rounded-control"><SelectValue /></SelectTrigger>
            <SelectContent>
              {machines.map((x) => (
                <SelectItem key={x.id} value={x.id}>{x.id} — {x.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="name" label="Equipment label" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Field id="loc" label="Location / bay" value={form.location} onChange={(v) => setForm({ ...form, location: v })} />
          <Field id="vib" label="Vibration threshold (mm/s)" type="number" step="0.05" value={form.vib} onChange={(v) => setForm({ ...form, vib: v })} hint="Above this, an inspection is prompted." />
          <Field id="temp" label="Temperature threshold (°C)" type="number" step="0.5" value={form.temp} onChange={(v) => setForm({ ...form, temp: v })} hint="Casing thermal alert trigger." />
        </div>
        <Button type="submit" variant="ink" size="pill" className="mt-auto self-start">
          <Save /> Save envelope
        </Button>
      </form>
    </Reveal>
  );
}

function Field({ id, label, value, onChange, hint, type = "text", step }: { id: string; label: string; value: string; onChange: (v: string) => void; hint?: string; type?: string; step?: string }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} step={step} value={value} onChange={(e) => onChange(e.target.value)} className="rounded-control font-mono" />
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}

function Preferences() {
  const { prefs, setPrefs } = useDemo();
  return (
    <Reveal delay={100}>
      <div className="flex h-full flex-col gap-6 rounded-card bg-ink p-6 text-ink-foreground sm:p-8">
        <div>
          <span className="eyebrow text-ink-muted">Workshop console</span>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">Display preferences</h2>
        </div>
        <Pref label="Temperature units">
          <InkSegmented value={prefs.tempUnit} onChange={(v) => setPrefs({ tempUnit: v as "C" | "F" })} options={[["C", "Celsius °C"], ["F", "Fahrenheit °F"]]} />
        </Pref>
        <Pref label="Primary vibration metric">
          <InkSegmented value={prefs.vibMetric} onChange={(v) => setPrefs({ vibMetric: v as "rms" | "peak" })} options={[["rms", "Velocity RMS"], ["peak", "Peak accel (g)"]]} />
        </Pref>
        <Pref label="Simulated refresh rate">
          <InkSegmented value={String(prefs.refreshSec)} onChange={(v) => setPrefs({ refreshSec: Number(v) as 5 | 15 | 60 })} options={[["5", "5 s"], ["15", "15 s"], ["60", "60 s"]]} />
        </Pref>
        <p className="mt-auto text-xs text-ink-muted">Preferences apply instantly and are saved on this device.</p>
      </div>
    </Reveal>
  );
}

function Pref({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 border-t border-ink-line pt-4">
      <span className="font-mono text-[11px] uppercase tracking-widest text-ink-muted">{label}</span>
      {children}
    </div>
  );
}

function InkSegmented({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div className="flex w-fit rounded-full bg-ink-foreground/10 p-1">
      {options.map(([v, l]) => (
        <button
          key={v}
          type="button"
          aria-pressed={value === v}
          onClick={() => onChange(v)}
          className={cn("rounded-full px-4 py-1.5 text-xs font-medium transition-colors", value === v ? "bg-hazard text-hazard-foreground" : "text-ink-muted hover:text-ink-foreground")}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
