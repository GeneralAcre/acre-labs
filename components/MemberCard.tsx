import { Identicon } from "./Identicon";
import { DEFAULT_ACCENT_COLOR, DEFAULT_CARD_COLOR, readableTextOn } from "@/lib/color";
import { memberIdLabel } from "@/lib/memberId";

function formatDate(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

// Deterministic 32-bit hash so a card's barcode never changes between
// renders or devices.
function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}


// Decorative barcode: bar widths derived from the card's seed.
function Barcode({ seed }: { seed: string }) {
  const bars: { x: number; w: number }[] = [];
  let h = hash(seed);
  let x = 0;
  while (x < 96) {
    h = Math.imul(h ^ (h >>> 15), 2654435761) >>> 0;
    const w = 1 + (h % 3);
    const gap = 1 + ((h >>> 3) % 2);
    bars.push({ x, w });
    x += w + gap;
  }
  return (
    <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true">
      {bars.map((bar) => (
        <rect key={bar.x} x={bar.x} y={0} width={bar.w} height={20} fill="currentColor" />
      ))}
    </svg>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[2.1cqw] font-semibold uppercase leading-none tracking-wide">{label}:</p>
      <p className="mt-[0.6cqw] truncate font-serif text-[4.2cqw] uppercase leading-none tracking-tight">{value}</p>
    </div>
  );
}

// A community member card styled as a landscape ID card: photo + barcode on
// the left, the community as the headline, ID-style fields, and a colored
// strip along the bottom. The layout is fixed; each community's template only
// sets cardColor (background) and accentColor (headline + bottom strip), with
// text color picked automatically for contrast. Every size is in container-query units (cqw) so the card
// scales as one piece from the wall's small tiles to the large preview.
export function MemberCard({
  id,
  memberNo,
  communityName,
  name,
  xHandle,
  avatarUrl,
  role = null,
  cardColor = DEFAULT_CARD_COLOR,
  accentColor = DEFAULT_ACCENT_COLOR,
  issuedAt = null,
  joinedAt,
  preview = false,
  className = "",
}: {
  id: string;
  // Join position in the community; rendered as e.g. "TE-0001".
  memberNo: number;
  communityName: string;
  name: string;
  xHandle: string;
  avatarUrl: string | null;
  role?: string | null;
  cardColor?: string;
  accentColor?: string;
  // The event's chosen date of issue; falls back to when the member joined.
  issuedAt?: number | null;
  joinedAt: number;
  preview?: boolean;
  className?: string;
}) {
  const number = memberIdLabel(communityName, memberNo);
  const ink = readableTextOn(cardColor);
  const stripInk = readableTextOn(accentColor);

  const body = (
    <div
      className="relative flex aspect-[1.55/1] w-full flex-col overflow-hidden rounded-[3.5cqw]"
      style={{ backgroundColor: cardColor, color: ink }}
    >
      <div className="flex flex-1 gap-[4cqw] px-[4.5cqw] pt-[4cqw]">
        {/* Photo + barcode */}
        <div className="flex w-[31%] shrink-0 flex-col">
          <p className="text-[1.6cqw] font-semibold uppercase leading-tight">
            Identification card
            <br />
            No: {number}
          </p>
          <div className="mt-[1cqw] aspect-[3/4] w-full overflow-hidden bg-neutral-900">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- member-uploaded data: URI
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-neutral-900">
                <Identicon address={xHandle} size={56} tone="dark" className="border-0 bg-transparent" />
              </div>
            )}
          </div>
          <div className="mt-[1.5cqw] h-[6cqw] w-full">
            <Barcode seed={id} />
          </div>
        </div>

        {/* Headline + fields */}
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="text-right font-serif text-[2.6cqw] lowercase italic leading-none opacity-70">
            member id card
          </p>
          <div className="mt-[1cqw] flex min-w-0 items-center gap-[1.8cqw]">
            <p
              className="line-clamp-2 min-w-0 text-[6.4cqw] font-black uppercase italic leading-[0.9] tracking-tight"
              style={{ color: accentColor, textShadow: `0.25cqw 0.25cqw 0 ${ink}` }}
            >
              {communityName}
            </p>
          </div>

          <div className="mt-auto grid grid-cols-2 gap-x-[3cqw] gap-y-[2.6cqw] pb-[1.5cqw]">
            <Field label="Name" value={name} />
            <Field label="X handle" value={`@${xHandle}`} />
            <Field label="Community" value={communityName} />
            <Field label="Role" value={role || "Member"} />
          </div>

          <div className="flex items-end justify-between gap-[2cqw] border-t border-current/25 pb-[2.4cqw] pt-[1.2cqw] text-[1.5cqw] font-semibold uppercase leading-tight">
            <span>Date of issue {formatDate(issuedAt ?? joinedAt)}</span>
            <span className="text-right">
              Issued on AcreLabs
              <br />
              <span className="font-normal normal-case">the holder of this card is a community member</span>
            </span>
          </div>
        </div>
      </div>

      {/* Accent strip */}
      <div
        className="flex items-center justify-between gap-[2cqw] border-t-[0.4cqw] px-[4.5cqw] py-[1.4cqw] font-serif text-[2.4cqw] leading-none"
        style={{ backgroundColor: accentColor, color: stripInk, borderColor: ink }}
      >
        <span className="truncate uppercase">{communityName}</span>
        <span className="shrink-0">Verified member · AcreLabs</span>
      </div>
    </div>
  );

  // The outer element is the size container the cqw units resolve against.
  const frame = `block w-full [container-type:inline-size] ${className}`;

  if (preview) {
    return <div className={frame}>{body}</div>;
  }
  return (
    <a
      href={`https://x.com/${xHandle}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`${frame} rounded-xl transition-transform duration-200 hover:-translate-y-0.5`}
    >
      {body}
    </a>
  );
}
