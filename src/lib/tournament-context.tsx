"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

interface TournamentInfo {
  id: number;
  name: string;
  status: string;
}

interface TournamentContextType {
  tournaments: TournamentInfo[];
  currentId: number | null;
  currentName: string;
  loading: boolean;
  setCurrentId: (id: number) => void;
  refresh: () => Promise<void>;
}

const TournamentContext = createContext<TournamentContextType>({
  tournaments: [],
  currentId: null,
  currentName: "",
  loading: true,
  setCurrentId: () => {},
  refresh: async () => {},
});

interface TournamentListResponse {
  tournaments?: TournamentInfo[];
}

const STORAGE_KEY = "shuttle-arena-tournament-id";

export function TournamentProvider({ children }: { children: ReactNode }) {
  const [tournaments, setTournaments] = useState<TournamentInfo[]>([]);
  const [currentId, setCurrentIdState] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/tournaments");
      if (res.ok) {
        const data = await res.json() as TournamentListResponse;
        const list: TournamentInfo[] = (data.tournaments || []).map((t: TournamentInfo) => ({
          id: t.id,
          name: t.name,
          status: t.status,
        }));
        setTournaments(list);

        // Restore saved ID or default to first tournament
        const saved = localStorage.getItem(STORAGE_KEY);
        const savedId = saved ? parseInt(saved, 10) : null;
        if (savedId && list.some((t) => t.id === savedId)) {
          setCurrentIdState(savedId);
        } else if (list.length > 0) {
          setCurrentIdState(list[0].id);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setCurrentId = useCallback((id: number) => {
    setCurrentIdState(id);
    localStorage.setItem(STORAGE_KEY, String(id));
  }, []);

  const currentName = tournaments.find((t) => t.id === currentId)?.name || "";

  return (
    <TournamentContext.Provider value={{ tournaments, currentId, currentName, loading, setCurrentId, refresh }}>
      {children}
    </TournamentContext.Provider>
  );
}

export function useTournament() {
  return useContext(TournamentContext);
}
