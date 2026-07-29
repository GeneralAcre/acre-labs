import Image from "next/image";

function initialsFor(title: string): string {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function EventBadge({
  title,
  imageUrl,
  size = 96,
  className = "",
}: {
  title: string;
  imageUrl?: string;
  size?: number;
  className?: string;
}) {
  if (imageUrl) {
    return (
      <Image
        src={imageUrl}
        alt={title}
        width={size}
        height={size}
        // Badge images are either data: URIs (uploaded badges) or arbitrary
        // organizer-supplied URLs — neither goes through Vercel's remote
        // image optimizer, which only handles a configured allowlist of hosts.
        unoptimized
        className={`aspect-square rounded-full border border-brand-mist/10 object-cover ${className}`}
      />
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className={`badge-gradient flex aspect-square items-center justify-center rounded-full border border-brand-mist/30 font-heading uppercase text-brand-mist ${className}`}
    >
      <span style={{ fontSize: size * 0.32 }}>{initialsFor(title)}</span>
    </div>
  );
}
