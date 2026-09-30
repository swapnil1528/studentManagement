package com.dcc.studentmanagement.ui.dashboard

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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dcc.studentmanagement.data.GasApiClient
import com.dcc.studentmanagement.theme.*
import kotlinx.coroutines.launch

data class NativeActionCard(
    val id: String,
    val icon: String,
    val title: String,
    val subtitle: String,
    val badge: String? = null,
    val gradientColors: List<Color>,
    val onClick: () -> Unit
)

@Composable
fun DashboardScreen(
    role: String,
    username: String,
    studentId: String,
    onNavigateToAttendance: () -> Unit,
    onNavigateToFees: () -> Unit,
    onNavigateToChat: () -> Unit,
    onNavigateToNotices: () -> Unit,
    onNavigateToResults: () -> Unit,
    onNavigateToCourses: () -> Unit,
    onNavigateToProfile: () -> Unit,
    onLogout: () -> Unit,
    modifier: Modifier = Modifier
) {
    val scope = rememberCoroutineScope()
    var displayName by remember { mutableStateOf(username) }
    var displayBranch by remember { mutableStateOf("Devichapada") }
    var displayBatch by remember { mutableStateOf("") }
    var attendancePerc by remember { mutableIntStateOf(0) }
    var pendingFees by remember { mutableDoubleStateOf(0.0) }
    var coursesCount by remember { mutableIntStateOf(0) }

    LaunchedEffect(studentId) {
        scope.launch {
            val res = GasApiClient.getStudentData(studentId)
            res.onSuccess { json ->
                val prof = json.optJSONObject("profile")
                if (prof != null) {
                    displayName = prof.optString("name", username)
                    displayBranch = prof.optString("branch", "Devichapada")
                    displayBatch = prof.optString("batch", "")
                }
                val att = json.optJSONObject("attendance")
                if (att != null) {
                    attendancePerc = att.optInt("perc", 0)
                }
                val cArr = json.optJSONArray("courses")
                if (cArr != null) {
                    coursesCount = cArr.length()
                }
            }

            val feeRes = GasApiClient.getStudentFees(studentId)
            feeRes.onSuccess { feeJson ->
                val summary = feeJson.optJSONObject("feeSummary")
                if (summary != null) {
                    pendingFees = summary.optDouble("pendingAmount", 0.0)
                }
            }
        }
    }

    val actionCards = remember(coursesCount, pendingFees) {
        listOf(
            NativeActionCard(
                id = "chat",
                icon = "💬",
                title = "WhatsApp Chat",
                subtitle = "Groups, 1-on-1 & Faculty Help",
                badge = "ACTIVE",
                gradientColors = listOf(Color(0xFF10B981), Color(0xFF047857)),
                onClick = onNavigateToChat
            ),
            NativeActionCard(
                id = "attendance",
                icon = "📸",
                title = "Smart Attendance",
                subtitle = "Camera selfie & GPS check-in",
                badge = "$attendancePerc%",
                gradientColors = listOf(CyanNeon, Color(0xFF0891B2)),
                onClick = onNavigateToAttendance
            ),
            NativeActionCard(
                id = "fees",
                icon = "💳",
                title = "Fee Ledger",
                subtitle = "Dues, payments & receipts",
                badge = if (pendingFees > 0) "DUE" else "CLEARED",
                gradientColors = listOf(Color(0xFF34D399), Color(0xFF059669)),
                onClick = onNavigateToFees
            ),
            NativeActionCard(
                id = "notices",
                icon = "📢",
                title = "Notice Board",
                subtitle = "Campus circulars & holidays",
                badge = "NEW",
                gradientColors = listOf(AmberGold, Color(0xFFD97706)),
                onClick = onNavigateToNotices
            ),
            NativeActionCard(
                id = "results",
                icon = "📊",
                title = "Exams & Results",
                subtitle = "Grades, marks & certificates",
                badge = null,
                gradientColors = listOf(VioletAccent, Color(0xFF7C3AED)),
                onClick = onNavigateToResults
            ),
            NativeActionCard(
                id = "courses",
                icon = "📚",
                title = "Enrolled Courses",
                subtitle = "Syllabus modules & practicals",
                badge = if (coursesCount > 0) "$coursesCount Active" else null,
                gradientColors = listOf(BrandPrimary, Color(0xFF4338CA)),
                onClick = onNavigateToCourses
            ),
            NativeActionCard(
                id = "profile",
                icon = "🪪",
                title = "Digital Student ID",
                subtitle = "Campus pass & credentials",
                badge = "VERIFIED",
                gradientColors = listOf(PinkNeon, Color(0xFFBE185D)),
                onClick = onNavigateToProfile
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
            // HEADER BAR
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
                                    colors = listOf(BrandPrimary, CyanNeon)
                                )
                            )
                            .clickable { onNavigateToProfile() },
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = displayName.take(1).uppercase(),
                            fontSize = 20.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = Color.White
                        )
                    }

                    Spacer(Modifier.width(12.dp))

                    Column {
                        Text(
                            text = displayName,
                            fontSize = 16.sp,
                            fontWeight = FontWeight.Bold,
                            color = TextWhite,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis
                        )
                        Text(
                            text = studentId + " • " + displayBranch,
                            fontSize = 12.sp,
                            color = TextMuted
                        )
                    }
                }

                IconButton(
                    onClick = onLogout,
                    modifier = Modifier
                        .size(38.dp)
                        .clip(CircleShape)
                        .background(DarkCard)
                ) {
                    Text("🚪", fontSize = 18.sp)
                }
            }

            // LIVE STATS STRIP
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 6.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Attendance Box
                Card(
                    modifier = Modifier.weight(1f).clickable { onNavigateToAttendance() },
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = DarkCard),
                    border = BorderStroke(1.dp, DarkBorder)
                ) {
                    Column(Modifier.padding(12.dp)) {
                        Text("Attendance", fontSize = 11.sp, color = TextMuted)
                        Spacer(Modifier.height(4.dp))
                        Text(
                            text = "$attendancePerc%",
                            fontSize = 20.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = if (attendancePerc >= 75) EmeraldGreen else AmberGold
                        )
                    }
                }

                // Dues Box
                Card(
                    modifier = Modifier.weight(1f).clickable { onNavigateToFees() },
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = DarkCard),
                    border = BorderStroke(1.dp, if (pendingFees > 0) Color(0xFFF43F5E).copy(alpha = 0.4f) else DarkBorder)
                ) {
                    Column(Modifier.padding(12.dp)) {
                        Text("Fee Dues", fontSize = 11.sp, color = TextMuted)
                        Spacer(Modifier.height(4.dp))
                        Text(
                            text = if (pendingFees > 0) "₹" + pendingFees.toInt() else "CLEARED",
                            fontSize = 17.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = if (pendingFees > 0) Color(0xFFF43F5E) else EmeraldGreen
                        )
                    }
                }

                // Batch Time Box
                Card(
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(16.dp),
                    colors = CardDefaults.cardColors(containerColor = DarkCard),
                    border = BorderStroke(1.dp, DarkBorder)
                ) {
                    Column(Modifier.padding(12.dp)) {
                        Text("Batch Timing", fontSize = 11.sp, color = TextMuted)
                        Spacer(Modifier.height(4.dp))
                        Text(
                            text = displayBatch.ifBlank { "Regular" }.take(9),
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            color = CyanNeon
                        )
                    }
                }
            }

            Spacer(Modifier.height(8.dp))

            // ACTION CARDS GRID
            LazyVerticalGrid(
                columns = GridCells.Fixed(2),
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 16.dp),
                contentPadding = PaddingValues(bottom = 90.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                items(actionCards) { card ->
                    Card(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(148.dp)
                            .clickable { card.onClick() },
                        shape = RoundedCornerShape(22.dp),
                        colors = CardDefaults.cardColors(containerColor = DarkCard),
                        border = BorderStroke(1.dp, DarkBorder)
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
                                        .size(44.dp)
                                        .clip(RoundedCornerShape(14.dp))
                                        .background(
                                            Brush.linearGradient(colors = card.gradientColors)
                                        ),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(card.icon, fontSize = 22.sp)
                                }

                                if (card.badge != null) {
                                    Box(
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(8.dp))
                                            .background(card.gradientColors.first().copy(alpha = 0.2f))
                                            .padding(horizontal = 7.dp, vertical = 3.dp)
                                    ) {
                                        Text(
                                            text = card.badge,
                                            fontSize = 9.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = Color.White
                                        )
                                    }
                                }
                            }

                            Column {
                                Text(
                                    text = card.title,
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = TextWhite,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                                Spacer(Modifier.height(2.dp))
                                Text(
                                    text = card.subtitle,
                                    fontSize = 11.sp,
                                    color = TextMuted,
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis,
                                    lineHeight = 15.sp
                                )
                            }
                        }
                    }
                }
            }
        }

        // FLOATING WHATSAPP BUTTON
        FloatingActionButton(
            onClick = onNavigateToChat,
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(20.dp)
                .size(60.dp),
            shape = CircleShape,
            containerColor = Color(0xFF25D366),
            contentColor = Color.White,
            elevation = FloatingActionButtonDefaults.elevation(defaultElevation = 8.dp)
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("💬", fontSize = 24.sp)
            }
        }
    }
}
