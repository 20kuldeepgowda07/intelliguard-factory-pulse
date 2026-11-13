// Simulated telemetry model for the IntelliGuard prototype.
// All values are deterministic demo data — nothing here diagnoses a real fault.

export type MachineStatus = "normal" | "warning" | "offline";
export type Channel = "Vibration" | "Temperature" | "Telemetry";
export type MachineKind = "pump" | "fan" | "mill" | "compressor" | "sump";

export interface MachineSpec {
  id: string;
  name: string;
  type: string;
  kind: MachineKind;
  location: string;
  nodeId: string;
  vibThreshold: number; // mm/s RMS
  tempThreshold: number; // °C
  baseVib: number;
  baseTemp: number;
  latestVib: number;
  latestTemp: number;
  staleHours: number; // hours since the last packet arrived
  runHours: number;
  rpm: number;
  powerKw: number;
  transducer: string;
  supply: string;
  battery: number; // %
  rssi: number; // dBm
  firmware: string;
}

/** Hours without a packet after which a node is treated as offline / stale. */
export const STALE_AFTER_HOURS = 4;

export const MACHINES: MachineSpec[] = [
  {
    id: "M-101",
    name: "Boiler Feed Pump #1",
    type: "Centrifugal Pump",
    kind: "pump",
    location: "Bay A",
    nodeId: "NODE-ESP-01",
    vibThreshold: 3.8,
    tempThreshold: 65,
    baseVib: 2.1,
    baseTemp: 52,
    latestVib: 4.62,
    latestTemp: 58.4,
    staleHours: 0,
    runHours: 18420,
    rpm: 2950,
    powerKw: 15,
    transducer: "Tri-axial MEMS + NTC",
    supply: "Li-SOCl₂ 3.6V",
    battery: 82,
    rssi: -54,
    firmware: "v0.9.4-proto",
  },
  {
    id: "M-102",
    name: "Paint Exhaust Fan",
    type: "Axial Fan",
    kind: "fan",
    location: "Bay C",
    nodeId: "NODE-ESP-02",
    vibThreshold: 4.5,
    tempThreshold: 60,
    baseVib: 1.35,
    baseTemp: 36,
    latestVib: 1.38,
    latestTemp: 37.2,
    staleHours: 0,
    runHours: 9210,
    rpm: 1450,
    powerKw: 5.5,
    transducer: "Single-axis Piezo + NTC",
    supply: "Mains 5V DC",
    battery: 100,
    rssi: -61,
    firmware: "v0.9.4-proto",
  },
  {
    id: "M-103",
    name: "Milling Drive Motor",
    type: "Induction Motor",
    kind: "mill",
    location: "Bay B",
    nodeId: "NODE-ESP-03",
    vibThreshold: 3.5,
    tempThreshold: 70,
    baseVib: 2.05,
    baseTemp: 47,
    latestVib: 2.15,
    latestTemp: 48.6,
    staleHours: 0,
    runHours: 12760,
    rpm: 1480,
    powerKw: 11,
    transducer: "Tri-axial MEMS + NTC",
    supply: "Li-SOCl₂ 3.6V",
    battery: 64,
    rssi: -58,
    firmware: "v0.9.3-proto",
  },
  {
    id: "M-104",
    name: "Air Compressor #1",
    type: "Reciprocating Compressor",
    kind: "compressor",
    location: "Utility",
    nodeId: "NODE-ESP-04",
    vibThreshold: 5.0,
    tempThreshold: 80,
    baseVib: 2.9,
    baseTemp: 61,
    latestVib: 3.02,
    latestTemp: 62.1,
    staleHours: 4.5,
    runHours: 21340,
    rpm: 980,
    powerKw: 7.5,
    transducer: "Tri-axial MEMS + NTC",
    supply: "Li-SOCl₂ 3.6V",
    battery: 3,
    rssi: -91,
    firmware: "v0.9.1-proto",
  },
  {
    id: "M-105",
    name: "Slurry Sump Pump",
    type: "Submersible Pump",
    kind: "sump",
    location: "East Pit",
    nodeId: "NODE-ESP-05",
    vibThreshold: 4.5,
    tempThreshold: 70,
    baseVib: 2.3,
    baseTemp: 55,
    latestVib: 2.41,
    latestTemp: 74.6,
    staleHours: 0,
    runHours: 6880,
    rpm: 1460,
    powerKw: 4,
    transducer: "Single-axis Piezo + NTC",
    supply: "Li-SOCl₂ 3.6V",
    battery: 47,
    rssi: -67,
    firmware: "v0.9.4-proto",
  },
];

export interface Reading {
  vib: number;
  temp: number;
  staleHours: number;
}

/**
 * A node is offline once it has been silent for STALE_AFTER_HOURS or more.
 * Otherwise it needs an inspection when either channel is above its threshold.
 */
export function deriveStatus(
  reading: Reading,
  thresholds: { vibThreshold: number; tempThreshold: number },
): MachineStatus {
  if (reading.staleHours >= STALE_AFTER_HOURS) return "offline";
  if (reading.vib > thresholds.vibThreshold || reading.temp > thresholds.tempThreshold) {
    return "warning";
  }
  return "normal";
}

/** Peak acceleration estimate (g) derived from RMS velocity for the demo. */
export function peakAccel(vibRms: number): number {
  return Math.round((vibRms * 0.38 + 0.4) * 100) / 100;
}

export const toFahrenheit = (c: number) => (c * 9) / 5 + 32;

export const WINDOWS = { "1H": 1, "8H": 8, "24H": 24, "7D": 168 } as const;
export type WindowKey = keyof typeof WINDOWS;

export interface Sample {
  t: number;
  vib: number | null;
  temp: number | null;
}

function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

function noise(seed: number, x: number) {
  const s = Math.sin(seed * 1000 + x * 12.9898) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
}

/** Deterministic history for one machine; the newest sample equals `latest`. */
export function generateSeries(
  m: MachineSpec,
  hours: number,
  now: number,
  latest: { vib: number; temp: number } = { vib: m.latestVib, temp: m.latestTemp },
  points = 96,
  staleHours = m.staleHours,
): Sample[] {
  const seed = hash(m.id);
  const out: Sample[] = [];
  for (let i = 0; i < points; i++) {
    const age = hours * (1 - i / (points - 1));
    const t = now - age * 3600_000;
    if (age < staleHours) {
      out.push({ t, vib: null, temp: null });
      continue;
    }
    const minutes = Math.round(age * 60);
    const settle = 1 - Math.exp(-age * 4);
    const decay = Math.exp(-age / 5);
    const daily = Math.sin((age / 24) * Math.PI * 2);
    const vib =
      m.baseVib +
      (latest.vib - m.baseVib) * decay +
      settle * (m.baseVib * 0.07 * daily + m.baseVib * 0.09 * noise(seed, minutes));
    const temp =
      m.baseTemp +
      (latest.temp - m.baseTemp) * decay +
      settle * (2.2 * daily + 0.9 * noise(seed + 0.37, minutes));
    out.push({
      t,
      vib: Math.max(0.2, Math.round(vib * 100) / 100),
      temp: Math.round(temp * 10) / 10,
    });
  }
  return out;
}

export interface SeriesSummary {
  minVib: number | null;
  maxVib: number | null;
  meanVib: number | null;
  minTemp: number | null;
  maxTemp: number | null;
  meanTemp: number | null;
  pctVibAbove: number;
  pctTempAbove: number;
  reliability: number; // % of expected packets that arrived
}

export function summarize(
  series: Sample[],
  thresholds: { vibThreshold: number; tempThreshold: number },
): SeriesSummary {
  const vibs = series.map((s) => s.vib).filter((v): v is number => v !== null);
  const temps = series.map((s) => s.temp).filter((v): v is number => v !== null);
  const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
  return {
    minVib: vibs.length ? Math.min(...vibs) : null,
    maxVib: vibs.length ? Math.max(...vibs) : null,
    meanVib: mean(vibs),
    minTemp: temps.length ? Math.min(...temps) : null,
    maxTemp: temps.length ? Math.max(...temps) : null,
    meanTemp: mean(temps),
    pctVibAbove: vibs.length
      ? (vibs.filter((v) => v > thresholds.vibThreshold).length / vibs.length) * 100
      : 0,
    pctTempAbove: temps.length
      ? (temps.filter((v) => v > thresholds.tempThreshold).length / temps.length) * 100
      : 0,
    reliability: series.length ? (vibs.length / series.length) * 100 : 0,
  };
}

export function formatAgo(ms: number): string {
  const min = Math.max(0, Math.round(ms / 60000));
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h < 24) return m ? `${h}h ${m}m ago` : `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export const STATUS_LABEL: Record<MachineStatus, string> = {
  normal: "Nominal",
  warning: "Inspect",
  offline: "Offline / Stale",
};
