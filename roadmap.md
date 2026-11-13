# Roadmap

- [ ] Extend sensor_readings with nullable vibration_x/y/z (-50..50) and vibration_rms (0..50); enable live updates — waiting on user approval of the SQL
- [ ] Update ingest-sensor to accept machine_id, x/y/z/RMS vibration (g), optional timestamp
- [ ] Settings toggle: Simulated vs Live data source
- [ ] Live mode: dashboard cards, trend charts, health status, history list from stored readings, auto-update on new readings
- [ ] Insert sample readings via the endpoint, read them back, verify dashboard shows them
