"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Product, PublicEvent } from "@/lib/types";

const projects = [
  { number: "01", name: "Badge", product: "badge" as Product, description: "Collect on-chain proof of the moments you showed up for.", href: "/badge", letter: "B" },
  { number: "02", name: "Content", product: "content" as Product, description: "Check in with your name and X handle — see who else showed up.", href: "/content", letter: "C" },
];

export function ProjectsCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: "start", containScroll: "trimSnaps" });
  const [selectedIndex, setSelectedIndex] = useState(0);
  // Real counts, not decorative — pulled from the same public events feed the
  // claim gallery uses, so a card never claims more live drops than actually exist.
  const [openCounts, setOpenCounts] = useState<Partial<Record<Product, number>>>({});
  const updateSelectedIndex = useCallback(() => {
    if (emblaApi) setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("reInit", updateSelectedIndex).on("select", updateSelectedIndex);
    return () => { emblaApi.off("reInit", updateSelectedIndex).off("select", updateSelectedIndex); };
  }, [emblaApi, updateSelectedIndex]);

  useEffect(() => {
    let cancelled = false;
    async function loadCounts() {
      const now = Date.now();
      const entries = await Promise.all(
        projects.map(async ({ product }) => {
          const res = await fetch(`/api/events/public?product=${product}`);
          const data = await res.json().catch(() => ({ events: [] }));
          const events: PublicEvent[] = data.events ?? [];
          return [product, events.filter((e) => e.expiresAt > now).length] as const;
        })
      );
      if (!cancelled) setOpenCounts(Object.fromEntries(entries));
    }
    loadCounts();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mt-10">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex -ml-4 touch-pan-y">
          {projects.map((project) => (
            <div key={project.number} className="min-w-0 flex-[0_0_88%] pl-4 sm:flex-[0_0_calc(50%-0.5rem)]">
              {project.href ? <Link href={project.href} className="group block h-full"><ProjectCard project={project} openCount={openCounts[project.product]} /></Link> : <ProjectCard project={project} openCount={openCounts[project.product]} />}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between">
        <div className="flex gap-2" aria-label="Project slides">
          {projects.map((project, index) => <button key={project.number} type="button" aria-label={`Go to ${project.name}`} aria-current={selectedIndex === index ? "true" : undefined} className={`h-1.5 rounded-full transition-all ${selectedIndex === index ? "w-8 bg-brand-mist" : "w-3 bg-brand-mist/25 hover:bg-brand-mist/50"}`} onClick={() => emblaApi?.scrollTo(index)} />)}
        </div>
        <div className="flex gap-2">
          <button type="button" aria-label="Previous project" onClick={() => emblaApi?.scrollPrev()} className="grid size-9 place-items-center rounded-full border border-brand-mist/20 text-brand-mist transition-colors hover:border-brand-mist/50"><ChevronLeft className="size-4" /></button>
          <button type="button" aria-label="Next project" onClick={() => emblaApi?.scrollNext()} className="grid size-9 place-items-center rounded-full border border-brand-mist/20 text-brand-mist transition-colors hover:border-brand-mist/50"><ChevronRight className="size-4" /></button>
        </div>
      </div>
    </div>
  );
}

function ProjectCard({ project, openCount }: { project: (typeof projects)[number]; openCount?: number }) {
  const isComingSoon = !project.href;
  return <Card className={`dark-panel relative min-h-60 overflow-hidden border-brand-mist/10 bg-[#141414] ${isComingSoon ? "" : "transition-transform duration-300 group-hover:-translate-y-1 group-hover:border-brand-mist/30"}`}>
    <span className="absolute -bottom-5 -right-1 font-heading text-[8rem] uppercase leading-none tracking-[-0.1em] text-brand-mist/[0.06]">{project.letter}</span>
    <CardContent className="relative flex h-full flex-1 flex-col justify-end p-6">
      <div className="mb-auto flex items-center justify-between gap-3">
        <span className="font-mono text-xs text-brand-mist/45">{project.number} / PROJECT</span>
        {!isComingSoon && (
          <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-brand-mist/50">
            {openCount === undefined ? "…" : openCount === 0 ? "No live drops" : `${openCount} live drop${openCount === 1 ? "" : "s"}`}
          </span>
        )}
      </div>
      <h3 className="font-heading text-4xl uppercase leading-[0.85] tracking-[-0.045em] text-brand-mist sm:text-5xl">{project.name}</h3>
      <p className={`mt-3 ${isComingSoon ? "text-sm font-medium uppercase tracking-[0.18em] text-brand-red" : "max-w-sm text-sm leading-relaxed text-brand-mist/65"}`}>{project.description}</p>
      {!isComingSoon && <span className="mt-5 text-xs font-medium uppercase tracking-[0.18em] text-brand-mist">Open project →</span>}
    </CardContent>
  </Card>;
}
