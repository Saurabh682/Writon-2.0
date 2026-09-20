package com.ibitvalley.writon.modern.feature.notifications

import android.content.Intent
import android.provider.Settings
import androidx.compose.foundation.selection.toggleable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.core.app.NotificationManagerCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import com.ibitvalley.writon.R
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnSpacing
import com.ibitvalley.writon.modern.core.network.WritOnApiService
import com.ibitvalley.writon.modern.core.network.model.NotificationPreferencesDto
import com.ibitvalley.writon.modern.core.network.model.NotificationPreferencesUpdateDto
import com.ibitvalley.writon.modern.core.notification.DailyDigestTopicSubscription
import com.ibitvalley.writon.modern.core.config.WritOnRemoteConfig
import com.ibitvalley.writon.modern.core.preferences.UserPreferences
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch

@Composable
fun NotificationSettingsScreen(
    apiService: WritOnApiService,
    userPreferences: UserPreferences,
    isSignedIn: Boolean,
    onBackClick: () -> Unit,
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val scope = rememberCoroutineScope()
    val loadErrorMessage = stringResource(R.string.notification_settings_load_error)
    val saveErrorMessage = stringResource(R.string.notification_settings_save_error)
    var preferences by remember { mutableStateOf<NotificationPreferencesDto?>(null) }
    var error by remember { mutableStateOf<String?>(null) }
    var loadAttempt by remember { mutableStateOf(0) }
    var isLoading by remember { mutableStateOf(false) }
    var isSaving by remember { mutableStateOf(false) }
    var guestDiscoveryEnabled by remember { mutableStateOf(userPreferences.guestDiscoveryNotificationsEnabled) }
    var systemEnabled by remember {
        mutableStateOf(NotificationManagerCompat.from(context).areNotificationsEnabled())
    }

    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                systemEnabled = NotificationManagerCompat.from(context).areNotificationsEnabled()
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    LaunchedEffect(isSignedIn, loadAttempt) {
        if (!isSignedIn) return@LaunchedEffect
        isLoading = true
        error = null
        try {
            val response = apiService.getNotificationPreferences()
            if (response.isSuccessful) preferences = response.body() ?: NotificationPreferencesDto()
            else error = loadErrorMessage
        } catch (cancelled: CancellationException) {
            throw cancelled
        } catch (_: Exception) {
            error = loadErrorMessage
        } finally {
            isLoading = false
        }
    }

    fun save(next: NotificationPreferencesDto, update: NotificationPreferencesUpdateDto) {
        if (isSaving) return
        val prior = preferences
        preferences = next
        error = null
        isSaving = true
        scope.launch {
            try {
                val response = apiService.updateNotificationPreferences(update)
                if (response.isSuccessful) preferences = response.body() ?: next
                else {
                    preferences = prior
                    error = saveErrorMessage
                }
            } catch (cancelled: CancellationException) {
                throw cancelled
            } catch (_: Exception) {
                preferences = prior
                error = saveErrorMessage
            } finally {
                isSaving = false
            }
        }
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(WritOnSpacing.lg),
        verticalArrangement = Arrangement.spacedBy(WritOnSpacing.md),
    ) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onBackClick) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = stringResource(R.string.common_back),
                    )
                }
                Spacer(Modifier.width(8.dp))
                Column {
                    Text(stringResource(R.string.notification_settings_title), style = MaterialTheme.typography.headlineMedium)
                    Text(stringResource(R.string.notification_settings_subtitle), color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
        item {
            Text(
                if (systemEnabled) stringResource(R.string.notification_settings_system_on)
                else stringResource(R.string.notification_settings_system_off),
                color = if (systemEnabled) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.error,
            )
            if (!systemEnabled) {
                Button(
                    onClick = {
                        context.startActivity(Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
                            putExtra(Settings.EXTRA_APP_PACKAGE, context.packageName)
                        })
                    },
                    modifier = Modifier.padding(top = 8.dp),
                ) { Text(stringResource(R.string.notification_settings_open_system)) }
            }
        }
        item { HorizontalDivider() }
        val value = preferences
        if (!isSignedIn) {
            item {
                Text(stringResource(R.string.notification_settings_discovery_group), style = MaterialTheme.typography.titleLarge)
                NotificationPreferenceRow(
                    stringResource(R.string.notification_settings_guest_discovery),
                    stringResource(R.string.notification_settings_guest_discovery_desc),
                    guestDiscoveryEnabled,
                ) { enabled ->
                    guestDiscoveryEnabled = enabled
                    userPreferences.guestDiscoveryNotificationsEnabled = enabled
                    DailyDigestTopicSubscription.sync(
                        context.applicationContext,
                        isSignedIn = false,
                        digestEnabled = enabled && WritOnRemoteConfig.features.value.dailyDigestNotificationEnabled,
                    )
                }
            }
        } else if (value == null && isLoading) {
            item { CircularProgressIndicator() }
        } else if (value != null) {
            item {
                Text(stringResource(R.string.notification_settings_social_group), style = MaterialTheme.typography.titleLarge)
                NotificationPreferenceRow(stringResource(R.string.notification_settings_first_applause), stringResource(R.string.notification_settings_first_applause_desc), value.firstApplauseEnabled, enabled = !isSaving) {
                    save(value.copy(firstApplauseEnabled = it), NotificationPreferencesUpdateDto(firstApplauseEnabled = it))
                }
                NotificationPreferenceRow(stringResource(R.string.notification_settings_comments_replies), stringResource(R.string.notification_settings_comments_replies_desc), value.commentsRepliesEnabled, enabled = !isSaving) {
                    save(value.copy(commentsRepliesEnabled = it), NotificationPreferencesUpdateDto(commentsRepliesEnabled = it))
                }
                NotificationPreferenceRow(stringResource(R.string.notification_settings_new_followers), stringResource(R.string.notification_settings_new_followers_desc), value.newFollowersEnabled, enabled = !isSaving) {
                    save(value.copy(newFollowersEnabled = it), NotificationPreferencesUpdateDto(newFollowersEnabled = it))
                }
                NotificationPreferenceRow(stringResource(R.string.notification_settings_followed_writer_published), stringResource(R.string.notification_settings_followed_writer_published_desc), value.followedWriterPublishedEnabled, enabled = !isSaving) {
                    save(value.copy(followedWriterPublishedEnabled = it), NotificationPreferencesUpdateDto(followedWriterPublishedEnabled = it))
                }
            }
            item {
                Text(stringResource(R.string.notification_settings_discovery_group), style = MaterialTheme.typography.titleLarge)
                NotificationPreferenceRow(stringResource(R.string.notification_settings_reading_nudges), stringResource(R.string.notification_settings_reading_nudges_desc), value.readingNudgesEnabled, enabled = !isSaving) {
                    save(value.copy(readingNudgesEnabled = it), NotificationPreferencesUpdateDto(readingNudgesEnabled = it))
                }
                NotificationPreferenceRow(stringResource(R.string.notification_settings_draft_nudges), stringResource(R.string.notification_settings_draft_nudges_desc), value.draftNudgesEnabled, enabled = !isSaving) {
                    save(value.copy(draftNudgesEnabled = it), NotificationPreferencesUpdateDto(draftNudgesEnabled = it))
                }
                NotificationPreferenceRow(stringResource(R.string.notification_settings_weekly_prompt), stringResource(R.string.notification_settings_weekly_prompt_desc), value.weeklyPromptEnabled, enabled = !isSaving) {
                    save(value.copy(weeklyPromptEnabled = it), NotificationPreferencesUpdateDto(weeklyPromptEnabled = it))
                }
                NotificationPreferenceRow(stringResource(R.string.notification_settings_daily_digest), stringResource(R.string.notification_settings_daily_digest_desc), value.dailyDigestEnabled, enabled = !isSaving) {
                    save(value.copy(dailyDigestEnabled = it), NotificationPreferencesUpdateDto(dailyDigestEnabled = it))
                }
            }
        }
        if (isSaving) {
            item { Text(stringResource(R.string.interests_saving), color = MaterialTheme.colorScheme.onSurfaceVariant) }
        }
        error?.let { message ->
            item {
                Column {
                    Text(message, color = MaterialTheme.colorScheme.error)
                    if (isSignedIn && preferences == null) {
                        Button(
                            onClick = { loadAttempt += 1 },
                            modifier = Modifier.padding(top = 8.dp),
                        ) { Text(stringResource(R.string.common_retry)) }
                    }
                }
            }
        }
    }
}

@Composable
private fun NotificationPreferenceRow(
    title: String,
    description: String,
    checked: Boolean,
    enabled: Boolean = true,
    onCheckedChange: (Boolean) -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .toggleable(
                value = checked,
                enabled = enabled,
                role = Role.Switch,
                onValueChange = onCheckedChange,
            )
            .padding(vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Text(title, style = MaterialTheme.typography.titleMedium)
            Text(description, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
        Switch(checked = checked, onCheckedChange = null, enabled = enabled)
    }
}
