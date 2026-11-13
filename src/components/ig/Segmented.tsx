import { cn } from "@/lib/utils";

export function Segmented({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return (
    <div className="flex rounded-full bg-surface p-1" role="tablist">
      {options.map((o) => (
        <button
          key={o.v}
          role="tab"
          aria-selected={value === o.v}
          onClick={() => onChange(o.v)}
          className={cn(
            "rounded-full px-3.5 py-1.5 font-mono text-[11px] font-medium uppercase tracking-wider transition-colors",
            value === o.v ? "bg-ink text-ink-foreground" : "text-foreground/60 hover:text-foreground",
          )}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

