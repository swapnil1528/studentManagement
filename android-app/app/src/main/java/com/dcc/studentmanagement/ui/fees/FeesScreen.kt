package com.dcc.studentmanagement.ui.fees

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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dcc.studentmanagement.data.GasApiClient
import com.dcc.studentmanagement.theme.*
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject

data class FeeEnrollment(
    val admNo: String,
    val course: String,
    val totalFee: Double,
    val paidFee: Double,
    val pendingFee: Double,
    val status: String,
    val dueDate: String
)

data class FeePaymentRecord(
    val recNo: String,
    val date: String,
    val course: String,
    val amount: Double,
    val mode: String,
    val collector: String
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FeesScreen(
    studentId: String,
    onBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val scope = rememberCoroutineScope()
    var isLoading by remember { mutableStateOf(true) }

    var totalFee by remember { mutableDoubleStateOf(0.0) }
    var totalPaid by remember { mutableDoubleStateOf(0.0) }
    var pendingAmount by remember { mutableDoubleStateOf(0.0) }
    var dueDate by remember { mutableStateOf("") }
    var collectionRate by remember { mutableIntStateOf(0) }

    var enrollments by remember { mutableStateOf<List<FeeEnrollment>>(emptyList()) }
    var payments by remember { mutableStateOf<List<FeePaymentRecord>>(emptyList()) }

    fun refreshFees() {
        isLoading = true
        scope.launch {
            val res = GasApiClient.getStudentFees(studentId)
            res.onSuccess { json ->
                val summary = json.optJSONObject("feeSummary")
                if (summary != null) {
                    totalFee = summary.optDouble("totalFee", 0.0)
                    totalPaid = summary.optDouble("totalPaid", 0.0)
                    pendingAmount = summary.optDouble("pendingAmount", 0.0)
                    dueDate = summary.optString("dueDate", "")
                    collectionRate = summary.optInt("collectionRate", 0)
                }

                val enrollArray = json.optJSONArray("enrollments") ?: JSONArray()
                val eList = mutableListOf<FeeEnrollment>()
                for (i in 0 until enrollArray.length()) {
                    val o = enrollArray.optJSONObject(i)
                    if (o != null) {
                        eList.add(
                            FeeEnrollment(
                                admNo = o.optString("admNo", ""),
                                course = o.optString("course", "Course"),
                                totalFee = o.optDouble("totalFee", 0.0),
                                paidFee = o.optDouble("paidFee", 0.0),
                                pendingFee = o.optDouble("pendingFee", 0.0),
                                status = o.optString("status", "Active"),
                                dueDate = o.optString("dueDate", "")
                            )
                        )
                    }
                }
                enrollments = eList

                val payArray = json.optJSONArray("feePayments") ?: JSONArray()
                val pList = mutableListOf<FeePaymentRecord>()
                for (i in 0 until payArray.length()) {
                    val p = payArray.optJSONObject(i)
                    if (p != null) {
                        pList.add(
                            FeePaymentRecord(
                                recNo = p.optString("recNo", ""),
                                date = p.optString("date", ""),
                                course = p.optString("course", ""),
                                amount = p.optDouble("amount", 0.0),
                                mode = p.optString("mode", "Cash"),
                                collector = p.optString("collector", "Institute")
                            )
                        )
                    }
                }
                payments = pList
            }
            isLoading = false
        }
    }

    LaunchedEffect(studentId) {
        refreshFees()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text("Fee Ledger & Receipts", fontWeight = FontWeight.Bold, color = TextWhite)
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
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                item {
                    Spacer(Modifier.height(8.dp))
                    // Overview Summary Card
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(20.dp),
                        colors = CardDefaults.cardColors(containerColor = DarkCard),
                        border = BorderStroke(1.dp, if (pendingAmount > 0) Color(0xFFF43F5E).copy(alpha = 0.5f) else DarkBorder)
                    ) {
                        Column(Modifier.padding(20.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text("Pending Balance", fontSize = 13.sp, color = TextMuted)
                                    Text(
                                        text = "₹" + String.format(java.util.Locale.US, "%,.0f", pendingAmount),
                                        fontSize = 32.sp,
                                        fontWeight = FontWeight.ExtraBold,
                                        color = if (pendingAmount > 0) Color(0xFFF43F5E) else EmeraldGreen
                                    )
                                }

                                if (dueDate.isNotBlank()) {
                                    Box(
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(12.dp))
                                            .background(AmberGold.copy(alpha = 0.15f))
                                            .border(1.dp, AmberGold.copy(alpha = 0.4f), RoundedCornerShape(12.dp))
                                            .padding(horizontal = 10.dp, vertical = 6.dp)
                                    ) {
                                        Text(
                                            text = "Due: $dueDate",
                                            color = AmberGold,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 11.sp
                                        )
                                    }
                                }
                            }

                            Spacer(Modifier.height(14.dp))
                            LinearProgressIndicator(
                                progress = { (collectionRate / 100f).coerceIn(0f, 1f) },
                                modifier = Modifier.fillMaxWidth().height(8.dp).clip(CircleShape),
                                color = EmeraldGreen,
                                trackColor = DarkBorder
                            )

                            Spacer(Modifier.height(14.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Column {
                                    Text("Total Fees", fontSize = 11.sp, color = TextMuted)
                                    Text("₹" + String.format(java.util.Locale.US, "%,.0f", totalFee), fontWeight = FontWeight.Bold, color = TextWhite)
                                }
                                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                    Text("Paid Amount", fontSize = 11.sp, color = TextMuted)
                                    Text("₹" + String.format(java.util.Locale.US, "%,.0f", totalPaid), fontWeight = FontWeight.Bold, color = EmeraldGreen)
                                }
                                Column(horizontalAlignment = Alignment.End) {
                                    Text("Paid Rate", fontSize = 11.sp, color = TextMuted)
                                    Text("$collectionRate%", fontWeight = FontWeight.Bold, color = CyanNeon)
                                }
                            }
                        }
                    }
                }

                item {
                    Text(
                        text = "Course Fees Breakdown",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextWhite,
                        modifier = Modifier.padding(top = 4.dp)
                    )
                }

                items(enrollments) { item ->
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
                                Text(
                                    text = item.course,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 15.sp,
                                    color = TextWhite
                                )
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(if (item.pendingFee <= 0) EmeraldGreen.copy(alpha = 0.2f) else Color(0xFFF43F5E).copy(alpha = 0.15f))
                                        .padding(horizontal = 8.dp, vertical = 4.dp)
                                ) {
                                    Text(
                                        text = if (item.pendingFee <= 0) "PAID" else "DUE: ₹" + item.pendingFee.toInt(),
                                        color = if (item.pendingFee <= 0) EmeraldGreen else Color(0xFFF43F5E),
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 11.sp
                                    )
                                }
                            }

                            Spacer(Modifier.height(8.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text("Total: ₹" + item.totalFee.toInt(), fontSize = 12.sp, color = TextMuted)
                                Text("Paid: ₹" + item.paidFee.toInt(), fontSize = 12.sp, color = EmeraldLight)
                                Text("Status: " + item.status, fontSize = 12.sp, color = BrandLight)
                            }
                        }
                    }
                }

                item {
                    Text(
                        text = "Payment Receipts (" + payments.size + ")",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextWhite,
                        modifier = Modifier.padding(top = 8.dp)
                    )
                }

                if (payments.isEmpty()) {
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(14.dp),
                            colors = CardDefaults.cardColors(containerColor = DarkCard)
                        ) {
                            Text(
                                text = "No payment receipts found.",
                                modifier = Modifier.padding(20.dp).fillMaxWidth(),
                                textAlign = TextAlign.Center,
                                color = TextMuted,
                                fontSize = 13.sp
                            )
                        }
                    }
                } else {
                    items(payments) { rec ->
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
                                    Text(
                                        text = rec.recNo,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 13.sp,
                                        color = BrandLight
                                    )
                                    Text(
                                        text = rec.course + " • " + rec.date,
                                        fontSize = 12.sp,
                                        color = TextMuted
                                    )
                                    if (rec.collector.isNotBlank()) {
                                        Text(
                                            text = "Collector: " + rec.collector,
                                            fontSize = 11.sp,
                                            color = TextSubtle
                                        )
                                    }
                                }

                                Column(horizontalAlignment = Alignment.End) {
                                    Text(
                                        text = "+₹" + rec.amount.toInt(),
                                        fontWeight = FontWeight.ExtraBold,
                                        fontSize = 16.sp,
                                        color = EmeraldGreen
                                    )
                                    Box(
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(6.dp))
                                            .background(DarkBorder)
                                            .padding(horizontal = 6.dp, vertical = 2.dp)
                                    ) {
                                        Text(
                                            text = rec.mode,
                                            fontSize = 10.sp,
                                            color = TextWhite
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                item {
                    Spacer(Modifier.height(24.dp))
                }
            }
        }
    }
}
