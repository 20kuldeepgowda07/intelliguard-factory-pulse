import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDemo } from "@/lib/demo-store";
import { LineReveal } from "./Reveal";
import { Logo } from "./Logo";

export function SiteFooter() {
  const { machines } = useDemo();
  return (
    <footer className="no-print relative mt-24 overflow-hidden rounded-t-card bg-ink text-ink-foreground">
      <div className="shell relative z-10 pb-10 pt-20 lg:pt-24">
        <div className="flex flex-col gap-8 border-b border-ink-line pb-14 lg:flex-row lg:items-end lg:justify-between">
          <LineReveal
            as="h2"
            lines={["Reading crossed a line?", <span className="text-ink-muted">Go check the machine.</span>]}
            className="text-4xl font-semibold leading-[0.98] tracking-tight sm:text-6xl"
            stagger={100}
          />
          <Button asChild variant="hazard" size="pill">
            <Link to="/alerts">
              Open inspection log <ArrowRight />
            </Link>
          </Button>
        </div>
        <div className="grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <Logo className="size-6 text-hazard" /> IntelliGuard
            </div>
            <p className="max-w-xs text-sm text-ink-muted">
              Machine-health telemetry for small factories, workshops and pump stations. Built to prompt reasoned human inspection.
            </p>
          </div>
          <FooterCol title="Dashboard">
            <Link to="/" className="hover:text-ink-foreground">Overview</Link>
            <Link to="/alerts" className="hover:text-ink-foreground">Inspection log</Link>
            <Link to="/reports" className="hover:text-ink-foreground">Shift reports</Link>
            <Link to="/settings" className="hover:text-ink-foreground">Settings & nodes</Link>
          </FooterCol>
          <FooterCol title="Equipment">
            {machines.map((m) => (
              <Link key={m.id} to="/machines/$machineId" params={{ machineId: m.id }} className="hover:text-ink-foreground">
                {m.name}
              </Link>
            ))}
          </FooterCol>
          <FooterCol title="Prototype">
            <span>All readings are simulated</span>
            <span>Non-diagnostic interpretation</span>
            <span>No breakdown-date prediction</span>
            <span>Gateway: ESP-NOW · 2.4 GHz</span>
          </FooterCol>
        </div>
        <div className="flex flex-wrap justify-between gap-4 border-t border-ink-line pt-6 font-mono text-[11px] uppercase tracking-wider text-ink-muted">
          <span>© 2026 IntelliGuard Project · Prototype testbed</span>
          <span>Simulated demo data · Not a certified safety system</span>
        </div>
      </div>
      <div className="watermark pointer-events-none absolute inset-x-0 -bottom-[0.12em] text-center text-ink-foreground/[0.04]">
        INTELLIGUARD
      </div>
    </footer>
  );
}

function FooterCol({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5 text-sm text-ink-muted">
      <span className="mb-1 font-mono text-xs uppercase tracking-widest text-ink-foreground">{title}</span>
      {children}
    </div>
  );
}
