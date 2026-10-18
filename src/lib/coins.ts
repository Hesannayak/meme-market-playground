import { useEffect, useState } from "react";

export type Coin = { slug: string; sym: string; name: string; hl: string; mult: number; blurb: string };

// hl = Hyperliquid perp ticker; mult converts "k" contracts (price per 1000) to per-token price.
export const COINS: Coin[] = [
  { slug: "fartcoin", sym: "FARTCOIN", name: "Fartcoin", hl: "FARTCOIN", mult: 1, blurb: "The gas-powered memecoin of Solana." },
  { slug: "wif", sym: "WIF", name: "dogwifhat", hl: "WIF", mult: 1, blurb: "Just a dog with a hat. On Solana." },
  { slug: "bonk", sym: "BONK", name: "Bonk", hl: "kBONK", mult: 0.001, blurb: "Solana's original community dog coin." },
  { slug: "pepe", sym: "PEPE", name: "Pepe", hl: "kPEPE", mult: 0.001, blurb: "The most memeable frog, on Ethereum." },
  { slug: "popcat", sym: "POPCAT", name: "Popcat", hl: "POPCAT", mult: 1, blurb: "Pop. Cat. Pop." },
  { slug: "doge", sym: "DOGE", name: "Dogecoin", hl: "DOGE", mult: 1, blurb: "The OG memecoin. Much wow." },
];

export const getCoin = (slug: string) => COINS.find((c) => c.slug === slug);

const API = "https://api.hyperliquid.xyz/info";
const post = (body: unknown) =>
  fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then((r) => r.json());

export const fmt = (p?: number) => (p == null ? "—" : p < 0.01 ? p.toFixed(8) : p < 1 ? p.toFixed(5) : p.toFixed(4));

export type Stats = { price: number; prev: number; vol: number; oi: number; funding: number };

/** Live prices + 24h stats for all coins, polled from Hyperliquid. */
export function useMarkets() {
  const [data, setData] = useState<Record<string, Stats>>({});
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const [meta, ctxs] = await post({ type: "metaAndAssetCtxs" });
        const out: Record<string, Stats> = {};
        meta.universe.forEach((u: { name: string }, i: number) => {
          const c = COINS.find((x) => x.hl === u.name);
          const x = ctxs[i];
          if (c && x) {
            out[c.slug] = {
              price: +x.markPx * c.mult,
              prev: +x.prevDayPx * c.mult,
              vol: +x.dayNtlVlm,
              oi: +x.openInterest * +x.markPx,
              funding: +x.funding,
            };
          }
        });
        if (alive) setData(out);
      } catch {
        /* keep last data */
      }
    };
    load();
    const id = setInterval(load, 3000);
    return () => { alive = false; clearInterval(id); };
  }, []);
  return data;
}

export type Candle = { time: number; open: number; high: number; low: number; close: number };

export async function fetchCandles(coin: Coin, interval: string, lookbackMs: number): Promise<Candle[]> {
  const rows = await post({ type: "candleSnapshot", req: { coin: coin.hl, interval, startTime: Date.now() - lookbackMs } });
  return rows.map((r: { t: number; o: string; h: string; l: string; c: string }) => ({
    time: Math.floor(+r.t / 1000),
    open: +r.o * coin.mult, high: +r.h * coin.mult, low: +r.l * coin.mult, close: +r.c * coin.mult,
  }));
}

export const compact = (n?: number) =>
  n == null ? "—" : "$" + Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 2 }).format(n);
