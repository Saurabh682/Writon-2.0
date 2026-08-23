package com.ibitvalley.writon.modern.feature.settings

import android.app.Activity
import android.content.Context
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.fragment.app.FragmentActivity
import com.ibitvalley.writon.R
import com.ibitvalley.writon.modern.core.auth.BiometricAuthManager
import com.ibitvalley.writon.modern.core.designsystem.components.WritOnBrandMark
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandRed
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnElevation
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnRadius
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnSpacing
import com.ibitvalley.writon.modern.core.locale.LocaleManager
import com.ibitvalley.writon.modern.core.preferences.UserPreferences

private val SettingsEditorialFamily = FontFamily(
    Font(R.font.source_serif_4_regular, weight = FontWeight.Normal),
    Font(R.font.source_serif_4_semibold, weight = FontWeight.SemiBold),
    Font(R.font.source_serif_4_semibold, weight = FontWeight.Bold)
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    userPreferences: UserPreferences,
    onBackClick: () -> Unit = {},
    onAppearanceClick: () -> Unit = {},
    onNotificationsClick: () -> Unit = {},
    onSavedStoriesClick: () -> Unit = {},
    onInterestsClick: () -> Unit = {},
    onSearchClick: () -> Unit = {},
    onLogOut: () -> Unit = {}
) {
    val context = LocalContext.current
    val fragmentActivity = context as? FragmentActivity

    var showAboutDialog by remember { mutableStateOf(false) }
    var showTutorialDialog by remember { mutableStateOf(false) }
    var showDeleteAccountDialog by remember { mutableStateOf(false) }
    var isDeletingAccount by remember { mutableStateOf(false) }
    var deleteAccountError by remember { mutableStateOf<String?>(null) }
    var showLanguageDialog by remember { mutableStateOf(false) }
    var showResetPasswordDialog by remember { mutableStateOf(false) }
    var isSendingResetEmail by remember { mutableStateOf(false) }
    var resetEmailSent by remember { mutableStateOf(false) }
    var resetError by remember { mutableStateOf<String?>(null) }

    val userEmail = com.google.firebase.auth.FirebaseAuth.getInstance().currentUser?.email.orEmpty()
    val isBiometricSupported = remember { BiometricAuthManager.isBiometricAvailable(context) }
    var isBiometricEnabled by remember { mutableStateOf(userPreferences.isBiometricEnabled) }

    if (showLanguageDialog) {
        var selectedCode by remember { mutableStateOf(userPreferences.appLanguage) }
        AlertDialog(
            onDismissRequest = { showLanguageDialog = false },
            title = {
                Text(
                    stringResource(R.string.settings_language_dialog_title),
                    fontFamily = SettingsEditorialFamily,
                    fontWeight = FontWeight.Bold,
                    fontSize = 20.sp
                )
            },
            text = {
                Column(
                    verticalArrangement = Arrangement.spacedBy(10.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        stringResource(R.string.settings_language_dialog_subtitle),
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Spacer(Modifier.height(4.dp))
                    LocaleManager.SupportedLanguages.forEach { lang ->
                        val isSelected = selectedCode == lang.code
                        Surface(
                            onClick = {
                                selectedCode = lang.code
                                LocaleManager.applyLanguage(context, lang.code, recreateActivity = true)
                                showLanguageDialog = false
                            },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            color = if (isSelected) BrandRed.copy(alpha = 0.12f) else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f),
                            border = if (isSelected) BorderStroke(1.5.dp, BrandRed) else BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.3f))
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 14.dp, vertical = 12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Column {
                                    Text(
                                        text = lang.nativeName,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 16.sp,
                                        color = if (isSelected) BrandRed else MaterialTheme.colorScheme.onSurface
                                    )
                                    Text(
                                        text = "${lang.name} • ${lang.subtitle}",
                                        fontSize = 12.sp,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                                if (isSelected) {
                                    Surface(
                                        shape = CircleShape,
                                        color = BrandRed,
                                        modifier = Modifier.size(22.dp)
                                    ) {
                                        Box(contentAlignment = Alignment.Center) {
                                            Text("✓", color = Color.White, fontSize = 13.sp, fontWeight = FontWeight.Bold)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { showLanguageDialog = false }) {
                    Text(stringResource(R.string.common_close))
                }
            }
        )
    }

    if (showTutorialDialog) {
        AlertDialog(
            onDismissRequest = { showTutorialDialog = false },
            title = {
                Text(
                    stringResource(R.string.settings_guide_title),
                    fontFamily = SettingsEditorialFamily,
                    fontWeight = FontWeight.Bold,
                    fontSize = 20.sp
                )
            },
            text = {
                Column(
                    verticalArrangement = Arrangement.spacedBy(14.dp),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    GuideItem("📖", "Curated Feed", "Browse thoughtful essays filtered by your favorite topics.")
                    GuideItem("🎨", "Reader Themes (Aa)", "Switch between Paper, Sepia, Dark Obsidian & adjust font sizes in reader.")
                    GuideItem("✍️", "Offline Writer Studio", "Draft stories offline with auto-save and automatic outbox sync.")
                    GuideItem("🔒", "Biometric Lock", "Secure your app with Fingerprint or Face ID in Settings.")
                }
            },
            confirmButton = {
                TextButton(onClick = { showTutorialDialog = false }) {
                    Text(stringResource(R.string.common_close))
                }
            }
        )
    }

    if (showAboutDialog) {
        AlertDialog(
            onDismissRequest = { showAboutDialog = false },
            title = {
                Text(
                    stringResource(R.string.settings_about_title),
                    fontFamily = SettingsEditorialFamily,
                    fontWeight = FontWeight.Bold,
                    fontSize = 20.sp
                )
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(stringResource(R.string.settings_about_desc, "2.0.0", 101), fontWeight = FontWeight.SemiBold)
                    Text("WritOn is a distraction-free editorial publishing & reading platform built for thoughtful writers and avid readers.", style = MaterialTheme.typography.bodyMedium)
                    Spacer(Modifier.height(4.dp))
                    Text("• Kotlin Jetpack Compose Modern Architecture", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("• Offline-First Room DB & Cloud Firestore Sync", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("• On-Device Biometric Security & Smart Analytics", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            },
            confirmButton = {
                TextButton(onClick = { showAboutDialog = false }) {
                    Text(stringResource(R.string.common_close))
                }
            }
        )
    }

    if (showResetPasswordDialog) {
        AlertDialog(
            onDismissRequest = { if (!isSendingResetEmail) showResetPasswordDialog = false },
            title = {
                Text(
                    stringResource(R.string.settings_password_security_title),
                    fontFamily = SettingsEditorialFamily,
                    fontWeight = FontWeight.Bold,
                    fontSize = 20.sp
                )
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (resetEmailSent) {
                        Text(
                            "A password reset link has been sent to $userEmail. Please check your inbox and spam folder.",
                            color = MaterialTheme.colorScheme.primary,
                            style = MaterialTheme.typography.bodyMedium
                        )
                    } else {
                        Text(
                            if (userEmail.isNotBlank())
                                stringResource(R.string.settings_password_reset_subtitle, userEmail)
                            else
                                stringResource(R.string.settings_password_reset_default),
                            style = MaterialTheme.typography.bodyMedium
                        )
                    }
                    if (resetError != null) {
                        Text(resetError.orEmpty(), color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                    }
                }
            },
            confirmButton = {
                if (resetEmailSent) {
                    TextButton(onClick = { showResetPasswordDialog = false }) {
                        Text(stringResource(R.string.common_done))
                    }
                } else {
                    Button(
                        onClick = {
                            if (userEmail.isNotBlank()) {
                                isSendingResetEmail = true
                                resetError = null
                                com.google.firebase.auth.FirebaseAuth.getInstance()
                                    .sendPasswordResetEmail(userEmail)
                                    .addOnCompleteListener { task ->
                                        isSendingResetEmail = false
                                        if (task.isSuccessful) {
                                            resetEmailSent = true
                                        } else {
                                            resetError = task.exception?.localizedMessage ?: "Failed to send reset email. Please retry."
                                        }
                                    }
                            } else {
                                resetError = "No email address found for your account."
                            }
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = BrandRed),
                        enabled = !isSendingResetEmail && userEmail.isNotBlank()
                    ) {
                        Text(if (isSendingResetEmail) "Sending..." else "Send Reset Link", color = Color.White)
                    }
                }
            },
            dismissButton = {
                if (!resetEmailSent) {
                    TextButton(onClick = { showResetPasswordDialog = false }, enabled = !isSendingResetEmail) {
                        Text(stringResource(R.string.common_cancel))
                    }
                }
            }
        )
    }

    if (showDeleteAccountDialog) {
        AlertDialog(
            onDismissRequest = { if (!isDeletingAccount) showDeleteAccountDialog = false },
            title = {
                Text(
                    stringResource(R.string.settings_delete_account_title),
                    fontFamily = SettingsEditorialFamily,
                    fontWeight = FontWeight.Bold,
                    fontSize = 20.sp,
                    color = MaterialTheme.colorScheme.error
                )
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        "Are you sure you want to delete your WritOn account? All your published stories, drafts, applauds, and profile data will be permanently removed.",
                        style = MaterialTheme.typography.bodyMedium
                    )
                    Text(
                        "This action is irreversible.",
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodySmall
                    )
                    if (deleteAccountError != null) {
                        Text(deleteAccountError.orEmpty(), color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
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
                    Text(stringResource(R.string.common_cancel))
                }
            }
        )
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(horizontal = WritOnSpacing.lg, vertical = WritOnSpacing.md),
        verticalArrangement = Arrangement.spacedBy(WritOnSpacing.lg)
    ) {
        item { SettingsHeader(onSearchClick) }
        item {
            SettingsSection(stringResource(R.string.settings_section_preferences)) {
                SettingsRow(
                    title = stringResource(R.string.settings_language),
                    subtitle = "${LocaleManager.getCurrentLanguage(context).nativeName} • ${LocaleManager.getCurrentLanguage(context).name}",
                    icon = R.drawable.ic_book_orange,
                    onClick = { showLanguageDialog = true }
                )
                SettingsRow(
                    title = stringResource(R.string.settings_theme),
                    subtitle = stringResource(R.string.settings_theme_desc),
                    icon = R.drawable.ic_sun_orange,
                    onClick = onAppearanceClick
                )
                SettingsRow(
                    title = stringResource(R.string.settings_reading_title),
                    subtitle = stringResource(R.string.settings_reading_desc),
                    icon = R.drawable.ic_book_orange,
                    onClick = onInterestsClick
                )
                SettingsRow(
                    title = stringResource(R.string.settings_notifications_title),
                    subtitle = stringResource(R.string.settings_notifications_desc),
                    icon = R.drawable.ic_notification_orange,
                    onClick = onNotificationsClick
                )
                SettingsRow(
                    title = stringResource(R.string.settings_test_notif_title),
                    subtitle = stringResource(R.string.settings_test_notif_desc),
                    icon = R.drawable.ic_notification_orange,
                    onClick = { com.ibitvalley.writon.modern.core.notification.WritOnNotificationManager.sendTestNotification(context) }
                )
                SettingsRow(
                    title = stringResource(R.string.settings_copy_token_title),
                    subtitle = stringResource(R.string.settings_copy_token_desc),
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
                SettingsRow(
                    title = stringResource(R.string.settings_applause_title),
                    subtitle = stringResource(R.string.settings_applause_desc),
                    icon = null,
                    useApplaudIcon = true,
                    enabled = false
                )
                SettingsRow(
                    title = stringResource(R.string.settings_saving_title),
                    subtitle = stringResource(R.string.settings_saving_desc),
                    icon = R.drawable.ic_bookmark_orange,
                    onClick = onSavedStoriesClick
                )
            }
        }
        item {
            SettingsSection(stringResource(R.string.settings_section_account)) {
                if (isBiometricSupported) {
                    SettingsSwitchRow(
                        title = stringResource(R.string.settings_biometric_lock_title),
                        subtitle = stringResource(R.string.settings_biometric_lock_desc),
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
                SettingsRow(
                    title = stringResource(R.string.settings_password_security_title),
                    subtitle = if (userEmail.isNotBlank()) stringResource(R.string.settings_password_reset_subtitle, userEmail) else stringResource(R.string.settings_password_reset_default),
                    icon = R.drawable.ic_shield_orange,
                    onClick = { resetEmailSent = false; resetError = null; showResetPasswordDialog = true }
                )
                SettingsRow(
                    title = stringResource(R.string.settings_delete_account_title),
                    subtitle = stringResource(R.string.settings_delete_account_desc),
                    icon = R.drawable.ic_shield_orange,
                    accent = true,
                    onClick = { showDeleteAccountDialog = true }
                )
                SettingsRow(
                    title = stringResource(R.string.settings_account_title),
                    subtitle = stringResource(R.string.settings_account_desc),
                    avatar = "AK",
                    enabled = false
                )
                SettingsRow(
                    title = stringResource(R.string.settings_privacy_title),
                    subtitle = stringResource(R.string.settings_privacy_desc),
                    icon = R.drawable.ic_shield_orange,
                    enabled = false
                )
                SettingsRow(
                    title = stringResource(R.string.settings_guide_title),
                    subtitle = stringResource(R.string.settings_guide_desc),
                    icon = R.drawable.ic_help_orange,
                    onClick = { showTutorialDialog = true }
                )
                SettingsRow(
                    title = stringResource(R.string.settings_about_title),
                    subtitle = stringResource(R.string.settings_about_desc, "2.0.0", 101),
                    icon = R.drawable.ic_info_orange,
                    onClick = { showAboutDialog = true }
                )
            }
        }
        item {
            SettingsSection(stringResource(R.string.settings_section_more)) {
                SettingsRow(
                    title = stringResource(R.string.settings_logout_title),
                    subtitle = "",
                    icon = R.drawable.ic_logout_orange,
                    accent = true,
                    onClick = onLogOut
                )
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
            IconButton(onClick = onSearchClick) {
                Image(
                    painterResource(R.drawable.ic_search),
                    contentDescription = stringResource(R.string.common_search),
                    modifier = Modifier.size(24.dp),
                    colorFilter = ColorFilter.tint(MaterialTheme.colorScheme.onBackground)
                )
            }
            IconButton(onClick = { }) {
                Image(
                    painterResource(R.drawable.ic_more_vertical),
                    contentDescription = stringResource(R.string.common_more),
                    modifier = Modifier.size(24.dp),
                    colorFilter = ColorFilter.tint(MaterialTheme.colorScheme.onBackground)
                )
            }
        }
        Spacer(Modifier.height(WritOnSpacing.lg))
        Text(
            stringResource(R.string.settings_title),
            style = MaterialTheme.typography.displayLarge.copy(fontFamily = SettingsEditorialFamily, fontSize = 36.sp, lineHeight = 42.sp)
        )
        Spacer(Modifier.height(WritOnSpacing.xs))
        Text(
            stringResource(R.string.settings_subtitle),
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
            color = MaterialTheme.colorScheme.surface,
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
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
                avatar != null -> Surface(shape = CircleShape, color = MaterialTheme.colorScheme.surfaceVariant, modifier = Modifier.size(40.dp)) {
                    Box(contentAlignment = Alignment.Center) { Text(avatar, style = MaterialTheme.typography.labelLarge) }
                }
                useApplaudIcon -> Image(painterResource(R.drawable.ic_applaud_muted), contentDescription = null, modifier = Modifier.size(26.dp))
                icon != null -> Surface(
                    shape = RoundedCornerShape(WritOnRadius.field),
                    color = BrandRed.copy(alpha = 0.12f),
                    modifier = Modifier.size(40.dp)
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Image(
                            painter = painterResource(icon),
                            contentDescription = title,
                            modifier = Modifier.size(20.dp),
                            colorFilter = ColorFilter.tint(BrandRed)
                        )
                    }
                }
            }

            Spacer(Modifier.width(WritOnSpacing.md))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleMedium.copy(fontSize = 17.sp),
                    color = color,
                    fontWeight = FontWeight.Medium
                )
                if (subtitle.isNotBlank()) {
                    Text(
                        text = subtitle,
                        style = MaterialTheme.typography.bodySmall.copy(fontSize = 13.sp),
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            if (enabled) {
                Text(
                    text = "›",
                    style = MaterialTheme.typography.headlineMedium.copy(fontSize = 24.sp),
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
        HorizontalDivider(
            color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.25f),
            modifier = Modifier.padding(start = 56.dp)
        )
    }
}

@Composable
private fun SettingsSwitchRow(
    title: String,
    subtitle: String,
    icon: Int,
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
            Surface(
                shape = RoundedCornerShape(WritOnRadius.field),
                color = BrandRed.copy(alpha = 0.12f),
                modifier = Modifier.size(40.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Image(
                        painter = painterResource(icon),
                        contentDescription = title,
                        modifier = Modifier.size(20.dp),
                        colorFilter = ColorFilter.tint(BrandRed)
                    )
                }
            }

            Spacer(Modifier.width(WritOnSpacing.md))

            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleMedium.copy(fontSize = 17.sp),
                    color = MaterialTheme.colorScheme.onSurface,
                    fontWeight = FontWeight.Medium
                )
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.bodySmall.copy(fontSize = 13.sp),
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Switch(
                checked = checked,
                onCheckedChange = onCheckedChange,
                colors = SwitchDefaults.colors(
                    checkedThumbColor = Color.White,
                    checkedTrackColor = BrandRed
                )
            )
        }
        HorizontalDivider(
            color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.25f),
            modifier = Modifier.padding(start = 56.dp)
        )
    }
}

@Composable
private fun GuideItem(emoji: String, title: String, description: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        verticalAlignment = Alignment.Top,
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        Text(emoji, fontSize = 24.sp)
        Column {
            Text(title, fontWeight = FontWeight.Bold, fontSize = 15.sp)
            Text(
                description,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}
