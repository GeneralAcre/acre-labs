export const metadata = {
  title: "Terms of Use — AcreLabs",
};

export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-6 py-16">
      <span className="brand-kicker text-brand-red">Legal</span>
      <h1 className="mt-3 font-heading text-3xl uppercase tracking-tight text-brand-mist">
        Terms of Use
      </h1>
      <p className="mt-2 text-xs text-brand-mist/50">Last updated: 2026-07-31</p>

      <div className="mt-8 flex flex-col gap-6 text-sm leading-relaxed text-brand-mist/80">
        <p>
          AcreLabs is a demo application for claiming event-attendance NFTs on
          Avalanche. By using it, you agree to the following.
        </p>

        <section>
          <h2 className="font-heading text-lg uppercase tracking-tight text-brand-mist">
            What AcreLabs Does
          </h2>
          <p className="mt-2">
            Organizers create drops with a 6-digit claim code and a claim window;
            AcreLabs generates the code and mints from a single AcreLabs-operated
            NFT contract shared across all drops. Attendees who enter the correct
            code within that window can mint an NFT to their own connected
            wallet. AcreLabs never holds, custodies, or has access to your funds
            or private keys — every transaction is signed and broadcast by your
            own wallet, or, if you sign in with email, by the embedded wallet
            described below.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg uppercase tracking-tight text-brand-mist">
            Email Sign-In
          </h2>
          <p className="mt-2">
            If you don&apos;t have a wallet, you can continue with email instead.
            This creates a self-custodial embedded wallet for you through Privy,
            a third-party wallet infrastructure provider — see their{" "}
            <a
              href="https://www.privy.io/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-brand-mist"
            >
              privacy policy
            </a>{" "}
            for how they handle your email and key material. AcreLabs itself
            never sees or stores your private key either way.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg uppercase tracking-tight text-brand-mist">
            No Guarantees
          </h2>
          <p className="mt-2">
            This is demonstration software. Drop titles, pictures, and dates are
            provided by organizers and not verified by AcreLabs. We make no
            guarantee that a claim will succeed or that the service will be
            available at any given time.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg uppercase tracking-tight text-brand-mist">
            On-Chain Activity Is Public
          </h2>
          <p className="mt-2">
            Any transaction you submit through AcreLabs is recorded permanently on
            Avalanche and is publicly visible on block explorers such as SnowTrace.
            Do not claim an NFT with a wallet address you don&apos;t want linked to
            your attendance at an event.
          </p>
        </section>

        <section>
          <h2 className="font-heading text-lg uppercase tracking-tight text-brand-mist">
            Acceptable Use
          </h2>
          <p className="mt-2">
            Don&apos;t use AcreLabs to distribute malicious contracts, scrape claim
            codes, or attempt to claim NFTs you weren&apos;t entitled to. Organizer
            accounts and claim codes are provided as-is with no access controls
            beyond what&apos;s described here.
          </p>
        </section>
      </div>
    </div>
  );
}
