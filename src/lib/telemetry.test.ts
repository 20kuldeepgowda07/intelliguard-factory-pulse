import { describe, expect, it } from "vitest";
import { deriveStatus, generateSeries, MACHINES, summarize, toFahrenheit } from "./telemetry";

const thr = { vibThreshold: 3.8, tempThreshold: 65 };

describe("machine status rules", () => {
  it("flags an inspection when vibration is above its threshold", () => {
    expect(deriveStatus({ vib: 4.62, temp: 58, staleHours: 0 }, thr)).toBe("warning");
  });
  it("flags an inspection when temperature is above its threshold", () => {
    expect(deriveStatus({ vib: 2, temp: 65.1, staleHours: 0 }, thr)).toBe("warning");
  });
  it("treats a reading exactly at the threshold as nominal", () => {
    expect(deriveStatus({ vib: 3.8, temp: 65, staleHours: 0 }, thr)).toBe("normal");
  });
  it("marks a node offline after 4 hours without packets, even if readings were high", () => {
    expect(deriveStatus({ vib: 9, temp: 90, staleHours: 4 }, thr)).toBe("offline");
    expect(deriveStatus({ vib: 2, temp: 50, staleHours: 3.9 }, thr)).toBe("normal");
  });
});

describe("telemetry summaries", () => {
  it("packet reliability counts missing samples from a stalled node", () => {
    const m = MACHINES.find((x) => x.id === "M-104")!;
    const s = generateSeries(m, 24, 0, undefined, 97, 6);
    const sum = summarize(s, m);
    expect(sum.reliability).toBeCloseTo(75, 0);
  });
  it("newest sample equals the latest live reading", () => {
    const m = MACHINES[0]!;
    const s = generateSeries(m, 24, 0);
    expect(s.at(-1)).toMatchObject({ vib: 4.62, temp: 58.4 });
  });
  it("converts Celsius to Fahrenheit", () => {
    expect(toFahrenheit(65)).toBe(149);
  });
});
