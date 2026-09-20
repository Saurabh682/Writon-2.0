package com.ibitvalley.writon.modern.core.auth

import com.google.firebase.FirebaseApp
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import com.google.firebase.auth.GoogleAuthProvider
import com.ibitvalley.writon.modern.core.network.NetworkClient
import com.ibitvalley.writon.modern.core.notification.DailyDigestTopicSubscription
import com.ibitvalley.writon.modern.core.notification.PushNotificationRegistration
import com.ibitvalley.writon.modern.core.preferences.UserPreferences
import com.ibitvalley.writon.modern.core.telemetry.WritOnTelemetry
import com.ibitvalley.writon.modern.core.config.WritOnRemoteConfig

object FirebaseAuthManager {
    private val auth: FirebaseAuth
        get() = FirebaseAuth.getInstance()

    private fun getGrowthTracker() = runCatching {
        UserPreferences(FirebaseApp.getInstance().applicationContext).growthTracker
    }.getOrNull()

    fun signIn(
        email: String,
        password: String,
        onSuccess: (FirebaseUser) -> Unit,
        onError: (String) -> Unit
    ) {
        auth.signInWithEmailAndPassword(email.trim(), password)
            .addOnSuccessListener { result ->
                result.user?.let {
                    WritOnTelemetry.authOutcome("password", true)
                    WritOnTelemetry.logLogin("password")
                    WritOnTelemetry.setUserId(FirebaseApp.getInstance().applicationContext, it.uid)
                    syncAuthenticatedNotifications()
                    getGrowthTracker()?.recordFailureResolved("auth_failure")
                    onSuccess(it)
                } ?: run {
                    WritOnTelemetry.authOutcome("password", false)
                    getGrowthTracker()?.recordUserVisibleFailure("auth_failure")
                    onError("Could not retrieve the signed-in user.")
                }
            }
            .addOnFailureListener { error ->
                WritOnTelemetry.authOutcome("password", false)
                getGrowthTracker()?.recordUserVisibleFailure("auth_failure")
                if (AuthFailurePolicy.shouldReportNonFatal(error)) {
                    WritOnTelemetry.recordNonFatal("password_sign_in", error)
                }
                onError(AuthFailurePolicy.userMessage(error, "Sign-in failed."))
            }
    }

    fun createAccount(
        email: String,
        password: String,
        onSuccess: (FirebaseUser) -> Unit,
        onError: (String) -> Unit
    ) {
        auth.createUserWithEmailAndPassword(email.trim(), password)
            .addOnSuccessListener { result ->
                result.user?.let {
                    WritOnTelemetry.authOutcome("password", true)
                    WritOnTelemetry.logSignUp("password")
                    WritOnTelemetry.setUserId(FirebaseApp.getInstance().applicationContext, it.uid)
                    syncAuthenticatedNotifications()
                    getGrowthTracker()?.recordFailureResolved("auth_failure")
                    onSuccess(it)
                } ?: run {
                    WritOnTelemetry.authOutcome("password", false)
                    getGrowthTracker()?.recordUserVisibleFailure("auth_failure")
                    onError("Could not retrieve the new user.")
                }
            }
            .addOnFailureListener { error ->
                WritOnTelemetry.authOutcome("password", false)
                getGrowthTracker()?.recordUserVisibleFailure("auth_failure")
                if (AuthFailurePolicy.shouldReportNonFatal(error)) {
                    WritOnTelemetry.recordNonFatal("account_creation", error)
                }
                onError(AuthFailurePolicy.userMessage(error, "Account creation failed."))
            }
    }

    fun signInWithGoogle(
        idToken: String,
        onSuccess: (FirebaseUser) -> Unit,
        onError: (String) -> Unit
    ) {
        val credential = GoogleAuthProvider.getCredential(idToken, null)
        auth.signInWithCredential(credential)
            .addOnSuccessListener { result ->
                result.user?.let {
                    WritOnTelemetry.authOutcome("google", true)
                    val isNewUser = result.additionalUserInfo?.isNewUser == true
                    if (isNewUser) {
                        WritOnTelemetry.logSignUp("google")
                    } else {
                        WritOnTelemetry.logLogin("google")
                    }
                    WritOnTelemetry.setUserId(FirebaseApp.getInstance().applicationContext, it.uid)
                    syncAuthenticatedNotifications()
                    getGrowthTracker()?.recordFailureResolved("auth_failure")
                    onSuccess(it)
                } ?: run {
                    WritOnTelemetry.authOutcome("google", false)
                    getGrowthTracker()?.recordUserVisibleFailure("auth_failure")
                    onError("Could not retrieve the signed-in user.")
                }
            }
            .addOnFailureListener { error ->
                WritOnTelemetry.authOutcome("google", false)
                getGrowthTracker()?.recordUserVisibleFailure("auth_failure")
                if (AuthFailurePolicy.shouldReportNonFatal(error)) {
                    WritOnTelemetry.recordNonFatal("google_sign_in", error)
                }
                onError(AuthFailurePolicy.userMessage(error, "Google sign-in failed."))
            }
    }

    fun sendPasswordReset(
        email: String,
        onSuccess: () -> Unit,
        onError: (String) -> Unit
    ) {
        if (email.isBlank()) {
            onError("Please enter your email address.")
            return
        }
        val recoveryTrace = WritOnTelemetry.beginTrace("login_recovery")
        auth.sendPasswordResetEmail(email.trim())
                .addOnSuccessListener {
                    recoveryTrace.close()
                    onSuccess()
                }
                .addOnFailureListener { error ->
                    recoveryTrace.close()
                    if (AuthFailurePolicy.shouldReportNonFatal(error)) {
                        WritOnTelemetry.recordNonFatal("password_reset", error)
                    }
                    onError(AuthFailurePolicy.userMessage(error, "Failed to send password reset email."))
                }
    }

    fun getFreshTokenBlocking(): String? {
        val currentUser = auth.currentUser ?: return null
        return try {
            val task = currentUser.getIdToken(true)
            com.google.android.gms.tasks.Tasks.await(task, 10, java.util.concurrent.TimeUnit.SECONDS)?.token
        } catch (e: Exception) {
            null
        }
    }

    fun syncNetworkAuthToken(onComplete: (Boolean) -> Unit = {}) {
        val currentUser = auth.currentUser
        if (currentUser == null) {
            NetworkClient.setAuthToken(null)
            onComplete(false)
            return
        }

        WritOnTelemetry.setUserId(FirebaseApp.getInstance().applicationContext, currentUser.uid)

        currentUser.getIdToken(false)
            .addOnSuccessListener { tokenResult ->
                val token = tokenResult.token
                if (token == null) {
                    NetworkClient.setAuthToken(null)
                    onComplete(false)
                } else {
                    NetworkClient.setAuthToken(token)
                    onComplete(true)
                }
            }
            .addOnFailureListener {
                NetworkClient.setAuthToken(null)
                onComplete(false)
            }
    }

    fun signOut() {
        auth.signOut()
        val context = FirebaseApp.getInstance().applicationContext
        GoogleCredentialSignIn.clearCredentialState(context)
        WritOnTelemetry.setUserId(context, null)
        DailyDigestTopicSubscription.sync(
            context,
            isSignedIn = false,
            digestEnabled = WritOnRemoteConfig.features.value.dailyDigestNotificationEnabled &&
                com.ibitvalley.writon.modern.core.preferences.UserPreferences(context).guestDiscoveryNotificationsEnabled
        ) {
            // Recreate guest reachability after the signed-in row has been detached on logout.
            PushNotificationRegistration.enqueue(context)
        }
        NetworkClient.setAuthToken(null)
    }

    private fun syncAuthenticatedNotifications() {
        val context = FirebaseApp.getInstance().applicationContext
        DailyDigestTopicSubscription.sync(
            context,
            isSignedIn = true,
            digestEnabled = WritOnRemoteConfig.features.value.dailyDigestNotificationEnabled
        ) {
            // A failed guest-topic unsubscribe is retried by future syncs; it must not make the
            // signed-in installation unreachable through its direct token in the meantime.
            PushNotificationRegistration.enqueue(context)
        }
    }
}
