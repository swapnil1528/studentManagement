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
import { parseDate, formatDateDMY, addDays, calculateFeeDueDetails } from '../utils/helpers';

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
/** Get student fee summary, enrollments, and payment history */
/** Get student portal data (profile, attendance, LMS, results) with resilient fallback */
export const getStudentPortalData = async (id) => {
    const studentId = id || 'ST-2026-1001';
    try {
        const res = await apiCall('getStudent', { id: studentId });
        if (res && res.profile && res.courses && res.courses.length > 0) {
            return res;
        }
        const basicRes = await apiCall('getStudentBasic', { id: studentId });
        if (basicRes && basicRes.courses && basicRes.courses.length > 0) {
            return basicRes;
        }
        return res || {};
    } catch (e) {
        console.error('[getStudentPortalData] error:', e);
        return {};
    }
};

/** Get student fee summary, enrollments, and payment history with sheet fallback */
export const getStudentFees = async (id) => {
    const studentId = id || 'ST-2026-1001';
    try {
        const direct = await apiCall('getStudentFees', { id: studentId });
        if (direct && direct.enrollments && direct.enrollments.length > 0) {
            return direct;
        }
    } catch (e) {
        console.warn('[getStudentFees] direct call failed, using live sheet fallback');
    }

    try {
        const adminData = await fetchAdminData('All');
        const admissions = adminData?.admissions || [];
        const fees = adminData?.fees || [];

        const sId = String(studentId).trim().toLowerCase();
        let myAdm = admissions.filter(r => String(r[2]).trim().toLowerCase() === sId);
        if (myAdm.length === 0 && sId) {
            myAdm = admissions.filter(r =>
                String(r[1]).trim().toLowerCase() === sId ||
                String(r[4]).trim() === sId ||
                String(r[3]).trim().toLowerCase().includes(sId)
            );
        }
        if (myAdm.length === 0) {
            myAdm = admissions.filter(r => String(r[2]).trim() === 'ST-2026-1001');
        }

        const resolvedStudentId = myAdm[0] ? String(myAdm[0][2]).trim() : 'ST-2026-1001';
        const resolvedName = myAdm[0] ? myAdm[0][3] : 'Student';
        const resolvedBranch = myAdm[0] ? myAdm[0][6] : 'Devichapada';
        const resolvedBatch = myAdm[0] ? myAdm[0][8] : '';
        const resolvedPhoto = myAdm[0] ? myAdm[0][12] : '';

        const myFees = fees.filter(f =>
            String(f[2]).trim().toLowerCase() === resolvedStudentId.toLowerCase() ||
            String(f[3]).trim().toLowerCase() === resolvedName.toLowerCase()
        );

        const feePayments = myFees.map((f, i) => {
            const rawDate = f[1] || '';
            const pDate = parseDate(rawDate);
            // Column K (index 10) or compute +29 days from payment date
            const rawDueDate = f[10] || (pDate ? formatDateDMY(addDays(pDate, 29)) : '');
            return {
                receiptNo: f[0] || ('REC-' + (1000 + i)),
                date: rawDate,
                studentId: f[2] || resolvedStudentId,
                studentName: f[3] || resolvedName,
                course: f[4] || '',
                amountPaid: Number(f[5]) || 0,
                balance: Number(f[6]) || 0,
                paymentMode: f[7] || 'Cash',
                collectedBy: f[8] || 'Institute',
                dueDate: rawDueDate
            };
        });

        const normCourse = (c) => String(c || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const totalCourseFee = myAdm.reduce((sum, r) => sum + (Number(r[10]) || 0), 0);
        const totalPaidAll = feePayments.reduce((sum, p) => sum + (Number(p.amountPaid) || 0), 0);

        const enrollments = myAdm.map(r => {
            const course = String(r[7] || '').trim();
            const totalFee = Number(r[10]) || 0;
            const normC = normCourse(course);

            let paidForCourse = 0;
            if (myAdm.length === 1) {
                // Single enrollment: all payments by this student belong to this course
                paidForCourse = totalPaidAll;
            } else {
                // Multiple courses: match by exact, normalized, or substring
                const matchingPayments = feePayments.filter(p => {
                    const normP = normCourse(p.course);
                    return !normP || normP === normC || normC.includes(normP) || normP.includes(normC);
                });
                paidForCourse = matchingPayments.reduce((sum, p) => sum + p.amountPaid, 0);
            }

            paidForCourse = Math.min(totalFee, paidForCourse);
            const pendingAmount = Math.max(0, totalFee - paidForCourse);

            return {
                admNo: r[1] || '',
                studentId: r[2] || resolvedStudentId,
                studentName: r[3] || resolvedName,
                branch: r[6] || resolvedBranch,
                course: course,
                batch: r[8] || '',
                admDate: r[9] || '',
                totalFee: totalFee,
                paidAmount: paidForCourse,
                pendingAmount: pendingAmount,
                feeStatus: pendingAmount === 0 ? 'Cleared' : (paidForCourse > 0 ? 'Partial' : 'Pending'),
                status: r[11] || 'Active'
            };
        });

        // If multiple enrollments and some payments were unallocated, allocate them to remaining dues
        if (myAdm.length > 1) {
            let allocated = enrollments.reduce((sum, e) => sum + e.paidAmount, 0);
            let unallocated = Math.max(0, totalPaidAll - allocated);
            if (unallocated > 0) {
                for (let e of enrollments) {
                    if (e.pendingAmount > 0 && unallocated > 0) {
                        const take = Math.min(e.pendingAmount, unallocated);
                        e.paidAmount += take;
                        e.pendingAmount = Math.max(0, e.totalFee - e.paidAmount);
                        e.feeStatus = e.pendingAmount === 0 ? 'Cleared' : (e.paidAmount > 0 ? 'Partial' : 'Pending');
                        unallocated -= take;
                    }
                }
            }
        }

        const totalFee = enrollments.reduce((sum, e) => sum + e.totalFee, 0);
        const totalPaid = totalPaidAll;
        const pendingAmount = Math.max(0, totalFee - totalPaid);
        const collectionRate = totalFee > 0 ? Math.min(100, Math.round((totalPaid / totalFee) * 100)) : 100;

        // Determine latest payment date and sheet due date
        let latestPaymentDate = null;
        let explicitDueDate = null;
        if (feePayments.length > 0) {
            const sortedPayments = [...feePayments].sort((a, b) => {
                const ta = parseDate(a.date)?.getTime() || 0;
                const tb = parseDate(b.date)?.getTime() || 0;
                return tb - ta;
            });
            latestPaymentDate = sortedPayments[0].date;
            explicitDueDate = sortedPayments.find(p => p.dueDate)?.dueDate || null;
        }

        const admissionDate = enrollments[0]?.admDate || '';
        const dueDetails = calculateFeeDueDetails(latestPaymentDate, admissionDate, pendingAmount, explicitDueDate);

        return {
            success: true,
            studentId: resolvedStudentId,
            studentName: resolvedName,
            branch: resolvedBranch,
            batch: resolvedBatch,
            photo: resolvedPhoto,
            enrollments,
            feePayments,
            feeSummary: {
                totalFee,
                totalPaid,
                pendingAmount,
                collectionRate,
                ...dueDetails,
            }
        };
    } catch (err) {
        console.error('[getStudentFees] fallback error:', err);
        return {
            success: false,
            enrollments: [],
            feePayments: [],
            feeSummary: { totalFee: 0, totalPaid: 0, pendingAmount: 0, collectionRate: 100 }
        };
    }
};

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

/** Delete quiz by ID */
export const deleteQuiz = (id) =>
    apiCall('deleteQuiz', { id });

/** Student submits quiz result */
export const submitQuizResult = (form) =>
    apiCall('submitQuiz', { form });

/** Get quiz results (optionally filtered by studentId) */
export const getQuizResults = (studentId = '') =>
    apiCall('getQuizResults', { studentId });

// ─── Articulate Step-by-Step LMS Sessions ──────────────────────
/** Get structured course sessions for Articulate viewer */
export const getCourseSessions = (course) =>
    apiCall('getCourseSessions', { courseName: course });

/** Admin saves structured course sessions tree */
export const saveCourseSessions = (course, sessions) =>
    apiCall('saveCourseSessions', { courseName: course, sessions });

/** Get student step-by-step learning progress and points */
export const getStudentLearningProgress = (studentId, course) =>
    apiCall('getStudentLearningProgress', { studentId, courseName: course });

/** Record completed learning step/topic for a student */
export const recordTopicProgress = (studentId, course, topicId, pointsEarned = 0, sessionCount = 0) =>
    apiCall('recordTopicProgress', { studentId, courseName: course, topicId, pointsEarned, sessionCount });

