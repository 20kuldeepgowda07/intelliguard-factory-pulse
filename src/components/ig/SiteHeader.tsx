import { Link, useRouterState } from "@tanstack/react-router";
import { Menu } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useDemo } from "@/lib/demo-store";
import { Logo } from "./Logo";
import { useIntroReady } from "./Reveal";
import { NavMenu } from "./NavMenu";
import { cn } from "@/lib/utils";

export const NAV = [
  { to: "/", label: "Overview" },
  { to: "/machines/$machineId", label: "Machines" },
  { to: "/alerts", label: "Alerts" },
  { to: "/reports", label: "Reports" },
  { to: "/settings", label: "Settings & Nodes" },
] as const;

type NavItem = (typeof NAV)[number];

/** Link for a top-level nav item; "Machines" opens the first machine. */
export function NavLink({
  item,
  className,
  activeClassName,
  onClick,
  children,
}: {
  item: NavItem;
  className: string;
  activeClassName?: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  const activeProps = activeClassName ? { className: activeClassName } : {};
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (item.to === "/machines/$machineId") {
    return (
      <Link
        to="/machines/$machineId"
        params={{ machineId: "M-101" }}
        className={cn(className, pathname.startsWith("/machines") && activeClassName)}
        onClick={onClick}
      >
        {children}
      </Link>
    );
  }
  return (
    <Link to={item.to} className={className} activeOptions={{ exact: item.to === "/" }} activeProps={activeProps} onClick={onClick}>
      {children}
    </Link>
  );
}

function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  if (!now) return { time: "14:00:00", date: "13 Nov 2026" };
  return {
    time: now.toLocaleTimeString("en-GB", { hour12: false }),
    date: now.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
  };
}

export function SiteHeader() {
  const ready = useIntroReady();
  const { openAlerts } = useDemo();
  const { time, date } = useClock();
  const [open, setOpen] = useState(false);

  return (
    <>
      <header
        className={cn(
          "no-print absolute inset-x-0 top-0 z-50 transition-all duration-700 ease-[cubic-bezier(.22,1,.36,1)]",
          ready ? "translate-y-0 opacity-100" : "-translate-y-3 opacity-0",
        )}
      >
        <div className="overflow-hidden bg-ink py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-muted">
          <div className="flex w-max animate-marquee gap-10 whitespace-nowrap">
            {Array.from({ length: 2 }).map((_, k) => (
              <div key={k} className="flex gap-10">
                <span><b className="text-hazard">●</b> Demo prototype</span>
                <span>Simulated readings — not for certified safety or diagnostic shutdown</span>
                <span>[Non-diagnostic mode]</span>
                <span>Gateway HUB-01 · ESP-NOW 2.4 GHz</span>
                <span>Readings prompt a physical inspection, never a diagnosis</span>
              </div>
            ))}
          </div>
        </div>
        <div className="shell flex items-center justify-between gap-6 py-5">
          <Link to="/" className="spring-hover flex items-center gap-2 text-lg font-semibold tracking-tight hover:scale-[1.04]">
            <Logo className="size-6 text-hazard" />
            IntelliGuard
          </Link>
          <nav aria-label="Main" className="hidden lg:block">
            <ul className="glass flex items-center gap-1 rounded-full p-1 text-sm font-medium">
              {NAV.map((n) => (
                <li key={n.label}>
                  <NavLink
                    item={n}
                    className="flex items-center gap-1.5 rounded-full px-4 py-2 text-foreground/70 transition-colors hover:text-foreground"
                    activeClassName="!bg-ink !text-ink-foreground"
                  >
                    {n.label}
                    {n.label === "Alerts" && openAlerts > 0 && (
                      <span className="grid min-w-5 place-items-center rounded-full bg-hazard px-1 font-mono text-[10px] text-hazard-foreground">
                        {openAlerts}
                      </span>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex items-center gap-2">
            <div className="glass hidden items-center gap-3 rounded-control px-3 py-2 text-xs md:flex">
              <span className="flex items-center gap-1.5 font-mono font-medium uppercase tracking-wider text-signal">
                <span className="relative flex size-2">
                  <span className="absolute inset-0 animate-pulse-ring rounded-full bg-signal" />
                  <span className="relative size-2 rounded-full bg-signal" />
                </span>
                Live
              </span>
              <span className="num min-w-16 font-mono font-medium">{time}</span>
              <span className="text-foreground/30">•</span>
              <span className="font-medium text-foreground/70">{date}</span>
            </div>
            <button
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              className="glass flex items-center gap-2 rounded-control px-4 py-2 text-xs font-medium uppercase tracking-wider transition-colors hover:bg-background/80"
            >
              <Menu className="size-3.5" />
              <span className="hidden sm:inline">Menu</span>
            </button>
          </div>
        </div>
      </header>
      <NavMenu open={open} onClose={() => setOpen(false)} />
    </>
  );
}
