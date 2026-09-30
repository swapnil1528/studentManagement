package com.dcc.studentmanagement

import android.content.Context
import androidx.activity.compose.BackHandler
import androidx.compose.animation.*
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import com.dcc.studentmanagement.ui.dashboard.DashboardScreen
import com.dcc.studentmanagement.ui.login.LoginScreen
import com.dcc.studentmanagement.ui.webview.WebViewScreen

sealed class ScreenDestination {
    data object Login : ScreenDestination()
    data class Dashboard(val role: String, val username: String) : ScreenDestination()
    data class FeatureView(val url: String, val title: String) : ScreenDestination()
}

@Composable
fun AppNavigation() {
    val context = LocalContext.current
    val prefs = remember { context.getSharedPreferences("dcc_credentials", Context.MODE_PRIVATE) }

    val initialScreen = remember {
        val saveEnabled = prefs.getBoolean("save_enabled", false)
        val savedRole = prefs.getString("saved_role", null)
        val savedUser = prefs.getString("saved_username", null)
        if (saveEnabled && !savedRole.isNullOrBlank() && !savedUser.isNullOrBlank()) {
            ScreenDestination.Dashboard(role = savedRole, username = savedUser)
        } else {
            ScreenDestination.Login
        }
    }

    val backStack = remember { mutableStateListOf<ScreenDestination>(initialScreen) }
    val currentDestination = backStack.lastOrNull() ?: ScreenDestination.Login

    BackHandler(enabled = backStack.size > 1) {
        backStack.removeAt(backStack.lastIndex)
    }

    AnimatedContent(
        targetState = currentDestination,
        transitionSpec = {
            fadeIn() togetherWith fadeOut()
        },
        label = "AppScreenTransition",
        modifier = Modifier.fillMaxSize()
    ) { dest ->
        when (dest) {
            is ScreenDestination.Login -> {
                LoginScreen(
                    onLoginSuccess = { role, user, sessionJson ->
                        backStack.clear()
                        backStack.add(ScreenDestination.Dashboard(role = role, username = user))
                    },
                    onOpenWebPortal = {
                        backStack.add(ScreenDestination.FeatureView(url = "/login", title = "DCC Student Portal"))
                    }
                )
            }
            is ScreenDestination.Dashboard -> {
                DashboardScreen(
                    role = dest.role,
                    username = dest.username,
                    onItemClick = { url, title ->
                        backStack.add(ScreenDestination.FeatureView(url = url, title = title))
                    },
                    onOpenChat = {
                        val chatUrl = if (dest.role == "admin" || dest.role == "employee" || dest.role == "teacher") "/admin/chat" else "/student"
                        backStack.add(ScreenDestination.FeatureView(url = chatUrl, title = "WhatsApp Chat"))
                    },
                    onLogout = {
                        prefs.edit()
                            .remove("saved_role")
                            .remove("saved_password")
                            .remove("saved_session")
                            .putBoolean("save_enabled", false)
                            .apply()
                        backStack.clear()
                        backStack.add(ScreenDestination.Login)
                    }
                )
            }
            is ScreenDestination.FeatureView -> {
                WebViewScreen(
                    url = dest.url,
                    title = dest.title,
                    onBack = {
                        if (backStack.size > 1) {
                            backStack.removeAt(backStack.lastIndex)
                        } else {
                            val role = prefs.getString("saved_role", "student") ?: "student"
                            val user = prefs.getString("saved_username", "User") ?: "User"
                            backStack.clear()
                            backStack.add(ScreenDestination.Dashboard(role = role, username = user))
                        }
                    }
                )
            }
        }
    }
}
