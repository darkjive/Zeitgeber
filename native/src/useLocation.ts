/**
 * useLocation — GPS über expo-location mit Rückfall auf einen Standardort
 * (Spec §10: Kernuhr bleibt ohne Standortfreigabe voll funktionsfähig).
 * Reine lokale Verarbeitung, keine Übertragung (§38.1).
 */

import { useEffect, useState } from 'react';
import * as Location from 'expo-location';
import type { GeoLocation } from '../../src/core/astro-engine';
import { DEFAULT_LOCATION } from '../../src/core/location';

export function useLocation(): { location: GeoLocation; granted: boolean } {
  const [location, setLocation] = useState<GeoLocation>(DEFAULT_LOCATION);
  const [granted, setGranted] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return; // Fallback bleibt aktiv (§10)
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
        if (!active) return;
        setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setGranted(true);
      } catch {
        /* Standardort bleibt gültig */
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return { location, granted };
}
