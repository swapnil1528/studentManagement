package com.dcc.studentmanagement.ui.login

import android.content.Context
import androidx.compose.animation.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dcc.studentmanagement.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

@Composable
fun LoginScreen(
    onLoginSuccess: (role: String, username: String) -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val focusManager = LocalFocusManager.current
    val scope = rememberCoroutineScope()
    val prefs = remember { context.getSharedPreferences("dcc_credentials", Context.MODE_PRIVATE) }

    var username by remember { mutableStateOf(prefs.getString("saved_username", "") ?: "") }
    var password by remember { mutableStateOf(prefs.getString("saved_password", "") ?: "") }
    var saveCredentials by remember { mutableStateOf(prefs.getBoolean("save_enabled", true)) }
    var passwordVisible by remember { mutableStateOf(false) }
    var selectedRoleTab by remember { mutableStateOf("student") }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(DarkBg)
    ) {
        // Decorative background gradient circles
        Box(
            modifier = Modifier
                .size(340.dp)
                .offset(x = (-80).dp, y = (-80).dp)
                .clip(CircleShape)
                .background(
                    Brush.radialGradient(
                        colors = listOf(BrandPrimary.copy(alpha = 0.22f), Color.Transparent)
                    )
                )
        )
        Box(
            modifier = Modifier
                .size(280.dp)
                .align(Alignment.BottomEnd)
                .offset(x = 60.dp, y = 60.dp)
                .clip(CircleShape)
                .background(
                    Brush.radialGradient(
                        colors = listOf(CyanNeon.copy(alpha = 0.18f), Color.Transparent)
                    )
                )
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .navigationBarsPadding()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Spacer(Modifier.height(36.dp))

            // Stitch App Brand Emblem
            Box(
                modifier = Modifier
                    .size(76.dp)
                    .clip(RoundedCornerShape(24.dp))
                    .background(
                        Brush.linearGradient(
                            listOf(BrandPrimary, CyanNeon)
                        )
                    )
                    .padding(2.dp)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .clip(RoundedCornerShape(22.dp))
                        .background(DarkSurface),
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = "DCC",
                        fontSize = 24.sp,
                        fontWeight = FontWeight.Black,
                        color = Color.White
                    )
                }
            }

            Spacer(Modifier.height(20.dp))

            Text(
                text = "DCC Academy Portal",
                fontSize = 24.sp,
                fontWeight = FontWeight.ExtraBold,
                color = TextWhite,
                letterSpacing = (-0.5).sp
            )

            Text(
                text = "Student & Administration Workspace",
                fontSize = 13.sp,
                fontWeight = FontWeight.Medium,
                color = TextMuted
            )

            Spacer(Modifier.height(28.dp))

            // Role Selector Tabs (Stitch Style Pills)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(DarkSurface)
                    .border(1.dp, DarkBorderSubtle, RoundedCornerShape(16.dp))
                    .padding(4.dp)
            ) {
                listOf(
                    "student" to "Student Portal",
                    "admin" to "Admin & Faculty"
                ).forEach { pair ->
                    val roleKey = pair.first
                    val label = pair.second
                    val isSelected = selectedRoleTab == roleKey
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(12.dp))
                            .background(
                                if (isSelected) Brush.linearGradient(
                                    listOf(BrandPrimary, VioletAccent)
                                ) else Brush.linearGradient(
                                    listOf(Color.Transparent, Color.Transparent)
                                )
                            )
                            .clickable { selectedRoleTab = roleKey }
                            .padding(vertical = 10.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = label,
                            fontSize = 13.sp,
                            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                            color = if (isSelected) Color.White else TextMuted
                        )
                    }
                }
            }

            Spacer(Modifier.height(20.dp))

            // Login Card Container
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(24.dp),
                colors = CardDefaults.cardColors(containerColor = DarkCard),
                border = BorderStroke(1.dp, DarkBorder)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(24.dp),
                    verticalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    Text(
                        text = if (selectedRoleTab == "student") "Student Sign In" else "Staff Sign In",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextWhite
                    )

                    // Username Field
                    OutlinedTextField(
                        value = username,
                        onValueChange = {
                            username = it
                            errorMessage = null
                        },
                        label = {
                            Text(if (selectedRoleTab == "student") "Student ID or Username" else "Admin Username")
                        },
                        placeholder = { Text("e.g. STU101 or admin") },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Text,
                            imeAction = ImeAction.Next
                        ),
                        keyboardActions = KeyboardActions(
                            onNext = { focusManager.moveFocus(FocusDirection.Down) }
                        ),
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = BrandPrimary,
                            unfocusedBorderColor = DarkBorder,
                            cursorColor = BrandPrimary,
                            focusedTextColor = TextWhite,
                            unfocusedTextColor = Color(0xFFE2E8F0),
                            focusedLabelColor = BrandLight,
                            unfocusedLabelColor = TextMuted
                        )
                    )

                    // Password Field
                    OutlinedTextField(
                        value = password,
                        onValueChange = {
                            password = it
                            errorMessage = null
                        },
                        label = { Text("Password") },
                        singleLine = true,
                        visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
                        keyboardOptions = KeyboardOptions(
                            keyboardType = KeyboardType.Password,
                            imeAction = ImeAction.Done
                        ),
                        keyboardActions = KeyboardActions(
                            onDone = { focusManager.clearFocus() }
                        ),
                        trailingIcon = {
                            Text(
                                text = if (passwordVisible) "HIDE" else "SHOW",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = BrandLight,
                                modifier = Modifier
                                    .clickable { passwordVisible = !passwordVisible }
                                    .padding(8.dp)
                            )
                        },
                        shape = RoundedCornerShape(14.dp),
                        modifier = Modifier.fillMaxWidth(),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = BrandPrimary,
                            unfocusedBorderColor = DarkBorder,
                            cursorColor = BrandPrimary,
                            focusedTextColor = TextWhite,
                            unfocusedTextColor = Color(0xFFE2E8F0),
                            focusedLabelColor = BrandLight,
                            unfocusedLabelColor = TextMuted
                        )
                    )

                    // Save Credentials Option
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column {
                            Text(
                                text = "Save Credentials",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.SemiBold,
                                color = TextWhite
                            )
                            Text(
                                text = "Stay logged in on this device",
                                fontSize = 11.sp,
                                color = TextSubtle
                            )
                        }
                        Switch(
                            checked = saveCredentials,
                            onCheckedChange = { saveCredentials = it },
                            colors = SwitchDefaults.colors(
                                checkedThumbColor = Color.White,
                                checkedTrackColor = BrandPrimary,
                                uncheckedThumbColor = TextMuted,
                                uncheckedTrackColor = DarkBorderSubtle
                            )
                        )
                    }

                    // Error Banner
                    AnimatedVisibility(visible = errorMessage != null) {
                        Text(
                            text = errorMessage ?: "",
                            color = StatusError,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.SemiBold,
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(12.dp))
                                .background(StatusError.copy(alpha = 0.12f))
                                .border(1.dp, StatusError.copy(alpha = 0.3f), RoundedCornerShape(12.dp))
                                .padding(12.dp),
                            textAlign = TextAlign.Center
                        )
                    }

                    // Submit Button
                    Button(
                        onClick = {
                            if (username.isBlank() || password.isBlank()) {
                                errorMessage = "Please enter both username and password"
                                return@Button
                            }
                            focusManager.clearFocus()
                            isLoading = true
                            errorMessage = null

                            scope.launch {
                                try {
                                    val result = performLogin(username.trim(), password.trim())
                                    if (result.first) {
                                        val role = result.second
                                        if (saveCredentials) {
                                            prefs.edit()
                                                .putString("saved_username", username.trim())
                                                .putString("saved_password", password.trim())
                                                .putString("saved_role", role)
                                                .putBoolean("save_enabled", true)
                                                .apply()
                                        } else {
                                            prefs.edit()
                                                .remove("saved_password")
                                                .putBoolean("save_enabled", false)
                                                .apply()
                                        }
                                        onLoginSuccess(role, username.trim())
                                    } else {
                                        errorMessage = result.second
                                    }
                                } catch (e: Exception) {
                                    errorMessage = "Network error: Unable to reach portal server"
                                } finally {
                                    isLoading = false
                                }
                            }
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp),
                        shape = RoundedCornerShape(16.dp),
                        enabled = !isLoading,
                        colors = ButtonDefaults.buttonColors(
                            containerColor = BrandPrimary,
                            disabledContainerColor = DarkBorder
                        )
                    ) {
                        if (isLoading) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(22.dp),
                                color = Color.White,
                                strokeWidth = 2.5.dp
                            )
                            Spacer(Modifier.width(10.dp))
                            Text(
                                text = "Authenticating...",
                                fontWeight = FontWeight.Bold,
                                fontSize = 15.sp,
                                color = Color.White
                            )
                        } else {
                            Text(
                                text = "Sign In to Portal",
                                fontWeight = FontWeight.Bold,
                                fontSize = 15.sp,
                                color = Color.White
                            )
                        }
                    }
                }
            }

            Spacer(Modifier.height(24.dp))

            Text(
                text = "Secured with end-to-end encryption",
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
                color = TextSubtle
            )

            Spacer(Modifier.height(40.dp))
        }
    }
}

private suspend fun performLogin(username: String, password: String): Pair<Boolean, String> {
    return withContext(Dispatchers.IO) {
        try {
            val apiUrl = "https://script.google.com/macros/s/AKfycbzhSkApquHe8n5Z5FQzvkMrxdZxR6HURPFwE2geZQ0mWMHfhYhsd-_PtzfSe-1nfRGp9A/exec"
            val body = JSONObject().apply {
                put("action", "login")
                put("username", username)
                put("password", password)
            }

            val url = URL(apiUrl)
            var conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "application/json")
            conn.doOutput = true
            conn.instanceFollowRedirects = true
            conn.connectTimeout = 15000
            conn.readTimeout = 15000

            conn.outputStream.use { os ->
                os.write(body.toString().toByteArray())
            }

            val responseCode = conn.responseCode
            if (responseCode == 302 || responseCode == 301) {
                val redirectUrl = conn.getHeaderField("Location")
                if (redirectUrl != null) {
                    conn = URL(redirectUrl).openConnection() as HttpURLConnection
                    conn.instanceFollowRedirects = true
                }
            }

            val response = conn.inputStream.bufferedReader().readText()
            val json = JSONObject(response)

            if (json.optBoolean("success", false)) {
                val role = json.optString("role", "student")
                Pair(true, role)
            } else {
                val error = json.optString("error", "Invalid credentials. Please verify your details.")
                Pair(false, error)
            }
        } catch (e: Exception) {
            Pair(false, "Connection error: " + (e.message ?: "Unknown"))
        }
    }
}
