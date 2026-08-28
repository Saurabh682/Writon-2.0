package com.ibitvalley.writon.modern.core.telemetry

import android.content.Context
import android.os.Bundle
import com.google.firebase.FirebaseApp
import com.google.firebase.analytics.FirebaseAnalytics
import com.google.firebase.crashlytics.FirebaseCrashlytics
import com.google.firebase.perf.FirebasePerformance

/**
 * Privacy-safe boundary for WritOn's no-cost Firebase observability tools.
 *
 * Never pass email addresses, display names, story text, Firebase ID tokens, or push tokens
 * into this object. Events are limited to feature outcomes and app health.
 */
object WritOnTelemetry {

    fun appLaunched(context: Context) {
        log(context, "writon_launch")
    }

    fun authOutcome(provider: String, succeeded: Boolean) {
        logFromFirebase("auth_outcome") {
            putString("provider", provider)
            putString("result", if (succeeded) "success" else "failure")
        }
    }

    fun versionCheck(context: Context, source: String, updateRequired: Boolean) {
        log(context, "version_check") {
            putString("source", source)
            putString("update", if (updateRequired) "required" else "none")
        }
    }

    fun pushRegistration(context: Context, succeeded: Boolean) {
        log(context, "push_registration") {
            putString("result", if (succeeded) "success" else "failure")
        }
    }

    fun pushReceived(context: Context, kind: String, hasStoryTarget: Boolean) {
        log(context, "push_received") {
            putString("kind", kind.take(36))
            putString("target", if (hasStoryTarget) "story" else "notifications")
        }
    }

    fun recordNonFatal(operation: String, throwable: Throwable) {
        FirebaseCrashlytics.getInstance().apply {
            setCustomKey("operation", operation.take(64))
            recordException(throwable)
        }
    }

    suspend fun <T> trace(traceName: String, block: suspend () -> T): T {
        val trace = FirebasePerformance.getInstance().newTrace(traceName)
        trace.start()
        return try {
            block()
        } finally {
            trace.stop()
        }
    }

    private fun logFromFirebase(event: String, parameters: Bundle.() -> Unit) {
        log(FirebaseApp.getInstance().applicationContext, event, parameters)
    }

    private fun log(context: Context, event: String, parameters: Bundle.() -> Unit = {}) {
        FirebaseAnalytics.getInstance(context.applicationContext).logEvent(event, Bundle().apply(parameters))
    }
}
