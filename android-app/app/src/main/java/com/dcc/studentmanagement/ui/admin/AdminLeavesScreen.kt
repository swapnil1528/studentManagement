package com.dcc.studentmanagement.ui.admin

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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dcc.studentmanagement.data.GasApiClient
import com.dcc.studentmanagement.theme.*
import kotlinx.coroutines.launch
import org.json.JSONArray

data class AdminLeaveItem(
    val id: String,
    val empId: String,
    val name: String,
    val type: String,
    val fromDate: String,
    val toDate: String,
    val reason: String,
    val status: String
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminLeavesScreen(
    branch: String,
    onBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var isLoading by remember { mutableStateOf(true) }
    var leaves by remember { mutableStateOf<List<AdminLeaveItem>>(emptyList()) }

    fun refreshLeaves() {
        isLoading = true
        scope.launch {
            val res = GasApiClient.loadAdminData(branch)
            res.onSuccess { json ->
                val arr = json.optJSONArray("leaves") ?: JSONArray()
                val list = mutableListOf<AdminLeaveItem>()
                for (i in 0 until arr.length()) {
                    val l = arr.optJSONArray(i)
                    if (l != null) {
                        list.add(
                            AdminLeaveItem(
                                id = l.optString(0, ""),
                                empId = l.optString(1, ""),
                                name = l.optString(2, "Staff Member"),
                                type = l.optString(4, "Leave"),
                                fromDate = l.optString(5, ""),
                                toDate = l.optString(6, ""),
                                reason = l.optString(7, ""),
                                status = l.optString(8, "Pending")
                            )
                        )
                    }
                }
                leaves = list
            }
            isLoading = false
        }
    }

    LaunchedEffect(Unit) {
        refreshLeaves()
    }

    fun handleAction(leaveId: String, action: String) {
        scope.launch {
            val res = GasApiClient.actionLeave(leaveId, action)
            res.onSuccess {
                Toast.makeText(context, "Leave marked as $action", Toast.LENGTH_SHORT).show()
                refreshLeaves()
            }.onFailure {
                Toast.makeText(context, "Error: " + it.message, Toast.LENGTH_SHORT).show()
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text("Staff Leave Management", fontWeight = FontWeight.Bold, color = TextWhite)
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
                CircularProgressIndicator(color = AmberGold)
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(horizontal = 16.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                item {
                    Spacer(Modifier.height(8.dp))
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(18.dp),
                        colors = CardDefaults.cardColors(containerColor = DarkCard),
                        border = BorderStroke(1.dp, AmberGold.copy(alpha = 0.4f))
                    ) {
                        Column(Modifier.padding(16.dp)) {
                            Text("Pending Staff Applications", fontSize = 12.sp, color = AmberGold, fontWeight = FontWeight.Bold)
                            Spacer(Modifier.height(4.dp))
                            Text(leaves.size.toString() + " Leave Applications", fontSize = 20.sp, fontWeight = FontWeight.ExtraBold, color = TextWhite)
                            Spacer(Modifier.height(4.dp))
                            Text("Review, approve or decline leave requests from institute employees.", fontSize = 12.sp, color = TextMuted)
                        }
                    }
                }

                if (leaves.isEmpty()) {
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = DarkCard)
                        ) {
                            Text(
                                text = "No pending leave applications at this time.",
                                modifier = Modifier.padding(32.dp).fillMaxWidth(),
                                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                                color = TextMuted,
                                fontSize = 14.sp
                            )
                        }
                    }
                } else {
                    items(leaves) { item ->
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
                                    Column {
                                        Text(item.name, fontWeight = FontWeight.Bold, color = TextWhite, fontSize = 15.sp)
                                        Text(item.empId + " • " + item.type, color = BrandLight, fontSize = 12.sp)
                                    }

                                    Box(
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(8.dp))
                                            .background(AmberGold.copy(alpha = 0.2f))
                                            .padding(horizontal = 8.dp, vertical = 4.dp)
                                    ) {
                                        Text(item.status, color = AmberGold, fontWeight = FontWeight.Bold, fontSize = 11.sp)
                                    }
                                }

                                Spacer(Modifier.height(8.dp))
                                Text(
                                    text = "Duration: " + item.fromDate + " to " + item.toDate,
                                    fontSize = 12.sp,
                                    color = CyanNeon
                                )
                                if (item.reason.isNotBlank()) {
                                    Spacer(Modifier.height(4.dp))
                                    Text(
                                        text = "Reason: " + item.reason,
                                        fontSize = 12.sp,
                                        color = TextMuted
                                    )
                                }

                                Spacer(Modifier.height(14.dp))
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                                ) {
                                    Button(
                                        onClick = { handleAction(item.id, "Approved") },
                                        modifier = Modifier.weight(1f).height(40.dp),
                                        shape = RoundedCornerShape(10.dp),
                                        colors = ButtonDefaults.buttonColors(containerColor = EmeraldGreen)
                                    ) {
                                        Text("✓ Approve", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                                    }

                                    Button(
                                        onClick = { handleAction(item.id, "Rejected") },
                                        modifier = Modifier.weight(1f).height(40.dp),
                                        shape = RoundedCornerShape(10.dp),
                                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFF43F5E))
                                    ) {
                                        Text("✕ Reject", fontWeight = FontWeight.Bold, fontSize = 12.sp)
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
