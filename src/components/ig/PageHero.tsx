import type { ReactNode } from "react";
import { FactoryBackdrop } from "./FactoryBackdrop";
import type { ScenePreset } from "./FactoryScene";
import { LineReveal, Reveal } from "./Reveal";

/** Inner-page header: the 3D factory floor framed on the relevant equipment. */
export function PageHero({
  kicker,
  title,
  description,
  actions,
  aside,
  preset,
  focusId,
}: {
  kicker: string;
  title: ReactNode[];
  description?: ReactNode;
  actions?: ReactNode;
  aside?: ReactNode;
  preset: ScenePreset;
  focusId?: string | undefined;
}) {
  return (
    <section className="no-print relative isolate overflow-hidden rounded-b-card bg-scene">
      <FactoryBackdrop preset={preset} focusId={focusId} />
      <div className="bg-veil pointer-events-none absolute inset-0 z-[1]" />
      <div className="bg-veil-side pointer-events-none absolute inset-0 z-[1]" />
      <div className="shell relative z-20 flex min-h-[78svh] flex-col justify-end gap-8 pb-12 pt-40 lg:grid lg:grid-cols-12 lg:items-end">
        <div className="flex flex-col gap-5 lg:col-span-7">
          <Reveal gate delay={150} y={10}>
            <span className="eyebrow">
              <span className="size-1.5 rounded-full bg-hazard" /> {kicker}
            </span>
          </Reveal>
          <LineReveal
            gate
            delay={220}
            lines={title}
            className="max-w-[18ch] text-4xl font-semibold leading-[0.98] tracking-tight sm:text-5xl md:text-6xl"
          />
          {description && (
            <Reveal gate delay={450}>
              <p className="max-w-xl text-base text-foreground/70">{description}</p>
            </Reveal>
          )}
          {actions && (
            <Reveal gate delay={600}>
              <div className="flex flex-wrap gap-3">{actions}</div>
            </Reveal>
          )}
        </div>
        {aside && (
          <Reveal gate delay={500} y={16} scale={0.97} className="lg:col-span-5 lg:justify-self-end">
            {aside}
          </Reveal>
        )}
      </div>
    </section>
  );
}
