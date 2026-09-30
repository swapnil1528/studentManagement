package com.dcc.studentmanagement.ui.results

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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dcc.studentmanagement.data.GasApiClient
import com.dcc.studentmanagement.theme.*
import kotlinx.coroutines.launch
import org.json.JSONArray

data class ExamResultItem(
    val exam: String,
    val marks: String,
    val total: String
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ResultsScreen(
    studentId: String,
    onBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val scope = rememberCoroutineScope()
    var isLoading by remember { mutableStateOf(true) }
    var results by remember { mutableStateOf<List<ExamResultItem>>(emptyList()) }

    LaunchedEffect(studentId) {
        isLoading = true
        scope.launch {
            val res = GasApiClient.getStudentData(studentId)
            res.onSuccess { json ->
                val arr = json.optJSONArray("results") ?: JSONArray()
                val list = mutableListOf<ExamResultItem>()
                for (i in 0 until arr.length()) {
                    val o = arr.optJSONObject(i)
                    if (o != null) {
                        list.add(
                            ExamResultItem(
                                exam = o.optString("exam", "Exam"),
                                marks = o.optString("marks", "0"),
                                total = o.optString("total", "100")
                            )
                        )
                    }
                }
                results = list
            }
            isLoading = false
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text("Exams & Performance", fontWeight = FontWeight.Bold, color = TextWhite)
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
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                item {
                    Spacer(Modifier.height(8.dp))
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(20.dp),
                        colors = CardDefaults.cardColors(containerColor = DarkCard),
                        border = BorderStroke(1.dp, DarkBorder)
                    ) {
                        Column(Modifier.padding(20.dp)) {
                            Text("Official Assessment Ledger", fontSize = 13.sp, color = TextMuted)
                            Spacer(Modifier.height(4.dp))
                            Text("Academic Evaluations & Grades", fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = TextWhite)
                            Spacer(Modifier.height(8.dp))
                            Text("Synchronized directly with DCC Examination & Certification server.", fontSize = 12.sp, color = EmeraldLight)
                        }
                    }
                }

                if (results.isEmpty()) {
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = DarkCard)
                        ) {
                            Text(
                                text = "No published exam records found yet.",
                                modifier = Modifier.padding(32.dp).fillMaxWidth(),
                                textAlign = TextAlign.Center,
                                color = TextMuted,
                                fontSize = 14.sp
                            )
                        }
                    }
                } else {
                    items(results) { res ->
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = DarkCard),
                            border = BorderStroke(1.dp, DarkBorder)
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth().padding(18.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = res.exam,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 16.sp,
                                        color = TextWhite
                                    )
                                    Spacer(Modifier.height(4.dp))
                                    Text(
                                        text = "Evaluation Score",
                                        fontSize = 12.sp,
                                        color = TextMuted
                                    )
                                }

                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(12.dp))
                                        .background(EmeraldGreen.copy(alpha = 0.15f))
                                        .border(1.dp, EmeraldGreen.copy(alpha = 0.4f), RoundedCornerShape(12.dp))
                                        .padding(horizontal = 14.dp, vertical = 8.dp)
                                ) {
                                    Text(
                                        text = if (res.total.length <= 2) "Grade " + res.total else res.marks + " / " + res.total,
                                        color = EmeraldLight,
                                        fontWeight = FontWeight.ExtraBold,
                                        fontSize = 14.sp
                                    )
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
