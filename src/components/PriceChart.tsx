import { useEffect, useRef, useState } from "react";
import { fetchCandles, type Coin } from "@/lib/coins";
import type { Position } from "@/lib/trading";

const RANGES = [
  { label: "1m", interval: "1m", ms: 3600e3 },
  { label: "1D", interval: "15m", ms: 864e5 },
  { label: "1W", interval: "1h", ms: 7 * 864e5 },
  { label: "1M", interval: "4h", ms: 30 * 864e5 },
  { label: "3M", interval: "1d", ms: 90 * 864e5 },
];

function cssVar(name: string) {
  const ctx = document.createElement("canvas").getContext("2d")!;
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return `rgb(${r},${g},${b})`;
}

export function PriceChart({ coin, positions = [] }: { coin: Coin; positions?: Position[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const seriesRef = useRef<unknown>(null);
  const lcRef = useRef<typeof import("lightweight-charts") | null>(null);
  const [range, setRange] = useState(RANGES[0]!);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let disposed = false;
    let cleanup = () => {};
    (async () => {
      const lc = await import("lightweight-charts");
      lcRef.current = lc;
      if (disposed || !containerRef.current) return;
      const fg = cssVar("--muted-foreground"), grid = cssVar("--border");
      const chart = lc.createChart(containerRef.current, {
        autoSize: true,
        layout: { background: { color: "transparent" }, textColor: fg, fontFamily: "JetBrains Mono, monospace" },
        grid: { vertLines: { color: grid }, horzLines: { color: grid } },
        timeScale: { timeVisible: true, borderColor: grid },
        rightPriceScale: { borderColor: grid },
      });
      const up = cssVar("--up"), down = cssVar("--down");
      const series = chart.addSeries(lc.CandlestickSeries, {
        upColor: up, downColor: down, wickUpColor: up, wickDownColor: down, borderVisible: false,
        priceFormat: { type: "price", precision: coin.mult < 1 ? 8 : 5, minMove: coin.mult < 1 ? 1e-8 : 1e-5 },
      });
      seriesRef.current = series;

      const load = async () => {
        try {
          const c = await fetchCandles(coin, range.interval, range.ms);
          if (disposed) return;
          series.setData(c as never);
          setErr(false);
        } catch { setErr(true); }
      };
      await load();
      chart.timeScale().fitContent();
      const id = setInterval(load, range.interval === "1m" ? 3000 : 5000);
      cleanup = () => { clearInterval(id); chart.remove(); seriesRef.current = null; };
    })();
    return () => { disposed = true; cleanup(); };
  }, [coin, range]);

  useEffect(() => {
    const lc = lcRef.current;
    const series = seriesRef.current as ReturnType<ReturnType<typeof import("lightweight-charts")["createChart"]>["addSeries"]> | null;
    if (!lc || !series) return;

    const up = cssVar("--up"), down = cssVar("--down");
    const lines: ReturnType<typeof series.createPriceLine>[] = [];

    for (const pos of positions) {
      lines.push(series.createPriceLine({
        price: pos.entryPrice,
        color: pos.side === "long" ? up : down,
        lineWidth: 1,
        lineStyle: lc.LineStyle.Solid,
        axisLabelVisible: true,
        title: `entry ${pos.side.toUpperCase()} ${pos.leverage}x`,
      }));
      lines.push(series.createPriceLine({
        price: pos.liqPrice,
        color: down,
        lineWidth: 1,
        lineStyle: lc.LineStyle.Dashed,
        axisLabelVisible: true,
        title: `liq`,
      }));
    }

    return () => { lines.forEach((l) => series.removePriceLine(l)); };
  }, [positions]);

  return (
    <div>
      <div className="mb-3 flex gap-2">
        {RANGES.map((r) => (
          <button key={r.label} onClick={() => setRange(r)}
            className={`px-3 py-1 text-xs ${r.label === range.label ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"}`}>
            {r.label}
          </button>
        ))}
        {err && <span className="text-xs text-down">chart data unavailable</span>}
      </div>
      <div ref={containerRef} className="h-[420px] w-full" />
    </div>
  );
}
