import { createFileRoute } from "@tanstack/react-router";
import {
  MAX_BODY_BYTES,
  extractBearerToken,
  sensorReadingSchema,
  tokensMatch,
} from "@/lib/sensor-ingest";

const json = (status: number, body: Record<string, unknown>) =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });

export const Route = createFileRoute("/api/public/ingest-sensor")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env["SENSOR_INGEST_TOKEN"];
        if (!expected) {
          console.error("[ingest-sensor] SENSOR_INGEST_TOKEN is not configured");
          return json(500, { ok: false, error: "Server is not configured" });
        }

        const provided = extractBearerToken(request.headers.get("authorization"));
        if (!provided || !(await tokensMatch(provided, expected))) {
          return json(401, { ok: false, error: "Unauthorized" });
        }

        const raw = await request.text();
        if (raw.length > MAX_BODY_BYTES) {
          return json(413, { ok: false, error: "Payload too large" });
        }

        let body: unknown;
        try {
          body = JSON.parse(raw);
        } catch {
          return json(400, { ok: false, error: "Body must be valid JSON" });
        }

        const parsed = sensorReadingSchema.safeParse(body);
        if (!parsed.success) {
          return json(400, {
            ok: false,
            error: "Invalid reading",
            details: parsed.error.issues.map((i) => `${i.path.join(".") || "body"}: ${i.message}`),
          });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("sensor_readings")
          .insert(parsed.data)
          .select("id, created_at")
          .single();

        if (error) {
          console.error("[ingest-sensor] insert failed", error.message);
          return json(500, { ok: false, error: "Could not store reading" });
        }

        return json(201, { ok: true, id: data.id, created_at: data.created_at });
      },
    },
  },
});