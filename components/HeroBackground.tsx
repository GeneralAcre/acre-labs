"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const IMAGES = [
  "/LandingPicture/LandingHero-1.jpg",
  "/LandingPicture/LandingHero-2.jpg",
  "/LandingPicture/LandingHero-3.jpg",
  "/LandingPicture/LandingHero-4.jpg",
];

const INTERVAL_MS = 10000;

export function HeroBackground() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % IMAGES.length);
    }, INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="absolute inset-0 z-0">
      {IMAGES.map((src, i) => (
        <Image
          key={src}
          src={src}
          alt=""
          fill
          priority={i === 0}
          className={`object-cover transition-opacity duration-1000 ease-in-out ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
      {/* Plain dark wash on top of the photos so the white text stays
          readable no matter which image is showing. */}
      <div className="absolute inset-0 bg-black/65" />
    </div>
  );
}
