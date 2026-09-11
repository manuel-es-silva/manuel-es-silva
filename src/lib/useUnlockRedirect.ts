import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { UNLOCK_QUERY_PARAM } from '../config/payments';
import { setUnlocked } from './entitlement';

/** Catches Stripe's redirect back to the app (?unlocked=1) on any route. */
export function useUnlockRedirect() {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    if (searchParams.get(UNLOCK_QUERY_PARAM) === '1') {
      setUnlocked(true);
      searchParams.delete(UNLOCK_QUERY_PARAM);
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);
}
