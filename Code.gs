// ============================================
// Student Management System — Google Apps Script Backend
// ============================================
// Face detection & location checking REMOVED from attendance.
// Deploy: Deploy > New Deployment > Web App > Anyone > Deploy

const SPREADSHEET_ID = "1Z7b4VjAdN9K-tcm8jAOgFjs6qTdsT556TD3vjYtsjBM"; 
const DRIVE_FOLDER_ID = "1H2h_mP5XT0x9LXmqnzF7dW_vwS91EiEi"; 

// --- AUTO SHEET SETUP ---
function ensureSheet(name, headers) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
  }
  return sheet;
}

// ============================================
// MAIN REQUEST HANDLER
// ============================================
function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    const act = d.action;
    let res = {};

    // --- AUTH & LOAD ---
    if(act==='login') res = checkLogin(d.u, d.p);
    else if(act==='loadAdminData') res = fetchAllAdminData(d.branch);
    
    // --- SAVING DATA ---
    else if(act==='saveInq') res = saveInquiry(d.form);
    else if(act==='regStudent') res = registerStudent(d.form);
    else if(act==='saveAdm') res = saveCourseAdmission(d.form);
    else if(act==='saveFee') res = saveFeeCollection(d.form);
    else if(act==='saveAtt') res = saveAttendance(d.records);
    else if(act==='saveLMS') res = saveLMSContent(d.form);
    else if(act==='saveExam') res = saveExamResult(d.form);
    else if(act==='getAttReport') res = getDailyAttendanceReport(d.date);
    else if(act==='saveNotice') res = saveNotice(d.form);
    else if(act==='getCourseFees') res = getAllCourseFees();
    
    // --- HR & PAYROLL ---
    else if(act==='addEmployee') res = addNewEmployee(d.form);
    else if(act==='reqLeave') res = saveLeaveRequest(d.form);
    else if(act==='actionLeave') res = actionLeaveRequest(d.id, d.status);
    else if(act==='savePayroll') res = savePayroll(d.form);

    // --- PORTAL ACTIONS ---
    else if(act==='registerFace') res = registerFaceData(d.id, d.descriptor);
    else if(act==='getStudent') res = getStudentPortalData(d.id);
    else if(act==='markStudentAtt') res = markStudentAttendance(d.id, d.type, d.lat, d.lng, d.device);
    else if(act==='getEmployee') res = getEmployeePortalData(d.id);
    else if(act==='markEmployeeAtt') res = markEmployeeAttendance(d.id, d.type, d.lat, d.lng);

    // --- ASSIGNMENTS ---
    else if(act==='uploadAssignment') res = uploadAssignment(d.form);
    else if(act==='getAssignments') res = getAssignments(d.id);
    else if(act==='getAllAssignments') res = getAllAssignments();

    // --- SETTINGS ---
    else if(act==='getSettings') res = getSettings();
    else if(act==='saveSetting') res = saveSetting(d.key, d.value);
    else if(act==='checkMobileAllowed') res = checkMobileAllowed();

    return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
  } catch(e) {
    return ContentService.createTextOutput(JSON.stringify({error: "Server Error: "+e.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================
// AUTHENTICATION
// ============================================
function checkLogin(u, p) {
  const d = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("Users").getDataRange().getValues();
  for (let i = 1; i < d.length; i++) {
    if (String(d[i][0]).toLowerCase() == String(u).toLowerCase() && String(d[i][1]) == String(p)) {
      return {
        success: true,
        username: d[i][0],
        role: d[i][2],
        branch: d[i][3],
        userId: d[i][4],
        studentId: d[i][4]
      };
    }
  }
  return { success: false };
}

// ============================================
// ADMIN DATA LOADING
// ============================================
function fetchAllAdminData(b) { 
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const getD = (n) => ss.getSheetByName(n) ? ss.getSheetByName(n).getDataRange().getValues().slice(1) : []; 
  const check = (v, t) => String(t).toLowerCase() === "all" ? true : String(v).trim().toLowerCase() === String(t).trim().toLowerCase(); 
  
  const inq = getD("Inquiries").filter(r => check(r[2], b)); 
  const adm = getD("Admission Data").filter(r => check(r[6], b));
  const activeStudents = adm.filter(r => r[11] === "Active"); 
  
  // Attendance Stats
  const todayStr = Utilities.formatDate(new Date(), "GMT+5:30", "yyyy-MM-dd"); 
  const allAtt = getD("Attendance");
  const todayAtt = allAtt.filter(r => {
    let d = r[0];
    let dStr = (Object.prototype.toString.call(d) === '[object Date]') ? Utilities.formatDate(d, "GMT+5:30", "yyyy-MM-dd") : String(d).substring(0, 10);
    return dStr === todayStr;
  });
  const uniquePresent = [...new Set(todayAtt.map(r => r[1]))]; 
  
  // HR Data
  const employees = getD("Employee");
  const leaves = getD("Leave Requests").filter(r => r[8] === "Pending");
  const approvedLeaves = getD("Leave Requests").filter(r => r[8] === "Approved");
  const payroll = getD("Payroll");
  const empAtt = getD("Employee Attendance");

  // Dropdowns
  const getL = (n, c) => ss.getSheetByName(n) ? ss.getSheetByName(n).getRange(2, c, ss.getSheetByName(n).getLastRow() - 1 || 1).getValues().flat().filter(String) : [];

  // Course Master with fees per year
  const cmSheet = ss.getSheetByName("Course Master");
  let courseMaster = [];
  if (cmSheet && cmSheet.getLastRow() > 1) {
    const cmAll = cmSheet.getDataRange().getValues();
    const cmHeaders = cmAll[0];
    courseMaster = cmAll.slice(1).filter(r => r[1]).map(r => {
      const fees = {};
      for (let c = 3; c < cmHeaders.length; c++) {
        if (cmHeaders[c] && r[c]) fees[String(cmHeaders[c])] = r[c];
      }
      return { course: String(r[1]), validity: r[2], fees: fees };
    });
  }

  // Batch data from Batch sheet
  const batchSheet = ss.getSheetByName("Batch");
  let batches = [];
  if (batchSheet && batchSheet.getLastRow() > 1) {
    batches = batchSheet.getRange(2, 2, batchSheet.getLastRow() - 1).getValues().flat().filter(String);
  }

  return { 
    inquiries: inq, 
    registrations: getD("Registration Data").filter(r => check(r[8], b)), 
    admissions: adm, 
    fees: getD("FEE MANAGEMENT"), 
    employees: employees.map(e => ({ id: e[1], name: e[2], role: e[3], mobile: e[4], salary: e[5] })),
    leaves: leaves.map(l => ({ id: l[0], empId: l[2], name: l[3], type: l[4], from: Utilities.formatDate(new Date(l[5]), "GMT+5:30", "dd-MMM"), to: Utilities.formatDate(new Date(l[6]), "GMT+5:30", "dd-MMM"), reason: l[7] })),
    approvedLeaves: approvedLeaves.map(l => ({ id: l[0], empId: l[2], type: l[4], fromDate: Utilities.formatDate(new Date(l[5]), "GMT+5:30", "yyyy-MM-dd"), toDate: Utilities.formatDate(new Date(l[6]), "GMT+5:30", "yyyy-MM-dd") })),
    payroll: payroll,
    dropdowns: { 
      branches: getL("Branch", 2), 
      courses: getL("Course Master", 2), 
      courseMaster: courseMaster,
      batches: batches,
      villages: getL("VILLAGES", 2), 
      employees: employees.map(e => e[2]), 
      education: getL("Education", 2) 
    }, 
    activeStudents: activeStudents.map(r => ({ id: r[2], name: r[3], course: r[7], batch: r[8] })), 
    stats: { todayPresent: uniquePresent.length, todayAbsent: Math.max(0, activeStudents.length - uniquePresent.length) },
    _rawAttendance: allAtt.map(r => ({ date: r[0], id: r[1], name: r[2], course: r[3], status: r[4], batch: r[5] })),
    empAttendance: empAtt.map(r => ({ time: r[0], empId: String(r[1]), name: r[2], status: r[3], loc: r[4], dist: r[5], date: r[6] }))
  };
}

// ============================================
// STUDENT PORTAL
// ============================================
function getStudentPortalData(id) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const safeGet = (n) => ss.getSheetByName(n) ? ss.getSheetByName(n).getDataRange().getValues().slice(1) : [];
  
  const ad = safeGet("Admission Data").filter(r => r[2] == id);
  const cs = [...new Set(ad.map(r => r[7]))];
  const lms = safeGet("LMS Content").filter(r => cs.includes(r[1]));
  const att = safeGet("Attendance").filter(r => r[1] == id);
  const res = safeGet("Exam Results").filter(r => r[1] == id);
  
  let p = 0;
  att.forEach(r => { if(String(r[4]).toLowerCase().includes('present') || String(r[4]).toLowerCase().includes('check-in')) p++; });
  
  const todayStr = Utilities.formatDate(new Date(), "GMT+5:30", "yyyy-MM-dd");
  let todayStatus = "None", lastCheckInTime = null;
  const todaysEntries = att.filter(r => {
    let d = r[0];
    let dStr = (d instanceof Date) ? Utilities.formatDate(d, "GMT+5:30", "yyyy-MM-dd") : String(d).substring(0, 10);
    return dStr === todayStr;
  });
  if (todaysEntries.length > 0) {
    const last = todaysEntries[todaysEntries.length - 1];
    todayStatus = last[4];
    lastCheckInTime = last[0];
  }
  
  const attLogs = att.map(r => ({ time: r[0], status: r[4], location: r[6] || "N/A", distance: r[7] || "N/A" })).reverse();
  const recentLogs = attLogs.slice(0, 6);
  
  return { 
    profile: { name: ad[0] ? ad[0][3] : "Student", id: id, photo: ad[0] ? ad[0][12] : "", batch: ad[0] ? ad[0][8] : "", hasFace: true }, 
    courses: cs, 
    lms: lms.map(r => ({ title: r[2], type: r[3], link: r[4], desc: r[5] })), 
    attendance: { perc: att.length ? Math.round((p / att.length) * 100) : 0, pres: p, total: att.length, todayStatus: todayStatus, lastCheckInTime: lastCheckInTime, logs: recentLogs, allLogs: attLogs }, 
    results: res.map(r => ({ exam: r[3], marks: r[5], total: r[6], grade: r[7] })),
    notices: getNotices('Student'),
    topics: getTopicsList(cs)
  };
}

// --- MARK STUDENT ATTENDANCE (with mobile device check) ---
function markStudentAttendance(id, type, lat, lng, device) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // Backend enforcement: block mobile if setting is off
  if (String(device).toLowerCase() === 'mobile') {
    var settings = getSettings();
    if (!settings.mobileCheckIn) {
      return { error: "Mobile check-in is disabled by admin. Please use a desktop device." };
    }
  }
  
  // Find student in Admission Data
  const adData = ss.getSheetByName("Admission Data").getDataRange().getValues();
  const studentRow = adData.find(r => String(r[2]) === String(id) && String(r[11]) === "Active");
  if (!studentRow) return { error: "Student not Active" };
  
  // Save attendance record
  const attSheet = ss.getSheetByName("Attendance");
  const timestamp = Utilities.formatDate(new Date(), "GMT+5:30", "yyyy-MM-dd HH:mm:ss");
  const loc = (lat && lng) ? lat + "," + lng : "N/A";
  attSheet.appendRow([timestamp, id, studentRow[3], studentRow[7], type, studentRow[8], loc, "0m"]);
  
  return { success: true, time: timestamp, type: type };
}

// ============================================
// EMPLOYEE PORTAL
// ============================================
function getEmployeePortalData(id) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const empSheet = ss.getSheetByName("Employee");
  const empData = empSheet ? empSheet.getDataRange().getValues().slice(1) : [];
  const profile = empData.find(r => String(r[1]) === String(id)) || ["", id, "Employee", "Staff"]; 
  
  const attSheet = ss.getSheetByName("Employee Attendance");
  const attData = attSheet ? attSheet.getDataRange().getValues().slice(1) : [];
  const myAtt = attData.filter(r => String(r[1]) === String(id));
  
  const leaveSheet = ss.getSheetByName("Leave Requests");
  const leaveData = leaveSheet ? leaveSheet.getDataRange().getValues().slice(1) : [];
  const myLeaves = leaveData.filter(r => String(r[2]) === String(id));

  const payrollSheet = ss.getSheetByName("Payroll");
  const payrollData = payrollSheet ? payrollSheet.getDataRange().getValues().slice(1) : [];
  const myPayroll = payrollData.filter(r => String(r[2]) === String(id));

  const todayStr = Utilities.formatDate(new Date(), "GMT+5:30", "yyyy-MM-dd");
  let todayStatus = "None", lastTime = null;
  const todaysEntries = myAtt.filter(r => {
    let d = r[0];
    let dStr = (d instanceof Date) ? Utilities.formatDate(d, "GMT+5:30", "yyyy-MM-dd") : String(d).substring(0, 10);
    return dStr === todayStr;
  });
  if (todaysEntries.length > 0) {
    const last = todaysEntries[todaysEntries.length - 1];
    todayStatus = last[3];
    lastTime = last[0];
  }
  
  const allLogs = myAtt.map(r => ({ time: r[0], status: r[3], location: r[4], distance: r[5] })).reverse();
  const recentLogs = allLogs.slice(0, 6);
  
  return { 
    profile: { name: profile[2] || "Employee", id: id, role: profile[3] || "Staff", hasFace: true }, 
    stats: { totalDays: [...new Set(myAtt.map(r => Utilities.formatDate(new Date(r[0]), "GMT+5:30", "yyyy-MM-dd")))].length, todayStatus: todayStatus, lastCheckTime: lastTime }, 
    logs: recentLogs,
    allLogs: allLogs,
    leaves: myLeaves.map(l => ({ type: l[4], from: Utilities.formatDate(new Date(l[5]), "GMT+5:30", "dd-MMM"), status: l[8] })),
    payroll: myPayroll.map(p => ({ id: p[0], date: p[1], days: p[4], amount: p[5], status: p[6] })),
    notices: getNotices('Employee')
  };
}

// --- MARK EMPLOYEE ATTENDANCE (No face, no location check) ---
function markEmployeeAttendance(id, type, lat, lng) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  const attSheet = ensureSheet("Employee Attendance", ["Time", "ID", "Name", "Type", "Loc", "Dist", "Date"]);
  const timestamp = new Date();
  const dateStr = Utilities.formatDate(timestamp, "GMT+5:30", "yyyy-MM-dd");
  const timeStr = Utilities.formatDate(timestamp, "GMT+5:30", "yyyy-MM-dd HH:mm:ss");
  const loc = (lat && lng) ? lat + "," + lng : "N/A";
  
  // Get employee name
  const empSheet = ss.getSheetByName("Employee");
  let empName = "Unknown";
  if (empSheet) {
    const empRow = empSheet.getDataRange().getValues().find(r => String(r[1]) === String(id));
    if (empRow) empName = empRow[2];
  }
  
  attSheet.appendRow([timeStr, id, empName, type, loc, "0m", dateStr]);
  return { success: true, time: timeStr, type: type };
}

// ============================================
// HR FUNCTIONS
// ============================================
function addNewEmployee(f) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const uSheet = ensureSheet("Users", ["Username", "Password", "Role", "Branch", "UserId"]);
  const users = uSheet.getDataRange().getValues();
  if (users.some(r => String(r[0]).toLowerCase() === String(f.username).toLowerCase())) return { error: "Username already exists" };
  
  const empId = "EMP-" + (100 + uSheet.getLastRow());
  uSheet.appendRow([f.username, f.password, "employee", f.branch, empId]);
  
  const eSheet = ensureSheet("Employee", ["Timestamp", "ID", "Name", "Role", "Mobile", "Salary"]);
  eSheet.appendRow([new Date(), empId, f.name, f.role, f.mobile, f.salary]);
  
  return { success: true };
}

function saveLeaveRequest(f) {
  const sheet = ensureSheet("Leave Requests", ["ID", "Date", "Emp ID", "Name", "Type", "From", "To", "Reason", "Status"]);
  const id = "LV-" + Date.now();
  sheet.appendRow([id, new Date(), f.empId, f.name, f.type, f.from, f.to, f.reason, "Pending"]);
  return { success: true };
}

function actionLeaveRequest(id, status) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("Leave Requests");
  if (!sheet) return { error: "Sheet not found" };
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.getRange(i + 1, 9).setValue(status);
      return { success: true };
    }
  }
  return { error: "Request not found" };
}

function savePayroll(f) {
  const sheet = ensureSheet("Payroll", ["ID", "Date", "Emp ID", "Name", "Days Present", "Salary Amount", "Status"]);
  sheet.appendRow(["PAY-" + Date.now(), f.date, f.empId, f.name, f.days, f.amount, "Paid"]);
  return { success: true };
}

// ============================================
// DATA SAVING FUNCTIONS
// ============================================
function saveInquiry(f) {
  const s = ensureSheet("Inquiries", ["ID", "Date", "Branch", "Name", "Mobile", "Village", "Course", "Status", "Remark", "Edu", "Gender", "Medium", "Board", "Stream", ""]);
  s.appendRow([s.getLastRow() + 1, Utilities.formatDate(new Date(), "GMT+5:30", "dd-MM-yyyy"), f.branch, f.name, f.mobile, f.village, f.course, "New", f.remark || "", f.edu || "", f.gender || "", f.medium || "", f.board || "", f.stream || "", ""]);
  return { success: true };
}

function registerStudent(f) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const inq = ss.getSheetByName("Inquiries").getDataRange().getValues().find(r => r[0] == f.inquiryId);
  if (!inq) return { success: false };
  const photoUrl = saveImage(f.photo, "ST_" + f.inquiryId);
  const rs = ensureSheet("Registration Data", ["ID", "InqId", "StudID", "Date", "Status", "Name", "Mobile", "Village", "Branch", "Course", "Aadhar", "Photo", "DOB"]);
  const sid = "ST-2026-" + (1000 + rs.getLastRow());
  rs.appendRow([rs.getLastRow(), f.inquiryId, sid, Utilities.formatDate(new Date(), "GMT+5:30", "dd-MM-yyyy"), "Enrolled", inq[3], inq[4], inq[5], inq[2], inq[6], f.aadhar, photoUrl, f.dob]);
  const inqSheet = ss.getSheetByName("Inquiries");
  const allInq = inqSheet.getDataRange().getValues();
  for (let i = 0; i < allInq.length; i++) if (allInq[i][0] == f.inquiryId) { inqSheet.getRange(i + 1, 8).setValue("Confirmed"); break; }
  return { success: true };
}

function saveCourseAdmission(f) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const s = ss.getSheetByName("Registration Data").getDataRange().getValues().find(r => r[2] == f.admStudId);
  const as = ensureSheet("Admission Data", ["ID", "AdmNo", "StudID", "Name", "Mobile", "DOB", "Branch", "Course", "Batch", "Date", "Fees", "Status", "Photo"]);
  as.appendRow([as.getLastRow(), "ADM-" + as.getLastRow(), f.admStudId, s[5], s[6], s[12], s[8], f.admCourse, f.admBatchTime, Utilities.formatDate(new Date(), "GMT+5:30", "dd-MM-yyyy"), f.admFees, "Active", s[11]]);
  return { success: true };
}

function saveFeeCollection(f) {
  ensureSheet("FEE MANAGEMENT", ["RecNo", "Date", "StudID", "Name", "Course", "Amount", "Balance", "Mode", "Collector", "Rem"]).appendRow(["REC-" + Date.now(), Utilities.formatDate(new Date(), "GMT+5:30", "dd-MM-yyyy"), f.studId, f.name, f.course, f.amount, 0, f.mode, f.collector, ""]);
  return { success: true };
}

function saveAttendance(r) {
  const s = ensureSheet("Attendance", ["Date", "ID", "Name", "Course", "Status", "Batch", "Loc", "Dist"]);
  r.forEach(x => s.appendRow([x.date, x.id, x.name, x.course, x.status, x.batch]));
  return { success: true };
}

function saveLMSContent(f) {
  ensureSheet("LMS Content", ["Date", "Course", "Topic", "Type", "Link", "Desc"]).appendRow([new Date(), f.course, f.topic, f.type, f.link, f.desc]);
  return { success: true };
}

function saveExamResult(f) {
  ensureSheet("Exam Results", ["Date", "StudID", "Name", "Exam", "Course", "Marks", "Total", "Grade"]).appendRow([f.date, f.studId, f.name, f.examName, f.course, f.marks, f.total, f.grade]);
  return { success: true };
}

function getDailyAttendanceReport(dateStr) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("Attendance");
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues().slice(1);
  const reportMap = {};
  data.forEach(r => {
    let t = r[0];
    let dVal = (Object.prototype.toString.call(t) === '[object Date]') ? Utilities.formatDate(t, "GMT+5:30", "yyyy-MM-dd") : String(t).substring(0, 10);
    if (dVal === dateStr) {
      let id = r[1];
      if (!reportMap[id]) {
        reportMap[id] = { id: id, name: r[2], course: r[3], in: "--:--", out: "--:--", status: "Present" };
      }
      let timeVal = (Object.prototype.toString.call(t) === '[object Date]') ? Utilities.formatDate(t, "GMT+5:30", "hh:mm a") : String(t).substring(11, 16);
      if (String(r[4]) === 'Check-In') reportMap[id].in = timeVal;
      if (String(r[4]) === 'Check-Out') reportMap[id].out = timeVal;
    }
  });
  return Object.values(reportMap);
}

// ============================================
// NOTICES
// ============================================
function saveNotice(f) {
  const sheet = ensureSheet("Notices", ["Date", "Title", "Message", "Audience", "Expiry Date"]);
  const date = Utilities.formatDate(new Date(), "GMT+5:30", "yyyy-MM-dd HH:mm");
  sheet.appendRow([date, f.title, f.msg, f.audience, f.expiry || ""]);
  return { success: true };
}

function getNotices(role) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("Notices");
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues().slice(1);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return data.filter(r => {
    const aud = String(r[3]).trim().toLowerCase();
    const target = String(role).trim().toLowerCase();
    const isAud = (aud === 'all' || aud === target);
    let isVal = true;
    if (r[4]) { const exp = new Date(r[4]); if (!isNaN(exp.getTime()) && exp < today) isVal = false; }
    return isAud && isVal;
  }).map(r => ({ date: Utilities.formatDate(new Date(r[0]), "GMT+5:30", "dd-MMM"), title: r[1], msg: r[2] })).reverse().slice(0, 10);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function saveImage(base64Data, name) {
  try {
    if (!base64Data || !DRIVE_FOLDER_ID || base64Data.length < 100) return "https://via.placeholder.com/50?text=No+Img";
    const split = base64Data.split('base64,');
    if (split.length < 2) return "https://via.placeholder.com/50?text=Error";
    const blob = Utilities.newBlob(Utilities.base64Decode(split[1]), split[0].split(':')[1].split(';')[0], name + "_" + Date.now() + ".png");
    const file = DriveApp.getFolderById(DRIVE_FOLDER_ID).createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return "https://lh3.googleusercontent.com/d/" + file.getId();
  } catch (e) {
    return "https://via.placeholder.com/50?text=Error";
  }
}

// Face functions kept for backward compatibility but not used in attendance
function checkFaceRegistered(id) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("Face Data");
  if (!sheet) return false;
  const data = sheet.getDataRange().getValues();
  return data.some(r => String(r[0]) === String(id));
}

function registerFaceData(id, descriptor) {
  const sheet = ensureSheet("Face Data", ["ID", "Descriptor", "Timestamp"]);
  const timestamp = Utilities.formatDate(new Date(), "GMT+5:30", "yyyy-MM-dd HH:mm:ss");
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.getRange(i + 1, 2).setValue(JSON.stringify(descriptor));
      sheet.getRange(i + 1, 3).setValue(timestamp);
      return { success: true, msg: "Face updated successfully" };
    }
  }
  sheet.appendRow([id, JSON.stringify(descriptor), timestamp]);
  return { success: true, msg: "Face registered successfully" };
}

function getCourseFee(c) {
  const d = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName("Course Master").getDataRange().getValues();
  for (let i = 1; i < d.length; i++) if (d[i][1] == c) return { fee: d[i][2] };
  return { fee: 0 };
}

// Returns ALL courses with year-wise fees + all batches
function getAllCourseFees() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // Course Master: A=SrNo, B=Course, C=Validity, D=2024, E=2025, F=2026, G=2027, H=2028
  const cmSheet = ss.getSheetByName("Course Master");
  let courses = [];
  if (cmSheet && cmSheet.getLastRow() > 1) {
    const cmData = cmSheet.getDataRange().getValues();
    const headers = cmData[0];
    courses = cmData.slice(1).filter(r => r[1]).map(r => {
      const fees = {};
      for (let c = 3; c < headers.length; c++) {
        if (headers[c]) fees[String(headers[c])] = r[c] || 0;
      }
      return { course: String(r[1]), validity: r[2], fees: fees };
    });
  }
  
  // Batch sheet: A=Srno, B=Batch
  const batchSheet = ss.getSheetByName("Batch");
  let batches = [];
  if (batchSheet && batchSheet.getLastRow() > 1) {
    batches = batchSheet.getRange(2, 2, batchSheet.getLastRow() - 1).getValues().flat().filter(String);
  }
  
  return { success: true, courses: courses, batches: batches };
}

// ============================================
// TOPICS
// ============================================
// Get topics from Topic sheet filtered by student's courses
function getTopicsList(studentCourses) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("Topic");
  if (!sheet || sheet.getLastRow() < 2) return [];
  const data = sheet.getDataRange().getValues().slice(1);
  // Filter by student's courses if provided
  const topics = data.filter(r => r[2]).map(r => ({ course: String(r[1]), topic: String(r[2]) }));
  if (studentCourses && studentCourses.length > 0) {
    const sc = studentCourses.map(c => String(c).toLowerCase());
    return topics.filter(t => sc.includes(t.course.toLowerCase()));
  }
  return topics;
}

// ============================================
// ASSIGNMENTS
// ============================================
// Upload assignment file to Google Drive and log in Assignments sheet
function uploadAssignment(f) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    
    // Get student info from Admission Data
    const admData = ss.getSheetByName("Admission Data");
    if (!admData) return { error: "Admission Data sheet not found" };
    const adRows = admData.getDataRange().getValues();
    const student = adRows.find(r => String(r[2]) === String(f.studentId));
    const studentName = student ? student[3] : "Unknown";
    
    // Create or get student's folder: StudentID-StudentName
    const parentFolder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    const folderName = f.studentId + "-" + studentName;
    let studentFolder;
    const folders = parentFolder.getFoldersByName(folderName);
    if (folders.hasNext()) {
      studentFolder = folders.next();
    } else {
      studentFolder = parentFolder.createFolder(folderName);
      studentFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    }
    
    // Save the file to Drive
    const fileData = f.fileData; // base64 string
    const fileName = f.fileName || "assignment_" + Date.now();
    const mimeType = f.mimeType || "application/octet-stream";
    
    const split = fileData.split('base64,');
    let blob;
    if (split.length >= 2) {
      blob = Utilities.newBlob(Utilities.base64Decode(split[1]), mimeType, fileName);
    } else {
      blob = Utilities.newBlob(Utilities.base64Decode(fileData), mimeType, fileName);
    }
    
    const file = studentFolder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    const fileUrl = "https://drive.google.com/file/d/" + file.getId() + "/view";
    const fileSize = file.getSize();
    
    // Log in Assignments sheet
    const aSheet = ensureSheet("Assignments", ["ID", "Date", "StudentID", "StudentName", "Course", "Topic", "FileName", "FileURL", "FileSize", "MimeType"]);
    const aId = "ASN-" + Date.now();
    const dateStr = Utilities.formatDate(new Date(), "GMT+5:30", "yyyy-MM-dd HH:mm:ss");
    aSheet.appendRow([aId, dateStr, f.studentId, studentName, f.course || "", f.topic || "", fileName, fileUrl, fileSize, mimeType]);
    
    return { success: true, fileUrl: fileUrl, fileName: fileName, id: aId };
  } catch(err) {
    return { error: "Upload failed: " + err.toString() };
  }
}

// Get assignment history for a student + topics for upload
function getAssignments(studentId) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // Get assignments
  const sheet = ss.getSheetByName("Assignments");
  let assignments = [];
  if (sheet && sheet.getLastRow() >= 2) {
    const data = sheet.getDataRange().getValues().slice(1);
    assignments = data
      .filter(r => String(r[2]) === String(studentId))
      .map(r => ({
        id: r[0],
        date: r[1],
        course: r[4],
        topic: r[5],
        fileName: r[6],
        fileUrl: r[7],
        fileSize: r[8],
        mimeType: r[9]
      }))
      .reverse();
  }
  
  // Get student's enrolled courses from Admission Data
  const admSheet = ss.getSheetByName("Admission Data");
  let studentCourses = [];
  if (admSheet) {
    const admData = admSheet.getDataRange().getValues().slice(1);
    studentCourses = [...new Set(admData.filter(r => String(r[2]) === String(studentId)).map(r => String(r[7])))];
  }
  
  // Get topics from Topic sheet (A=SrNo, B=Course, C=Topic)
  const topicSheet = ss.getSheetByName("Topic");
  let topics = [];
  if (topicSheet && topicSheet.getLastRow() >= 2) {
    const tData = topicSheet.getDataRange().getValues().slice(1);
    topics = tData.filter(r => r[2]).map(r => ({ course: String(r[1]), topic: String(r[2]) }));
    if (studentCourses.length > 0) {
      const sc = studentCourses.map(c => c.toLowerCase());
      topics = topics.filter(t => sc.includes(t.course.toLowerCase()));
    }
  }
  
  return { success: true, assignments: assignments, topics: topics, courses: studentCourses };
}

// Get ALL assignments for admin analysis
function getAllAssignments() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName("Assignments");
  if (!sheet || sheet.getLastRow() < 2) return { success: true, assignments: [] };
  const data = sheet.getDataRange().getValues().slice(1);
  const assignments = data.map(r => ({
    id: r[0],
    date: r[1],
    studentId: String(r[2]),
    studentName: r[3],
    course: r[4],
    topic: r[5],
    fileName: r[6],
    fileUrl: r[7],
    fileSize: r[8],
    mimeType: r[9]
  }));
  return { success: true, assignments: assignments };
}

// ============================================
// SETTINGS
// ============================================
// Get all settings
function getSettings() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ensureSheet("Settings", ["Key", "Value"]);
  if (sheet.getLastRow() < 2) return { success: true, mobileCheckIn: false };
  const data = sheet.getDataRange().getValues().slice(1);
  const settings = {};
  data.forEach(r => { if (r[0]) settings[r[0]] = r[1]; });
  
  // Handle both boolean true and string 'true' (Google Sheets may auto-convert)
  const isMobileOn = settings.mobileCheckIn === true || settings.mobileCheckIn === 'true';
  return { success: true, mobileCheckIn: isMobileOn };
}

// Save a setting
function saveSetting(key, value) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ensureSheet("Settings", ["Key", "Value"]);
  const data = sheet.getDataRange().getValues();
  let found = false;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(key)) {
      sheet.getRange(i + 1, 2).setValue(value);
      found = true;
      break;
    }
  }
  if (!found) sheet.appendRow([key, value]);
  return { success: true };
}

// Check if mobile attendance is allowed
function checkMobileAllowed() {
  const settings = getSettings();
  return { success: true, mobileCheckIn: settings.mobileCheckIn === true };
}
