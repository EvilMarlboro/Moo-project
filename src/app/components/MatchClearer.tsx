import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useMatches } from '../context/MatchContext';

/**
 * Component that clears matches when user logs out
 * Must be rendered inside both AuthProvider and MatchProvider
 */
export function MatchClearer() {
  const { user } = useAuth();
  const { clearMatches } = useMatches();
  const prevUserRef = useRef(user);

  useEffect(() => {
    // Clear matches only when user transitions from logged in to logged out
    if (prevUserRef.current && !user) {
      clearMatches();
    }
    prevUserRef.current = user;
  }, [user, clearMatches]);

  // This component doesn't render anything
  return null;
}