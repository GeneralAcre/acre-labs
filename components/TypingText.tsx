"use client";

import { useEffect, useState } from "react";

type TypingTextProps = {
  text: string;
  className?: string;
};

export function TypingText({ text, className }: TypingTextProps) {
  const [visibleText, setVisibleText] = useState("");

  useEffect(() => {
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setVisibleText(text.slice(0, index));

      if (index === text.length) window.clearInterval(timer);
    }, 65);

    return () => window.clearInterval(timer);
  }, [text]);

  // The full sentence is laid out invisibly underneath and the typed text is
  // overlaid on top, so line breaks are fixed from the first frame — otherwise
  // the paragraph re-wraps (and grows) with every character typed.
  return (
    <p aria-label={text} className={`relative ${className ?? ""}`}>
      <span aria-hidden="true" className="invisible">
        {text}
        <span className="ml-1 inline-block">|</span>
      </span>
      <span aria-hidden="true" className="absolute inset-0">
        {visibleText}
        <span className="ml-1 inline-block animate-pulse text-brand-blue">|</span>
      </span>
    </p>
  );
}
