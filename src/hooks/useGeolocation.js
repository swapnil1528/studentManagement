/**
 * ============================================
 * Geolocation Hook
 * ============================================
 * Custom React hook for getting the user's current GPS position.
 * Used in attendance check-in/out flows.
 */

import { useState, useEffect } from 'react';
import { distanceFromInstitute } from '../utils/helpers';
import { ALLOWED_RADIUS } from '../config/constants';

/**
 * useGeolocation — watches the user's position and computes
 * distance from the institute.
 *
 * @returns {{ lat, lng, distance, inRange, error, loading }}
 */
export function useGeolocation() {
    const [position, setPosition] = useState({
        lat: null,
        lng: null,
        distance: null,
        inRange: false,
        error: null,
        loading: true,
    });

    useEffect(() => {
        if (!navigator.geolocation) {
            setPosition((prev) => ({
                ...prev,
                error: 'GPS not supported',
                loading: false,
            }));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                const dist = distanceFromInstitute(latitude, longitude);
                setPosition({
                    lat: latitude,
                    lng: longitude,
                    distance: Math.round(dist),
                    inRange: dist <= ALLOWED_RADIUS,
                    error: null,
                    loading: false,
                });
            },
            (err) => {
                setPosition((prev) => ({
                    ...prev,
                    error: 'GPS permission denied',
                    loading: false,
                }));
            }
        );
    }, []);

    return position;
}
