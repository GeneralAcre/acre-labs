"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const projects = [
  { number: "01", name: "Badge", description: "Collect on-chain proof of the moments you showed up for.", href: "/badge", letter: "B" },
  { number: "02", name: "Content", description: "Coming soon", letter: "C" },
];

export function ProjectsCarousel() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: "start", containScroll: "trimSnaps" });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const updateSelectedIndex = useCallback(() => {
    if (emblaApi) setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("reInit", updateSelectedIndex).on("select", updateSelectedIndex);
    return () => { emblaApi.off("reInit", updateSelectedIndex).off("select", updateSelectedIndex); };
  }, [emblaApi, updateSelectedIndex]);

  return (
    <div className="mt-10">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex -ml-4 touch-pan-y">
          {projects.map((project) => (
            <div key={project.number} className="min-w-0 flex-[0_0_88%] pl-4 sm:flex-[0_0_calc(50%-0.5rem)]">
              {project.href ? <Link href={project.href} className="group block h-full"><ProjectCard project={project} /></Link> : <ProjectCard project={project} />}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-5 flex items-center justify-between">
        <div className="flex gap-2" aria-label="Project slides">
          {projects.map((project, index) => <button key={project.number} type="button" aria-label={`Go to ${project.name}`} aria-current={selectedIndex === index ? "true" : undefined} className={`h-1.5 rounded-full transition-all ${selectedIndex === index ? "w-8 bg-brand-red" : "w-3 bg-brand-mist/25 hover:bg-brand-mist/50"}`} onClick={() => emblaApi?.scrollTo(index)} />)}
        </div>
        <div className="flex gap-2">
          <button type="button" aria-label="Previous project" onClick={() => emblaApi?.scrollPrev()} className="grid size-9 place-items-center rounded-full border border-brand-mist/20 text-brand-mist transition-colors hover:border-brand-mist/50"><ChevronLeft className="size-4" /></button>
          <button type="button" aria-label="Next project" onClick={() => emblaApi?.scrollNext()} className="grid size-9 place-items-center rounded-full border border-brand-mist/20 text-brand-mist transition-colors hover:border-brand-mist/50"><ChevronRight className="size-4" /></button>
        </div>
      </div>
    </div>
  );
}

function ProjectCard({ project }: { project: (typeof projects)[number] }) {
  const isComingSoon = !project.href;
  return <Card className={`relative min-h-60 overflow-hidden border-brand-mist/10 bg-brand-surface ${isComingSoon ? "" : "transition-transform duration-300 group-hover:-translate-y-1 group-hover:border-brand-mist/30"}`}>
    <div className={`absolute inset-0 bg-[radial-gradient(circle_at_80%_25%,rgba(216,8,25,${isComingSoon ? "0.2" : "0.4"}),transparent_20rem)]`} />
    <span className="absolute -bottom-5 -right-1 font-heading text-[8rem] uppercase leading-none tracking-[-0.1em] text-brand-mist/[0.05]">{project.letter}</span>
    <CardContent className="relative flex h-full flex-1 flex-col justify-end p-6">
      <span className="mb-auto font-mono text-xs text-brand-mist/45">{project.number} / PROJECT</span>
      <h3 className="font-heading text-4xl uppercase leading-[0.85] tracking-[-0.045em] text-brand-mist sm:text-5xl">{project.name}</h3>
      <p className={`mt-3 ${isComingSoon ? "text-sm font-medium uppercase tracking-[0.18em] text-brand-red" : "max-w-sm text-sm leading-relaxed text-brand-mist/65"}`}>{project.description}</p>
      {!isComingSoon && <span className="mt-5 text-xs font-medium uppercase tracking-[0.18em] text-brand-mist">Open project →</span>}
    </CardContent>
  </Card>;
}
