"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type PrintTextProps = {
  text: string;
  className?: string;
  speed?: number;
  delay?: number;
  caret?: boolean;
  reserveSpace?: boolean;
};

export function PrintText({
  text,
  className,
  speed = 28,
  delay = 0,
  caret = true,
  reserveSpace = false,
}: PrintTextProps) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(delay === 0);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) {
      setStarted(true);
      setCount(text.length);
      return;
    }

    setCount(0);
    setStarted(delay === 0);
    const startTimer = window.setTimeout(() => setStarted(true), delay);
    return () => window.clearTimeout(startTimer);
  }, [text, delay]);

  useEffect(() => {
    if (!started || count >= text.length) return;
    const timer = window.setTimeout(() => setCount((current) => current + 1), speed);
    return () => window.clearTimeout(timer);
  }, [started, count, text, speed]);

  const visible = text.slice(0, count);
  const printing = started && count < text.length;

  return (
    <span className={cn(reserveSpace ? "relative block w-full" : "relative inline", className)}>
      {reserveSpace ? <span className="invisible whitespace-pre-wrap">{text}</span> : null}
      <span className={cn(reserveSpace && "absolute inset-0 whitespace-pre-wrap")}>
        {visible}
        {caret && (printing || count === 0) ? <span className="print-caret" aria-hidden /> : null}
      </span>
    </span>
  );
}
