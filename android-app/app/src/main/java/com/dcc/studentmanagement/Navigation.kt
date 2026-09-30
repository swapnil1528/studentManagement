package com.dcc.studentmanagement

import android.content.Context
import androidx.activity.compose.BackHandler
import androidx.compose.animation.*
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import com.dcc.studentmanagement.ui.admin.*
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

    // ADMIN PAGES
    data class AdminDashboard(val username: String, val branch: String) : ScreenDestination()
    data class AdminFees(val branch: String) : ScreenDestination()
    data class AdminAttendance(val branch: String) : ScreenDestination()
    data class AdminLeaves(val branch: String) : ScreenDestination()
    data class AdminStudents(val branch: String) : ScreenDestination()

    // STUDENT PAGES
    data class StudentDashboard(val role: String, val username: String, val studentId: String) : ScreenDestination()
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
        val savedBranch = prefs.getString("saved_branch", "Devichapada") ?: "Devichapada"

        if (saveEnabled && !savedRole.isNullOrBlank() && !savedUser.isNullOrBlank()) {
            if (savedRole.equals("admin", ignoreCase = true) || savedRole.equals("employee", ignoreCase = true) || savedRole.equals("teacher", ignoreCase = true)) {
                ScreenDestination.AdminDashboard(username = savedUser, branch = savedBranch)
            } else {
                ScreenDestination.StudentDashboard(role = savedRole, username = savedUser, studentId = savedStudId ?: savedUser)
            }
        } else {
            ScreenDestination.Login
        }
    }

    val backStack = remember { mutableStateListOf<ScreenDestination>(initialScreen) }
    val currentDestination = backStack.lastOrNull() ?: ScreenDestination.Login

    BackHandler(enabled = backStack.size > 1) {
        backStack.removeAt(backStack.lastIndex)
    }

    fun logout() {
        prefs.edit()
            .remove("saved_role")
            .remove("saved_password")
            .remove("saved_studentid")
            .putBoolean("save_enabled", false)
            .apply()
        backStack.clear()
        backStack.add(ScreenDestination.Login)
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
                    onLoginSuccess = { role, user, studentId, branch ->
                        backStack.clear()
                        if (role.equals("admin", true) || role.equals("employee", true) || role.equals("teacher", true)) {
                            backStack.add(ScreenDestination.AdminDashboard(username = user, branch = branch))
                        } else {
                            backStack.add(ScreenDestination.StudentDashboard(role = role, username = user, studentId = studentId))
                        }
                    }
                )
            }

            // ════════════════════════════════════════════════════════════
            // ADMIN EXECUTIVE DESTINATIONS
            // ════════════════════════════════════════════════════════════
            is ScreenDestination.AdminDashboard -> {
                AdminDashboardScreen(
                    username = dest.username,
                    branch = dest.branch,
                    onNavigateToAdminFees = {
                        backStack.add(ScreenDestination.AdminFees(branch = dest.branch))
                    },
                    onNavigateToAdminPendingFees = {
                        backStack.add(ScreenDestination.AdminFees(branch = dest.branch))
                    },
                    onNavigateToAdminAttendance = {
                        backStack.add(ScreenDestination.AdminAttendance(branch = dest.branch))
                    },
                    onNavigateToAdminLeaves = {
                        backStack.add(ScreenDestination.AdminLeaves(branch = dest.branch))
                    },
                    onNavigateToAdminStudents = {
                        backStack.add(ScreenDestination.AdminStudents(branch = dest.branch))
                    },
                    onNavigateToNotices = {
                        backStack.add(ScreenDestination.Notices(studentId = dest.username, role = "admin", branch = dest.branch))
                    },
                    onNavigateToChat = {
                        backStack.add(ScreenDestination.Chat(userId = dest.username, userRole = "admin", userName = dest.username, branch = dest.branch))
                    },
                    onLogout = { logout() }
                )
            }

            is ScreenDestination.AdminFees -> {
                AdminFeesScreen(
                    branch = dest.branch,
                    onBack = {
                        if (backStack.size > 1) backStack.removeAt(backStack.lastIndex)
                    }
                )
            }

            is ScreenDestination.AdminAttendance -> {
                AdminAttendanceScreen(
                    branch = dest.branch,
                    onBack = {
                        if (backStack.size > 1) backStack.removeAt(backStack.lastIndex)
                    }
                )
            }

            is ScreenDestination.AdminLeaves -> {
                AdminLeavesScreen(
                    branch = dest.branch,
                    onBack = {
                        if (backStack.size > 1) backStack.removeAt(backStack.lastIndex)
                    }
                )
            }

            is ScreenDestination.AdminStudents -> {
                AdminStudentsScreen(
                    branch = dest.branch,
                    onBack = {
                        if (backStack.size > 1) backStack.removeAt(backStack.lastIndex)
                    }
                )
            }

            // ════════════════════════════════════════════════════════════
            // STUDENT DESTINATIONS
            // ════════════════════════════════════════════════════════════
            is ScreenDestination.StudentDashboard -> {
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
                    onLogout = { logout() }
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
                    onLogout = { logout() }
                )
            }
        }
    }
}
