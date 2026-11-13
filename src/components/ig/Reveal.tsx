import { createContext, useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export const IntroContext = createContext<{ ready: boolean }>({ ready: true });
export const useIntroReady = () => useContext(IntroContext).ready;

function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, inView] as const;
}

export function Reveal({
  children,
  className,
  delay = 0,
  y = 18,
  scale,
  gate = false,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  scale?: number;
  gate?: boolean;
}) {
  const ready = useIntroReady();
  const [ref, inView] = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={cn("reveal", className)}
      data-shown={inView && (!gate || ready)}
      style={
        {
          "--reveal-delay": `${delay}ms`,
          "--reveal-y": `${y}px`,
          "--reveal-scale": scale ?? 1,
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}

export function LineReveal({
  lines,
  className,
  delay = 0,
  stagger = 120,
  gate = false,
  as: Tag = "h1",
}: {
  lines: ReactNode[];
  className?: string;
  delay?: number;
  stagger?: number;
  gate?: boolean;
  as?: "h1" | "h2" | "h3";
}) {
  const ready = useIntroReady();
  const [ref, inView] = useInView<HTMLHeadingElement>();
  return (
    <Tag ref={ref} className={className} data-shown={inView && (!gate || ready)}>
      {lines.map((l, i) => (
        <span key={i} className="line-mask">
          <span style={{ "--line-delay": `${delay + i * stagger}ms` } as CSSProperties}>{l}</span>
        </span>
      ))}
    </Tag>
  );
}

export function WordReveal({
  text,
  muted,
  className,
}: {
  text: string;
  muted?: string;
  className?: string;
}) {
  const [ref, inView] = useInView<HTMLHeadingElement>();
  const words = text.split(" ");
  const mutedWords = muted ? muted.split(" ") : [];
  return (
    <h2 ref={ref} className={className} data-shown={inView}>
      {words.map((w, i) => (
        <span key={`a${i}`} className="word" style={{ "--word-delay": `${i * 35}ms` } as CSSProperties}>
          {w}&nbsp;
        </span>
      ))}
      {mutedWords.map((w, i) => (
        <span
          key={`b${i}`}
          className="word text-muted-foreground"
          style={{ "--word-delay": `${(words.length + i) * 35}ms` } as CSSProperties}
        >
          {w}&nbsp;
        </span>
      ))}
    </h2>
  );
}

export function useCountUp(target: number, duration = 1400) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const e = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(e * target));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, target, duration]);
  return [ref, value] as const;
}
