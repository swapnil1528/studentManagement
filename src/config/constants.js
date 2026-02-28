/**
 * ============================================
 * Application Constants
 * ============================================
 * Centralized configuration loaded from environment variables.
 * All sensitive values (API URLs, coordinates) are stored in .env
 * and accessed through this single module.
 */

// Google Apps Script deployed URL — the sole backend endpoint
export const API_URL = import.meta.env.VITE_API_URL;

// Institute geolocation (used for attendance radius validation)
export const INSTITUTE_LAT = parseFloat(import.meta.env.VITE_INSTITUTE_LAT) || 19.07157800;
export const INSTITUTE_LNG = parseFloat(import.meta.env.VITE_INSTITUTE_LNG) || 73.14348780;

// Maximum distance (meters) a user can be from the institute to mark attendance
export const ALLOWED_RADIUS = parseInt(import.meta.env.VITE_ALLOWED_RADIUS) || 100;

// Face recognition distance threshold (lower = stricter match)
export const FACE_MATCH_THRESHOLD = parseFloat(import.meta.env.VITE_FACE_MATCH_THRESHOLD) || 0.6;
