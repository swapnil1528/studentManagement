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
import com.dcc.studentmanagement.data.GasApiClient
import com.dcc.studentmanagement.theme.*
import kotlinx.coroutines.launch

@Composable
fun LoginScreen(
    onLoginSuccess: (role: String, username: String, studentId: String, branch: String) -> Unit,
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
    var selectedRoleTab by remember { mutableStateOf(if (prefs.getString("saved_role", "student") == "admin") "admin" else "student") }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(DarkBg)
    ) {
        // Decorative radial gradients
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
            Spacer(Modifier.height(36.dp))

            // Logo & Title
            Box(
                modifier = Modifier
                    .size(76.dp)
                    .clip(RoundedCornerShape(22.dp))
                    .background(
                        Brush.linearGradient(
                            colors = listOf(BrandPrimary, CyanNeon)
                        )
                    ),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = "DCC",
                    fontSize = 24.sp,
                    fontWeight = FontWeight.ExtraBold,
                    color = Color.White
                )
            }

            Spacer(Modifier.height(18.dp))

            Text(
                text = "DCC Student Portal",
                fontSize = 26.sp,
                fontWeight = FontWeight.ExtraBold,
                color = TextWhite,
                textAlign = TextAlign.Center
            )

            Text(
                text = "Unified Campus Management & WhatsApp Chat",
                fontSize = 13.sp,
                color = TextMuted,
                textAlign = TextAlign.Center,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp)
            )

            Spacer(Modifier.height(26.dp))

            // Role Toggle Pill
            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = DarkCard),
                border = BorderStroke(1.dp, DarkBorder)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(4.dp),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    // Student Tab
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(12.dp))
                            .background(if (selectedRoleTab == "student") BrandPrimary else Color.Transparent)
                            .clickable { selectedRoleTab = "student" }
                            .padding(vertical = 12.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "Student Portal",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (selectedRoleTab == "student") Color.White else TextMuted
                        )
                    }

                    // Admin Tab
                    Box(
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(12.dp))
                            .background(if (selectedRoleTab == "admin") EmeraldGreen else Color.Transparent)
                            .clickable { selectedRoleTab = "admin" }
                            .padding(vertical = 12.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "Admin & Faculty",
                            fontSize = 13.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (selectedRoleTab == "admin") Color.White else TextMuted
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
                        placeholder = { Text(if (selectedRoleTab == "student") "e.g. ST-2026-1001 or swapnil" else "e.g. admin") },
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

                    // Error Banner
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
                                val res = GasApiClient.login(username.trim(), password.trim())
                                isLoading = false
                                res.onSuccess { json ->
                                    if (json.optBoolean("success", false)) {
                                        val rawRole = json.optString("role", selectedRoleTab).lowercase()
                                        val user = json.optString("username", username.trim())
                                        val studId = json.optString("studentId", json.optString("userId", user))
                                        val branch = json.optString("branch", "Devichapada")

                                        val finalRole = if (rawRole.contains("admin") || rawRole.contains("employee") || rawRole.contains("teacher")) "admin" else "student"

                                        if (saveCredentials) {
                                            prefs.edit()
                                                .putString("saved_username", username.trim())
                                                .putString("saved_password", password.trim())
                                                .putString("saved_role", finalRole)
                                                .putString("saved_studentid", studId)
                                                .putString("saved_branch", branch)
                                                .putBoolean("save_enabled", true)
                                                .apply()
                                        } else {
                                            prefs.edit()
                                                .remove("saved_password")
                                                .remove("saved_studentid")
                                                .putBoolean("save_enabled", false)
                                                .apply()
                                        }
                                        onLoginSuccess(finalRole, user, studId, branch)
                                    } else {
                                        errorMessage = json.optString("error", "Invalid username or password.")
                                    }
                                }.onFailure { err ->
                                    errorMessage = "Login failed: " + (err.message ?: "Unable to reach server")
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
                                text = "Authenticating...",
                                fontWeight = FontWeight.Bold,
                                fontSize = 14.sp,
                                color = Color.White
                            )
                        } else {
                            Text(
                                text = if (selectedRoleTab == "student") "Student Sign In" else "Admin Sign In",
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
                text = "Secured with Google Cloud Apps Script Database",
                fontSize = 11.sp,
                color = TextSubtle
            )

            Spacer(Modifier.height(36.dp))
        }
    }
}
