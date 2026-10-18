import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "memetrade_ — paper trade large cap memecoins" },
      { name: "description", content: "Paper trade Fartcoin, WIF, BONK and more with 1000x leverage and zero market impact." },
      { property: "og:title", content: "memetrade_ — paper trade memecoins" },
      { property: "og:description", content: "1000x leverage on Fartcoin, WIF, BONK. Zero risk, zero market impact." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const COINS = [
  { sym: "FARTCOIN", name: "Fartcoin", price: 1.2431 },
  { sym: "WIF", name: "dogwifhat", price: 2.1874 },
  { sym: "BONK", name: "Bonk", price: 0.00002914 },
  { sym: "PEPE", name: "Pepe", price: 0.00001187 },
  { sym: "POPCAT", name: "Popcat", price: 0.8123 },
  { sym: "DOGE", name: "Dogecoin", price: 0.2471 },
];

function fmt(p: number) {
  return p < 0.01 ? p.toFixed(8) : p.toFixed(4);
}

function useLive() {
  const [state, setState] = useState(COINS.map((c) => ({ ...c, open: c.price, hist: [c.price] })));
  useEffect(() => {
    const id = setInterval(() => {
      setState((s) =>
        s.map((c) => {
          const price = c.price * (1 + (Math.random() - 0.495) * 0.006);
          return { ...c, price, hist: [...c.hist.slice(-39), price] };
        }),
      );
    }, 900);
    return () => clearInterval(id);
  }, []);
  return state;
}

function Spark({ data, up }: { data: number[]; up: boolean }) {
  if (data.length < 2) return <svg className="h-10 w-full" />;
  const min = Math.min(...data), max = Math.max(...data), r = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 100},${40 - ((v - min) / r) * 36 - 2}`).join(" ");
  return (
    <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-10 w-full">
      <polyline points={pts} fill="none" strokeWidth="1.5" className={up ? "stroke-up" : "stroke-down"} />
    </svg>
  );
}

function Index() {
  const coins = useLive();
  const [sel, setSel] = useState(0);
  const [lev, setLev] = useState(100);
  const c = coins[sel] ?? coins[0]!;
  const tape = coins.map((x) => `${x.sym} ${fmt(x.price)}`).join("  ·  ");

  return (
    <main className="min-h-screen bg-background font-mono text-foreground">
      <div className="overflow-hidden border-b border-border py-2 text-xs text-muted-foreground">
        <div className="animate-marquee whitespace-nowrap">{(tape + "  ·  ").repeat(6)}</div>
      </div>

      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5 text-sm">
        <span className="font-bold">memetrade<span className="text-primary">_</span></span>
        <div className="flex gap-6 text-muted-foreground">
          <span>mobile app <span className="text-primary">soon</span></span>
          <a href="#trade" className="hover:text-foreground">trade</a>
          <a href="#coins" className="hover:text-foreground">markets</a>
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
          <li className="text-muted-foreground">fartcoin · wif · bonk — paper only, no rugs</li>
        </ul>
        <a href="#trade" className="mt-10 inline-block bg-primary px-6 py-3 font-bold text-primary-foreground hover:opacity-90">
          start trading →
        </a>
      </section>

      <section id="coins" className="mx-auto grid max-w-6xl gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
        {coins.map((x, i) => {
          const ch = ((x.price - x.open) / x.open) * 100;
          const up = ch >= 0;
          return (
            <button key={x.sym} onClick={() => { setSel(i); document.getElementById("trade")?.scrollIntoView({ behavior: "smooth" }); }}
              className="bg-background p-5 text-left transition-colors hover:bg-card">
              <div className="flex justify-between text-sm">
                <span className="font-bold">{x.sym}</span>
                <span className={up ? "text-up" : "text-down"}>{up ? "+" : ""}{ch.toFixed(2)}%</span>
              </div>
              <div className="text-xs text-muted-foreground">{x.name}</div>
              <div className="mt-3 text-2xl tabular-nums">${fmt(x.price)}</div>
              <Spark data={x.hist} up={up} />
            </button>
          );
        })}
      </section>

      <section id="trade" className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="mb-6 text-sm text-muted-foreground">// trade preview</h2>
        <div className="grid gap-px border border-border bg-border lg:grid-cols-[1fr_320px]">
          <div className="bg-card p-6">
            <div className="mb-4 flex flex-wrap gap-2">
              {coins.map((x, i) => (
                <button key={x.sym} onClick={() => setSel(i)}
                  className={`px-3 py-1 text-xs ${i === sel ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"}`}>
                  {x.sym}-PERP
                </button>
              ))}
            </div>
            <div className="text-4xl tabular-nums">${fmt(c.price)}</div>
            <div className="mt-4 h-64"><svg className="hidden" /><div className="h-full [&_svg]:h-full"><Spark data={c.hist} up={c.price >= c.open} /></div></div>
          </div>
          <div className="space-y-5 bg-card p-6 text-sm">
            <div>
              <div className="mb-2 flex justify-between text-muted-foreground"><span>leverage</span><span className="text-primary">{lev}x</span></div>
              <input type="range" min={1} max={1000} value={lev} onChange={(e) => setLev(+e.target.value)} className="w-full accent-[var(--primary)]" />
            </div>
            <div className="flex justify-between"><span className="text-muted-foreground">size</span><span>$1,000 paper</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">notional</span><span>${(1000 * lev).toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">liq. distance</span><span>{(100 / lev).toFixed(2)}%</span></div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button className="bg-up py-3 font-bold text-background">long</button>
              <button className="bg-down py-3 font-bold text-background">short</button>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border px-6 py-8 text-center text-xs text-muted-foreground">
        paper trading only · not financial advice · prices simulated
      </footer>
    </main>
  );
}
