package com.dcc.studentmanagement

import android.content.Context
import androidx.activity.compose.BackHandler
import androidx.compose.animation.*
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import com.dcc.studentmanagement.ui.attendance.AttendanceScreen
import com.dcc.studentmanagement.ui.chat.ChatScreen
import com.dcc.studentmanagement.ui.courses.CoursesScreen
import com.dcc.studentmanagement.ui.dashboard.DashboardScreen
import com.dcc.studentmanagement.ui.fees.FeesScreen
import com.dcc.studentmanagement.ui.login.LoginScreen
import com.dcc.studentmanagement.ui.notices.NoticesScreen
import com.dcc.studentmanagement.ui.profile.ProfileScreen
import com.dcc.studentmanagement.ui.results.ResultsScreen

sealed class ScreenDestination {
    data object Login : ScreenDestination()
    data class Dashboard(val role: String, val username: String, val studentId: String) : ScreenDestination()
    data class Attendance(val studentId: String, val branch: String) : ScreenDestination()
    data class Fees(val studentId: String) : ScreenDestination()
    data class Chat(val userId: String, val userRole: String, val userName: String, val branch: String) : ScreenDestination()
    data class Notices(val studentId: String, val role: String, val branch: String) : ScreenDestination()
    data class Results(val studentId: String) : ScreenDestination()
    data class Courses(val studentId: String) : ScreenDestination()
    data class Profile(val studentId: String) : ScreenDestination()
}

@Composable
fun AppNavigation() {
    val context = LocalContext.current
    val prefs = remember { context.getSharedPreferences("dcc_credentials", Context.MODE_PRIVATE) }

    val initialScreen = remember {
        val saveEnabled = prefs.getBoolean("save_enabled", false)
        val savedRole = prefs.getString("saved_role", null)
        val savedUser = prefs.getString("saved_username", null)
        val savedStudId = prefs.getString("saved_studentid", savedUser)
        if (saveEnabled && !savedRole.isNullOrBlank() && !savedUser.isNullOrBlank() && !savedStudId.isNullOrBlank()) {
            ScreenDestination.Dashboard(role = savedRole, username = savedUser, studentId = savedStudId)
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
                    onLoginSuccess = { role, user, studentId ->
                        backStack.clear()
                        backStack.add(
                            ScreenDestination.Dashboard(
                                role = role,
                                username = user,
                                studentId = studentId
                            )
                        )
                    }
                )
            }
            is ScreenDestination.Dashboard -> {
                DashboardScreen(
                    role = dest.role,
                    username = dest.username,
                    studentId = dest.studentId,
                    onNavigateToAttendance = {
                        backStack.add(ScreenDestination.Attendance(studentId = dest.studentId, branch = "Devichapada"))
                    },
                    onNavigateToFees = {
                        backStack.add(ScreenDestination.Fees(studentId = dest.studentId))
                    },
                    onNavigateToChat = {
                        backStack.add(
                            ScreenDestination.Chat(
                                userId = dest.studentId,
                                userRole = dest.role,
                                userName = dest.username,
                                branch = "Devichapada"
                            )
                        )
                    },
                    onNavigateToNotices = {
                        backStack.add(
                            ScreenDestination.Notices(
                                studentId = dest.studentId,
                                role = dest.role,
                                branch = "Devichapada"
                            )
                        )
                    },
                    onNavigateToResults = {
                        backStack.add(ScreenDestination.Results(studentId = dest.studentId))
                    },
                    onNavigateToCourses = {
                        backStack.add(ScreenDestination.Courses(studentId = dest.studentId))
                    },
                    onNavigateToProfile = {
                        backStack.add(ScreenDestination.Profile(studentId = dest.studentId))
                    },
                    onLogout = {
                        prefs.edit()
                            .remove("saved_role")
                            .remove("saved_password")
                            .remove("saved_studentid")
                            .putBoolean("save_enabled", false)
                            .apply()
                        backStack.clear()
                        backStack.add(ScreenDestination.Login)
                    }
                )
            }
            is ScreenDestination.Attendance -> {
                AttendanceScreen(
                    studentId = dest.studentId,
                    branch = dest.branch,
                    onBack = {
                        if (backStack.size > 1) backStack.removeAt(backStack.lastIndex)
                    }
                )
            }
            is ScreenDestination.Fees -> {
                FeesScreen(
                    studentId = dest.studentId,
                    onBack = {
                        if (backStack.size > 1) backStack.removeAt(backStack.lastIndex)
                    }
                )
            }
            is ScreenDestination.Chat -> {
                ChatScreen(
                    userId = dest.userId,
                    userRole = dest.userRole,
                    userName = dest.userName,
                    branch = dest.branch,
                    onBack = {
                        if (backStack.size > 1) backStack.removeAt(backStack.lastIndex)
                    }
                )
            }
            is ScreenDestination.Notices -> {
                NoticesScreen(
                    studentId = dest.studentId,
                    role = dest.role,
                    branch = dest.branch,
                    onBack = {
                        if (backStack.size > 1) backStack.removeAt(backStack.lastIndex)
                    }
                )
            }
            is ScreenDestination.Results -> {
                ResultsScreen(
                    studentId = dest.studentId,
                    onBack = {
                        if (backStack.size > 1) backStack.removeAt(backStack.lastIndex)
                    }
                )
            }
            is ScreenDestination.Courses -> {
                CoursesScreen(
                    studentId = dest.studentId,
                    onBack = {
                        if (backStack.size > 1) backStack.removeAt(backStack.lastIndex)
                    }
                )
            }
            is ScreenDestination.Profile -> {
                ProfileScreen(
                    studentId = dest.studentId,
                    onBack = {
                        if (backStack.size > 1) backStack.removeAt(backStack.lastIndex)
                    },
                    onLogout = {
                        prefs.edit()
                            .remove("saved_role")
                            .remove("saved_password")
                            .remove("saved_studentid")
                            .putBoolean("save_enabled", false)
                            .apply()
                        backStack.clear()
                        backStack.add(ScreenDestination.Login)
                    }
                )
            }
        }
    }
}
