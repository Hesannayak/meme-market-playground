import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "How it works — Oton trades" },
      { name: "description", content: "Learn how Oton trades works — leverage, liquidation, funding, and more." },
    ],
  }),
  component: DocsPage,
});

function DocsPage() {
  return (
    <main className="min-h-screen bg-background font-mono text-foreground">
      <nav className="mx-auto flex max-w-4xl items-center justify-between px-6 py-5 text-sm">
        <Link to="/" className="flex items-center gap-2 font-bold">
          <img src="/logo.png" alt="Oton" className="h-7 w-7" />
          <span>Oton<span className="text-primary"> trades</span></span>
        </Link>
        <div className="flex items-center gap-6 text-muted-foreground">
          <Link to="/trade/$pair" params={{ pair: "fartcoin" }} className="hover:text-foreground">trade</Link>
          <Link to="/docs" className="text-primary">docs</Link>
        </div>
      </nav>

      <article className="mx-auto max-w-4xl px-6 pb-20 pt-10">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          how it <span className="text-primary">works</span>
        </h1>
        <p className="mt-4 text-muted-foreground">
          Oton trades lets you go long or short on large-cap memecoins with up to 1000x leverage.
          Live market data is sourced directly from Hyperliquid perpetual markets.
        </p>

        <Section title="getting started">
          <p>Connect your wallet (Phantom for Solana or MetaMask/Rabby for EVM) to activate trading. Once connected, you receive a USDC balance to trade with. Select any listed memecoin to open its market page with a live candlestick chart and order panel.</p>
        </Section>

        <Section title="supported markets">
          <p>We list perpetual contracts on high-liquidity memecoins:</p>
          <ul className="mt-3 space-y-1">
            <li><span className="text-primary">FARTCOIN-PERP</span> — Fartcoin (Solana)</li>
            <li><span className="text-primary">WIF-PERP</span> — dogwifhat (Solana)</li>
            <li><span className="text-primary">BONK-PERP</span> — Bonk (Solana)</li>
            <li><span className="text-primary">PEPE-PERP</span> — Pepe (Ethereum)</li>
            <li><span className="text-primary">POPCAT-PERP</span> — Popcat (Solana)</li>
            <li><span className="text-primary">DOGE-PERP</span> — Dogecoin</li>
          </ul>
          <p className="mt-3">All prices, volume, open interest, and funding rates update in real-time from Hyperliquid.</p>
        </Section>

        <Section title="opening a position">
          <p>On any market page, set your margin size in USDC and choose your leverage (1x–1000x). The panel shows your notional exposure, token quantity, and liquidation prices for both directions before you confirm.</p>
          <p className="mt-3">Click <span className="text-up font-bold">long</span> if you expect the price to go up, or <span className="text-down font-bold">short</span> if you expect it to go down.</p>
          <div className="mt-4 border border-border p-4 text-xs">
            <Row k="margin" v="$10 USDC" />
            <Row k="leverage" v="100x" />
            <Row k="notional" v="$1,000" />
            <Row k="liquidation distance" v="1% from entry" />
          </div>
        </Section>

        <Section title="leverage & margin">
          <p>Leverage multiplies your exposure relative to your margin. At 100x leverage, a $10 margin controls $1,000 of notional value. Higher leverage means larger potential gains — and larger potential losses.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="px-4 py-2 font-normal">leverage</th>
                  <th className="px-4 py-2 font-normal">margin</th>
                  <th className="px-4 py-2 font-normal">notional</th>
                  <th className="px-4 py-2 font-normal">liq. distance</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                <tr className="border-b border-border"><td className="px-4 py-2">10x</td><td className="px-4 py-2">$10</td><td className="px-4 py-2">$100</td><td className="px-4 py-2">10%</td></tr>
                <tr className="border-b border-border"><td className="px-4 py-2">50x</td><td className="px-4 py-2">$10</td><td className="px-4 py-2">$500</td><td className="px-4 py-2">2%</td></tr>
                <tr className="border-b border-border"><td className="px-4 py-2">100x</td><td className="px-4 py-2">$10</td><td className="px-4 py-2">$1,000</td><td className="px-4 py-2">1%</td></tr>
                <tr className="border-b border-border"><td className="px-4 py-2">500x</td><td className="px-4 py-2">$10</td><td className="px-4 py-2">$5,000</td><td className="px-4 py-2">0.2%</td></tr>
                <tr><td className="px-4 py-2">1000x</td><td className="px-4 py-2">$10</td><td className="px-4 py-2">$10,000</td><td className="px-4 py-2">0.1%</td></tr>
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="liquidation">
          <p>When the market moves against your position by more than your margin can cover, the position is automatically liquidated. Your entire margin for that position is lost.</p>
          <p className="mt-3">Liquidation price is calculated at the time of entry and displayed both in the order panel and as a dashed line on the chart. The formula:</p>
          <div className="mt-3 border border-border bg-card p-4 text-xs">
            <p><span className="text-muted-foreground">long:</span> entry × (1 − 1/leverage)</p>
            <p><span className="text-muted-foreground">short:</span> entry × (1 + 1/leverage)</p>
          </div>
        </Section>

        <Section title="PnL calculation">
          <p>Profit and loss is calculated continuously against the live mark price:</p>
          <div className="mt-3 border border-border bg-card p-4 text-xs">
            <p><span className="text-muted-foreground">long PnL:</span> margin × leverage × (current − entry) / entry</p>
            <p><span className="text-muted-foreground">short PnL:</span> margin × leverage × (entry − current) / entry</p>
          </div>
          <p className="mt-3">PnL updates in real-time in the positions tab below the chart.</p>
        </Section>

        <Section title="take profit">
          <p>You can set a take-profit price on any open position. When the market reaches your target, the position closes automatically and profits are added to your balance. You can update or remove the take-profit at any time.</p>
        </Section>

        <Section title="chart & market data">
          <p>Each market page shows a live candlestick chart with multiple timeframes: 1 minute, 1 day, 1 week, 1 month, and 3 months. When you have an open position, the chart overlays your entry price (solid line) and liquidation price (dashed line).</p>
          <p className="mt-3">Market stats displayed for each asset:</p>
          <ul className="mt-2 space-y-1">
            <li><span className="text-muted-foreground">mark price</span> — current market price</li>
            <li><span className="text-muted-foreground">24h change</span> — percentage move from previous day</li>
            <li><span className="text-muted-foreground">24h volume</span> — total trading volume in the last 24 hours</li>
            <li><span className="text-muted-foreground">open interest</span> — total value of outstanding contracts</li>
            <li><span className="text-muted-foreground">funding rate</span> — hourly funding rate for perpetual contracts</li>
          </ul>
        </Section>

        <Section title="positions & history">
          <p>The <span className="text-primary">positions</span> tab shows all your open trades with live PnL, entry price, margin, leverage, and percentage change. You can close any position at the current market price.</p>
          <p className="mt-3">The <span className="text-primary">history</span> tab records all closed trades with entry price, exit price, and realized PnL.</p>
        </Section>

        <div className="mt-16 border-t border-border pt-8 text-center">
          <Link to="/trade/$pair" params={{ pair: "fartcoin" }}
            className="inline-block bg-primary px-6 py-3 font-bold text-primary-foreground hover:opacity-90">
            start trading →
          </Link>
        </div>
      </article>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="text-xl font-bold text-primary">{title}</h2>
      <div className="mt-4 text-sm leading-relaxed text-foreground/90">{children}</div>
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between py-1"><span className="text-muted-foreground">{k}</span><span className="tabular-nums">{v}</span></div>;
}
