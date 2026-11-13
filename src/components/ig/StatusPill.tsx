import { cva } from "class-variance-authority";
import { STATUS_LABEL, type MachineStatus } from "@/lib/telemetry";
import { cn } from "@/lib/utils";

const pill = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-wider",
  {
    variants: {
      status: {
        normal: "bg-signal-soft text-signal",
        warning: "bg-hazard-soft text-hazard",
        offline: "bg-surface text-muted-foreground",
      },
    },
  },
);
const dot = cva("size-1.5 rounded-full", {
  variants: {
    status: { normal: "bg-signal", warning: "bg-hazard animate-blink", offline: "bg-offline" },
  },
});

export function StatusPill({ status, className }: { status: MachineStatus; className?: string }) {
  return (
    <span className={cn(pill({ status }), className)}>
      <span className={dot({ status })} />
      {STATUS_LABEL[status]}
    </span>
  );
}
