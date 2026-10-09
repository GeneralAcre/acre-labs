import Link from "next/link";
import { Plus, Ticket } from "lucide-react";
import { ClaimGalleryPage } from "@/components/ClaimGalleryPage";
import { CreateDropPage } from "@/components/CreateDropPage";

type Tab = "claim" | "create";

const TABS: { value: Tab; label: string; href: string; Icon: typeof Ticket }[] = [
  { value: "claim", label: "Claim", href: "/badge#badge-tabs", Icon: Ticket },
  { value: "create", label: "Create Badge", href: "/badge?tab=create#badge-tabs", Icon: Plus },
];

export default async function BadgePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { tab: rawTab } = await searchParams;
  const tab: Tab = rawTab === "create" ? "create" : "claim";

  return (
    <main className="flex flex-1 flex-col bg-background">
      <div id="badge-tabs" className="scroll-mt-16 px-4 pt-5 sm:px-6 sm:pt-6">
        <div className="mx-auto max-w-[1400px]">
          <nav aria-label="Badge" className="inline-flex gap-1 rounded-xl border border-border bg-card p-1">
            {TABS.map(({ value, label, href, Icon }) => (
              <Link
                key={value}
                href={href}
                scroll={false}
                aria-current={tab === value ? "page" : undefined}
                className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg px-4 text-sm font-medium transition-colors ${
                  tab === value ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {tab === "create" ? (
        <CreateDropPage product="badge" />
      ) : (
        <ClaimGalleryPage product="badge" showHero={false} />
      )}
    </main>
  );
}
