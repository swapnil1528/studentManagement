package com.dcc.studentmanagement.ui.attendance

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.location.Location
import android.location.LocationManager
import android.util.Base64
import android.widget.Toast
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.dcc.studentmanagement.data.GasApiClient
import com.dcc.studentmanagement.theme.*
import kotlinx.coroutines.launch
import org.json.JSONArray
import java.io.ByteArrayOutputStream

data class AttendanceRecord(
    val time: String,
    val status: String,
    val location: String,
    val distance: String
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AttendanceScreen(
    studentId: String,
    branch: String,
    onBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var isLoading by remember { mutableStateOf(true) }
    var isSubmitting by remember { mutableStateOf(false) }
    var attendancePerc by remember { mutableIntStateOf(0) }
    var presentDays by remember { mutableIntStateOf(0) }
    var totalDays by remember { mutableIntStateOf(0) }
    var todayStatus by remember { mutableStateOf("Not Marked") }
    var logs by remember { mutableStateOf<List<AttendanceRecord>>(emptyList()) }

    var selfieBitmap by remember { mutableStateOf<Bitmap?>(null) }
    var capturedPhotoBase64 by remember { mutableStateOf<String?>(null) }
    var userLat by remember { mutableDoubleStateOf(19.071578) }
    var userLng by remember { mutableDoubleStateOf(73.1434878) }

    fun refreshData() {
        isLoading = true
        scope.launch {
            val res = GasApiClient.getStudentData(studentId)
            res.onSuccess { json ->
                val att = json.optJSONObject("attendance")
                if (att != null) {
                    attendancePerc = att.optInt("perc", 0)
                    presentDays = att.optInt("pres", 0)
                    totalDays = att.optInt("total", 0)
                    todayStatus = att.optString("todayStatus", "None")

                    val logArray = att.optJSONArray("logs") ?: JSONArray()
                    val list = mutableListOf<AttendanceRecord>()
                    for (i in 0 until logArray.length()) {
                        val item = logArray.optJSONObject(i)
                        if (item != null) {
                            list.add(
                                AttendanceRecord(
                                    time = item.optString("time", ""),
                                    status = item.optString("status", "Check-In"),
                                    location = item.optString("location", "Campus"),
                                    distance = item.optString("distance", "0m")
                                )
                            )
                        }
                    }
                    logs = list
                }
            }
            isLoading = false
        }
    }

    LaunchedEffect(studentId) {
        refreshData()
    }

    val cameraLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.TakePicturePreview()
    ) { bitmap ->
        if (bitmap != null) {
            selfieBitmap = bitmap
            val baos = ByteArrayOutputStream()
            bitmap.compress(Bitmap.CompressFormat.JPEG, 75, baos)
            val bytes = baos.toByteArray()
            capturedPhotoBase64 = "data:image/jpeg;base64," + Base64.encodeToString(bytes, Base64.NO_WRAP)
            Toast.makeText(context, "Selfie captured successfully!", Toast.LENGTH_SHORT).show()
        }
    }

    fun fetchLocation() {
        try {
            val locationManager = context.getSystemService(Context.LOCATION_SERVICE) as? LocationManager
            if (locationManager != null) {
                val hasFine = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
                if (hasFine) {
                    val loc: Location? = locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER)
                        ?: locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER)
                    if (loc != null) {
                        userLat = loc.latitude
                        userLng = loc.longitude
                    }
                }
            }
        } catch (_: Exception) {}
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) { perms ->
        if (perms[Manifest.permission.CAMERA] == true) {
            cameraLauncher.launch(null)
        }
        if (perms[Manifest.permission.ACCESS_FINE_LOCATION] == true) {
            fetchLocation()
        }
    }

    fun submitAttendance(type: String) {
        val hasCam = ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
        val hasLoc = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED

        if (!hasCam || !hasLoc) {
            permissionLauncher.launch(arrayOf(Manifest.permission.CAMERA, Manifest.permission.ACCESS_FINE_LOCATION))
            return
        }

        fetchLocation()
        isSubmitting = true

        scope.launch {
            val res = GasApiClient.markStudentAttendance(
                id = studentId,
                type = type,
                lat = userLat,
                lng = userLng,
                photoBase64 = capturedPhotoBase64
            )
            isSubmitting = false
            res.onSuccess {
                Toast.makeText(context, "$type Marked Successfully!", Toast.LENGTH_LONG).show()
                selfieBitmap = null
                capturedPhotoBase64 = null
                refreshData()
            }.onFailure { err ->
                Toast.makeText(context, "Failed: " + (err.message ?: "Server error"), Toast.LENGTH_LONG).show()
            }
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text("Attendance Portal", fontWeight = FontWeight.Bold, color = TextWhite)
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
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(20.dp),
                        colors = CardDefaults.cardColors(containerColor = DarkCard),
                        border = BorderStroke(1.dp, DarkBorder)
                    ) {
                        Column(Modifier.padding(20.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text("Overall Attendance", fontSize = 13.sp, color = TextMuted)
                                    Text(
                                        text = "$attendancePerc%",
                                        fontSize = 32.sp,
                                        fontWeight = FontWeight.ExtraBold,
                                        color = if (attendancePerc >= 75) EmeraldGreen else AmberGold
                                    )
                                }
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(12.dp))
                                        .background(if (todayStatus.contains("Check-In", true)) EmeraldGreen.copy(alpha = 0.2f) else DarkBorder)
                                        .padding(horizontal = 12.dp, vertical = 6.dp)
                                ) {
                                    Text(
                                        text = "Today: $todayStatus",
                                        color = if (todayStatus.contains("Check-In", true)) EmeraldLight else TextWhite,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 12.sp
                                    )
                                }
                            }

                            Spacer(Modifier.height(14.dp))
                            LinearProgressIndicator(
                                progress = { (attendancePerc / 100f).coerceIn(0f, 1f) },
                                modifier = Modifier.fillMaxWidth().height(8.dp).clip(CircleShape),
                                color = if (attendancePerc >= 75) EmeraldGreen else AmberGold,
                                trackColor = DarkBorder
                            )

                            Spacer(Modifier.height(12.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text("Present: $presentDays Days", fontSize = 12.sp, color = TextWhite)
                                Text("Total: $totalDays Days", fontSize = 12.sp, color = TextMuted)
                            }
                        }
                    }
                }

                item {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(20.dp),
                        colors = CardDefaults.cardColors(containerColor = DarkCard),
                        border = BorderStroke(1.dp, DarkBorder)
                    ) {
                        Column(
                            Modifier.padding(20.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(
                                text = "Daily Check-In & Check-Out",
                                fontSize = 16.sp,
                                fontWeight = FontWeight.Bold,
                                color = TextWhite
                            )
                            Text(
                                text = "Take selfie photo and tap below to mark attendance",
                                fontSize = 12.sp,
                                color = TextSubtle,
                                textAlign = TextAlign.Center
                            )

                            Spacer(Modifier.height(14.dp))

                            Box(
                                modifier = Modifier
                                    .size(110.dp)
                                    .clip(CircleShape)
                                    .background(DarkBorder)
                                    .border(2.dp, BrandPrimary, CircleShape)
                                    .clickable {
                                        val hasCam = ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
                                        if (hasCam) {
                                            cameraLauncher.launch(null)
                                        } else {
                                            permissionLauncher.launch(arrayOf(Manifest.permission.CAMERA))
                                        }
                                    },
                                contentAlignment = Alignment.Center
                            ) {
                                if (selfieBitmap != null) {
                                    Image(
                                        bitmap = selfieBitmap!!.asImageBitmap(),
                                        contentDescription = "Selfie",
                                        modifier = Modifier.fillMaxSize()
                                    )
                                } else {
                                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                                        Text("📸", fontSize = 28.sp)
                                        Text("Take Photo", fontSize = 11.sp, color = BrandLight, fontWeight = FontWeight.Bold)
                                    }
                                }
                            }

                            Spacer(Modifier.height(18.dp))

                            if (isSubmitting) {
                                CircularProgressIndicator(color = BrandPrimary)
                                Spacer(Modifier.height(8.dp))
                                Text("Submitting to server...", color = TextMuted, fontSize = 12.sp)
                            } else {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                                ) {
                                    Button(
                                        onClick = { submitAttendance("Check-In") },
                                        modifier = Modifier.weight(1f).height(50.dp),
                                        shape = RoundedCornerShape(14.dp),
                                        colors = ButtonDefaults.buttonColors(containerColor = EmeraldGreen)
                                    ) {
                                        Text("🟢 Check In", fontWeight = FontWeight.Bold)
                                    }

                                    Button(
                                        onClick = { submitAttendance("Check-Out") },
                                        modifier = Modifier.weight(1f).height(50.dp),
                                        shape = RoundedCornerShape(14.dp),
                                        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFDC2626))
                                    ) {
                                        Text("🔴 Check Out", fontWeight = FontWeight.Bold)
                                    }
                                }
                            }
                        }
                    }
                }

                item {
                    Text(
                        text = "Attendance History Logs",
                        fontSize = 15.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextWhite,
                        modifier = Modifier.padding(top = 8.dp)
                    )
                }

                if (logs.isEmpty()) {
                    item {
                        Card(
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = DarkCard)
                        ) {
                            Text(
                                text = "No attendance logs found yet.",
                                modifier = Modifier.padding(24.dp).fillMaxWidth(),
                                textAlign = TextAlign.Center,
                                color = TextMuted,
                                fontSize = 13.sp
                            )
                        }
                    }
                } else {
                    items(logs) { record ->
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
                                        text = record.status,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 14.sp,
                                        color = if (record.status.contains("In", true)) EmeraldGreen else Color(0xFFF87171)
                                    )
                                    Text(
                                        text = record.time.replace("T", " ").take(19),
                                        fontSize = 12.sp,
                                        color = TextMuted
                                    )
                                }
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(8.dp))
                                        .background(DarkBorder)
                                        .padding(horizontal = 8.dp, vertical = 4.dp)
                                ) {
                                    Text(
                                        text = "📍 " + record.distance,
                                        fontSize = 11.sp,
                                        color = CyanNeon
                                    )
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
