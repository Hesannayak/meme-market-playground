import { createFileRoute, Link } from "@tanstack/react-router";
import { WalletButton } from "@/components/WalletButton";
import { COINS, compact, fmt, useMarkets } from "@/lib/coins";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Oton trades — trade large cap memecoins" },
      { name: "description", content: "Trade Fartcoin, WIF, BONK and more with 1000x leverage and zero market impact." },
      { property: "og:title", content: "Oton trades — trade memecoins" },
      { property: "og:description", content: "1000x leverage on Fartcoin, WIF, BONK. Zero market impact." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function XIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" width="16" height="16">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function Index() {
  const m = useMarkets();
  const tape = COINS.map((c) => `${c.sym} ${fmt(m[c.slug]?.price)}`).join("  ·  ");

  return (
    <main className="min-h-screen bg-background font-mono text-foreground">
      <div className="overflow-hidden border-b border-border py-2 text-xs text-muted-foreground">
        <div className="animate-marquee whitespace-nowrap">{(tape + "  ·  ").repeat(6)}</div>
      </div>

      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 text-sm">
        <span className="flex items-center gap-2 font-bold">
          <img src="/logo.png" alt="Oton" className="h-7 w-7" />
          <span>Oton<span className="text-primary"> trades</span></span>
        </span>
        <div className="flex items-center gap-6 text-muted-foreground">
          <a href="https://x.com/lab100x" target="_blank" rel="noopener noreferrer" className="hover:text-foreground cursor-pointer">
            <XIcon />
          </a>
          <Link to="/trade/$pair" params={{ pair: "fartcoin" }} className="cursor-pointer hover:text-foreground">trade</Link>
          <Link to="/docs" className="cursor-pointer hover:text-foreground">docs</Link>
          <WalletButton />
        </div>
      </nav>

      <section className="mx-auto max-w-6xl px-6 pb-16 pt-20">
        <h1 className="flex items-center gap-4 text-6xl font-bold tracking-tighter sm:text-8xl">
          <img src="/logo.png" alt="" className="hidden h-20 w-20 sm:block sm:h-24 sm:w-24" />
          <span>Oton<span className="animate-pulse text-primary"> trades</span></span>
        </h1>
        <ul className="mt-10 space-y-2 text-xl sm:text-2xl">
          <li><span className="text-primary">1000x</span> leverage</li>
          <li><span className="text-primary">0</span> market impact</li>
          <li><span className="text-primary">100%</span> degen approved</li>
          <li className="text-muted-foreground">fartcoin · wif · bonk — live prices, real charts</li>
        </ul>
        <Link to="/trade/$pair" params={{ pair: "fartcoin" }}
          className="mt-10 inline-block cursor-pointer bg-primary px-6 py-3 font-bold text-primary-foreground hover:opacity-90">
          start trading →
        </Link>
      </section>

      <section className="mx-auto grid max-w-6xl gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
        {COINS.map((c) => {
          const s = m[c.slug];
          const ch = s ? ((s.price - s.prev) / s.prev) * 100 : 0;
          const up = ch >= 0;
          return (
            <Link key={c.slug} to="/trade/$pair" params={{ pair: c.slug }}
              className="cursor-pointer bg-background p-5 transition-colors hover:bg-card">
              <div className="flex justify-between text-sm">
                <span className="font-bold">{c.sym}-PERP</span>
                <span className={up ? "text-up" : "text-down"}>{s ? `${up ? "+" : ""}${ch.toFixed(2)}%` : "—"}</span>
              </div>
              <div className="text-xs text-muted-foreground">{c.name}</div>
              <div className="mt-3 text-2xl tabular-nums">${fmt(s?.price)}</div>
              <div className="mt-2 text-xs text-muted-foreground">vol {compact(s?.vol)} · OI {compact(s?.oi)}</div>
            </Link>
          );
        })}
      </section>

      <footer className="mt-16 border-t border-border px-6 py-8 text-center text-xs text-muted-foreground">
        not financial advice · live data from Hyperliquid
      </footer>
    </main>
  );
}
