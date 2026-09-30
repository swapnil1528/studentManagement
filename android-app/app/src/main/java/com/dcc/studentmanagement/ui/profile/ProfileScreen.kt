package com.dcc.studentmanagement.ui.profile

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dcc.studentmanagement.data.GasApiClient
import com.dcc.studentmanagement.theme.*
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    studentId: String,
    onBack: () -> Unit,
    onLogout: () -> Unit,
    modifier: Modifier = Modifier
) {
    val scope = rememberCoroutineScope()
    var isLoading by remember { mutableStateOf(true) }
    var name by remember { mutableStateOf("Student") }
    var branch by remember { mutableStateOf("DCC Institute") }
    var batch by remember { mutableStateOf("") }
    var photoUrl by remember { mutableStateOf("") }

    LaunchedEffect(studentId) {
        isLoading = true
        scope.launch {
            val res = GasApiClient.getStudentData(studentId)
            res.onSuccess { json ->
                val prof = json.optJSONObject("profile")
                if (prof != null) {
                    name = prof.optString("name", "Student")
                    branch = prof.optString("branch", "DCC Institute")
                    batch = prof.optString("batch", "")
                    photoUrl = prof.optString("photo", "")
                }
            }
            isLoading = false
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text("Digital Student ID", fontWeight = FontWeight.Bold, color = TextWhite)
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
                CircularProgressIndicator(color = BrandPrimary)
            }
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(20.dp)
                    .verticalScroll(rememberScrollState()),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Spacer(Modifier.height(10.dp))

                // Physical PVC Card Style
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(24.dp),
                    colors = CardDefaults.cardColors(containerColor = DarkCard),
                    border = BorderStroke(1.5.dp, BrandPrimary.copy(alpha = 0.6f))
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(
                                Brush.verticalGradient(
                                    colors = listOf(
                                        Color(0xFF1E1B4B),
                                        Color(0xFF0F172A)
                                    )
                                )
                            )
                            .padding(24.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        // Card Header
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column {
                                Text("DCC DIGITAL CAMPUS", fontWeight = FontWeight.ExtraBold, fontSize = 14.sp, color = BrandLight)
                                Text("Student Identity Credential", fontSize = 10.sp, color = TextMuted)
                            }
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(EmeraldGreen.copy(alpha = 0.2f))
                                    .padding(horizontal = 8.dp, vertical = 4.dp)
                            ) {
                                Text("VERIFIED", color = EmeraldGreen, fontWeight = FontWeight.Bold, fontSize = 10.sp)
                            }
                        }

                        Spacer(Modifier.height(24.dp))

                        // Avatar
                        Box(
                            modifier = Modifier
                                .size(96.dp)
                                .clip(CircleShape)
                                .background(DarkBorder)
                                .border(3.dp, BrandPrimary, CircleShape),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = name.take(1).uppercase(),
                                fontSize = 36.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = BrandLight
                            )
                        }

                        Spacer(Modifier.height(16.dp))

                        Text(
                            text = name.uppercase(),
                            fontSize = 18.sp,
                            fontWeight = FontWeight.ExtraBold,
                            color = TextWhite,
                            textAlign = TextAlign.Center
                        )

                        Text(
                            text = "Student ID: $studentId",
                            fontSize = 13.sp,
                            color = CyanNeon,
                            fontWeight = FontWeight.SemiBold,
                            fontFamily = FontFamily.Monospace
                        )

                        Spacer(Modifier.height(20.dp))
                        HorizontalDivider(color = DarkBorder, thickness = 1.dp)
                        Spacer(Modifier.height(16.dp))

                        // Info rows
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column {
                                Text("Branch Campus", fontSize = 11.sp, color = TextMuted)
                                Text(branch, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextWhite)
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text("Batch Timing", fontSize = 11.sp, color = TextMuted)
                                Text(batch.ifBlank { "Daily Regular" }, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = TextWhite)
                            }
                        }

                        Spacer(Modifier.height(20.dp))

                        // Digital Barcode Decorative Strip
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(40.dp)
                                .clip(RoundedCornerShape(8.dp))
                                .background(Color.Black.copy(alpha = 0.4f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(
                                text = "||||| ||||||| || |||||| |||||| ||||||| ||||",
                                fontFamily = FontFamily.Monospace,
                                fontSize = 18.sp,
                                color = TextMuted.copy(alpha = 0.7f),
                                letterSpacing = 2.sp
                            )
                        }
                    }
                }

                Spacer(Modifier.height(32.dp))

                // Logout Button
                OutlinedButton(
                    onClick = onLogout,
                    modifier = Modifier.fillMaxWidth().height(52.dp),
                    shape = RoundedCornerShape(16.dp),
                    border = BorderStroke(1.dp, Color(0xFFF43F5E)),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFFF43F5E))
                ) {
                    Text("Sign Out from App", fontWeight = FontWeight.Bold, fontSize = 14.sp)
                }

                Spacer(Modifier.height(30.dp))
            }
        }
    }
}
