package com.dcc.studentmanagement.ui.admin

import android.widget.Toast
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
import java.text.SimpleDateFormat
import java.util.*

data class AdminFeeReceiptItem(
    val recNo: String,
    val date: String,
    val studId: String,
    val name: String,
    val course: String,
    val amount: Double,
    val mode: String,
    val collector: String
)

data class AdminPendingDueItem(
    val studId: String,
    val name: String,
    val course: String,
    val totalFee: Double,
    val paidFee: Double,
    val pendingFee: Double,
    val dueDate: String,
    val mobile: String
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminFeesScreen(
    branch: String,
    onBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var isLoading by remember { mutableStateOf(true) }
    var selectedTab by remember { mutableIntStateOf(0) } // 0 = Today's Receipts, 1 = Pending Dues

    var todayCollectionTotal by remember { mutableDoubleStateOf(0.0) }
    var totalPendingDues by remember { mutableDoubleStateOf(0.0) }
    var receipts by remember { mutableStateOf<List<AdminFeeReceiptItem>>(emptyList()) }
    var pendingItems by remember { mutableStateOf<List<AdminPendingDueItem>>(emptyList()) }

    var searchQuery by remember { mutableStateOf("") }
    var showRecordPaymentDialog by remember { mutableStateOf(false) }

    // Collect form
    var inputStudId by remember { mutableStateOf("") }
    var inputName by remember { mutableStateOf("") }
    var inputCourse by remember { mutableStateOf("") }
    var inputAmount by remember { mutableStateOf("") }
    var inputMode by remember { mutableStateOf("Cash") }
    var isSavingFee by remember { mutableStateOf(false) }

    fun loadData() {
        isLoading = true
        scope.launch {
            val res = GasApiClient.loadAdminData(branch)
            res.onSuccess { json ->
                val feeArr = json.optJSONArray("fees") ?: JSONArray()
                val admArr = json.optJSONArray("admissions") ?: JSONArray()
                val todayStr = SimpleDateFormat("dd-MM-yyyy", Locale.ENGLISH).format(Date())

                val rList = mutableListOf<AdminFeeReceiptItem>()
                val paidByStudent = mutableMapOf<String, Double>()
                var todaySum = 0.0

                for (i in 0 until feeArr.length()) {
                    val f = feeArr.optJSONArray(i)
                    if (f != null) {
                        val recNo = f.optString(0, "")
                        val date = f.optString(1, "")
                        val sId = f.optString(2, "")
                        val sName = f.optString(3, "")
                        val course = f.optString(4, "")
                        val amt = f.optDouble(5, 0.0)
                        val mode = f.optString(7, "Cash")
                        val collector = f.optString(8, "")

                        if (date.contains(todayStr) || date.startsWith(todayStr.take(10))) {
                            todaySum += amt
                        }

                        val key = sId.trim().lowercase()
                        paidByStudent[key] = (paidByStudent[key] ?: 0.0) + amt

                        rList.add(
                            AdminFeeReceiptItem(
                                recNo = recNo,
                                date = date,
                                studId = sId,
                                name = sName,
                                course = course,
                                amount = amt,
                                mode = mode,
                                collector = collector
                            )
                        )
                    }
                }
                todayCollectionTotal = todaySum
                receipts = rList.reversed()

                // Calculate pending dues
                val pList = mutableListOf<AdminPendingDueItem>()
                var pendSum = 0.0
                for (i in 0 until admArr.length()) {
                    val a = admArr.optJSONArray(i)
                    if (a != null) {
                        val sId = a.optString(2, "")
                        val sName = a.optString(3, "")
                        val mobile = a.optString(4, "")
                        val course = a.optString(7, "")
                        val total = a.optDouble(10, 0.0)
                        val paid = paidByStudent[sId.trim().lowercase()] ?: 0.0
                        val pending = total - paid
                        val dueD = a.optString(9, "")

                        if (pending > 0) {
                            pendSum += pending
                            pList.add(
                                AdminPendingDueItem(
                                    studId = sId,
                                    name = sName,
                                    course = course,
                                    totalFee = total,
                                    paidFee = paid,
                                    pendingFee = pending,
                                    dueDate = dueD,
                                    mobile = mobile
                                )
                            )
                        }
                    }
                }
                totalPendingDues = pendSum
                pendingItems = pList.sortedByDescending { it.pendingFee }
            }
            isLoading = false
        }
    }

    LaunchedEffect(Unit) {
        loadData()
    }

    // Record payment dialog
    if (showRecordPaymentDialog) {
        AlertDialog(
            onDismissRequest = { showRecordPaymentDialog = false },
            title = { Text("Record Fee Collection", fontWeight = FontWeight.Bold, color = TextWhite) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedTextField(
                        value = inputStudId,
                        onValueChange = { inputStudId = it },
                        label = { Text("Student ID (e.g. ST-2026-1001)") },
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(focusedTextColor = TextWhite, unfocusedTextColor = TextWhite)
                    )
                    OutlinedTextField(
                        value = inputName,
                        onValueChange = { inputName = it },
                        label = { Text("Student Name") },
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(focusedTextColor = TextWhite, unfocusedTextColor = TextWhite)
                    )
                    OutlinedTextField(
                        value = inputCourse,
                        onValueChange = { inputCourse = it },
                        label = { Text("Course (e.g. MS-CIT, TALLY)") },
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(focusedTextColor = TextWhite, unfocusedTextColor = TextWhite)
                    )
                    OutlinedTextField(
                        value = inputAmount,
                        onValueChange = { inputAmount = it },
                        label = { Text("Fee Amount (₹)") },
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(focusedTextColor = TextWhite, unfocusedTextColor = TextWhite)
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("Cash", "UPI", "Card").forEach { mode ->
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(if (inputMode == mode) EmeraldGreen else DarkBorder)
                                    .clickable { inputMode = mode }
                                    .padding(horizontal = 14.dp, vertical = 8.dp)
                            ) {
                                Text(mode, color = Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                            }
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        val amtNum = inputAmount.toDoubleOrNull()
                        if (inputStudId.isNotBlank() && amtNum != null && amtNum > 0 && !isSavingFee) {
                            isSavingFee = true
                            scope.launch {
                                val form = JSONObject().apply {
                                    put("studId", inputStudId.trim())
                                    put("name", inputName.trim())
                                    put("course", inputCourse.trim())
                                    put("amount", amtNum)
                                    put("mode", inputMode)
                                    put("collector", "Admin")
                                    put("remarks", "Collected via Mobile Admin App")
                                }
                                val res = GasApiClient.saveFee(form)
                                isSavingFee = false
                                res.onSuccess { rJson ->
                                    val recNo = rJson.optString("receiptNo", "DCC/REC/NEW")
                                    Toast.makeText(context, "Payment Recorded! Receipt: $recNo", Toast.LENGTH_LONG).show()
                                    showRecordPaymentDialog = false
                                    inputStudId = ""
                                    inputName = ""
                                    inputAmount = ""
                                    loadData()
                                }.onFailure {
                                    Toast.makeText(context, "Error: " + it.message, Toast.LENGTH_SHORT).show()
                                }
                            }
                        } else {
                            Toast.makeText(context, "Please enter valid student ID and amount", Toast.LENGTH_SHORT).show()
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = EmeraldGreen)
                ) {
                    Text(if (isSavingFee) "Saving..." else "Collect & Save")
                }
            },
            dismissButton = {
                TextButton(onClick = { showRecordPaymentDialog = false }) {
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
                    Text("Admin Fee Management", fontWeight = FontWeight.Bold, color = TextWhite)
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
                    Button(
                        onClick = { showRecordPaymentDialog = true },
                        modifier = Modifier.padding(end = 8.dp),
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = EmeraldGreen)
                    ) {
                        Text("+ Collect Fee", fontWeight = FontWeight.Bold, fontSize = 12.sp)
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
                CircularProgressIndicator(color = EmeraldGreen)
            }
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
            ) {
                // Top Financial Banners
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
                        border = BorderStroke(1.dp, EmeraldGreen.copy(alpha = 0.4f))
                    ) {
                        Column(Modifier.padding(14.dp)) {
                            Text("Today Collected", fontSize = 11.sp, color = TextMuted)
                            Spacer(Modifier.height(4.dp))
                            Text(
                                text = "₹" + String.format(Locale.US, "%,.0f", todayCollectionTotal),
                                fontSize = 20.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = EmeraldGreen
                            )
                        }
                    }

                    Card(
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(16.dp),
                        colors = CardDefaults.cardColors(containerColor = DarkCard),
                        border = BorderStroke(1.dp, Color(0xFFF43F5E).copy(alpha = 0.4f))
                    ) {
                        Column(Modifier.padding(14.dp)) {
                            Text("Total Pending Dues", fontSize = 11.sp, color = TextMuted)
                            Spacer(Modifier.height(4.dp))
                            Text(
                                text = "₹" + String.format(Locale.US, "%,.0f", totalPendingDues),
                                fontSize = 20.sp,
                                fontWeight = FontWeight.ExtraBold,
                                color = Color(0xFFF43F5E)
                            )
                        }
                    }
                }

                // Tabs: Receipts vs Pending
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
                            .background(if (selectedTab == 0) EmeraldGreen else Color.Transparent)
                            .clickable { selectedTab = 0 }
                            .padding(vertical = 10.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "Receipts (${receipts.size})",
                            color = if (selectedTab == 0) Color.White else TextMuted,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp
                        )
                    }

                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(10.dp))
                            .background(if (selectedTab == 1) Color(0xFFF43F5E) else Color.Transparent)
                            .clickable { selectedTab = 1 }
                            .padding(vertical = 10.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "Pending Dues (${pendingItems.size})",
                            color = if (selectedTab == 1) Color.White else TextMuted,
                            fontWeight = FontWeight.Bold,
                            fontSize = 13.sp
                        )
                    }
                }

                // Search Bar
                OutlinedTextField(
                    value = searchQuery,
                    onValueChange = { searchQuery = it },
                    placeholder = { Text("Search by student name or ID...", color = TextMuted, fontSize = 13.sp) },
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 6.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedTextColor = TextWhite,
                        unfocusedTextColor = TextWhite,
                        focusedBorderColor = BrandPrimary,
                        unfocusedBorderColor = DarkBorder
                    ),
                    singleLine = true
                )

                // List
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 16.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    item { Spacer(Modifier.height(4.dp)) }

                    if (selectedTab == 0) {
                        val filteredReceipts = receipts.filter {
                            searchQuery.isBlank() || it.name.contains(searchQuery, true) || it.studId.contains(searchQuery, true) || it.recNo.contains(searchQuery, true)
                        }

                        items(filteredReceipts) { rec ->
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
                                        Text(rec.name, fontWeight = FontWeight.Bold, color = TextWhite, fontSize = 14.sp)
                                        Text(rec.course + " • " + rec.recNo, color = BrandLight, fontSize = 12.sp)
                                        Text("Date: " + rec.date.take(10) + " • ID: " + rec.studId, color = TextMuted, fontSize = 11.sp)
                                    }

                                    Column(horizontalAlignment = Alignment.End) {
                                        Text("+₹" + rec.amount.toInt(), fontWeight = FontWeight.ExtraBold, color = EmeraldGreen, fontSize = 16.sp)
                                        Box(
                                            modifier = Modifier.clip(RoundedCornerShape(6.dp)).background(DarkBorder).padding(horizontal = 6.dp, vertical = 2.dp)
                                        ) {
                                            Text(rec.mode, color = TextWhite, fontSize = 10.sp)
                                        }
                                    }
                                }
                            }
                        }
                    } else {
                        val filteredPending = pendingItems.filter {
                            searchQuery.isBlank() || it.name.contains(searchQuery, true) || it.studId.contains(searchQuery, true) || it.course.contains(searchQuery, true)
                        }

                        items(filteredPending) { p ->
                            Card(
                                modifier = Modifier.fillMaxWidth(),
                                shape = RoundedCornerShape(14.dp),
                                colors = CardDefaults.cardColors(containerColor = DarkCard),
                                border = BorderStroke(1.dp, Color(0xFFF43F5E).copy(alpha = 0.3f))
                            ) {
                                Row(
                                    modifier = Modifier.fillMaxWidth().padding(14.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween,
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        Text(p.name, fontWeight = FontWeight.Bold, color = TextWhite, fontSize = 14.sp)
                                        Text(p.course + " • " + p.studId, color = CyanNeon, fontSize = 12.sp)
                                        Text("Total: ₹" + p.totalFee.toInt() + " • Paid: ₹" + p.paidFee.toInt(), color = TextMuted, fontSize = 11.sp)
                                        if (p.mobile.isNotBlank()) {
                                            Text("📞 " + p.mobile, color = TextSubtle, fontSize = 11.sp)
                                        }
                                    }

                                    Column(horizontalAlignment = Alignment.End) {
                                        Text("DUE: ₹" + p.pendingFee.toInt(), fontWeight = FontWeight.ExtraBold, color = Color(0xFFF43F5E), fontSize = 15.sp)
                                        Button(
                                            onClick = {
                                                inputStudId = p.studId
                                                inputName = p.name
                                                inputCourse = p.course
                                                inputAmount = p.pendingFee.toInt().toString()
                                                showRecordPaymentDialog = true
                                            },
                                            shape = RoundedCornerShape(8.dp),
                                            colors = ButtonDefaults.buttonColors(containerColor = EmeraldGreen),
                                            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp),
                                            modifier = Modifier.height(32.dp)
                                        ) {
                                            Text("Collect", fontSize = 11.sp)
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
