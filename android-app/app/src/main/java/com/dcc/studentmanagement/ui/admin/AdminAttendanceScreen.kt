package com.dcc.studentmanagement.ui.admin

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dcc.studentmanagement.data.GasApiClient
import com.dcc.studentmanagement.theme.*
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject

data class AdminEmpAttRecord(
    val empId: String,
    val name: String,
    val status: String,
    val time: String,
    val loc: String,
    val dist: String
)

data class AdminStudentAttRecord(
    val studId: String,
    val name: String,
    val status: String,
    val time: String,
    val branch: String
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminAttendanceScreen(
    branch: String,
    onBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val scope = rememberCoroutineScope()
    var isLoading by remember { mutableStateOf(true) }
    var selectedTab by remember { mutableIntStateOf(0) } // 0 = Staff, 1 = Students

    var todayStudentPresent by remember { mutableIntStateOf(0) }
    var todayStudentAbsent by remember { mutableIntStateOf(0) }
    var empAttendanceList by remember { mutableStateOf<List<AdminEmpAttRecord>>(emptyList()) }
    var studentAttendanceList by remember { mutableStateOf<List<AdminStudentAttRecord>>(emptyList()) }

    LaunchedEffect(Unit) {
        isLoading = true
        scope.launch {
            val res = GasApiClient.loadAdminData(branch)
            res.onSuccess { json ->
                val stats = json.optJSONObject("stats")
                todayStudentPresent = stats?.optInt("todayPresent", 0) ?: 0
                todayStudentAbsent = stats?.optInt("todayAbsent", 0) ?: 0

                val empAttArr = json.optJSONArray("empAttendance") ?: JSONArray()
                val eList = mutableListOf<AdminEmpAttRecord>()
                for (i in 0 until empAttArr.length()) {
                    val o = empAttArr.optJSONObject(i)
                    if (o != null) {
                        eList.add(
                            AdminEmpAttRecord(
                                empId = o.optString("empId", ""),
                                name = o.optString("name", "Employee"),
                                status = o.optString("status", "Check-In"),
                                time = o.optString("time", "").take(19).replace("T", " "),
                                loc = o.optString("loc", "Campus"),
                                dist = o.optString("dist", "0m")
                            )
                        )
                    }
                }
                empAttendanceList = eList

                val rawAtt = json.optJSONArray("_rawAttendance") ?: json.optJSONArray("attendance") ?: JSONArray()
                val sList = mutableListOf<AdminStudentAttRecord>()
                for (i in 0 until rawAtt.length()) {
                    val r = rawAtt.optJSONArray(i)
                    if (r != null) {
                        sList.add(
                            AdminStudentAttRecord(
                                studId = r.optString(1, ""),
                                name = r.optString(2, "Student"),
                                status = r.optString(4, "Present"),
                                time = r.optString(0, ""),
                                branch = r.optString(3, branch)
                            )
                        )
                    }
                }
                studentAttendanceList = sList
            }
            isLoading = false
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text("Campus Attendance Ledger", fontWeight = FontWeight.Bold, color = TextWhite)
                },
                navigationIcon = {
                    Text(
                        text = "← Back",
                        color = BrandLight,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier
                            .clickable { onBack() }
                            .padding(16.dp)
                    )
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = DarkCard)
            )
        },
        containerColor = DarkBg,
        modifier = modifier
    ) { padding ->
        if (isLoading) {
            Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = CyanNeon)
            }
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
            ) {
                // Summary Metric Strip
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    Card(
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = DarkCard),
                        border = BorderStroke(1.dp, BrandPrimary.copy(alpha = 0.4f))
                    ) {
                        Column(Modifier.padding(14.dp)) {
                            Text("Staff Present Today", fontSize = 11.sp, color = TextMuted)
                            Spacer(Modifier.height(4.dp))
                            Text(
                                text = "${empAttendanceList.size} Staff",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = BrandLight
                            )
                        }
                    }

                    Card(
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = DarkCard),
                        border = BorderStroke(1.dp, CyanNeon.copy(alpha = 0.4f))
                    ) {
                        Column(Modifier.padding(14.dp)) {
                            Text("Students Today", fontSize = 11.sp, color = TextMuted)
                            Spacer(Modifier.height(4.dp))
                            Text(
                                text = "$todayStudentPresent / ${todayStudentPresent + todayStudentAbsent}",
                                fontSize = 18.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = CyanNeon
                            )
                        }
                    }
                }

                // Dual Tabs
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 6.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(DarkCard)
                        .padding(4.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(10.dp))
                            .background(if (selectedTab == 0) BrandPrimary else Color.Transparent)
                            .clickable { selectedTab = 0 }
                            .padding(vertical = 10.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "Staff Logs (${empAttendanceList.size})",
                            color = if (selectedTab == 0) Color.White else TextMuted,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp
                        )
                    }

                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(10.dp))
                            .background(if (selectedTab == 1) CyanNeon else Color.Transparent)
                            .clickable { selectedTab = 1 }
                            .padding(vertical = 10.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "Student Logs (${studentAttendanceList.size})",
                            color = if (selectedTab == 1) Color.Black else TextMuted,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp
                        )
                    }
                }

                // List
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    item { Spacer(Modifier.height(4.dp)) }

                    if (selectedTab == 0) {
                        if (empAttendanceList.isEmpty()) {
                            item {
                                Box(
                                    modifier = Modifier.fillMaxWidth().padding(40.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text("No employee check-ins recorded today.", color = TextMuted)
                                }
                            }
                        } else {
                            items(empAttendanceList) { item ->
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(14.dp),
                                    colors = CardDefaults.cardColors(containerColor = DarkCard),
                                    border = BorderStroke(1.dp, DarkBorder)
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth().padding(14.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(item.name, fontWeight = FontWeight.Bold, color = TextWhite, fontSize = 14.sp)
                                            Text("Staff ID: " + item.empId + " • " + item.time, color = TextMuted, fontSize = 11.sp)
                                            Text("📍 " + item.dist + " • " + item.loc, color = CyanNeon, fontSize = 11.sp)
                                        }

                                        Box(
                                            modifier = Modifier
                                                .clip(RoundedCornerShape(8.dp))
                                                .background(EmeraldGreen.copy(alpha = 0.2f))
                                                .padding(horizontal = 10.dp, vertical = 4.dp)
                                        ) {
                                            Text(item.status, color = EmeraldGreen, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                                        }
                                    }
                                }
                            }
                        }
                    } else {
                        if (studentAttendanceList.isEmpty()) {
                            item {
                                Box(
                                    modifier = Modifier.fillMaxWidth().padding(40.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text("No student attendance logs for today.", color = TextMuted)
                                }
                            }
                        } else {
                            items(studentAttendanceList) { item ->
                                Card(
                                    modifier = Modifier.fillMaxWidth(),
                                    shape = RoundedCornerShape(14.dp),
                                    colors = CardDefaults.cardColors(containerColor = DarkCard),
                                    border = BorderStroke(1.dp, DarkBorder)
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth().padding(14.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(item.name, fontWeight = FontWeight.Bold, color = TextWhite, fontSize = 14.sp)
                                            Text("Student ID: " + item.studId + " • " + item.branch, color = TextMuted, fontSize = 11.sp)
                                            Text("Date: " + item.time, color = TextSubtle, fontSize = 11.sp)
                                        }

                                        Box(
                                            modifier = Modifier
                                                .clip(RoundedCornerShape(8.dp))
                                                .background(CyanNeon.copy(alpha = 0.2f))
                                                .padding(horizontal = 10.dp, vertical = 4.dp)
                                        ) {
                                            Text(item.status, color = CyanNeon, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                                        }
                                    }
                                }
                            }
                        }
                    }

                    item { Spacer(Modifier.height(24.dp)) }
                }
            }
        }
    }
}
