package com.ibitvalley.writon.modern.core.notification

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.messaging.FirebaseMessaging
import com.ibitvalley.writon.BuildConfig
import com.ibitvalley.writon.modern.core.auth.FirebaseAuthManager
import com.ibitvalley.writon.modern.core.network.NetworkClient
import com.ibitvalley.writon.modern.core.network.model.PushTokenRegistrationRequestDto
import com.ibitvalley.writon.modern.core.telemetry.WritOnTelemetry
import kotlinx.coroutines.tasks.await

internal class PushRegistrationDeferredException : IllegalStateException(
    "Notification registration is waiting for an authenticated Firebase token."
)

internal fun shouldReportPushRegistrationFailure(error: Throwable): Boolean =
    error !is PushRegistrationDeferredException

/** Registers one installation, never a user secret, with the authenticated WritOn profile. */
object PushNotificationRegistration {
    suspend fun syncCurrentDevice(context: Context, suppliedToken: String? = null): Result<Unit> = runCatching {
        if (FirebaseAuth.getInstance().currentUser == null) return@runCatching
        WritOnTelemetry.trace("push_token_registration") {
            val hasToken = FirebaseAuthManager.getFreshTokenBlocking()
            if (hasToken.isNullOrBlank()) throw PushRegistrationDeferredException()
            NetworkClient.setAuthToken(hasToken)
            val pushToken = suppliedToken ?: FirebaseMessaging.getInstance().token.await()
            val permission = if (android.os.Build.VERSION.SDK_INT < android.os.Build.VERSION_CODES.TIRAMISU ||
                ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED
            ) "granted" else "denied"
            val response = NetworkClient.apiService.registerPushToken(
                PushTokenRegistrationRequestDto(
                    token = pushToken,
                    appVersionCode = BuildConfig.VERSION_CODE,
                    notificationPermission = permission
                )
            )
            check(response.isSuccessful) { "WritOn could not register this device (${response.code()})." }
        }
    }.onSuccess {
        WritOnTelemetry.pushRegistration(context, true)
    }.onFailure { error ->
        WritOnTelemetry.pushRegistration(context, false)
        if (shouldReportPushRegistrationFailure(error)) {
            WritOnTelemetry.recordNonFatal("push_token_registration", error)
        }
    }
}
