"use client";

import { useEffect, useState } from "react";

type TypingTextProps = {
  text: string;
  className?: string;
};

export function TypingText({ text, className }: TypingTextProps) {
  const [visibleText, setVisibleText] = useState("");

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const timer = window.setTimeout(() => setVisibleText(text), 0);
      return () => window.clearTimeout(timer);
    }

    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setVisibleText(text.slice(0, index));

      if (index === text.length) window.clearInterval(timer);
    }, 65);

    return () => window.clearInterval(timer);
  }, [text]);

  return (
    <p aria-label={text} className={className}>
      <span aria-hidden="true">{visibleText}</span>
      <span aria-hidden="true" className="ml-1 inline-block animate-pulse text-brand-red">
        |
      </span>
    </p>
  );
}
