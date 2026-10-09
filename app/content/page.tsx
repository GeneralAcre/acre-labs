import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { CommunityList } from "@/components/CommunityList";
import { CreateCommunityForm } from "@/components/CreateCommunityForm";

type Tab = "communities" | "create";

const TABS: { value: Tab; label: string; href: string; Icon: typeof Users }[] = [
  { value: "communities", label: "Get your card", href: "/content", Icon: Users },
  { value: "create", label: "Create community", href: "/content?tab=create", Icon: Plus },
];

export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { tab: rawTab } = await searchParams;
  const tab: Tab = rawTab === "create" ? "create" : "communities";

  return (
    <main className="flex flex-1 flex-col bg-background">
      <div className="mx-auto w-full max-w-[1400px] px-4 pt-6 sm:px-6 sm:pt-8">
        <span className="brand-kicker text-muted-foreground">Content</span>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Event cards</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Pick an event below to get your own ID card with your name, X handle, role and photo — or create one for your community.
        </p>

        <nav aria-label="Content" className="mt-6 inline-flex gap-1 rounded-xl border border-border bg-card p-1">
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

      {tab === "create" ? <CreateCommunityForm /> : <CommunityList />}
    </main>
  );
}
