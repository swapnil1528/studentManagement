/**
 * ============================================
 * Utility Helpers
 * ============================================
 * Pure utility functions used across the app.
 * No side effects, no dependencies on React.
 */

import { INSTITUTE_LAT, INSTITUTE_LNG } from '../config/constants';

/**
 * Calculate distance between two GPS coordinates using the Haversine formula.
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in meters
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Calculate distance from a point to the institute.
 * @param {number} lat - User's latitude
 * @param {number} lng - User's longitude
 * @returns {number} Distance in meters
 */
export function distanceFromInstitute(lat, lng) {
    return calculateDistance(INSTITUTE_LAT, INSTITUTE_LNG, lat, lng);
}

/**
 * Format a date string for display.
 * @param {string|Date} date
 * @returns {string} Formatted date string
 */
export function formatDate(date) {
    if (!date) return '—';
    const d = new Date(date);
    if (isNaN(d.getTime())) return String(date);
    return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

/**
 * Format a date-time string for display.
 * @param {string|Date} date
 * @returns {string}
 */
export function formatDateTime(date) {
    if (!date) return '—';
    const d = new Date(date);
    if (isNaN(d.getTime())) return String(date);
    return d.toLocaleString('en-IN');
}

/**
 * Format time only.
 * @param {string|Date} date
 * @returns {string}
 */
export function formatTime(date) {
    if (!date) return '--:--';
    const d = new Date(date);
    if (isNaN(d.getTime())) return String(date);
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}
