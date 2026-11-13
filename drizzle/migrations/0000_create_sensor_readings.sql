CREATE TABLE public.sensor_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine TEXT NOT NULL CHECK (char_length(machine) BETWEEN 1 AND 100),
  vibration NUMERIC NOT NULL CHECK (vibration >= 0),
  temperature NUMERIC NOT NULL CHECK (temperature BETWEEN -50 AND 500),
  load NUMERIC NOT NULL CHECK (load BETWEEN 0 AND 100),
  status TEXT NOT NULL CHECK (status IN ('optimal','inspect','offline')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX sensor_readings_machine_created_idx ON public.sensor_readings (machine, created_at DESC);
CREATE INDEX sensor_readings_created_idx ON public.sensor_readings (created_at DESC);

GRANT SELECT ON public.sensor_readings TO anon, authenticated;
GRANT ALL ON public.sensor_readings TO service_role;

ALTER TABLE public.sensor_readings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sensor readings are readable"
ON public.sensor_readings FOR SELECT
TO anon, authenticated
USING (true);