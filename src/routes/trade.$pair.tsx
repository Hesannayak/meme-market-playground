import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { PriceChart } from "@/components/PriceChart";
import { COINS, compact, fmt, getCoin, useMarkets } from "@/lib/coins";

export const Route = createFileRoute("/trade/$pair")({
  loader: ({ params }) => {
    const coin = getCoin(params.pair);
    if (!coin) throw notFound();
    return { slug: coin.slug };
  },
  head: ({ loaderData }) => {
    const c = loaderData ? getCoin(loaderData.slug) : undefined;
    const t = c ? `${c.sym}-PERP live chart — memetrade_` : "Market not found — memetrade_";
    const d = c ? `Paper trade ${c.name} (${c.sym}) with up to 1000x leverage. Live price chart and market stats.` : "This market does not exist.";
    return { meta: [
      { title: t }, { name: "description", content: d },
      { property: "og:title", content: t }, { property: "og:description", content: d },
      { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
    ] };
  },
  component: PairPage,
  notFoundComponent: () => (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background font-mono text-foreground">
      <p>market not found_</p><Link to="/" className="text-primary">← back</Link>
    </main>
  ),
  errorComponent: ({ error }) => <div className="p-6 font-mono">{String(error)}</div>,
});

function PairPage() {
  const { slug } = Route.useLoaderData();
  const coin = getCoin(slug)!;
  const markets = useMarkets();
  const s = markets[slug];
  const ch = s ? ((s.price - s.prev) / s.prev) * 100 : 0;
  const [lev, setLev] = useState(100);
  const [size, setSize] = useState(1000);

  return (
    <main className="min-h-screen bg-background font-mono text-foreground">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 text-sm">
        <Link to="/" className="font-bold">memetrade<span className="text-primary">_</span></Link>
        <div className="flex gap-4 overflow-x-auto text-xs">
          {COINS.map((c) => (
            <Link key={c.slug} to="/trade/$pair" params={{ pair: c.slug }}
              className={c.slug === slug ? "text-primary" : "text-muted-foreground hover:text-foreground"}>{c.sym}</Link>
          ))}
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-6 pb-16">
        <div className="flex flex-wrap items-end gap-x-10 gap-y-4 border-b border-border pb-5">
          <div>
            <h1 className="text-3xl font-bold">{coin.sym}-PERP</h1>
            <p className="text-xs text-muted-foreground">{coin.name} · {coin.blurb}</p>
          </div>
          <div className="text-3xl tabular-nums">${fmt(s?.price)}</div>
          <Stat label="24h" value={s ? `${ch >= 0 ? "+" : ""}${ch.toFixed(2)}%` : "—"} cls={ch >= 0 ? "text-up" : "text-down"} />
          <Stat label="24h volume" value={compact(s?.vol)} />
          <Stat label="open interest" value={compact(s?.oi)} />
          <Stat label="funding /1h" value={s ? `${(s.funding * 100).toFixed(4)}%` : "—"} />
        </div>

        <div className="mt-6 grid gap-px border border-border bg-border lg:grid-cols-[1fr_320px]">
          <div className="bg-card p-4"><PriceChart coin={coin} /></div>
          <div className="space-y-5 bg-card p-6 text-sm">
            <div>
              <div className="mb-2 text-muted-foreground">size (paper usd)</div>
              <input type="number" value={size} min={1} onChange={(e) => setSize(Math.max(0, +e.target.value))}
                className="w-full border border-border bg-background px-3 py-2" />
            </div>
            <div>
              <div className="mb-2 flex justify-between text-muted-foreground"><span>leverage</span><span className="text-primary">{lev}x</span></div>
              <input type="range" min={1} max={1000} value={lev} onChange={(e) => setLev(+e.target.value)} className="w-full accent-[var(--primary)]" />
            </div>
            <Row k="notional" v={`$${(size * lev).toLocaleString()}`} />
            <Row k="qty" v={s ? `${((size * lev) / s.price).toLocaleString(undefined, { maximumFractionDigits: 0 })} ${coin.sym}` : "—"} />
            <Row k="liq. long" v={s ? `$${fmt(s.price * (1 - 1 / lev))}` : "—"} />
            <Row k="liq. short" v={s ? `$${fmt(s.price * (1 + 1 / lev))}` : "—"} />
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button className="bg-up py-3 font-bold text-background">long</button>
              <button className="bg-down py-3 font-bold text-background">short</button>
            </div>
            <p className="text-xs text-muted-foreground">live data from Hyperliquid · paper trading only</p>
          </div>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value, cls = "" }: { label: string; value: string; cls?: string }) {
  return <div><div className="text-xs text-muted-foreground">{label}</div><div className={`tabular-nums ${cls}`}>{value}</div></div>;
}
function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{k}</span><span className="tabular-nums">{v}</span></div>;
}
