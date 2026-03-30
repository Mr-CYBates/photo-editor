import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useAuth } from './useAuth';

interface CreditsInfo {
  plan: string;
  monthly_credits: number;
  monthly_limit: number;
  pack_credits: number;
  total_available: number;
}

interface CreditsContextValue {
  credits: CreditsInfo | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

const CreditsContext = createContext<CreditsContextValue>({
  credits: null,
  loading: true,
  refresh: async () => {},
});

export function CreditsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [credits, setCredits] = useState<CreditsInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setCredits(null);
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/credits', { credentials: 'include' });
      if (res.ok) {
        setCredits(await res.json());
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <CreditsContext.Provider value={{ credits, loading, refresh }}>
      {children}
    </CreditsContext.Provider>
  );
}

export function useCredits() {
  return useContext(CreditsContext);
}
