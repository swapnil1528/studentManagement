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
    onLoginSuccess: (role: String, username: String, sessionJson: String) -> Unit,
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
        // Vibrant Background Gradient Blobs
        Box(
            modifier = Modifier
                .size(360.dp)
                .offset(x = (-80).dp, y = (-80).dp)
                .clip(CircleShape)
                .background(
                    Brush.radialGradient(
                        colors = listOf(BrandPrimary.copy(alpha = 0.28f), Color.Transparent)
                    )
                )
        )
        Box(
            modifier = Modifier
                .size(320.dp)
                .align(Alignment.BottomEnd)
                .offset(x = 80.dp, y = 80.dp)
                .clip(CircleShape)
                .background(
                    Brush.radialGradient(
                        colors = listOf(EmeraldGreen.copy(alpha = 0.25f), Color.Transparent)
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
            Spacer(Modifier.height(32.dp))

            // Glowing Emblem
            Box(
                modifier = Modifier
                    .size(80.dp)
                    .clip(RoundedCornerShape(26.dp))
                    .background(
                        Brush.linearGradient(
                            listOf(BrandPrimary, CyanNeon, EmeraldGreen)
                        )
                    )
                    .padding(3.dp)
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .clip(RoundedCornerShape(23.dp))
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

            Spacer(Modifier.height(18.dp))

            Text(
                text = "DCC Student Portal",
                fontSize = 26.sp,
                fontWeight = FontWeight.Black,
                color = TextWhite,
                letterSpacing = (-0.5).sp
            )

            Text(
                text = "Unified Campus Management & WhatsApp Chat",
                fontSize = 13.sp,
                fontWeight = FontWeight.Medium,
                color = TextMuted,
                textAlign = TextAlign.Center
            )

            Spacer(Modifier.height(26.dp))

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
                                    if (roleKey == "student") listOf(BrandPrimary, VioletAccent)
                                    else listOf(EmeraldGreen, CyanNeon)
                                ) else Brush.linearGradient(
                                    listOf(Color.Transparent, Color.Transparent)
                                )
                            )
                            .clickable { selectedRoleTab = roleKey }
                            .padding(vertical = 11.dp),
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
                shape = RoundedCornerShape(26.dp),
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
                        text = if (selectedRoleTab == "student") "Student Authentication" else "Administrator Login",
                        fontSize = 17.sp,
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
                            Text(if (selectedRoleTab == "student") "Student ID / Username" else "Admin Username")
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
                            focusedBorderColor = if (selectedRoleTab == "student") BrandPrimary else EmeraldGreen,
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
                            focusedBorderColor = if (selectedRoleTab == "student") BrandPrimary else EmeraldGreen,
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
                                checkedTrackColor = if (selectedRoleTab == "student") BrandPrimary else EmeraldGreen,
                                uncheckedThumbColor = TextMuted,
                                uncheckedTrackColor = DarkBorderSubtle
                            )
                        )
                    }

                    // Prominent Error Banner
                    AnimatedVisibility(
                        visible = errorMessage != null,
                        enter = fadeIn() + expandVertically(),
                        exit = fadeOut() + shrinkVertically()
                    ) {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(14.dp))
                                .background(Color(0xFF3B1219))
                                .border(1.5.dp, Color(0xFFF43F5E), RoundedCornerShape(14.dp))
                                .padding(14.dp)
                        ) {
                            Text(
                                text = errorMessage ?: "",
                                color = Color(0xFFFFB4AB),
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                textAlign = TextAlign.Center,
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
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
                                    val result = performGASLogin(username.trim(), password.trim())
                                    if (result.success) {
                                        val role = result.role
                                        val user = result.username
                                        if (saveCredentials) {
                                            prefs.edit()
                                                .putString("saved_username", username.trim())
                                                .putString("saved_password", password.trim())
                                                .putString("saved_role", role)
                                                .putString("saved_session", result.rawJson)
                                                .putBoolean("save_enabled", true)
                                                .apply()
                                        } else {
                                            prefs.edit()
                                                .remove("saved_password")
                                                .remove("saved_session")
                                                .putBoolean("save_enabled", false)
                                                .apply()
                                        }
                                        onLoginSuccess(role, user, result.rawJson)
                                    } else {
                                        errorMessage = result.error.ifBlank { "Invalid username or password. Please verify your credentials." }
                                    }
                                } catch (e: Exception) {
                                    errorMessage = "Network error: Unable to connect to portal server"
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
                            containerColor = if (selectedRoleTab == "student") BrandPrimary else EmeraldGreen,
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
                                text = "Verifying with server...",
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp,
                                color = Color.White
                            )
                        } else {
                            Text(
                                text = "Sign In",
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
                text = "Secured with Google Cloud Authentication",
                fontSize = 11.sp,
                color = TextSubtle
            )

            Spacer(Modifier.height(36.dp))
        }
    }
}

data class GASLoginResult(
    val success: Boolean,
    val role: String = "student",
    val username: String = "",
    val error: String = "",
    val rawJson: String = ""
)

private suspend fun performGASLogin(username: String, password: String): GASLoginResult {
    return withContext(Dispatchers.IO) {
        try {
            val apiUrl = "https://script.google.com/macros/s/AKfycbzhSkApquHe8n5Z5FQzvkMrxdZxR6HURPFwE2geZQ0mWMHfhYhsd-_PtzfSe-1nfRGp9A/exec"
            val body = JSONObject().apply {
                put("action", "login")
                put("u", username)
                put("p", password)
                put("username", username)
                put("password", password)
            }

            val url = URL(apiUrl)
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "text/plain")
            conn.doOutput = true
            conn.instanceFollowRedirects = false
            conn.connectTimeout = 15000
            conn.readTimeout = 15000

            conn.outputStream.use { os ->
                os.write(body.toString().toByteArray())
            }

            val responseCode = conn.responseCode
            var responseText = ""

            // Handle Google Apps Script 302 Redirect cleanly with GET
            if (responseCode == 302 || responseCode == 301) {
                val redirectUrl = conn.getHeaderField("Location")
                if (redirectUrl != null) {
                    val getConn = URL(redirectUrl).openConnection() as HttpURLConnection
                    getConn.requestMethod = "GET"
                    getConn.instanceFollowRedirects = true
                    getConn.connectTimeout = 15000
                    getConn.readTimeout = 15000
                    responseText = getConn.inputStream.bufferedReader().readText()
                }
            } else {
                responseText = conn.inputStream.bufferedReader().readText()
            }

            val json = JSONObject(responseText)
            if (json.optBoolean("success", false)) {
                val rawRole = json.optString("role", "student").lowercase()
                val user = json.optString("username", username)
                GASLoginResult(
                    success = true,
                    role = rawRole,
                    username = user,
                    rawJson = responseText
                )
            } else {
                val errorMsg = json.optString("error", "Invalid username or password. Please verify your credentials.")
                GASLoginResult(
                    success = false,
                    error = errorMsg
                )
            }
        } catch (e: Exception) {
            GASLoginResult(
                success = false,
                error = "Connection failed: " + (e.message ?: "Unable to reach server")
            )
        }
    }
}
