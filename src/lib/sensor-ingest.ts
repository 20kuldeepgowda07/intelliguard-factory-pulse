import { z } from "zod";

/** Validation for readings posted by ESP32 gateways to /api/public/ingest-sensor. */
export const sensorReadingSchema = z
  .object({
    machine: z
      .string()
      .trim()
      .min(1, "machine is required")
      .max(100, "machine must be at most 100 characters")
      .regex(/^[A-Za-z0-9 _.-]+$/, "machine may only contain letters, numbers, spaces, _ . -"),
    vibration: z.number().finite().min(0, "vibration must be >= 0 g").max(50, "vibration must be <= 50 g"),
    temperature: z
      .number()
      .finite()
      .min(-50, "temperature must be >= -50 °C")
      .max(500, "temperature must be <= 500 °C"),
    load: z.number().finite().min(0, "load must be >= 0 %").max(100, "load must be <= 100 %"),
    status: z.enum(["optimal", "inspect", "offline"]),
  })
  .strict();

export type SensorReadingInput = z.infer<typeof sensorReadingSchema>;

export const MAX_BODY_BYTES = 2048;

export function extractBearerToken(header: string | null): string | null {
  const match = /^Bearer ([^\s,]+)$/.exec(header ?? "");
  return match?.[1] ?? null;
}

async function sha256(value: string): Promise<Uint8Array> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return new Uint8Array(buf);
}

/** Constant-time comparison of a provided token against the expected secret. */
export async function tokensMatch(provided: string, expected: string): Promise<boolean> {
  const [a, b] = await Promise.all([sha256(provided), sha256(expected)]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}