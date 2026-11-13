import { Link } from "@tanstack/react-router";
import { ArrowUpRight, X } from "lucide-react";
import { useEffect } from "react";
import { useDemo } from "@/lib/demo-store";
import { cn } from "@/lib/utils";
import { NAV, NavLink } from "./SiteHeader";

export function NavMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { machines } = useDemo();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Navigation"
      aria-hidden={!open}
      className={cn(
        "no-print fixed inset-0 z-[90] flex flex-col bg-ink text-ink-foreground transition-all duration-500 ease-[cubic-bezier(.22,1,.36,1)]",
        open ? "visible opacity-100" : "invisible -translate-y-4 opacity-0",
      )}
    >
      <div className="shell flex w-full items-center justify-between py-6">
        <span className="font-mono text-xs uppercase tracking-widest text-ink-muted">IntelliGuard / Navigation</span>
        <button
          onClick={onClose}
          className="flex items-center gap-2 rounded-control border border-ink-line px-4 py-2 text-xs font-medium uppercase tracking-wider hover:bg-ink-foreground/10"
        >
          <X className="size-3.5" /> Close
        </button>
      </div>
      <div className="shell grid w-full flex-1 gap-10 pb-10 lg:grid-cols-12">
        <ul className="flex flex-col justify-center gap-1 lg:col-span-8">
          {NAV.map((n, i) => (
            <li
              key={n.label}
              className="transition-all duration-700"
              style={{ transitionDelay: open ? `${120 + i * 60}ms` : "0ms", transform: open ? "none" : "translateY(24px)", opacity: open ? 1 : 0 }}
            >
              <NavLink
                item={n}
                onClick={onClose}
                className="group flex items-baseline gap-5 border-b border-ink-line py-3 text-4xl font-medium tracking-tight sm:text-6xl"
              >
                <span className="font-mono text-xs text-hazard">0{i + 1}</span>
                <span className="spring-hover group-hover:translate-x-2">{n.label}</span>
                <ArrowUpRight className="ml-auto size-8 opacity-0 transition-opacity group-hover:opacity-100" />
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="flex flex-col justify-end gap-3 lg:col-span-4">
          <span className="font-mono text-xs uppercase tracking-widest text-ink-muted">Sensor nodes</span>
          {machines.map((m) => (
            <Link
              key={m.id}
              to="/machines/$machineId"
              params={{ machineId: m.id }}
              onClick={onClose}
              className="flex items-center justify-between rounded-control border border-ink-line px-4 py-3 text-sm hover:bg-ink-foreground/5"
            >
              <span className="flex items-center gap-3">
                <span
                  className={cn(
                    "size-2 rounded-full",
                    m.status === "warning" ? "bg-hazard" : m.status === "offline" ? "bg-offline" : "bg-signal",
                  )}
                />
                {m.name}
              </span>
              <span className="font-mono text-xs text-ink-muted">{m.nodeId}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
