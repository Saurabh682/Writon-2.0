package com.ibitvalley.writon.modern.feature.settings

import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ibitvalley.writon.R
import com.ibitvalley.writon.modern.core.designsystem.components.WritOnBrandMark
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandBeige
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandRed
import com.ibitvalley.writon.modern.core.designsystem.theme.SurfacePaper
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnElevation
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnRadius
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnSpacing
import com.ibitvalley.writon.modern.core.auth.BiometricAuthManager
import com.ibitvalley.writon.modern.core.preferences.UserPreferences

private val SettingsEditorialFamily = FontFamily(
    Font(R.font.source_serif_4_regular, weight = FontWeight.Normal),
    Font(R.font.source_serif_4_semibold, weight = FontWeight.SemiBold),
    Font(R.font.source_serif_4_semibold, weight = FontWeight.Bold)
)

@Composable
fun SettingsScreen(
    userPreferences: UserPreferences = UserPreferences(androidx.compose.ui.platform.LocalContext.current),
    onBackClick: () -> Unit,
    onAppearanceClick: () -> Unit = {},
    onInterestsClick: () -> Unit,
    onSearchClick: () -> Unit = {},
    onNotificationsClick: () -> Unit = {},
    onSavedStoriesClick: () -> Unit = {},
    onLogOut: () -> Unit = {}
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val fragmentActivity = context as? androidx.fragment.app.FragmentActivity
    val isBiometricSupported = remember { BiometricAuthManager.isBiometricAvailable(context) }
    var isBiometricEnabled by remember { mutableStateOf(userPreferences.isBiometricEnabled) }

    var showAboutDialog by remember { mutableStateOf(false) }

    var showResetPasswordDialog by remember { mutableStateOf(false) }
    var resetEmailSent by remember { mutableStateOf(false) }
    var isSendingReset by remember { mutableStateOf(false) }
    var resetError by remember { mutableStateOf<String?>(null) }

    var showDeleteAccountDialog by remember { mutableStateOf(false) }
    var isDeletingAccount by remember { mutableStateOf(false) }
    var deleteAccountError by remember { mutableStateOf<String?>(null) }
    val userEmail = com.google.firebase.auth.FirebaseAuth.getInstance().currentUser?.email.orEmpty()

    if (showAboutDialog) {
        AlertDialog(
            onDismissRequest = { showAboutDialog = false },
            title = { Text("About WritOn", fontFamily = SettingsEditorialFamily) },
            text = { Text("WritOn 2.0.0\nA calm place to read, write, and support thoughtful stories.") },
            confirmButton = {
                TextButton(onClick = { showAboutDialog = false }) { Text("Close", color = BrandRed) }
            }
        )
    }

    if (showResetPasswordDialog) {
        AlertDialog(
            onDismissRequest = {
                if (!isSendingReset) showResetPasswordDialog = false
            },
            title = { Text("Password & Security", fontFamily = SettingsEditorialFamily, fontWeight = FontWeight.Bold) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    if (!resetEmailSent) {
                        Text(
                            "We will send a password reset link to your registered email address ($userEmail).",
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color(0xFF6D6963)
                        )
                    } else {
                        Text(
                            "Password reset link sent to $userEmail! Please check your inbox and spam folder to set a new password.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = Color(0xFF2E7D32),
                            fontWeight = FontWeight.Medium
                        )
                    }
                    resetError?.let { err ->
                        Text(err, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                    }
                }
            },
            confirmButton = {
                if (!resetEmailSent) {
                    Button(
                        onClick = {
                            isSendingReset = true
                            resetError = null
                            com.ibitvalley.writon.modern.core.auth.FirebaseAuthManager.sendPasswordReset(
                                email = userEmail,
                                onSuccess = {
                                    isSendingReset = false
                                    resetEmailSent = true
                                },
                                onError = { msg ->
                                    isSendingReset = false
                                    resetError = msg
                                }
                            )
                        },
                        enabled = !isSendingReset && userEmail.isNotBlank(),
                        colors = ButtonDefaults.buttonColors(containerColor = BrandRed)
                    ) {
                        if (isSendingReset) {
                            CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.White, strokeWidth = 2.dp)
                            Spacer(Modifier.width(8.dp))
                        }
                        Text(if (isSendingReset) "Sending…" else "Send Reset Email")
                    }
                } else {
                    Button(
                        onClick = { showResetPasswordDialog = false },
                        colors = ButtonDefaults.buttonColors(containerColor = BrandRed)
                    ) {
                        Text("Done")
                    }
                }
            },
            dismissButton = {
                if (!resetEmailSent) {
                    TextButton(onClick = { showResetPasswordDialog = false }, enabled = !isSendingReset) {
                        Text("Cancel", color = Color(0xFF6D6963))
                    }
                }
            }
        )
    }

    if (showDeleteAccountDialog) {
        AlertDialog(
            onDismissRequest = { if (!isDeletingAccount) showDeleteAccountDialog = false },
            title = { Text("Delete Account & Data", fontFamily = SettingsEditorialFamily, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.error) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        "Are you sure you want to permanently delete your WritOn account? All your stories, drafts, comments, and profile data will be permanently removed.",
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Text(
                        "This action cannot be undone.",
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.error
                    )
                    deleteAccountError?.let { err ->
                        Text(err, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                    }
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        isDeletingAccount = true
                        deleteAccountError = null
                        val user = com.google.firebase.auth.FirebaseAuth.getInstance().currentUser
                        user?.delete()?.addOnCompleteListener { task ->
                            isDeletingAccount = false
                            if (task.isSuccessful) {
                                showDeleteAccountDialog = false
                                onLogOut()
                            } else {
                                deleteAccountError = task.exception?.localizedMessage ?: "Could not delete account. Please log in again and retry."
                            }
                        }
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                    enabled = !isDeletingAccount
                ) {
                    Text(if (isDeletingAccount) "Deleting..." else "Delete Permanently", color = Color.White)
                }
            },
            dismissButton = {
                TextButton(
                    onClick = { showDeleteAccountDialog = false },
                    enabled = !isDeletingAccount
                ) {
                    Text("Cancel")
                }
            }
        )
    }

    val context = androidx.compose.ui.platform.LocalContext.current

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = WritOnSpacing.lg, vertical = WritOnSpacing.md),
        verticalArrangement = Arrangement.spacedBy(WritOnSpacing.lg)
    ) {
        item { SettingsHeader(onSearchClick) }
        item {
            SettingsSection("PREFERENCES") {
                SettingsRow("Appearance", "Theme, font size, line height", R.drawable.ic_sun_orange, onClick = onAppearanceClick)
                SettingsRow("Reading", "Choose your reading interests", R.drawable.ic_book_orange, onClick = onInterestsClick)
                SettingsRow("Notifications", "View activity and reminders", R.drawable.ic_notification_orange, onClick = onNotificationsClick)
                SettingsRow("Test Notification", "Send a sample rich interaction notification", R.drawable.ic_notification_orange, onClick = { com.ibitvalley.writon.modern.core.notification.WritOnNotificationManager.sendTestNotification(context) })
                SettingsRow(
                    title = "Copy Push Token",
                    subtitle = "Copy this device's token to paste in Firebase Console",
                    icon = R.drawable.ic_notification_orange,
                    onClick = {
                        com.google.firebase.messaging.FirebaseMessaging.getInstance().token
                            .addOnSuccessListener { token ->
                                val clipboard = context.getSystemService(android.content.Context.CLIPBOARD_SERVICE) as android.content.ClipboardManager
                                val clip = android.content.ClipData.newPlainText("FCM Token", token)
                                clipboard.setPrimaryClip(clip)
                                android.widget.Toast.makeText(context, "FCM Token copied to clipboard!", android.widget.Toast.LENGTH_LONG).show()
                            }
                            .addOnFailureListener {
                                android.widget.Toast.makeText(context, "Failed to get token: ${it.message}", android.widget.Toast.LENGTH_SHORT).show()
                            }
                    }
                )
                SettingsRow("Applause", "Vibration and effects", icon = null, useApplaudIcon = true, enabled = false)
                SettingsRow("Saving & Downloads", "View saved stories and offline cache", R.drawable.ic_bookmark_orange, onClick = onSavedStoriesClick)
            }
        }
        item {
            SettingsSection("ACCOUNT") {
                if (isBiometricSupported) {
                    SettingsSwitchRow(
                        title = "Biometric App Lock",
                        subtitle = "Require fingerprint or face ID to open WritOn",
                        icon = R.drawable.ic_shield_orange,
                        checked = isBiometricEnabled,
                        onCheckedChange = { enable ->
                            if (enable) {
                                if (fragmentActivity != null) {
                                    BiometricAuthManager.promptBiometric(
                                        activity = fragmentActivity,
                                        title = "Enable Biometric Lock",
                                        subtitle = "Confirm your fingerprint or face to enable App Lock",
                                        onSuccess = {
                                            userPreferences.isBiometricEnabled = true
                                            isBiometricEnabled = true
                                            android.widget.Toast.makeText(context, "Biometric App Lock enabled!", android.widget.Toast.LENGTH_SHORT).show()
                                        },
                                        onError = { msg ->
                                            android.widget.Toast.makeText(context, msg, android.widget.Toast.LENGTH_SHORT).show()
                                        }
                                    )
                                } else {
                                    userPreferences.isBiometricEnabled = true
                                    isBiometricEnabled = true
                                }
                            } else {
                                userPreferences.isBiometricEnabled = false
                                isBiometricEnabled = false
                                android.widget.Toast.makeText(context, "Biometric lock disabled.", android.widget.Toast.LENGTH_SHORT).show()
                            }
                        }
                    )
                }
                SettingsRow("Password & Security", if (userEmail.isNotBlank()) "Send password reset link to $userEmail" else "Reset your password", R.drawable.ic_shield_orange, onClick = { resetEmailSent = false; resetError = null; showResetPasswordDialog = true })
                SettingsRow("Delete Account & Data", "Permanently remove your account and stories", R.drawable.ic_shield_orange, accent = true, onClick = { showDeleteAccountDialog = true })
                SettingsRow("Account", "Profile editing", avatar = "AK", enabled = false)
                SettingsRow("Privacy", "Privacy controls", R.drawable.ic_shield_orange, enabled = false)
                SettingsRow("Help & Support", "FAQs and contact us", R.drawable.ic_help_orange, enabled = false)
                SettingsRow("About WritOn", "Version 2.0.0", R.drawable.ic_info_orange, onClick = { showAboutDialog = true })
            }
        }
        item {
            SettingsSection("MORE") {
                SettingsRow("Log out", "", R.drawable.ic_logout_orange, accent = true, onClick = onLogOut)
            }
        }
    }
}

@Composable
private fun SettingsHeader(onSearchClick: () -> Unit) {
    Column {
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            WritOnBrandMark(width = 108.dp)
            Spacer(Modifier.weight(1f))
            IconButton(onClick = onSearchClick) { Image(painterResource(R.drawable.ic_search), contentDescription = "Search", modifier = Modifier.size(24.dp)) }
            IconButton(onClick = { }) { Image(painterResource(R.drawable.ic_more_vertical), contentDescription = "More settings options", modifier = Modifier.size(24.dp)) }
        }
        Spacer(Modifier.height(WritOnSpacing.lg))
        Text(
            "Settings",
            style = MaterialTheme.typography.displayLarge.copy(fontFamily = SettingsEditorialFamily, fontSize = 36.sp, lineHeight = 42.sp)
        )
        Spacer(Modifier.height(WritOnSpacing.xs))
        Text(
            "Personalize your experience.",
            style = MaterialTheme.typography.bodyLarge.copy(fontFamily = SettingsEditorialFamily, fontSize = 16.sp, lineHeight = 22.sp),
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(Modifier.height(WritOnSpacing.md))
        Surface(color = BrandRed, shape = CircleShape, modifier = Modifier.width(72.dp).height(4.dp)) { }
    }
}

@Composable
private fun SettingsSection(title: String, content: @Composable ColumnScope.() -> Unit) {
    Column {
        Text(
            title,
            style = MaterialTheme.typography.labelLarge.copy(letterSpacing = 1.1.sp),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(bottom = WritOnSpacing.sm)
        )
        Surface(
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(WritOnRadius.card),
            color = SurfacePaper,
            tonalElevation = WritOnElevation.flat,
            shadowElevation = WritOnElevation.raised
        ) {
            Column(content = content)
        }
    }
}

@Composable
private fun SettingsRow(
    title: String,
    subtitle: String,
    icon: Int? = null,
    useApplaudIcon: Boolean = false,
    avatar: String? = null,
    accent: Boolean = false,
    enabled: Boolean = true,
    onClick: () -> Unit = {}
) {
    val color = when {
        !enabled -> MaterialTheme.colorScheme.onSurfaceVariant
        accent -> BrandRed
        else -> MaterialTheme.colorScheme.onSurface
    }
    Column {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(WritOnRadius.field))
                .clickable(enabled = enabled, onClick = onClick)
                .padding(horizontal = WritOnSpacing.md, vertical = WritOnSpacing.xs),
            verticalAlignment = Alignment.CenterVertically
        ) {
            when {
                avatar != null -> Surface(shape = CircleShape, color = BrandBeige, modifier = Modifier.size(40.dp)) {
                    Box(contentAlignment = Alignment.Center) { Text(avatar, style = MaterialTheme.typography.labelLarge) }
                }
                useApplaudIcon -> Image(painterResource(R.drawable.ic_applaud_muted), contentDescription = null, modifier = Modifier.size(26.dp))
                icon != null -> Image(painterResource(icon), contentDescription = null, modifier = Modifier.size(26.dp))
            }
            Spacer(Modifier.width(WritOnSpacing.md))
            Column(Modifier.weight(1f)) {
                Text(title, style = MaterialTheme.typography.titleLarge.copy(fontSize = 17.sp, lineHeight = 22.sp), color = color)
                if (subtitle.isNotBlank() || !enabled) {
                    Spacer(Modifier.height(WritOnSpacing.xxs))
                    Text(
                        if (enabled) subtitle else "$subtitle · Coming soon",
                        style = MaterialTheme.typography.bodyMedium.copy(fontSize = 13.sp, lineHeight = 17.sp),
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
            if (enabled) {
                Image(painterResource(R.drawable.ic_chevron_right_muted), contentDescription = null, modifier = Modifier.size(20.dp))
            }
        }
        HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.55f), modifier = Modifier.padding(horizontal = WritOnSpacing.md))
    }
}

@Composable
private fun SettingsSwitchRow(
    title: String,
    subtitle: String,
    icon: Int? = null,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    Column {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = WritOnSpacing.md, vertical = WritOnSpacing.xs),
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (icon != null) {
                Image(painterResource(icon), contentDescription = null, modifier = Modifier.size(26.dp))
                Spacer(Modifier.width(WritOnSpacing.md))
            }
            Column(Modifier.weight(1f)) {
                Text(title, style = MaterialTheme.typography.titleLarge.copy(fontSize = 17.sp, lineHeight = 22.sp), color = MaterialTheme.colorScheme.onSurface)
                if (subtitle.isNotBlank()) {
                    Spacer(Modifier.height(WritOnSpacing.xxs))
                    Text(subtitle, style = MaterialTheme.typography.bodyMedium.copy(fontSize = 13.sp, lineHeight = 17.sp), color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
            Switch(
                checked = checked,
                onCheckedChange = onCheckedChange,
                colors = SwitchDefaults.colors(
                    checkedThumbColor = Color.White,
                    checkedTrackColor = BrandRed,
                    uncheckedThumbColor = Color.White,
                    uncheckedTrackColor = MaterialTheme.colorScheme.outlineVariant
                )
            )
        }
        HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.55f), modifier = Modifier.padding(horizontal = WritOnSpacing.md))
    }
}

