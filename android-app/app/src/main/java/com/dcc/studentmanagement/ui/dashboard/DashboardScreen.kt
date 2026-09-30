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
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dcc.studentmanagement.theme.*

data class ColorfulCard(
    val id: String,
    val iconTag: String,
    val title: String,
    val subtitle: String,
    val badge: String? = null,
    val gradientColors: List<Color>,
    val url: String
)

@Composable
fun DashboardScreen(
    role: String,
    username: String,
    onItemClick: (url: String, title: String) -> Unit,
    onOpenChat: () -> Unit,
    onLogout: () -> Unit,
    modifier: Modifier = Modifier
) {
    val isAdmin = role.equals("admin", ignoreCase = true) ||
                  role.equals("employee", ignoreCase = true) ||
                  role.equals("teacher", ignoreCase = true)

    val adminCards = remember {
        listOf(
            ColorfulCard(
                id = "admin_chat",
                iconTag = "CHAT",
                title = "WhatsApp Chat",
                subtitle = "Groups, 1-on-1 & media",
                badge = "ACTIVE",
                gradientColors = listOf(Color(0xFF10B981), Color(0xFF047857)),
                url = "/admin/chat"
            ),
            ColorfulCard(
                id = "admin_dash",
                iconTag = "DSH",
                title = "Overview Dashboard",
                subtitle = "Analytics & statistics",
                badge = "LIVE",
                gradientColors = listOf(BrandPrimary, Color(0xFF4338CA)),
                url = "/admin/dashboard"
            ),
            ColorfulCard(
                id = "admin_attend",
                iconTag = "ATT",
                title = "Attendance Tracker",
                subtitle = "Mark & view logs",
                badge = null,
                gradientColors = listOf(CyanNeon, Color(0xFF0891B2)),
                url = "/admin/attendance"
            ),
            ColorfulCard(
                id = "admin_notices",
                iconTag = "NTC",
                title = "Notice Board",
                subtitle = "Broadcast push alerts",
                badge = null,
                gradientColors = listOf(AmberGold, Color(0xFFD97706)),
                url = "/admin/notices"
            ),
            ColorfulCard(
                id = "admin_inquiries",
                iconTag = "INQ",
                title = "Student Inquiries",
                subtitle = "Follow-ups & leads",
                badge = null,
                gradientColors = listOf(SkyBlue, Color(0xFF0284C7)),
                url = "/admin/inquiries"
            ),
            ColorfulCard(
                id = "admin_reg",
                iconTag = "REG",
                title = "Registrations",
                subtitle = "New admissions queue",
                badge = null,
                gradientColors = listOf(PinkNeon, Color(0xFFBE185D)),
                url = "/admin/registrations"
            ),
            ColorfulCard(
                id = "admin_adm",
                iconTag = "ADM",
                title = "Enrolled Students",
                subtitle = "Directory & profiles",
                badge = null,
                gradientColors = listOf(VioletAccent, Color(0xFF7C3AED)),
                url = "/admin/admissions"
            ),
            ColorfulCard(
                id = "admin_fees",
                iconTag = "FEE",
                title = "Fee Collection",
                subtitle = "Collect dues & receipts",
                badge = null,
                gradientColors = listOf(Color(0xFF34D399), Color(0xFF059669)),
                url = "/admin/fees"
            ),
            ColorfulCard(
                id = "admin_pending",
                iconTag = "DUE",
                title = "Pending Fees",
                subtitle = "Due date reminders",
                badge = "ALERT",
                gradientColors = listOf(RoseRed, Color(0xFFBE123C)),
                url = "/admin/fees-pending"
            ),
            ColorfulCard(
                id = "admin_rcpt",
                iconTag = "RCP",
                title = "Receipts & Accounts",
                subtitle = "Payment transaction log",
                badge = null,
                gradientColors = listOf(Color(0xFF8B5CF6), Color(0xFF6D28D9)),
                url = "/admin/receipts"
            ),
            ColorfulCard(
                id = "admin_hr",
                iconTag = "HR",
                title = "HR & Payroll",
                subtitle = "Staff & salary tracking",
                badge = null,
                gradientColors = listOf(Color(0xFF64748B), Color(0xFF334155)),
                url = "/admin/hr"
            ),
            ColorfulCard(
                id = "admin_exams",
                iconTag = "EXM",
                title = "Exam Marks",
                subtitle = "Score entry & report cards",
                badge = null,
                gradientColors = listOf(OrangeSunset, Color(0xFFC2410C)),
                url = "/admin/exams"
            )
        )
    }

    val studentCards = remember {
        listOf(
            ColorfulCard(
                id = "stu_chat",
                iconTag = "CHAT",
                title = "WhatsApp Chat",
                subtitle = "Teacher & batch groups",
                badge = "ONLINE",
                gradientColors = listOf(Color(0xFF10B981), Color(0xFF047857)),
                url = "/student"
            ),
            ColorfulCard(
                id = "stu_portal",
                iconTag = "PORT",
                title = "Student Portal",
                subtitle = "Course overview & ERA LMS",
                badge = "MY COURSE",
                gradientColors = listOf(BrandPrimary, Color(0xFF4338CA)),
                url = "/student"
            ),
            ColorfulCard(
                id = "stu_attend",
                iconTag = "ATT",
                title = "My Attendance",
                subtitle = "Check daily records & GPS",
                badge = "92%",
                gradientColors = listOf(CyanNeon, Color(0xFF0891B2)),
                url = "/student"
            ),
            ColorfulCard(
                id = "stu_fees",
                iconTag = "FEE",
                title = "Fees & Receipts",
                subtitle = "Pay balance & vouchers",
                badge = null,
                gradientColors = listOf(SkyBlue, Color(0xFF0284C7)),
                url = "/student"
            ),
            ColorfulCard(
                id = "stu_notices",
                iconTag = "NTC",
                title = "Notice Board",
                subtitle = "Important circulars",
                badge = null,
                gradientColors = listOf(AmberGold, Color(0xFFD97706)),
                url = "/student"
            ),
            ColorfulCard(
                id = "stu_notes",
                iconTag = "DOC",
                title = "Study Materials",
                subtitle = "Lecture notes & PDFs",
                badge = null,
                gradientColors = listOf(VioletAccent, Color(0xFF7C3AED)),
                url = "/student"
            ),
            ColorfulCard(
                id = "stu_results",
                iconTag = "EXM",
                title = "Exam Results",
                subtitle = "Scorecards & grades",
                badge = null,
                gradientColors = listOf(RoseRed, Color(0xFFBE123C)),
                url = "/student"
            ),
            ColorfulCard(
                id = "stu_profile",
                iconTag = "ID",
                title = "Profile & ID Card",
                subtitle = "Personal records",
                badge = null,
                gradientColors = listOf(Color(0xFF64748B), Color(0xFF334155)),
                url = "/student"
            )
        )
    }

    val cards = if (isAdmin) adminCards else studentCards

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(DarkBg)
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
        ) {
            // Stitch Top App Bar with User Avatar & Chat Icon
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 14.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // User Avatar Circle
                Box(
                    modifier = Modifier
                        .size(46.dp)
                        .clip(CircleShape)
                        .background(
                            Brush.linearGradient(
                                if (isAdmin) listOf(BrandPrimary, CyanNeon)
                                else listOf(EmeraldGreen, CyanNeon)
                            )
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = username.take(1).uppercase(),
                        fontSize = 20.sp,
                        fontWeight = FontWeight.Black,
                        color = Color.White
                    )
                }

                Spacer(Modifier.width(14.dp))

                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = "Hello, " + username.replaceFirstChar { it.uppercase() },
                        fontSize = 17.sp,
                        fontWeight = FontWeight.ExtraBold,
                        color = TextWhite,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.padding(top = 2.dp)
                    ) {
                        Box(
                            modifier = Modifier
                                .size(7.dp)
                                .clip(CircleShape)
                                .background(if (isAdmin) BrandLight else EmeraldGreen)
                        )
                        Spacer(Modifier.width(6.dp))
                        Text(
                            text = if (isAdmin) "Admin Dashboard" else "Student Portal",
                            fontSize = 12.sp,
                            color = TextMuted,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }

                // WhatsApp Chat Icon Action Button
                FilledTonalButton(
                    onClick = onOpenChat,
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.filledTonalButtonColors(
                        containerColor = EmeraldGreen,
                        contentColor = Color.White
                    ),
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                ) {
                    Text("Chat", fontSize = 12.sp, fontWeight = FontWeight.ExtraBold)
                }

                Spacer(Modifier.width(8.dp))

                // Logout Button
                FilledTonalButton(
                    onClick = onLogout,
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.filledTonalButtonColors(
                        containerColor = DarkCardElevated,
                        contentColor = TextWhite
                    ),
                    border = BorderStroke(1.dp, DarkBorder),
                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
                ) {
                    Text("Exit", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                }
            }

            // Quick Stats Banner Strip
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 4.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                val quickPills = if (isAdmin) {
                    listOf("Chat" to "/admin/chat", "Attendance" to "/admin/attendance", "Pending Fees" to "/admin/fees-pending")
                } else {
                    listOf("Portal" to "/student", "Chat" to "/student", "Attendance" to "/student")
                }

                quickPills.forEach { pair ->
                    val label = pair.first
                    val url = pair.second
                    Card(
                        modifier = Modifier
                            .weight(1f)
                            .clickable { onItemClick(url, label) },
                        shape = RoundedCornerShape(14.dp),
                        colors = CardDefaults.cardColors(containerColor = DarkCard),
                        border = BorderStroke(1.dp, DarkBorderSubtle)
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 10.dp, horizontal = 8.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = label,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextWhite,
                                textAlign = TextAlign.Center
                            )
                        }
                    }
                }
            }

            Spacer(Modifier.height(8.dp))

            // Section Header
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 6.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = if (isAdmin) "Administrative Modules" else "Student Modules",
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextWhite
                )
                Text(
                    text = cards.size.toString() + " Available",
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = BrandLight
                )
            }

            // Grid of Colorful Cards
            LazyVerticalGrid(
                columns = GridCells.Fixed(2),
                contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 80.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                items(cards) { item ->
                    ColorfulDashboardCard(
                        item = item,
                        onClick = { onItemClick(item.url, item.title) }
                    )
                }
            }
        }

        // Floating WhatsApp Chat Button at Bottom-Right
        FloatingActionButton(
            onClick = onOpenChat,
            containerColor = EmeraldGreen,
            contentColor = Color.White,
            shape = CircleShape,
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(20.dp)
                .size(60.dp)
        ) {
            Text(
                text = "💬",
                fontSize = 24.sp
            )
        }
    }
}

@Composable
fun ColorfulDashboardCard(
    item: ColorfulCard,
    onClick: () -> Unit
) {
    Card(
        onClick = onClick,
        modifier = Modifier
            .fillMaxWidth()
            .height(130.dp),
        shape = RoundedCornerShape(22.dp),
        colors = CardDefaults.cardColors(containerColor = DarkCard),
        border = BorderStroke(1.dp, DarkBorder)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.linearGradient(
                        colors = item.gradientColors.map { it.copy(alpha = 0.28f) },
                        start = Offset(0f, 0f),
                        end = Offset(300f, 300f)
                    )
                )
                .padding(14.dp)
        ) {
            // Top Row: Tag badge + optional Pill
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Box(
                    modifier = Modifier
                        .size(38.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(
                            Brush.linearGradient(item.gradientColors)
                        ),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = item.iconTag.take(4),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Black,
                        color = Color.White
                    )
                }

                if (item.badge != null) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(6.dp))
                            .background(
                                if (item.badge == "ACTIVE" || item.badge == "ONLINE") EmeraldGreen.copy(alpha = 0.25f)
                                else RoseRed.copy(alpha = 0.2f)
                            )
                            .border(
                                1.dp,
                                if (item.badge == "ACTIVE" || item.badge == "ONLINE") EmeraldGreen.copy(alpha = 0.5f)
                                else RoseRed.copy(alpha = 0.4f),
                                RoundedCornerShape(6.dp)
                            )
                            .padding(horizontal = 6.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = item.badge,
                            fontSize = 9.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = if (item.badge == "ACTIVE" || item.badge == "ONLINE") EmeraldLight else Color(0xFFFDA4AF)
                        )
                    }
                }
            }

            // Bottom Content
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.BottomStart)
            ) {
                Text(
                    text = item.title,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = TextWhite,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(Modifier.height(2.dp))
                Text(
                    text = item.subtitle,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Medium,
                    color = TextMuted,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}
