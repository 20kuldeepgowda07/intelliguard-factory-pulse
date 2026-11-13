import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  deriveStatus,
  MACHINES,
  type Channel,
  type MachineSpec,
  type MachineStatus,
} from "./telemetry";

/** Fixed reference time used for SSR + first paint so markup hydrates identically. */
export const REFERENCE_NOW = Date.UTC(2026, 10, 13, 14, 0, 0);
const STORAGE_KEY = "intelliguard.demo.v1";

export interface Alert {
  id: string;
  machineId: string;
  channel: Channel;
  message: string;
  value: string;
  threshold: string;
  t: number;
  status: "open" | "ack";
  note?: { technician: string; observation: string; action: string; t: number };
}

export interface Prefs {
  tempUnit: "C" | "F";
  vibMetric: "rms" | "peak";
  refreshSec: 5 | 15 | 60;
}

type Overrides = Record<
  string,
  Partial<Pick<MachineSpec, "name" | "location" | "vibThreshold" | "tempThreshold">>
>;

interface Persisted {
  overrides: Overrides;
  alerts: Alert[];
  prefs: Prefs;
  stale: Record<string, boolean>;
}

export interface LiveMachine extends MachineSpec {
  vib: number;
  temp: number;
  effectiveStale: number;
  status: MachineStatus;
  lastPacket: number;
}

const DEFAULT_PREFS: Prefs = { tempUnit: "C", vibMetric: "rms", refreshSec: 15 };

function seedAlerts(now: number): Alert[] {
  const min = 60_000;
  return [
    {
      id: "AL-2041",
      machineId: "M-101",
      channel: "Vibration",
      message: "Vibration RMS above inspection envelope on drive-end bearing housing.",
      value: "4.62 mm/s",
      threshold: "3.80 mm/s",
      t: now - 42 * min,
      status: "open",
    },
    {
      id: "AL-2040",
      machineId: "M-105",
      channel: "Temperature",
      message: "Motor casing surface temperature above thermal envelope.",
      value: "74.6 °C",
      threshold: "70.0 °C",
      t: now - 75 * min,
      status: "open",
    },
    {
      id: "AL-2039",
      machineId: "M-104",
      channel: "Telemetry",
      message: "No packets received from node for more than 4 hours.",
      value: "Last packet 4h 30m ago",
      threshold: "4h timeout",
      t: now - 30 * min,
      status: "ack",
      note: {
        technician: "R. Menon",
        observation: "Node battery reads 3%. Wireless link lost behind compressor housing.",
        action: "Battery replacement scheduled",
        t: now - 20 * min,
      },
    },
    {
      id: "AL-2032",
      machineId: "M-103",
      channel: "Vibration",
      message: "Short vibration spike during tool change.",
      value: "3.62 mm/s",
      threshold: "3.50 mm/s",
      t: now - 26 * 60 * min,
      status: "ack",
      note: {
        technician: "A. Shetty",
        observation: "Transient during tool change. Foundation bolts checked and torqued.",
        action: "No action required",
        t: now - 25 * 60 * min,
      },
    },
    {
      id: "AL-2027",
      machineId: "M-102",
      channel: "Temperature",
      message: "Brief thermal rise while paint booth doors were closed.",
      value: "61.2 °C",
      threshold: "60.0 °C",
      t: now - 52 * 60 * min,
      status: "ack",
      note: {
        technician: "K. Gowda",
        observation: "Airflow restored after filter swap; temperature back in envelope.",
        action: "Filter replaced",
        t: now - 51 * 60 * min,
      },
    },
  ];
}

function freshState(now: number): Persisted {
  return { overrides: {}, alerts: seedAlerts(now), prefs: DEFAULT_PREFS, stale: {} };
}

interface DemoContextValue {
  now: number;
  hydrated: boolean;
  machines: LiveMachine[];
  getMachine: (id: string) => LiveMachine | undefined;
  alerts: Alert[];
  openAlerts: number;
  prefs: Prefs;
  live: Record<string, { vib: number; temp: number }>;
  setPrefs: (p: Partial<Prefs>) => void;
  updateMachine: (id: string, patch: Overrides[string]) => void;
  toggleStale: (id: string) => void;
  simulatePacket: () => void;
  simulateAlert: () => Alert | null;
  acknowledge: (alertId: string, note: NonNullable<Alert["note"]>) => void;
  reset: () => void;
  formatTemp: (c: number) => string;
  tempUnit: string;
}

const DemoContext = createContext<DemoContextValue | null>(null);

function initialLive() {
  return Object.fromEntries(MACHINES.map((m) => [m.id, { vib: m.latestVib, temp: m.latestTemp }]));
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const [now, setNow] = useState(REFERENCE_NOW);
  const [hydrated, setHydrated] = useState(false);
  const [state, setState] = useState<Persisted>(() => freshState(REFERENCE_NOW));
  const [live, setLive] = useState(initialLive);
  const tickCount = useRef(0);

  // Hydrate from localStorage after mount (never during render: SSR has no storage).
  useEffect(() => {
    const realNow = Date.now();
    setNow(realNow);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Persisted;
        setState({ ...freshState(realNow), ...parsed, prefs: { ...DEFAULT_PREFS, ...parsed.prefs } });
      } else {
        setState(freshState(realNow));
      }
    } catch {
      setState(freshState(realNow));
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const tick = useCallback(() => {
    tickCount.current += 1;
    const k = tickCount.current;
    setNow(Date.now());
    setLive((prev) => {
      const next = { ...prev };
      for (const m of MACHINES) {
        if (m.staleHours >= 4) continue;
        const j = Math.sin(k * 1.7 + m.vibThreshold * 3) * 0.06 + Math.cos(k * 0.9 + m.baseTemp) * 0.04;
        next[m.id] = {
          vib: Math.max(0.3, Math.round((m.latestVib * (1 + j)) * 100) / 100),
          temp: Math.round((m.latestTemp + j * 6) * 10) / 10,
        };
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const id = window.setInterval(tick, state.prefs.refreshSec * 1000);
    return () => window.clearInterval(id);
  }, [hydrated, state.prefs.refreshSec, tick]);

  const machines = useMemo<LiveMachine[]>(
    () =>
      MACHINES.map((base) => {
        const m = { ...base, ...state.overrides[base.id] };
        const forcedStale = state.stale[base.id];
        const effectiveStale = forcedStale ? Math.max(base.staleHours, 4.25) : base.staleHours;
        const l = live[base.id] ?? { vib: m.latestVib, temp: m.latestTemp };
        const status = deriveStatus({ vib: l.vib, temp: l.temp, staleHours: effectiveStale }, m);
        return {
          ...m,
          vib: l.vib,
          temp: l.temp,
          effectiveStale,
          status,
          lastPacket: now - (effectiveStale > 0 ? effectiveStale * 3600_000 : 60_000),
        };
      }),
    [state.overrides, state.stale, live, now],
  );

  const value = useMemo<DemoContextValue>(() => {
    const tempUnit = state.prefs.tempUnit === "C" ? "°C" : "°F";
    return {
      now,
      hydrated,
      machines,
      getMachine: (id) => machines.find((m) => m.id === id),
      alerts: [...state.alerts].sort((a, b) => b.t - a.t),
      openAlerts: state.alerts.filter((a) => a.status === "open").length,
      prefs: state.prefs,
      live,
      tempUnit,
      formatTemp: (c) =>
        state.prefs.tempUnit === "C" ? c.toFixed(1) : ((c * 9) / 5 + 32).toFixed(1),
      setPrefs: (p) => setState((s) => ({ ...s, prefs: { ...s.prefs, ...p } })),
      updateMachine: (id, patch) =>
        setState((s) => ({ ...s, overrides: { ...s.overrides, [id]: { ...s.overrides[id], ...patch } } })),
      toggleStale: (id) => setState((s) => ({ ...s, stale: { ...s.stale, [id]: !s.stale[id] } })),
      simulatePacket: tick,
      simulateAlert: () => {
        const candidates = machines.filter((m) => m.status !== "offline");
        if (!candidates.length) return null;
        const m = candidates[Math.floor(Math.random() * candidates.length)];
        if (!m) return null;
        const isVib = Math.random() > 0.5;
        const alert: Alert = {
          id: `AL-${2042 + Math.floor(Math.random() * 900)}`,
          machineId: m.id,
          channel: isVib ? "Vibration" : "Temperature",
          message: isVib
            ? "Simulated vibration excursion above inspection envelope."
            : "Simulated casing temperature rise above thermal envelope.",
          value: isVib
            ? `${(m.vibThreshold * 1.12).toFixed(2)} mm/s`
            : `${(m.tempThreshold + 3.4).toFixed(1)} °C`,
          threshold: isVib ? `${m.vibThreshold.toFixed(2)} mm/s` : `${m.tempThreshold.toFixed(1)} °C`,
          t: Date.now(),
          status: "open",
        };
        setState((s) => ({ ...s, alerts: [alert, ...s.alerts] }));
        return alert;
      },
      acknowledge: (alertId, note) =>
        setState((s) => ({
          ...s,
          alerts: s.alerts.map((a) => (a.id === alertId ? { ...a, status: "ack", note } : a)),
        })),
      reset: () => {
        localStorage.removeItem(STORAGE_KEY);
        setState(freshState(Date.now()));
        setLive(initialLive());
      },
    };
  }, [now, hydrated, machines, state, live, tick]);

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo must be used inside DemoProvider");
  return ctx;
}
