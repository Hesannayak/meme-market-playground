import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { WalletButton } from "@/components/WalletButton";
import { PriceChart } from "@/components/PriceChart";
import { COINS, compact, fmt, getCoin, useMarkets } from "@/lib/coins";
import { useTrading, calcPnl, isLiquidated, isTakeProfitHit, type Position } from "@/lib/trading";

export const Route = createFileRoute("/trade/$pair")({
  loader: ({ params }) => {
    const coin = getCoin(params.pair);
    if (!coin) throw notFound();
    return { slug: coin.slug };
  },
  head: ({ loaderData }) => {
    const c = loaderData ? getCoin(loaderData.slug) : undefined;
    const t = c ? `${c.sym}-PERP live chart — memetrade_` : "Market not found — memetrade_";
    const d = c ? `Trade ${c.name} (${c.sym}) with up to 1000x leverage. Live price chart and market stats.` : "This market does not exist.";
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
  const [size, setSize] = useState(10);
  const trading = useTrading();

  const coinPositions = trading.positions.filter((p) => p.coin === slug);

  return (
    <main className="min-h-screen bg-background font-mono text-foreground">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 text-sm">
        <Link to="/" className="font-bold">memetrade<span className="text-primary">_</span></Link>
        <div className="mx-6 flex flex-1 justify-end gap-4 overflow-x-auto text-xs">
          {COINS.map((c) => (
            <Link key={c.slug} to="/trade/$pair" params={{ pair: c.slug }}
              className={c.slug === slug ? "text-primary" : "text-muted-foreground hover:text-foreground"}>{c.sym}</Link>
          ))}
        </div>
        <WalletButton />
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
            {coinPositions.length === 0 ? (
              <OrderPanel coin={coin} slug={slug} price={s?.price} lev={lev} setLev={setLev} size={size} setSize={setSize} />
            ) : (
              <PositionPanel positions={coinPositions} price={s?.price} coin={coin} />
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function OrderPanel({ coin, slug, price, lev, setLev, size, setSize }: {
  coin: { sym: string; slug: string };
  slug: string;
  price?: number;
  lev: number;
  setLev: (v: number) => void;
  size: number;
  setSize: (v: number) => void;
}) {
  const trading = useTrading();
  const [err, setErr] = useState<string | null>(null);

  const open = (side: "long" | "short") => {
    if (!price) return;
    if (!trading.connected) { setErr("connect wallet to trade"); return; }
    if (size <= 0) { setErr("enter a valid size"); return; }
    if (size > trading.balance) { setErr("insufficient balance"); return; }

    const liqPrice = side === "long"
      ? price * (1 - 1 / lev)
      : price * (1 + 1 / lev);

    const ok = trading.openPosition({
      coin: slug,
      side,
      entryPrice: price,
      size,
      leverage: lev,
      liqPrice,
      takeProfit: null,
    });
    if (!ok) setErr("insufficient balance");
    else setErr(null);
  };

  return (
    <>
      <div>
        <div className="mb-2 text-muted-foreground">size (usd)</div>
        <input type="number" value={size} min={1} onChange={(e) => { setSize(Math.max(0, +e.target.value)); setErr(null); }}
          className="w-full border border-border bg-background px-3 py-2" />
      </div>
      <div>
        <div className="mb-2 flex justify-between text-muted-foreground"><span>leverage</span><span className="text-primary">{lev}x</span></div>
        <input type="range" min={1} max={1000} value={lev} onChange={(e) => setLev(+e.target.value)} className="w-full accent-[var(--primary)]" />
      </div>
      <Row k="notional" v={`$${(size * lev).toLocaleString()}`} />
      <Row k="qty" v={price ? `${((size * lev) / price).toLocaleString(undefined, { maximumFractionDigits: 0 })} ${coin.sym}` : "—"} />
      <Row k="liq. long" v={price ? `$${fmt(price * (1 - 1 / lev))}` : "—"} />
      <Row k="liq. short" v={price ? `$${fmt(price * (1 + 1 / lev))}` : "—"} />
      <div className="grid grid-cols-2 gap-2 pt-2">
        <button onClick={() => open("long")} className="bg-up py-3 font-bold text-background hover:opacity-90 active:opacity-75">long</button>
        <button onClick={() => open("short")} className="bg-down py-3 font-bold text-background hover:opacity-90 active:opacity-75">short</button>
      </div>
      {err && <p className="text-xs text-down">{err}</p>}
      {trading.connected && <p className="text-xs text-muted-foreground">balance: ${trading.balance.toFixed(2)} USDC</p>}
      <p className="text-xs text-muted-foreground">live data from Hyperliquid</p>
    </>
  );
}

function PositionPanel({ positions, price, coin }: { positions: Position[]; price?: number; coin: { sym: string } }) {
  const trading = useTrading();
  const [tpInputs, setTpInputs] = useState<Record<string, string>>({});
  const [, tick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => tick((t) => t + 1), 500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!price) return;
    for (const pos of positions) {
      if (isLiquidated(pos, price)) {
        trading.closePosition(pos.id, -pos.size);
        return;
      }
      if (isTakeProfitHit(pos, price)) {
        const pnl = calcPnl(pos, price);
        trading.closePosition(pos.id, pnl);
        return;
      }
    }
  }, [price, positions, trading]);

  return (
    <>
      <div className="text-xs font-bold text-primary uppercase tracking-wider">open positions</div>
      {positions.map((pos) => {
        const pnl = price ? calcPnl(pos, price) : 0;
        const pnlPct = price ? (pnl / pos.size) * 100 : 0;
        const isUp = pnl >= 0;

        return (
          <div key={pos.id} className="space-y-3 border border-border p-3">
            <div className="flex items-center justify-between">
              <span className={`font-bold ${pos.side === "long" ? "text-up" : "text-down"}`}>
                {pos.side.toUpperCase()} {pos.leverage}x
              </span>
              <span className="text-xs text-muted-foreground">{coin.sym}-PERP</span>
            </div>

            <div className={`text-2xl font-bold tabular-nums ${isUp ? "text-up" : "text-down"}`}>
              {isUp ? "+" : ""}{pnl.toFixed(2)} USDC
            </div>
            <div className={`text-xs tabular-nums ${isUp ? "text-up" : "text-down"}`}>
              {isUp ? "+" : ""}{pnlPct.toFixed(2)}%
            </div>

            <Row k="entry" v={`$${fmt(pos.entryPrice)}`} />
            <Row k="mark" v={price ? `$${fmt(price)}` : "—"} />
            <Row k="margin" v={`$${pos.size.toFixed(2)}`} />
            <Row k="liquidation" v={`$${fmt(pos.liqPrice)}`} />

            <div>
              <div className="mb-1 text-xs text-muted-foreground">take profit</div>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder={pos.takeProfit ? `$${pos.takeProfit}` : "set price"}
                  value={tpInputs[pos.id] ?? ""}
                  onChange={(e) => setTpInputs((p) => ({ ...p, [pos.id]: e.target.value }))}
                  className="flex-1 border border-border bg-background px-2 py-1 text-xs"
                />
                <button
                  onClick={() => {
                    const val = parseFloat(tpInputs[pos.id] ?? "");
                    if (!isNaN(val) && val > 0) {
                      trading.setTakeProfit(pos.id, val);
                      setTpInputs((p) => ({ ...p, [pos.id]: "" }));
                    }
                  }}
                  className="border border-primary px-2 py-1 text-xs text-primary hover:bg-primary hover:text-primary-foreground"
                >
                  set
                </button>
                {pos.takeProfit && (
                  <button
                    onClick={() => trading.setTakeProfit(pos.id, null)}
                    className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    ×
                  </button>
                )}
              </div>
              {pos.takeProfit && (
                <div className="mt-1 text-xs text-up">TP @ ${fmt(pos.takeProfit)}</div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => { if (price) trading.closePosition(pos.id, calcPnl(pos, price)); }}
                className="border border-border py-2 text-xs hover:bg-background"
              >
                close position
              </button>
              <button
                onClick={() => trading.closePosition(pos.id, -pos.size)}
                className="border border-down py-2 text-xs text-down hover:bg-down hover:text-background"
              >
                market close
              </button>
            </div>
          </div>
        );
      })}
      <p className="text-xs text-muted-foreground">balance: ${trading.balance.toFixed(2)} USDC</p>
    </>
  );
}

function Stat({ label, value, cls = "" }: { label: string; value: string; cls?: string }) {
  return <div><div className="text-xs text-muted-foreground">{label}</div><div className={`tabular-nums ${cls}`}>{value}</div></div>;
}
function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{k}</span><span className="tabular-nums">{v}</span></div>;
}
