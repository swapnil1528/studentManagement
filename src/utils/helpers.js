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

/**
 * Parse date string in DD-MM-YYYY, YYYY-MM-DD, ISO, or Date object.
 */
export function parseDate(dateStr) {
    if (!dateStr) return null;
    if (dateStr instanceof Date) return dateStr;
    const s = String(dateStr).trim();
    // DD-MM-YYYY or DD/MM/YYYY
    const dmy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (dmy) {
        return new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
    }
    // YYYY-MM-DD
    const ymd = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (ymd) {
        return new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
}

/**
 * Format Date object to DD-MM-YYYY string.
 */
export function formatDateDMY(date) {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return String(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
}

/**
 * Add days to a Date object.
 */
export function addDays(date, days) {
    if (!date) return null;
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
}

/**
 * Calculate due date (+29 days from payment date) and reminder window status.
 * Window: 5 days before due date to +5 days after due date (and overdue if still unpaid).
 * No reminder if fees fully paid.
 *
 * @param {string|Date} paymentDate - Latest fee payment date
 * @param {string|Date} fallbackDate - Admission date if no payments made yet
 * @param {number} pendingAmount - Outstanding balance
 */
export function calculateFeeDueDetails(paymentDate, fallbackDate, pendingAmount, explicitDueDate = null) {
    const isFullyPaid = (Number(pendingAmount) || 0) <= 0;
    const refDate = parseDate(paymentDate) || parseDate(fallbackDate) || new Date();

    // Due date is +29 days from payment date
    const dueDate = explicitDueDate ? (parseDate(explicitDueDate) || addDays(refDate, 29)) : addDays(refDate, 29);

    // Reminder window starts 5 days before due date (+24 days from payment)
    const reminderStartDate = addDays(dueDate, -5);

    // Reminder grace window ends 5 days after due date (+34 days from payment)
    const reminderGraceEndDate = addDays(dueDate, 5);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDay = new Date(dueDate);
    dueDay.setHours(0, 0, 0, 0);

    // Calendar days until due date:
    // > 5  : Upcoming (outside reminder window)
    // 0..5 : Within 5 days before due date (reminder popup starts)
    // 0    : Due today
    // -1..-5 : Within +5 days after due date (grace period, reminder popup active)
    // < -5 : Overdue (reminder popup remains active until paid)
    const daysUntilDue = Math.round((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Reminder window is active when 5 or fewer days remain before due date
    const isInReminderWindow = daysUntilDue <= 5;

    // No reminder if fees fully paid
    const shouldShowReminder = !isFullyPaid && isInReminderWindow;

    // Human-readable status label
    let statusLabel = 'Current';
    let statusBadge = 'Payment Current';
    if (isFullyPaid) {
        statusLabel = 'Cleared';
        statusBadge = 'All Dues Paid ✓';
    } else if (daysUntilDue > 5) {
        statusLabel = 'Upcoming';
        statusBadge = `Due in ${daysUntilDue} days`;
    } else if (daysUntilDue > 0 && daysUntilDue <= 5) {
        statusLabel = 'Due Soon';
        statusBadge = `⚠️ Due in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}`;
    } else if (daysUntilDue === 0) {
        statusLabel = 'Due Today';
        statusBadge = '🚨 Due Today!';
    } else if (daysUntilDue < 0 && daysUntilDue >= -5) {
        statusLabel = 'Grace Period';
        statusBadge = `⚠️ ${Math.abs(daysUntilDue)}d Overdue (+5d grace)`;
    } else {
        statusLabel = 'Overdue';
        statusBadge = `🚨 ${Math.abs(daysUntilDue)}d Overdue`;
    }

    return {
        hasPayment: !!paymentDate,
        lastPaymentDate: formatDateDMY(refDate),
        dueDate: formatDateDMY(dueDate),
        dueDateObj: dueDate,
        reminderStartDate: formatDateDMY(reminderStartDate),
        reminderGraceEndDate: formatDateDMY(reminderGraceEndDate),
        daysUntilDue,
        isInReminderWindow,
        shouldShowReminder,
        isFullyPaid,
        statusLabel,
        statusBadge,
    };
}

