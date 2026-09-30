package com.dcc.studentmanagement.ui.notices

import android.widget.Toast
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dcc.studentmanagement.data.GasApiClient
import com.dcc.studentmanagement.theme.*
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject

data class NoticeItem(
    val title: String,
    val msg: String,
    val date: String
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NoticesScreen(
    studentId: String,
    role: String,
    branch: String,
    onBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var isLoading by remember { mutableStateOf(true) }
    var notices by remember { mutableStateOf<List<NoticeItem>>(emptyList()) }

    var showPostDialog by remember { mutableStateOf(false) }
    var newTitle by remember { mutableStateOf("") }
    var newMessage by remember { mutableStateOf("") }
    var isPosting by remember { mutableStateOf(false) }

    fun refreshNotices() {
        isLoading = true
        scope.launch {
            val res = GasApiClient.getStudentData(studentId)
            res.onSuccess { json ->
                val arr = json.optJSONArray("notices") ?: JSONArray()
                val list = mutableListOf<NoticeItem>()
                for (i in 0 until arr.length()) {
                    val o = arr.optJSONObject(i)
                    if (o != null) {
                        list.add(
                            NoticeItem(
                                title = o.optString("title", "Announcement"),
                                msg = o.optString("msg", ""),
                                date = o.optString("date", "")
                            )
                        )
                    }
                }
                notices = list
            }
            isLoading = false
        }
    }

    LaunchedEffect(studentId) {
        refreshNotices()
    }

    if (showPostDialog) {
        AlertDialog(
            onDismissRequest = { showPostDialog = false },
            title = { Text("Broadcast New Notice", color = TextWhite, fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    OutlinedTextField(
                        value = newTitle,
                        onValueChange = { newTitle = it },
                        label = { Text("Notice Title") },
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = TextWhite,
                            unfocusedTextColor = TextWhite,
                            focusedBorderColor = BrandPrimary
                        )
                    )

                    OutlinedTextField(
                        value = newMessage,
                        onValueChange = { newMessage = it },
                        label = { Text("Notice Message") },
                        modifier = Modifier.fillMaxWidth().height(120.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = TextWhite,
                            unfocusedTextColor = TextWhite,
                            focusedBorderColor = BrandPrimary
                        )
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        if (newTitle.isNotBlank() && newMessage.isNotBlank() && !isPosting) {
                            isPosting = true
                            scope.launch {
                                val res = GasApiClient.saveNotice(newTitle.trim(), newMessage.trim(), branch)
                                isPosting = false
                                res.onSuccess {
                                    Toast.makeText(context, "Notice Published!", Toast.LENGTH_SHORT).show()
                                    showPostDialog = false
                                    newTitle = ""
                                    newMessage = ""
                                    refreshNotices()
                                }.onFailure {
                                    Toast.makeText(context, "Error: " + it.message, Toast.LENGTH_SHORT).show()
                                }
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = BrandPrimary)
                ) {
                    Text(if (isPosting) "Posting..." else "Publish")
                }
            },
            dismissButton = {
                TextButton(onClick = { showPostDialog = false }) {
                    Text("Cancel", color = TextMuted)
                }
            },
            containerColor = DarkCard
        )
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text("Notice Board", fontWeight = FontWeight.Bold, color = TextWhite)
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
                actions = {
                    if (role == "admin" || role == "employee" || role == "teacher") {
                        Text(
                            text = "+ Post",
                            color = EmeraldGreen,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier
                                .clickable { showPostDialog = true }
                                .padding(16.dp)
                        )
                    }
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
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                item { Spacer(Modifier.height(8.dp)) }

                if (notices.isEmpty()) {
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = DarkCard)
                        ) {
                            Text(
                                text = "No circulars or notices posted yet.",
                                modifier = Modifier.padding(32.dp).fillMaxWidth(),
                                textAlign = TextAlign.Center,
                                color = TextMuted,
                                fontSize = 14.sp
                            )
                        }
                    }
                } else {
                    items(notices) { item ->
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = DarkCard),
                            border = BorderStroke(1.dp, DarkBorder)
                        ) {
                            Column(Modifier.padding(18.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(8.dp))
                                            .background(BrandPrimary.copy(alpha = 0.2f))
                                            .padding(horizontal = 10.dp, vertical = 4.dp)
                                    ) {
                                        Text(
                                            text = item.date.ifBlank { "Announcement" },
                                            color = BrandLight,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 11.sp
                                        )
                                    }

                                    Text(
                                        text = "Official Circular",
                                        color = TextSubtle,
                                        fontSize = 11.sp
                                    )
                                }

                                Spacer(Modifier.height(10.dp))

                                Text(
                                    text = item.title,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 16.sp,
                                    color = TextWhite
                                )

                                Spacer(Modifier.height(6.dp))

                                Text(
                                    text = item.msg,
                                    fontSize = 13.sp,
                                    color = Color(0xFFCBD5E1),
                                    lineHeight = 20.sp
                                )
                            }
                        }
                    }
                }

                item { Spacer(Modifier.height(24.dp)) }
            }
        }
    }
}
