import { useEffect, useRef, useState } from "react";
import { useTrading } from "@/lib/trading";

type Kind = "evm" | "solana";
type Conn = { kind: Kind; address: string };

type Eth = { request: (a: { method: string; params?: unknown[] }) => Promise<unknown>; on?: (e: string, f: (x: string[]) => void) => void };
type Sol = { connect: (o?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString(): string } }>; disconnect: () => Promise<void> };

const w = () => window as unknown as { ethereum?: Eth; solana?: Sol & { isPhantom?: boolean }; phantom?: { solana?: Sol } };
const sol = () => w().phantom?.solana ?? w().solana;
const KEY = "oton-wallet";
const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;

const SOLANA_RPC = "https://api.mainnet-beta.solana.com";
const USDC_MINT_SOL = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const USDC_CONTRACT_EVM = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

async function fetchSolanaUsdcBalance(address: string): Promise<number> {
  try {
    const res = await fetch(SOLANA_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1, method: "getTokenAccountsByOwner",
        params: [
          address,
          { mint: USDC_MINT_SOL },
          { encoding: "jsonParsed" },
        ],
      }),
    });
    const data = await res.json();
    const accounts = data?.result?.value ?? [];
    let total = 0;
    for (const acc of accounts) {
      const info = acc?.account?.data?.parsed?.info;
      if (info?.tokenAmount?.uiAmount != null) {
        total += info.tokenAmount.uiAmount;
      }
    }
    return total;
  } catch {
    return 0;
  }
}

async function fetchEvmUsdcBalance(address: string, ethereum: Eth): Promise<number> {
  try {
    const balanceOfSelector = "0x70a08231";
    const paddedAddress = address.slice(2).toLowerCase().padStart(64, "0");
    const data = balanceOfSelector + paddedAddress;

    const result = await ethereum.request({
      method: "eth_call",
      params: [{ to: USDC_CONTRACT_EVM, data }, "latest"],
    }) as string;

    const raw = BigInt(result);
    return Number(raw) / 1e6;
  } catch {
    return 0;
  }
}

export function WalletButton() {
  const [conn, setConn] = useState<Conn | null>(null);
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const trading = useTrading();

  useEffect(() => {
    const saved = localStorage.getItem(KEY) as Kind | null;
    if (saved === "evm" && w().ethereum) {
      w().ethereum!.request({ method: "eth_accounts" }).then(async (a) => {
        const acc = (a as string[])[0];
        if (acc) {
          setConn({ kind: "evm", address: acc });
          const bal = await fetchEvmUsdcBalance(acc, w().ethereum!);
          trading.initBalance(bal);
        }
      }).catch(() => {});
    } else if (saved === "solana" && sol()) {
      sol()!.connect({ onlyIfTrusted: true }).then(async (r) => {
        const addr = r.publicKey.toString();
        setConn({ kind: "solana", address: addr });
        const bal = await fetchSolanaUsdcBalance(addr);
        trading.initBalance(bal);
      }).catch(() => {});
    }
    w().ethereum?.on?.("accountsChanged", (a) => setConn((c) => (c?.kind === "evm" ? (a[0] ? { kind: "evm", address: a[0] } : null) : c)));
  }, []);

  useEffect(() => {
    const f = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", f);
    return () => document.removeEventListener("mousedown", f);
  }, []);

  const connect = async (kind: Kind) => {
    setErr(null);
    setLoading(true);
    try {
      let address: string;
      if (kind === "evm") {
        const eth = w().ethereum;
        if (!eth) { window.open("https://metamask.io/download/", "_blank"); throw new Error("No EVM wallet found — install MetaMask or Rabby"); }
        const a = (await eth.request({ method: "eth_requestAccounts" })) as string[];
        address = a[0]!;
        setConn({ kind, address });
        const bal = await fetchEvmUsdcBalance(address, eth);
        trading.initBalance(bal);
      } else {
        const s = sol();
        if (!s) { window.open("https://phantom.app/download", "_blank"); throw new Error("No Solana wallet found — install Phantom"); }
        const r = await s.connect();
        address = r.publicKey.toString();
        setConn({ kind, address });
        const bal = await fetchSolanaUsdcBalance(address);
        trading.initBalance(bal);
      }
      localStorage.setItem(KEY, kind);
      setOpen(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Connection rejected");
    } finally {
      setLoading(false);
    }
  };

  const disconnect = async () => {
    if (conn?.kind === "solana") await sol()?.disconnect().catch(() => {});
    if (conn?.kind === "evm") await w().ethereum?.request({ method: "wallet_revokePermissions", params: [{ eth_accounts: {} }] }).catch(() => {});
    localStorage.removeItem(KEY);
    trading.clearBalance();
    setConn(null);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative flex items-center gap-3">
      {conn && trading.connected && (
        <div className="text-xs tabular-nums">
          <span className="text-muted-foreground">USDC</span>{" "}
          <span className="text-primary font-bold">${trading.balance.toFixed(2)}</span>
        </div>
      )}
      <button onClick={() => setOpen((o) => !o)}
        className={conn ? "cursor-pointer border border-primary px-4 py-2 text-xs text-primary" : "cursor-pointer bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:opacity-90"}>
        {loading ? "connecting…" : conn ? `● ${short(conn.address)}` : "connect wallet"}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-64 border border-border bg-card p-2 text-sm shadow-lg" style={{ top: "100%" }}>
          {conn ? (
            <>
              <div className="px-3 py-2 text-xs text-muted-foreground">{conn.kind === "evm" ? "EVM" : "Solana"} wallet</div>
              <div className="break-all px-3 pb-2 text-xs">{conn.address}</div>
              <button onClick={() => navigator.clipboard.writeText(conn.address)} className="cursor-pointer w-full px-3 py-2 text-left hover:bg-background">copy address</button>
              <button onClick={disconnect} className="cursor-pointer w-full px-3 py-2 text-left text-down hover:bg-background">disconnect</button>
            </>
          ) : (
            <>
              <button onClick={() => connect("solana")} disabled={loading} className="cursor-pointer w-full px-3 py-2 text-left hover:bg-background">Phantom <span className="text-xs text-muted-foreground">· solana</span></button>
              <button onClick={() => connect("evm")} disabled={loading} className="cursor-pointer w-full px-3 py-2 text-left hover:bg-background">MetaMask / Rabby <span className="text-xs text-muted-foreground">· evm</span></button>
              {err && <p className="px-3 py-2 text-xs text-down">{err}</p>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
