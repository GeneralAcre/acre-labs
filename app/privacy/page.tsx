export const metadata = {
  title: "Privacy Policy — AcreLabs",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-16">
      <span className="brand-kicker text-brand-red">Legal</span>
      <h1 className="mt-3 font-heading text-3xl uppercase tracking-tight text-brand-mist">
        Privacy Policy
      </h1>
      <p className="mt-2 text-xs text-brand-mist/50">Last updated: 2026-07-31</p>

      <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-brand-mist/80">
        <p>
          AcreLabs is built to work without collecting more than it needs. Here&apos;s
          exactly what is and isn&apos;t stored.
        </p>

        <section>
          <h2 className="font-heading text-lg uppercase tracking-tight text-brand-mist">
            What We Store
          </h2>
          <p className="mt-2">
            Drop details (title, badge image, claim code, and timing) are stored
            only to let attendees claim and organizers manage their drops. Every
            drop mints from the same AcreLabs-operated contract, so no organizer
            ever provides or controls a contract address. When you claim an NFT,
            we record the event ID, your public
            wallet address, and the resulting transaction hash so it can appear in
            your Collection page. This is kept in a persistent database, scoped to
            the organizer who created each drop.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg uppercase tracking-tight text-brand-mist">
            What We Don&apos;t Collect
          </h2>
          <p className="mt-2">
            No names, IP addresses, or private keys. We never see your wallet&apos;s
            seed phrase or private key — all transactions are signed locally in
            your own wallet extension. We don&apos;t collect your email either,
            unless you choose to sign in with email instead of a wallet — see
            below.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg uppercase tracking-tight text-brand-mist">
            Wallet Connections
          </h2>
          <p className="mt-2">
            Connecting a wallet only shares your public address with this app, the
            same way it would with any site you approve in your wallet. Your
            transactions and NFT ownership are also independently visible on public
            block explorers like SnowTrace — that visibility comes from Avalanche
            itself, not from AcreLabs.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg uppercase tracking-tight text-brand-mist">
            Email Sign-In
          </h2>
          <p className="mt-2">
            If you sign in with email instead of connecting a wallet, your email
            address is collected and used by Privy, our third-party embedded-wallet
            provider, to create and secure that wallet for you. We don&apos;t use
            your email for anything else, and it&apos;s only ever seen by AcreLabs
            if you choose this sign-in method.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg uppercase tracking-tight text-brand-mist">
            Cookies & Tracking
          </h2>
          <p className="mt-2">
            AcreLabs doesn&apos;t use tracking cookies or third-party advertising
            scripts. We use Vercel Analytics for aggregate page-view counts; it&apos;s
            cookieless and doesn&apos;t identify individual visitors.
          </p>
        </section>
      </div>
    </div>
  );
}
