import { describe, expect, it } from "vitest";
import { extractBearerToken, sensorReadingSchema, tokensMatch } from "./sensor-ingest";

const valid = { machine: "M-101", vibration: 1.2, temperature: 61.5, load: 72, status: "optimal" };

describe("sensor ingest validation", () => {
  it("accepts a well-formed reading", () => {
    expect(sensorReadingSchema.safeParse(valid).success).toBe(true);
  });
  it("rejects load above 100%", () => {
    expect(sensorReadingSchema.safeParse({ ...valid, load: 101 }).success).toBe(false);
  });
  it("rejects negative vibration", () => {
    expect(sensorReadingSchema.safeParse({ ...valid, vibration: -0.1 }).success).toBe(false);
  });
  it("rejects unknown status", () => {
    expect(sensorReadingSchema.safeParse({ ...valid, status: "broken" }).success).toBe(false);
  });
  it("rejects numbers sent as strings and extra fields", () => {
    expect(sensorReadingSchema.safeParse({ ...valid, temperature: "61" }).success).toBe(false);
    expect(sensorReadingSchema.safeParse({ ...valid, id: "x" }).success).toBe(false);
  });
});

describe("sensor ingest token", () => {
  it("requires a Bearer header", () => {
    expect(extractBearerToken("Bearer abc123")).toBe("abc123");
    expect(extractBearerToken("abc123")).toBeNull();
    expect(extractBearerToken(null)).toBeNull();
  });
  it("matches only the exact token", async () => {
    expect(await tokensMatch("secret-1", "secret-1")).toBe(true);
    expect(await tokensMatch("secret-2", "secret-1")).toBe(false);
  });
});