/**
 * ============================================
 * Centralized API Service
 * ============================================
 * All backend communication with Google Apps Script goes through
 * this single module. No component should call fetch() directly.
 *
 * Pattern: Each exported function wraps apiCall() with the
 * correct action name and payload shape expected by the backend.
 */

import { API_URL } from '../config/constants';

// ─── Core API Caller ──────────────────────────────────────────
/**
 * Makes a POST request to the Google Apps Script backend.
 * @param {string} action - The action identifier (e.g. 'login', 'saveInq')
 * @param {object} data   - Additional payload merged with the action
 * @returns {object|null} - Parsed JSON response, or null on network error
 */
export async function apiCall(action, data = {}) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            redirect: 'follow',
            headers: {
                'Content-Type': 'text/plain',
            },
            body: JSON.stringify({ action, ...data }),
        });

        // Google Apps Script may return a redirect — check if we got HTML
        const text = await response.text();
        let result;
        try {
            result = JSON.parse(text);
        } catch (parseErr) {
            console.error(`[API Parse Error] ${action}: Response is not JSON`, text.substring(0, 200));
            return null;
        }

        if (result.error) {
            console.error(`[API Error] ${action}:`, result.error);
        }
        return result;
    } catch (error) {
        console.error(`[Network Error] ${action}:`, error);
        return null;
    }
}

// ─── Authentication ───────────────────────────────────────────
/** Verify user credentials */
export const loginUser = (username, password) =>
    apiCall('login', { u: username, p: password });

// ─── Admin Data Loading ───────────────────────────────────────
/** Fetch all admin dashboard data for a branch */
export const fetchAdminData = (branch) =>
    apiCall('loadAdminData', { branch });

// ─── Inquiry Management ──────────────────────────────────────
/** Save a new student inquiry */
export const saveInquiry = (form) =>
    apiCall('saveInq', { form });

/** Update an existing inquiry by row ID */
export const updateInquiry = (id, form) =>
    apiCall('updateInq', { id, form });

/** Delete an inquiry by row ID */
export const deleteInquiry = (id) =>
    apiCall('deleteInq', { id });

// ─── Student Registration ────────────────────────────────────
/** Register a student from an inquiry */
export const registerStudent = (form) =>
    apiCall('regStudent', { form });

/** Update a registration record by student ID */
export const updateRegistration = (id, form) =>
    apiCall('updateReg', { id, form });

/** Delete a registration record by student ID */
export const deleteRegistration = (id) =>
    apiCall('deleteReg', { id });

// ─── Course Admission ────────────────────────────────────────
/** Admit a registered student to a course */
export const saveCourseAdmission = (form) =>
    apiCall('saveAdm', { form });

/** Update an admission record by admission row ID */
export const updateAdmission = (id, form) =>
    apiCall('updateAdm', { id, form });

/** Delete an admission record by admission row ID */
export const deleteAdmission = (id) =>
    apiCall('deleteAdm', { id });

// ─── Fee Collection ──────────────────────────────────────────
/** Record a fee payment */
export const saveFeeCollection = (form) =>
    apiCall('saveFee', { form });

// ─── Attendance ──────────────────────────────────────────────
/** Save manual attendance records (admin) */
export const saveAttendance = (records) =>
    apiCall('saveAtt', { records });

/** Get daily attendance report for a specific date */
export const getDailyAttendanceReport = (date) =>
    apiCall('getAttReport', { date });

// ─── LMS ─────────────────────────────────────────────────────
/** Upload LMS learning content */
export const saveLMSContent = (form) =>
    apiCall('saveLMS', { form });

// ─── Exam Results ────────────────────────────────────────────
/** Save exam result for a student */
export const saveExamResult = (form) =>
    apiCall('saveExam', { form });

// ─── Notices ─────────────────────────────────────────────────
/** Publish a notice */
export const saveNotice = (form) =>
    apiCall('saveNotice', { form });

// ─── HR & Payroll ────────────────────────────────────────────
/** Add a new employee */
export const addEmployee = (form) =>
    apiCall('addEmployee', { form });

/** Submit a leave request (employee) */
export const saveLeaveRequest = (form) =>
    apiCall('reqLeave', { form });

/** Approve or reject a leave request (admin) */
export const actionLeaveRequest = (id, status) =>
    apiCall('actionLeave', { id, status });

/** Save payroll record */
export const savePayroll = (form) =>
    apiCall('savePayroll', { form });

// ─── Face Recognition ────────────────────────────────────────
/** Register a face descriptor for a user */
export const registerFaceData = (id, descriptor) =>
    apiCall('registerFace', { id, descriptor });

// ─── Portal Data ─────────────────────────────────────────────
/** Get student portal data (profile, attendance, LMS, results) */
export const getStudentPortalData = (id) =>
    apiCall('getStudent', { id });

/** Get employee portal data (profile, attendance, leaves) */
export const getEmployeePortalData = (id) =>
    apiCall('getEmployee', { id });

// ─── Portal Attendance ───────────────────────────────────────
/** Mark student attendance with face + geolocation */
export const markStudentAttendance = (id, type, lat, lng, faceDescriptor) =>
    apiCall('markStudentAtt', { id, type, lat, lng, faceDescriptor });

/** Mark employee attendance with face + geolocation */
export const markEmployeeAttendance = (id, type, lat, lng, faceDescriptor) =>
    apiCall('markEmployeeAtt', { id, type, lat, lng, faceDescriptor });

// ─── Course Fees & Batches ───────────────────────────────────
/** Get all courses with fees + batch timings from Course Master & Batch sheets */
export const getCourseFees = () =>
    apiCall('getCourseFees', {});

// ─── Assignments ─────────────────────────────────────────────
/** Upload a student assignment file */
export const uploadAssignment = (form) =>
    apiCall('uploadAssignment', { form });

/** Get assignment history for a student */
export const getAssignments = (id) =>
    apiCall('getAssignments', { id });

// ─── LMS Management ──────────────────────────────────────────
/** Get all published LMS materials (optionally filtered by course) */
export const getLMSMaterials = (course = '') =>
    apiCall('getLMSMaterials', { course });

/** Update an existing LMS material by ID */
export const updateLMSContent = (id, form) =>
    apiCall('updateLMS', { id, form });

/** Delete an LMS material by ID */
export const deleteLMSContent = (id) =>
    apiCall('deleteLMS', { id });

// ─── Quiz / Exam ──────────────────────────────────────────────
/** Admin creates a new quiz */
export const saveQuiz = (form) =>
    apiCall('saveQuiz', { form });

/** Get quizzes for given courses (array) */
export const getQuizzes = (courses) =>
    apiCall('getQuizzes', { courses });

/** Student submits quiz result */
export const submitQuizResult = (form) =>
    apiCall('submitQuiz', { form });

/** Admin gets all quiz results */
export const getQuizResults = () =>
    apiCall('getQuizResults', {});
