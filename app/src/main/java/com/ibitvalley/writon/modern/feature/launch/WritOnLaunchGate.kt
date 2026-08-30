package com.ibitvalley.writon.modern.feature.launch

import android.content.Intent
import android.content.Context
import android.app.Activity
import android.net.Uri
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.size
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.ibitvalley.writon.BuildConfig
import com.ibitvalley.writon.R
import com.ibitvalley.writon.modern.core.designsystem.components.WritOnBrandMark
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandRed
import com.ibitvalley.writon.modern.core.network.model.AppVersionResponseDto
import com.ibitvalley.writon.modern.core.preferences.CachedAppVersion
import com.ibitvalley.writon.modern.core.preferences.UserPreferences
import com.ibitvalley.writon.modern.core.telemetry.WritOnTelemetry
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull

data class AppUpdatePrompt(val url: String, val required: Boolean = true)

internal fun requiredAppUpdatePrompt(
    installedVersionCode: Int,
    remoteVersion: AppVersionResponseDto?
): AppUpdatePrompt? = remoteVersion
    ?.takeIf { installedVersionCode < it.minSupportedVersionCode }
    ?.let { AppUpdatePrompt(url = it.updateUrl) }

/** Brief, offline-safe version check wrapped in WritOn's paper editorial opening. */
@Composable
fun WritOnLaunchGate(
    userPreferences: UserPreferences,
    loadRemoteVersion: suspend () -> AppVersionResponseDto?,
    onReady: (AppUpdatePrompt?) -> Unit
) {
    val context = LocalContext.current

    LaunchedEffect(Unit) {
        val startedAt = System.currentTimeMillis()
        val remote = optionalNetworkRequest {
            WritOnTelemetry.trace("version_manifest_check") {
                loadRemoteVersion()
            }
        }
        val version = remote?.let {
            CachedAppVersion(it.latestVersionCode, it.minSupportedVersionCode, it.updateUrl, System.currentTimeMillis())
                .also(userPreferences::saveAppVersion)
        } ?: userPreferences.cachedAppVersion

        // Optional releases never interrupt launch. A stale cached policy must
        // also never lock a reader out while offline, so only a fresh response
        // may enforce the minimum supported version.
        val prompt = requiredAppUpdatePrompt(BuildConfig.VERSION_CODE, remote)
        WritOnTelemetry.versionCheck(
            context = context,
            source = if (remote == null) "cache" else "network",
            updateRequired = prompt?.required == true
        )
        delay((850L - (System.currentTimeMillis() - startedAt)).coerceAtLeast(0L))
        onReady(prompt)
    }

    LaunchArtwork()
}

@Composable
fun WritOnAppUpdateDialog(prompt: AppUpdatePrompt, onDismiss: () -> Unit) {
    val context = LocalContext.current
    AlertDialog(
            onDismissRequest = {},
            title = { Text("Update required") },
            text = { Text("This version is no longer supported. Update WritOn to continue safely.") },
            confirmButton = {
                TextButton(onClick = {
                    context.startActivitySafely(Intent(Intent.ACTION_VIEW, Uri.parse(prompt.url)))
                }) {
                    Text("Update")
                }
            },
            dismissButton = null
        )
}

internal suspend fun <T> optionalNetworkRequest(
    timeoutMillis: Long = 1_800L,
    request: suspend () -> T?
): T? = try {
    withTimeoutOrNull(timeoutMillis) {
        withContext(Dispatchers.IO) { request() }
    }
} catch (cancelled: CancellationException) {
    throw cancelled
} catch (_: Exception) {
    null
}

internal fun Context.startActivitySafely(intent: Intent) {
    if (this !is Activity) intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    startActivity(intent)
}

@Composable
private fun LaunchArtwork() {
    val motion = rememberInfiniteTransition(label = "launch-feather")
    val featherOffset by motion.animateFloat(
        initialValue = -5f,
        targetValue = 7f,
        animationSpec = infiniteRepeatable(tween(1_700), RepeatMode.Reverse),
        label = "feather-offset"
    )
    Box(Modifier.fillMaxSize().background(MaterialTheme.colorScheme.background), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
            Image(
                painter = painterResource(R.drawable.welcome_feather),
                contentDescription = null,
                modifier = Modifier.size(104.dp).offset(y = featherOffset.dp).graphicsLayer(alpha = 0.92f)
            )
            Spacer(Modifier.height(18.dp))
            WritOnBrandMark(width = 170.dp)
            Spacer(Modifier.height(14.dp))
            Text("Words that stay.", style = MaterialTheme.typography.bodyLarge.copy(fontWeight = FontWeight.Medium), color = BrandRed)
        }
    }
}
