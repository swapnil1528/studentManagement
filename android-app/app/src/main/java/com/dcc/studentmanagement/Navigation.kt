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

sealed class AppDestination {
    data object Login : AppDestination()
    data class Dashboard(val role: String, val username: String) : AppDestination()
    data class WebView(val url: String, val title: String) : AppDestination()
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
            AppDestination.Dashboard(role = savedRole, username = savedUser)
        } else {
            AppDestination.Login
        }
    }

    val backStack = remember { mutableStateListOf<AppDestination>(initialScreen) }
    val currentDestination = backStack.lastOrNull() ?: AppDestination.Login

    BackHandler(enabled = backStack.size > 1) {
        backStack.removeAt(backStack.lastIndex)
    }

    AnimatedContent(
        targetState = currentDestination,
        transitionSpec = {
            fadeIn() togetherWith fadeOut()
        },
        label = "ScreenTransition",
        modifier = Modifier.fillMaxSize()
    ) { dest ->
        when (dest) {
            is AppDestination.Login -> {
                LoginScreen(
                    onLoginSuccess = { role, user ->
                        backStack.clear()
                        backStack.add(AppDestination.Dashboard(role = role, username = user))
                    }
                )
            }
            is AppDestination.Dashboard -> {
                DashboardScreen(
                    role = dest.role,
                    username = dest.username,
                    onItemClick = { url, title ->
                        backStack.add(AppDestination.WebView(url = url, title = title))
                    },
                    onLogout = {
                        prefs.edit()
                            .remove("saved_role")
                            .remove("saved_password")
                            .putBoolean("save_enabled", false)
                            .apply()
                        backStack.clear()
                        backStack.add(AppDestination.Login)
                    }
                )
            }
            is AppDestination.WebView -> {
                WebViewScreen(
                    url = dest.url,
                    title = dest.title,
                    onBack = {
                        if (backStack.size > 1) {
                            backStack.removeAt(backStack.lastIndex)
                        } else {
                            val savedRole = prefs.getString("saved_role", "student") ?: "student"
                            val savedUser = prefs.getString("saved_username", "User") ?: "User"
                            backStack.clear()
                            backStack.add(AppDestination.Dashboard(role = savedRole, username = savedUser))
                        }
                    }
                )
            }
        }
    }
}
