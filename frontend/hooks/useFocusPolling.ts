import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';

// Re-runs `refresh` when the screen regains focus and then every `intervalMs`
// while it stays focused (provider screens pick up new requests this way).
export function useFocusPolling(refresh: () => void, intervalMs = 20_000) {
  const ref = useRef(refresh);
  ref.current = refresh;
  const firstFocus = useRef(true);

  useFocusEffect(
    useCallback(() => {
      // The initial load is done by the screen itself.
      if (firstFocus.current) firstFocus.current = false;
      else ref.current();
      const timer = setInterval(() => ref.current(), intervalMs);
      return () => clearInterval(timer);
    }, [intervalMs]),
  );
}
