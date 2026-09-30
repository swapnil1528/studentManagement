package com.dcc.studentmanagement.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val StitchDarkColorScheme = darkColorScheme(
    primary = BrandPrimary,
    onPrimary = Color.White,
    primaryContainer = BrandDark,
    onPrimaryContainer = Color.White,
    secondary = CyanNeon,
    onSecondary = Color.Black,
    secondaryContainer = Color(0xFF164E63),
    onSecondaryContainer = Color.White,
    tertiary = AmberGold,
    background = DarkBg,
    onBackground = TextWhite,
    surface = DarkSurface,
    onSurface = TextWhite,
    surfaceVariant = DarkCard,
    onSurfaceVariant = TextMuted,
    outline = DarkBorder,
    outlineVariant = DarkBorderSubtle,
    error = StatusError,
    onError = Color.White
)

@Composable
fun DCCStudentPortalTheme(
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = StitchDarkColorScheme,
        typography = Typography,
        content = content
    )
}
