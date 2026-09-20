package com.ibitvalley.writon.modern.core.notification

internal fun canRequestNotificationPermission(now: Long, lastAttempt: Long): Boolean =
    lastAttempt == 0L || (now >= lastAttempt && now - lastAttempt >= 14L * 24 * 60 * 60 * 1000)

internal fun qualifiesForReadingNotificationPrompt(progress: Float, engagedSeconds: Int): Boolean =
    progress.isFinite() && progress >= 0.7f && engagedSeconds >= 30
