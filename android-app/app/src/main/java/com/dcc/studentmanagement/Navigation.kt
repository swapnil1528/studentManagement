package com.dcc.studentmanagement

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.dcc.studentmanagement.ui.webview.WebViewScreen

@Composable
fun AppNavigation() {
    WebViewScreen(
        initialUrl = "https://student-management-one-wine.vercel.app/",
        modifier = Modifier.fillMaxSize()
    )
}
