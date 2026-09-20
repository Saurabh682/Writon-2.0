package com.ibitvalley.writon.modern.core.notification

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import androidx.core.app.NotificationManagerCompat
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.messaging.FirebaseMessaging
import com.ibitvalley.writon.BuildConfig
import com.ibitvalley.writon.modern.core.network.NetworkClient
import com.ibitvalley.writon.modern.core.network.model.PushTokenRegistrationRequestDto
import com.ibitvalley.writon.modern.core.network.model.PushTokenRevocationRequestDto
import com.ibitvalley.writon.modern.core.telemetry.WritOnTelemetry
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.tasks.await
import java.security.MessageDigest
import java.util.UUID
import java.util.concurrent.TimeUnit

internal class PushRegistrationDeferredException : IllegalStateException(
    "Notification registration is waiting for an authenticated Firebase token."
)

internal fun shouldReportPushRegistrationFailure(error: Throwable): Boolean =
    error !is PushRegistrationDeferredException

internal fun shouldRefreshPushRegistration(
    savedFingerprint: String?,
    savedAtMillis: Long,
    currentFingerprint: String,
    nowMillis: Long
): Boolean = savedFingerprint != currentFingerprint ||
    savedAtMillis <= 0L ||
    nowMillis < savedAtMillis ||
    nowMillis - savedAtMillis >= TimeUnit.DAYS.toMillis(1)

/** Registers one installation, never a user secret, with the authenticated WritOn profile. */
object PushNotificationRegistration {
    private const val UNIQUE_SYNC_WORK = "writon-push-token-sync"
    private const val INSTALLATION_PREFS = "writon_installation"
    private const val INSTALLATION_ID = "id"
    private const val REGISTRATION_FINGERPRINT = "push_registration_fingerprint"
    private const val REGISTRATION_TIMESTAMP = "push_registration_timestamp"
    private val syncMutex = Mutex()

    private fun installationId(context: Context): String {
        val preferences = context.getSharedPreferences(INSTALLATION_PREFS, Context.MODE_PRIVATE)
        return preferences.getString(INSTALLATION_ID, null) ?: UUID.randomUUID().toString().also {
            preferences.edit().putString(INSTALLATION_ID, it).apply()
        }
    }

    fun enqueue(context: Context) {
        val request = OneTimeWorkRequestBuilder<PushTokenSyncWorker>()
            .setConstraints(
                Constraints.Builder()
                    .setRequiredNetworkType(NetworkType.CONNECTED)
                    .build()
            )
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 10, TimeUnit.SECONDS)
            .build()
        WorkManager.getInstance(context.applicationContext).enqueueUniqueWork(
            UNIQUE_SYNC_WORK,
            ExistingWorkPolicy.KEEP,
            request
        )
    }

    suspend fun syncCurrentDevice(context: Context, suppliedToken: String? = null): Result<Unit> {
        var registrationSent = false
        return runCatching {
            syncMutex.withLock {
                val currentUser = FirebaseAuth.getInstance().currentUser
                val signedIn = currentUser != null
                val authToken = currentUser?.getIdToken(false)?.await()?.token
                if (signedIn && authToken.isNullOrBlank()) throw PushRegistrationDeferredException()
                val pushToken = suppliedToken ?: FirebaseMessaging.getInstance().token.await()
                val localInstallationId = installationId(context)
                val runtimePermissionGranted = android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.TIRAMISU ||
                    ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
                val notificationsEnabled = runtimePermissionGranted &&
                    NotificationManagerCompat.from(context).areNotificationsEnabled()
                val permission = if (notificationsEnabled) "granted" else "denied"
                val fingerprint = MessageDigest.getInstance("SHA-256")
                    .digest("${currentUser?.uid ?: "guest"}|$pushToken|$permission|${BuildConfig.VERSION_CODE}".toByteArray())
                    .joinToString("") { "%02x".format(it) }
                val preferences = context.getSharedPreferences(INSTALLATION_PREFS, Context.MODE_PRIVATE)
                val now = System.currentTimeMillis()
                if (!shouldRefreshPushRegistration(
                        preferences.getString(REGISTRATION_FINGERPRINT, null),
                        preferences.getLong(REGISTRATION_TIMESTAMP, 0L),
                        fingerprint,
                        now
                    )
                ) return@withLock
                val request = PushTokenRegistrationRequestDto(
                    token = pushToken,
                    appVersionCode = BuildConfig.VERSION_CODE,
                    notificationPermission = permission,
                    installationId = localInstallationId
                )
                WritOnTelemetry.trace("push_token_registration") {
                    NetworkClient.setAuthToken(authToken)
                    val response = if (signedIn) NetworkClient.apiService.registerPushToken(request)
                        else NetworkClient.apiService.registerGuestPushToken(request)
                    if (!signedIn && response.code() == 404) throw PushRegistrationDeferredException()
                    check(response.isSuccessful) { "WritOn could not register this device (${response.code()})." }
                }
                preferences.edit()
                    .putString(REGISTRATION_FINGERPRINT, fingerprint)
                    .putLong(REGISTRATION_TIMESTAMP, now)
                    .apply()
                registrationSent = true
            }
        }.onSuccess {
            if (registrationSent) WritOnTelemetry.pushRegistration(context, true)
        }.onFailure { error ->
            if (shouldReportPushRegistrationFailure(error)) {
                WritOnTelemetry.pushRegistration(context, false)
                WritOnTelemetry.recordNonFatal("push_token_registration", error)
            }
        }
    }

    suspend fun unregisterCurrentDevice(context: Context): Result<Unit> {
        val messaging = FirebaseMessaging.getInstance()
        val serverResult = runCatching {
            val currentUser = FirebaseAuth.getInstance().currentUser
            val signedIn = currentUser != null
            val authToken = currentUser?.getIdToken(false)?.await()?.token
            if (signedIn && authToken.isNullOrBlank()) throw PushRegistrationDeferredException()
            NetworkClient.setAuthToken(authToken)
            val pushToken = messaging.token.await()
            val request = PushTokenRevocationRequestDto(pushToken, installationId(context))
            val response = if (signedIn) NetworkClient.apiService.revokePushToken(request)
                else NetworkClient.apiService.revokeGuestPushToken(request)
            if (!signedIn && response.code() == 404) throw PushRegistrationDeferredException()
            check(response.isSuccessful) { "WritOn could not revoke this device (${response.code()})." }
        }
        val localResult = runCatching { messaging.deleteToken().await() }
        if (localResult.isSuccess) {
            context.getSharedPreferences(INSTALLATION_PREFS, Context.MODE_PRIVATE).edit()
                .remove(REGISTRATION_FINGERPRINT)
                .remove(REGISTRATION_TIMESTAMP)
                .apply()
        }
        return when {
            serverResult.isFailure && shouldReportPushRegistrationFailure(serverResult.exceptionOrNull()!!) -> {
                val error = serverResult.exceptionOrNull()!!
                WritOnTelemetry.recordNonFatal("push_token_revocation", error)
                Result.failure(error)
            }
            localResult.isFailure -> Result.failure(localResult.exceptionOrNull()!!)
            else -> Result.success(Unit)
        }
    }
}

class PushTokenSyncWorker(
    context: Context,
    workerParameters: WorkerParameters
) : CoroutineWorker(context, workerParameters) {
    override suspend fun doWork(): Result {
        val outcome = PushNotificationRegistration.syncCurrentDevice(applicationContext)
        return outcome.fold(
            onSuccess = { Result.success() },
            onFailure = { error ->
                if (shouldReportPushRegistrationFailure(error)) Result.retry() else Result.success()
            }
        )
    }
}
