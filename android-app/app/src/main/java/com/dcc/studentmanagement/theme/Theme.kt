package com.dcc.studentmanagement.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val ColorfulDarkColorScheme = darkColorScheme(
    primary = BrandPrimary,
    onPrimary = Color.White,
    primaryContainer = Color(0xFF4338CA),
    onPrimaryContainer = Color.White,
    secondary = EmeraldGreen,
    onSecondary = Color.White,
    secondaryContainer = Color(0xFF065F46),
    onSecondaryContainer = Color.White,
    tertiary = CyanNeon,
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
        colorScheme = ColorfulDarkColorScheme,
        typography = Typography,
        content = content
    )
}
