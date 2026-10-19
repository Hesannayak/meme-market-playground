import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { WalletButton } from "@/components/WalletButton";
import { PriceChart } from "@/components/PriceChart";
import { COINS, compact, fmt, getCoin, useMarkets } from "@/lib/coins";
import { useTrading, calcPnl, isLiquidated, isTakeProfitHit, type Position, type ClosedPosition } from "@/lib/trading";

export const Route = createFileRoute("/trade/$pair")({
  loader: ({ params }) => {
    const coin = getCoin(params.pair);
    if (!coin) throw notFound();
    return { slug: coin.slug };
  },
  head: ({ loaderData }) => {
    const c = loaderData ? getCoin(loaderData.slug) : undefined;
    const t = c ? `${c.sym}-PERP live chart — Oton trades` : "Market not found — Oton trades";
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
      <p>market not found</p><Link to="/" className="text-primary">← back</Link>
    </main>
  ),
  errorComponent: ({ error }) => <div className="p-6 font-mono">{String(error)}</div>,
});

function XIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" width="16" height="16">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function PairPage() {
  const { slug } = Route.useLoaderData();
  const coin = getCoin(slug)!;
  const markets = useMarkets();
  const s = markets[slug];
  const ch = s ? ((s.price - s.prev) / s.prev) * 100 : 0;
  const [lev, setLev] = useState(100);
  const [size, setSize] = useState(10);
  const trading = useTrading();
  const [bottomTab, setBottomTab] = useState<"positions" | "history">("positions");

  const coinPositions = trading.positions.filter((p) => p.coin === slug);
  const coinHistory = (trading.history ?? []).filter((h) => h.coin === slug);

  return (
    <main className="min-h-screen bg-background font-mono text-foreground">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 text-sm">
        <Link to="/" className="flex items-center gap-2 font-bold">
          <img src="/logo.png" alt="Oton" className="h-7 w-7" />
          <span>Oton<span className="text-primary"> trades</span></span>
        </Link>
        <div className="mx-6 flex flex-1 justify-end gap-4 overflow-x-auto text-xs">
          {COINS.map((c) => (
            <Link key={c.slug} to="/trade/$pair" params={{ pair: c.slug }}
              className={`cursor-pointer ${c.slug === slug ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>{c.sym}</Link>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <Link to="/docs" className="text-muted-foreground hover:text-foreground cursor-pointer">docs</Link>
          <a href="https://x.com/lab100x" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground cursor-pointer">
            <XIcon />
          </a>
          <WalletButton />
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
          <div className="bg-card p-4"><PriceChart coin={coin} positions={coinPositions} /></div>
          <div className="space-y-5 bg-card p-6 text-sm">
            <OrderPanel coin={coin} slug={slug} price={s?.price} lev={lev} setLev={setLev} size={size} setSize={setSize} />
          </div>
        </div>

        <div className="mt-4 border border-border">
          <div className="flex border-b border-border text-xs">
            <button
              onClick={() => setBottomTab("positions")}
              className={`cursor-pointer px-5 py-3 font-bold uppercase tracking-wider ${bottomTab === "positions" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              positions {coinPositions.length > 0 && <span className="ml-1 text-primary">({coinPositions.length})</span>}
            </button>
            <button
              onClick={() => setBottomTab("history")}
              className={`cursor-pointer px-5 py-3 font-bold uppercase tracking-wider ${bottomTab === "history" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
            >
              history {coinHistory.length > 0 && <span className="ml-1 text-muted-foreground">({coinHistory.length})</span>}
            </button>
          </div>
          {bottomTab === "positions" ? (
            <PositionsTable positions={coinPositions} price={s?.price} coin={coin} />
          ) : (
            <HistoryTable history={coinHistory} coin={coin} />
          )}
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
    if (!price || !trading.connected) return;
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
          className="w-full border border-border bg-background px-3 py-2 cursor-text" />
      </div>
      <div>
        <div className="mb-2 flex justify-between text-muted-foreground"><span>leverage</span><span className="text-primary">{lev}x</span></div>
        <input type="range" min={1} max={1000} value={lev} onChange={(e) => setLev(+e.target.value)} className="w-full accent-[var(--primary)] cursor-pointer" />
      </div>
      <Row k="notional" v={`$${(size * lev).toLocaleString()}`} />
      <Row k="qty" v={price ? `${((size * lev) / price).toLocaleString(undefined, { maximumFractionDigits: 0 })} ${coin.sym}` : "—"} />
      <Row k="liq. long" v={price ? `$${fmt(price * (1 - 1 / lev))}` : "—"} />
      <Row k="liq. short" v={price ? `$${fmt(price * (1 + 1 / lev))}` : "—"} />
      <div className="grid grid-cols-2 gap-2 pt-2">
        {trading.connected ? (
          <>
            <button onClick={() => open("long")} className="cursor-pointer bg-up py-3 font-bold text-background hover:opacity-90 active:opacity-75">long</button>
            <button onClick={() => open("short")} className="cursor-pointer bg-down py-3 font-bold text-background hover:opacity-90 active:opacity-75">short</button>
          </>
        ) : (
          <>
            <button disabled className="cursor-not-allowed bg-up/30 py-3 font-bold text-background/50">long</button>
            <button disabled className="cursor-not-allowed bg-down/30 py-3 font-bold text-background/50">short</button>
          </>
        )}
      </div>
      {!trading.connected && <p className="text-xs text-muted-foreground">connect wallet to trade</p>}
      {err && <p className="text-xs text-down">{err}</p>}
      {trading.connected && <p className="text-xs text-muted-foreground">balance: ${trading.balance.toFixed(2)} USDC</p>}
      <p className="text-xs text-muted-foreground">live data from Hyperliquid</p>
    </>
  );
}

function PositionsTable({ positions, price, coin }: { positions: Position[]; price?: number; coin: { sym: string } }) {
  const trading = useTrading();
  const [, tick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => tick((t) => t + 1), 500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!price) return;
    for (const pos of positions) {
      if (isLiquidated(pos, price)) {
        trading.closePosition(pos.id, -pos.size, price);
        return;
      }
      if (isTakeProfitHit(pos, price)) {
        const pnl = calcPnl(pos, price);
        trading.closePosition(pos.id, pnl, price);
        return;
      }
    }
  }, [price, positions, trading]);

  if (positions.length === 0) {
    return <div className="p-8 text-center text-xs text-muted-foreground">no open positions</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="px-4 py-3 font-normal">asset</th>
            <th className="px-4 py-3 font-normal">side</th>
            <th className="px-4 py-3 font-normal">entry</th>
            <th className="px-4 py-3 font-normal">margin</th>
            <th className="px-4 py-3 font-normal">lev</th>
            <th className="px-4 py-3 font-normal">PnL</th>
            <th className="px-4 py-3 font-normal">% change</th>
            <th className="px-4 py-3 font-normal"></th>
          </tr>
        </thead>
        <tbody>
          {positions.map((pos) => {
            const pnl = price ? calcPnl(pos, price) : 0;
            const pnlPct = price ? (pnl / pos.size) * 100 : 0;
            const isUp = pnl >= 0;
            return (
              <tr key={pos.id} className="border-b border-border hover:bg-card/50">
                <td className="px-4 py-3 font-bold">{coin.sym}-PERP</td>
                <td className={`px-4 py-3 font-bold ${pos.side === "long" ? "text-up" : "text-down"}`}>
                  {pos.side.toUpperCase()}
                </td>
                <td className="px-4 py-3 tabular-nums">${fmt(pos.entryPrice)}</td>
                <td className="px-4 py-3 tabular-nums">${pos.size.toFixed(2)}</td>
                <td className="px-4 py-3 tabular-nums">{pos.leverage}x</td>
                <td className={`px-4 py-3 tabular-nums font-bold ${isUp ? "text-up" : "text-down"}`}>
                  {isUp ? "+" : ""}{pnl.toFixed(2)}
                </td>
                <td className={`px-4 py-3 tabular-nums ${isUp ? "text-up" : "text-down"}`}>
                  {isUp ? "+" : ""}{pnlPct.toFixed(2)}%
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => { if (price) trading.closePosition(pos.id, calcPnl(pos, price), price); }}
                    className="cursor-pointer border border-down px-3 py-1 text-down hover:bg-down hover:text-background"
                  >
                    close
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function HistoryTable({ history, coin }: { history: ClosedPosition[]; coin: { sym: string } }) {
  if (history.length === 0) {
    return <div className="p-8 text-center text-xs text-muted-foreground">no trade history</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="px-4 py-3 font-normal">asset</th>
            <th className="px-4 py-3 font-normal">side</th>
            <th className="px-4 py-3 font-normal">entry</th>
            <th className="px-4 py-3 font-normal">exit</th>
            <th className="px-4 py-3 font-normal">margin</th>
            <th className="px-4 py-3 font-normal">lev</th>
            <th className="px-4 py-3 font-normal">PnL</th>
            <th className="px-4 py-3 font-normal">% change</th>
          </tr>
        </thead>
        <tbody>
          {history.map((h) => {
            const pnlPct = (h.pnl / h.size) * 100;
            const isUp = h.pnl >= 0;
            return (
              <tr key={h.id + h.closedAt} className="border-b border-border hover:bg-card/50">
                <td className="px-4 py-3 font-bold">{coin.sym}-PERP</td>
                <td className={`px-4 py-3 font-bold ${h.side === "long" ? "text-up" : "text-down"}`}>
                  {h.side.toUpperCase()}
                </td>
                <td className="px-4 py-3 tabular-nums">${fmt(h.entryPrice)}</td>
                <td className="px-4 py-3 tabular-nums">${fmt(h.exitPrice)}</td>
                <td className="px-4 py-3 tabular-nums">${h.size.toFixed(2)}</td>
                <td className="px-4 py-3 tabular-nums">{h.leverage}x</td>
                <td className={`px-4 py-3 tabular-nums font-bold ${isUp ? "text-up" : "text-down"}`}>
                  {isUp ? "+" : ""}{h.pnl.toFixed(2)}
                </td>
                <td className={`px-4 py-3 tabular-nums ${isUp ? "text-up" : "text-down"}`}>
                  {isUp ? "+" : ""}{pnlPct.toFixed(2)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Stat({ label, value, cls = "" }: { label: string; value: string; cls?: string }) {
  return <div><div className="text-xs text-muted-foreground">{label}</div><div className={`tabular-nums ${cls}`}>{value}</div></div>;
}
function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between"><span className="text-muted-foreground">{k}</span><span className="tabular-nums">{v}</span></div>;
}
