import React, { createContext, useContext, useState, useCallback } from 'react';

interface Match {
  userId: string;
  matchedAt: Date;
  activity?: string; // Track which activity the match was for
}

interface MatchContextType {
  matches: Match[];
  addMatch: (userId: string, activity?: string) => void;
  isMatched: (userId: string) => boolean;
  clearMatches: () => void;
}

const MatchContext = createContext<MatchContextType | undefined>(undefined);

export function MatchProvider({ children }: { children: React.ReactNode }) {
  const [matches, setMatches] = useState<Match[]>([]);

  const addMatch = useCallback((userId: string, activity?: string) => {
    setMatches(prev => {
      if (!prev.find(m => m.userId === userId)) {
        return [...prev, { userId, matchedAt: new Date(), activity }];
      }
      return prev;
    });
  }, []);

  const isMatched = useCallback((userId: string) => {
    return matches.some(m => m.userId === userId);
  }, [matches]);

  const clearMatches = useCallback(() => {
    setMatches([]);
  }, []);

  return (
    <MatchContext.Provider value={{ matches, addMatch, isMatched, clearMatches }}>
      {children}
    </MatchContext.Provider>
  );
}

export function useMatches() {
  const context = useContext(MatchContext);
  if (context === undefined) {
    throw new Error('useMatches must be used within a MatchProvider');
  }
  return context;
}