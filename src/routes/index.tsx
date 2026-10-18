import { createFileRoute, Link } from "@tanstack/react-router";
import { WalletButton } from "@/components/WalletButton";
import { COINS, compact, fmt, useMarkets } from "@/lib/coins";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "memetrade_ — trade large cap memecoins" },
      { name: "description", content: "Trade Fartcoin, WIF, BONK and more with 1000x leverage and zero market impact." },
      { property: "og:title", content: "memetrade_ — trade memecoins" },
      { property: "og:description", content: "1000x leverage on Fartcoin, WIF, BONK. Zero market impact." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const m = useMarkets();
  const tape = COINS.map((c) => `${c.sym} ${fmt(m[c.slug]?.price)}`).join("  ·  ");

  return (
    <main className="min-h-screen bg-background font-mono text-foreground">
      <div className="overflow-hidden border-b border-border py-2 text-xs text-muted-foreground">
        <div className="animate-marquee whitespace-nowrap">{(tape + "  ·  ").repeat(6)}</div>
      </div>

      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 text-sm">
        <span className="font-bold">memetrade<span className="text-primary">_</span></span>
        <div className="flex items-center gap-6 text-muted-foreground">
          <span>mobile app <span className="text-primary">soon</span></span>
          <Link to="/trade/$pair" params={{ pair: "fartcoin" }} className="hover:text-foreground">trade</Link>
          <WalletButton />
        </div>
      </nav>

      <section className="mx-auto max-w-6xl px-6 pb-16 pt-20">
        <h1 className="text-6xl font-bold tracking-tighter sm:text-8xl">
          memetrade<span className="animate-pulse text-primary">_</span>
        </h1>
        <ul className="mt-10 space-y-2 text-xl sm:text-2xl">
          <li><span className="text-primary">1000x</span> leverage</li>
          <li><span className="text-primary">0</span> market impact</li>
          <li><span className="text-primary">100%</span> degen approved</li>
          <li className="text-muted-foreground">fartcoin · wif · bonk — live prices, real charts</li>
        </ul>
        <Link to="/trade/$pair" params={{ pair: "fartcoin" }}
          className="mt-10 inline-block bg-primary px-6 py-3 font-bold text-primary-foreground hover:opacity-90">
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
              className="bg-background p-5 transition-colors hover:bg-card">
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
