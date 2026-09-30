package com.dcc.studentmanagement.ui.admin

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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dcc.studentmanagement.data.GasApiClient
import com.dcc.studentmanagement.theme.*
import kotlinx.coroutines.launch
import org.json.JSONArray

data class AdminStudentItem(
    val admNo: String,
    val studId: String,
    val name: String,
    val mobile: String,
    val course: String,
    val batch: String,
    val status: String,
    val totalFee: Double
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminStudentsScreen(
    branch: String,
    onBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val scope = rememberCoroutineScope()
    var isLoading by remember { mutableStateOf(true) }
    var students by remember { mutableStateOf<List<AdminStudentItem>>(emptyList()) }
    var searchQuery by remember { mutableStateOf("") }

    LaunchedEffect(Unit) {
        isLoading = true
        scope.launch {
            val res = GasApiClient.loadAdminData(branch)
            res.onSuccess { json ->
                val admArr = json.optJSONArray("admissions") ?: JSONArray()
                val list = mutableListOf<AdminStudentItem>()
                for (i in 0 until admArr.length()) {
                    val a = admArr.optJSONArray(i)
                    if (a != null) {
                        list.add(
                            AdminStudentItem(
                                admNo = a.optString(1, ""),
                                studId = a.optString(2, ""),
                                name = a.optString(3, "Student"),
                                mobile = a.optString(4, ""),
                                course = a.optString(7, ""),
                                batch = a.optString(8, ""),
                                status = a.optString(11, "Active"),
                                totalFee = a.optDouble(10, 0.0)
                            )
                        )
                    }
                }
                students = list
            }
            isLoading = false
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text("Enrolled Students Directory", fontWeight = FontWeight.Bold, color = TextWhite)
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
            ) {
                // Search Bar
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    placeholder = { Text("Search by name, student ID, course...", color = TextMuted, fontSize = 13.sp) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = TextWhite,
                        unfocusedTextColor = TextWhite,
                        focusedBorderColor = BrandPrimary,
                        unfocusedBorderColor = DarkBorder
                    ),
                    singleLine = true
                )

                val filtered = students.filter {
                    searchQuery.isBlank() ||
                    it.name.contains(searchQuery, true) ||
                    it.studId.contains(searchQuery, true) ||
                    it.course.contains(searchQuery, true) ||
                    it.mobile.contains(searchQuery, true)
                }

                Text(
                    text = "Showing ${filtered.size} of ${students.size} Admitted Students",
                    fontSize = 12.sp,
                    color = TextMuted,
                    modifier = Modifier.padding(horizontal = 18.dp, vertical = 4.dp)
                )

                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    item { Spacer(Modifier.height(4.dp)) }

                    items(filtered) { s ->
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = DarkCard),
                            border = BorderStroke(1.dp, DarkBorder)
                        ) {
                            Column(Modifier.padding(16.dp)) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(
                                            text = s.name,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 15.sp,
                                            color = TextWhite
                                        )
                                        Text(
                                            text = s.studId + " • " + s.admNo,
                                            fontSize = 12.sp,
                                            color = CyanNeon
                                        )
                                    }

                                    Box(
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(8.dp))
                                            .background(if (s.status.contains("Active", true)) EmeraldGreen.copy(alpha = 0.2f) else DarkBorder)
                                            .padding(horizontal = 8.dp, vertical = 4.dp)
                                    ) {
                                        Text(
                                            text = s.status,
                                            color = if (s.status.contains("Active", true)) EmeraldLight else TextWhite,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 11.sp
                                        )
                                    }
                                }

                                Spacer(Modifier.height(8.dp))
                                Text("Course: " + s.course, fontSize = 13.sp, color = BrandLight, fontWeight = FontWeight.SemiBold)
                                if (s.batch.isNotBlank()) {
                                    Text("Batch: " + s.batch, fontSize = 12.sp, color = TextMuted)
                                }
                                if (s.mobile.isNotBlank()) {
                                    Text("📞 Contact: " + s.mobile, fontSize = 12.sp, color = TextSubtle)
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
