package com.dcc.studentmanagement.ui.admin

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dcc.studentmanagement.data.GasApiClient
import com.dcc.studentmanagement.theme.*
import kotlinx.coroutines.launch
import org.json.JSONArray
import java.text.SimpleDateFormat
import java.util.*

data class AdminMetricCard(
    val title: String,
    val value: String,
    val subtitle: String,
    val icon: String,
    val color1: Color,
    val color2: Color,
    val onClick: () -> Unit
)

@Composable
fun AdminDashboardScreen(
    username: String,
    branch: String,
    onNavigateToAdminFees: () -> Unit,
    onNavigateToAdminPendingFees: () -> Unit,
    onNavigateToAdminAttendance: () -> Unit,
    onNavigateToAdminLeaves: () -> Unit,
    onNavigateToAdminStudents: () -> Unit,
    onNavigateToNotices: () -> Unit,
    onNavigateToChat: () -> Unit,
    onLogout: () -> Unit,
    modifier: Modifier = Modifier
) {
    val scope = rememberCoroutineScope()
    var isLoading by remember { mutableStateOf(true) }

    var todayFeesCollected by remember { mutableDoubleStateOf(0.0) }
    var totalPendingFees by remember { mutableDoubleStateOf(0.0) }
    var todayPresentStudents by remember { mutableIntStateOf(0) }
    var todayAbsentStudents by remember { mutableIntStateOf(0) }
    var todayStaffPresent by remember { mutableIntStateOf(0) }
    var totalStaffCount by remember { mutableIntStateOf(0) }
    var pendingLeavesCount by remember { mutableIntStateOf(0) }
    var totalAdmissionsCount by remember { mutableIntStateOf(0) }

    fun loadData() {
        isLoading = true
        scope.launch {
            val res = GasApiClient.loadAdminData(branch)
            res.onSuccess { json ->
                // 1. Stats
                val stats = json.optJSONObject("stats")
                todayPresentStudents = stats?.optInt("todayPresent", 0) ?: 0
                todayAbsentStudents = stats?.optInt("todayAbsent", 0) ?: 0

                // 2. Fees & Today's collection
                val feeArr = json.optJSONArray("fees") ?: JSONArray()
                val todayDateStr = SimpleDateFormat("dd-MM-yyyy", Locale.ENGLISH).format(Date())
                var todaySum = 0.0
                val paidMap = mutableMapOf<String, Double>()

                for (i in 0 until feeArr.length()) {
                    val f = feeArr.optJSONArray(i)
                    if (f != null) {
                        val date = f.optString(1, "")
                        val studId = f.optString(2, "").trim().lowercase()
                        val amt = f.optDouble(5, 0.0)
                        if (date.contains(todayDateStr) || date.startsWith(todayDateStr.take(10))) {
                            todaySum += amt
                        }
                        paidMap[studId] = (paidMap[studId] ?: 0.0) + amt
                    }
                }
                todayFeesCollected = todaySum

                // 3. Admissions & Pending Fees
                val admArr = json.optJSONArray("admissions") ?: JSONArray()
                totalAdmissionsCount = admArr.length()
                var pendingSum = 0.0
                for (i in 0 until admArr.length()) {
                    val a = admArr.optJSONArray(i)
                    if (a != null) {
                        val studId = a.optString(2, "").trim().lowercase()
                        val total = a.optDouble(10, 0.0)
                        val paid = paidMap[studId] ?: 0.0
                        val diff = total - paid
                        if (diff > 0) pendingSum += diff
                    }
                }
                totalPendingFees = pendingSum

                // 4. Employees & Employee Attendance
                val empArr = json.optJSONArray("employees") ?: JSONArray()
                totalStaffCount = empArr.length()

                val empAttArr = json.optJSONArray("empAttendance") ?: JSONArray()
                val activeStaffToday = mutableSetOf<String>()
                for (i in 0 until empAttArr.length()) {
                    val ea = empAttArr.optJSONObject(i)
                    if (ea != null) {
                        val empId = ea.optString("empId", "")
                        if (empId.isNotBlank()) activeStaffToday.add(empId)
                    }
                }
                todayStaffPresent = activeStaffToday.size

                // 5. Leaves
                val leaveArr = json.optJSONArray("leaves") ?: JSONArray()
                pendingLeavesCount = leaveArr.length()
            }
            isLoading = false
        }
    }

    LaunchedEffect(Unit) {
        loadData()
    }

    val kpiCards = remember(
        todayFeesCollected,
        totalPendingFees,
        todayPresentStudents,
        todayStaffPresent,
        pendingLeavesCount,
        totalAdmissionsCount
    ) {
        listOf(
            AdminMetricCard(
                title = "Today Collection",
                value = "₹" + String.format(Locale.US, "%,.0f", todayFeesCollected),
                subtitle = "Collected Today",
                icon = "💰",
                color1 = Color(0xFF10B981),
                color2 = Color(0xFF047857),
                onClick = onNavigateToAdminFees
            ),
            AdminMetricCard(
                title = "Fees Pending",
                value = "₹" + String.format(Locale.US, "%,.0f", totalPendingFees),
                subtitle = "Outstanding Dues",
                icon = "⚠️",
                color1 = Color(0xFFF43F5E),
                color2 = Color(0xFF9F1239),
                onClick = onNavigateToAdminPendingFees
            ),
            AdminMetricCard(
                title = "Student Attendance",
                value = "$todayPresentStudents Present",
                subtitle = "$todayAbsentStudents Absent Today",
                icon = "👨‍🎓",
                color1 = CyanNeon,
                color2 = Color(0xFF0891B2),
                onClick = onNavigateToAdminAttendance
            ),
            AdminMetricCard(
                title = "Staff Attendance",
                value = "$todayStaffPresent / $totalStaffCount",
                subtitle = "Employees Checked-In",
                icon = "💼",
                color1 = BrandPrimary,
                color2 = Color(0xFF4338CA),
                onClick = onNavigateToAdminAttendance
            ),
            AdminMetricCard(
                title = "Leave Requests",
                value = "$pendingLeavesCount Pending",
                subtitle = "Staff Applications",
                icon = "🏖️",
                color1 = AmberGold,
                color2 = Color(0xFFB45309),
                onClick = onNavigateToAdminLeaves
            ),
            AdminMetricCard(
                title = "Total Enrolled",
                value = "$totalAdmissionsCount Students",
                subtitle = "Active Admissions",
                icon = "👥",
                color1 = VioletAccent,
                color2 = Color(0xFF6D28D9),
                onClick = onNavigateToAdminStudents
            )
        )
    }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(DarkBg)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .navigationBarsPadding()
        ) {
            // ADMIN EXECUTIVE HEADER
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 14.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(46.dp)
                            .clip(CircleShape)
                            .background(
                                Brush.linearGradient(
                                    colors = listOf(AmberGold, Color(0xFFD97706))
                                )
                            ),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("🛡️", fontSize = 20.sp)
                    }

                    Spacer(Modifier.width(12.dp))

                    Column {
                        Text(
                            text = "Admin Executive Hub",
                            fontSize = 17.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = TextWhite
                        )
                        Text(
                            text = "$username • Campus: $branch",
                            fontSize = 12.sp,
                            color = AmberGold
                        )
                    }
                }

                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(
                        onClick = { loadData() },
                        modifier = Modifier
                            .size(38.dp)
                            .clip(CircleShape)
                            .background(DarkCard)
                    ) {
                        Text("🔄", fontSize = 16.sp)
                    }

                    Spacer(Modifier.width(8.dp))

                    IconButton(
                        onClick = onLogout,
                        modifier = Modifier
                            .size(38.dp)
                            .clip(CircleShape)
                            .background(DarkCard)
                    ) {
                        Text("🚪", fontSize = 16.sp)
                    }
                }
            }

            // OVERVIEW STRIP
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 4.dp)
                    .clip(RoundedCornerShape(16.dp))
                    .background(
                        Brush.horizontalGradient(
                            colors = listOf(Color(0xFF1E1B4B), Color(0xFF0F172A))
                        )
                    )
                    .border(1.dp, BrandPrimary.copy(alpha = 0.3f), RoundedCornerShape(16.dp))
                    .padding(14.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("Live Campus Overview", fontSize = 11.sp, color = BrandLight, fontWeight = FontWeight.Bold)
                        Text(
                            text = "Collection & Attendance Realtime Feed",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextWhite
                        )
                    }
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .background(EmeraldGreen.copy(alpha = 0.2f))
                            .padding(horizontal = 8.dp, vertical = 4.dp)
                    ) {
                        Text("● LIVE", color = EmeraldGreen, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }

            Spacer(Modifier.height(8.dp))

            // 6 EXECUTIVE KPI STATS GRID
            LazyVerticalGrid(
                columns = GridCells.Fixed(2),
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 16.dp),
                contentPadding = PaddingValues(bottom = 90.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(kpiCards) { card ->
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(154.dp)
                            .clickable { card.onClick() },
                        shape = RoundedCornerShape(22.dp),
                        colors = CardDefaults.cardColors(containerColor = DarkCard),
                        border = BorderStroke(1.dp, card.color1.copy(alpha = 0.4f))
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(16.dp),
                            verticalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(42.dp)
                                        .clip(RoundedCornerShape(14.dp))
                                        .background(
                                            Brush.linearGradient(listOf(card.color1, card.color2))
                                        ),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(card.icon, fontSize = 20.sp)
                                }

                                Text(
                                    text = "OPEN →",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = card.color1
                                )
                            }

                            Column {
                                Text(
                                    text = card.value,
                                    fontSize = 17.sp,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = TextWhite,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                                Spacer(Modifier.height(2.dp))
                                Text(
                                    text = card.title,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = card.color1
                                )
                                Text(
                                    text = card.subtitle,
                                    fontSize = 10.sp,
                                    color = TextMuted,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                        }
                    }
                }

                item {
                    // Quick Action: Broadcast Notice
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(130.dp)
                            .clickable { onNavigateToNotices() },
                        shape = RoundedCornerShape(22.dp),
                        colors = CardDefaults.cardColors(containerColor = DarkCard),
                        border = BorderStroke(1.dp, AmberGold.copy(alpha = 0.4f))
                    ) {
                        Column(
                            Modifier.fillMaxSize().padding(16.dp),
                            verticalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("📢", fontSize = 24.sp)
                            Column {
                                Text("Broadcast Notice", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = TextWhite)
                                Text("Publish campus circulars", fontSize = 11.sp, color = TextMuted)
                            }
                        }
                    }
                }

                item {
                    // Quick Action: WhatsApp Hub
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(130.dp)
                            .clickable { onNavigateToChat() },
                        shape = RoundedCornerShape(22.dp),
                        colors = CardDefaults.cardColors(containerColor = DarkCard),
                        border = BorderStroke(1.dp, EmeraldGreen.copy(alpha = 0.4f))
                    ) {
                        Column(
                            Modifier.fillMaxSize().padding(16.dp),
                            verticalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("💬", fontSize = 24.sp)
                            Column {
                                Text("WhatsApp Hub", fontWeight = FontWeight.Bold, fontSize = 14.sp, color = TextWhite)
                                Text("Chat with students & staff", fontSize = 11.sp, color = TextMuted)
                            }
                        }
                    }
                }
            }
        }

        // FLOATING WHATSAPP CHAT BUTTON
        FloatingActionButton(
            onClick = onNavigateToChat,
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(20.dp)
                .size(60.dp),
            shape = CircleShape,
            containerColor = Color(0xFF25D366),
            contentColor = Color.White
        ) {
            Text("💬", fontSize = 24.sp)
        }
    }
}
