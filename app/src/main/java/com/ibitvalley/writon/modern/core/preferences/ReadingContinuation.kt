package com.ibitvalley.writon.modern.core.preferences

/** Local convenience state, separate from completion and ranking evidence. */
data class ReadingContinuation(val storyId: String, val progress: Float)

internal fun readingContinuation(storyId: String, progress: Float): ReadingContinuation? =
    if (storyId.isBlank() || !progress.isFinite() || progress <= 0f || progress >= 0.98f) null
    else ReadingContinuation(storyId, progress)

internal fun continuationScrollOffset(progress: Float, maximum: Int): Int =
    if (!progress.isFinite() || maximum <= 0 || maximum == Int.MAX_VALUE) 0
    else (progress.coerceIn(0f, 1f) * maximum).toInt().coerceIn(0, maximum)
