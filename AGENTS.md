<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- IntelliGuard is a prototype with simulated telemetry: machine specs, series generation and status rules live in `src/lib/telemetry.ts` (pure, unit-tested); live state, alerts and preferences live in `src/lib/demo-store.tsx` and persist to localStorage — no backend until real sensors exist.
- SSR and first paint use the fixed `REFERENCE_NOW`; real time is applied after hydration so server and client markup match.
- The 3D factory scene (`src/components/ig/FactoryScene.tsx`) is lazy-loaded behind `ClientOnly` via `FactoryBackdrop`; never import it statically from a route, because three.js cannot run during SSR.
- Beacon labels are plain DOM elements positioned each frame by `LabelProjector`, not drei `<Html>`, which spawns extra React roots and logs unmount races.
- Three.js materials need literal colors; keep them in the scene's `C` palette mirroring the CSS tokens in `src/styles.css`.
