import { createContext, useContext, useCallback, useEffect, useState, type ReactNode } from "react";

export type Position = {
  id: string;
  coin: string;
  side: "long" | "short";
  entryPrice: number;
  size: number;
  leverage: number;
  liqPrice: number;
  takeProfit: number | null;
  timestamp: number;
};

export type ClosedPosition = Position & {
  exitPrice: number;
  pnl: number;
  closedAt: number;
};

type TradingState = {
  balance: number;
  positions: Position[];
  history: ClosedPosition[];
};

type Ctx = TradingState & {
  connected: boolean;
  initBalance: (realBalance: number) => void;
  clearBalance: () => void;
  openPosition: (p: Omit<Position, "id" | "timestamp">) => boolean;
  closePosition: (id: string, pnl: number, exitPrice: number) => void;
  setTakeProfit: (id: string, price: number | null) => void;
};

const STORAGE_KEY = "oton-trading";

function load(): TradingState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function save(s: TradingState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

const TradingContext = createContext<Ctx | null>(null);

export function TradingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<TradingState | null>(() => load());

  useEffect(() => {
    if (state) save(state);
  }, [state]);

  const initBalance = useCallback((realBalance: number) => {
    setState((prev) => {
      if (prev) return prev;
      const existing = load();
      if (existing) return existing;
      return { balance: Math.round(realBalance * 100) / 100, positions: [], history: [] };
    });
  }, []);

  const clearBalance = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState(null);
  }, []);

  const openPosition = useCallback((p: Omit<Position, "id" | "timestamp">): boolean => {
    let ok = false;
    setState((prev) => {
      if (!prev || prev.balance < p.size) return prev;
      ok = true;
      return {
        ...prev,
        balance: Math.round((prev.balance - p.size) * 100) / 100,
        positions: [...prev.positions, { ...p, id: crypto.randomUUID(), timestamp: Date.now() }],
      };
    });
    return ok;
  }, []);

  const closePosition = useCallback((id: string, pnl: number, exitPrice: number) => {
    setState((prev) => {
      if (!prev) return prev;
      const pos = prev.positions.find((p) => p.id === id);
      if (!pos) return prev;
      const returnAmount = Math.max(0, pos.size + pnl);
      const closed: ClosedPosition = { ...pos, exitPrice, pnl, closedAt: Date.now() };
      return {
        balance: Math.round((prev.balance + returnAmount) * 100) / 100,
        positions: prev.positions.filter((p) => p.id !== id),
        history: [closed, ...(prev.history ?? [])],
      };
    });
  }, []);

  const setTakeProfit = useCallback((id: string, price: number | null) => {
    setState((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        positions: prev.positions.map((p) => (p.id === id ? { ...p, takeProfit: price } : p)),
      };
    });
  }, []);

  const ctx: Ctx = {
    balance: state?.balance ?? 0,
    positions: state?.positions ?? [],
    history: state?.history ?? [],
    connected: state !== null,
    initBalance,
    clearBalance,
    openPosition,
    closePosition,
    setTakeProfit,
  };

  return <TradingContext.Provider value={ctx}>{children}</TradingContext.Provider>;
}

export function useTrading() {
  const ctx = useContext(TradingContext);
  if (!ctx) throw new Error("useTrading must be inside TradingProvider");
  return ctx;
}

export function calcPnl(pos: Position, currentPrice: number): number {
  if (pos.side === "long") {
    return pos.size * pos.leverage * (currentPrice - pos.entryPrice) / pos.entryPrice;
  }
  return pos.size * pos.leverage * (pos.entryPrice - currentPrice) / pos.entryPrice;
}

export function isLiquidated(pos: Position, currentPrice: number): boolean {
  if (pos.side === "long") return currentPrice <= pos.liqPrice;
  return currentPrice >= pos.liqPrice;
}

export function isTakeProfitHit(pos: Position, currentPrice: number): boolean {
  if (pos.takeProfit === null) return false;
  if (pos.side === "long") return currentPrice >= pos.takeProfit;
  return currentPrice <= pos.takeProfit;
}
