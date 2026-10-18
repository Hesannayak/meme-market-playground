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

export function WalletButton() {
  const [conn, setConn] = useState<Conn | null>(null);
  const [open, setOpen] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const trading = useTrading();

  useEffect(() => {
    const saved = localStorage.getItem(KEY) as Kind | null;
    if (saved === "evm" && w().ethereum) {
      w().ethereum!.request({ method: "eth_accounts" }).then((a) => {
        const acc = (a as string[])[0];
        if (acc) {
          setConn({ kind: "evm", address: acc });
          trading.initBalance();
        }
      }).catch(() => {});
    } else if (saved === "solana" && sol()) {
      sol()!.connect({ onlyIfTrusted: true }).then((r) => {
        setConn({ kind: "solana", address: r.publicKey.toString() });
        trading.initBalance();
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
    try {
      if (kind === "evm") {
        const eth = w().ethereum;
        if (!eth) { window.open("https://metamask.io/download/", "_blank"); throw new Error("No EVM wallet found — install MetaMask or Rabby"); }
        const a = (await eth.request({ method: "eth_requestAccounts" })) as string[];
        setConn({ kind, address: a[0]! });
      } else {
        const s = sol();
        if (!s) { window.open("https://phantom.app/download", "_blank"); throw new Error("No Solana wallet found — install Phantom"); }
        const r = await s.connect();
        setConn({ kind, address: r.publicKey.toString() });
      }
      localStorage.setItem(KEY, kind);
      trading.initBalance();
      setOpen(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Connection rejected");
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
        {conn ? `● ${short(conn.address)}` : "connect wallet"}
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
              <button onClick={() => connect("solana")} className="cursor-pointer w-full px-3 py-2 text-left hover:bg-background">Phantom <span className="text-xs text-muted-foreground">· solana</span></button>
              <button onClick={() => connect("evm")} className="cursor-pointer w-full px-3 py-2 text-left hover:bg-background">MetaMask / Rabby <span className="text-xs text-muted-foreground">· evm</span></button>
              {err && <p className="px-3 py-2 text-xs text-down">{err}</p>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
