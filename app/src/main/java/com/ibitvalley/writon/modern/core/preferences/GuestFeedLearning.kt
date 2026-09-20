package com.ibitvalley.writon.modern.core.preferences

import android.content.SharedPreferences
import org.json.JSONObject
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import kotlin.math.pow

data class GuestFeedVectors(
    val topics: String?,
    val authors: String?,
    val languages: String?
)

private fun canonicalGuestTopic(value: String): String = value.trim().lowercase()
    .replace(Regex("[^a-z0-9]+"), "_")
    .trim('_')

internal fun preferredTopicScores(topics: Set<String>): Map<String, Float> = topics.mapNotNull { topic ->
    canonicalGuestTopic(topic)
        .takeIf(String::isNotBlank)?.let { it to 8f }
}.toMap()

/**
 * Device-local guest learning. Only the small, bounded vectors returned by
 * [vectors] leave the device; story history and action keys never do.
 */
class GuestFeedLearning(private val preferences: SharedPreferences) {
    fun recordAction(
        storyId: String,
        topicId: String,
        authorId: String,
        languageCode: String,
        action: String,
        weight: Float
    ) {
        val actionKey = "$storyId:$action"
        val actions = preferences.getStringSet(KEY_ACTIONS, emptySet()).orEmpty().toMutableSet()
        if (!actions.add(actionKey)) return

        val topics = decayedScores(KEY_TOPICS)
        val authors = decayedScores(KEY_AUTHORS)
        val languages = decayedScores(KEY_LANGUAGES)
        add(topics, canonicalGuestTopic(topicId), weight)
        add(authors, authorId, weight)
        add(languages, languageCode, weight)
        saveScores(KEY_TOPICS, topics)
        saveScores(KEY_AUTHORS, authors)
        saveScores(KEY_LANGUAGES, languages)
        preferences.edit()
            .putStringSet(KEY_ACTIONS, actions.toList().takeLast(MAX_ACTION_KEYS).toSet())
            .putLong(KEY_LAST_DECAY, System.currentTimeMillis())
            .apply()
    }

    fun recordOpen(storyId: String, topicId: String, authorId: String, languageCode: String) {
        recordAction(storyId, topicId, authorId, languageCode, "open", 0.5f)
        val key = "$KEY_FIRST_OPEN_PREFIX$storyId"
        val today = SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
        val firstOpenDay = preferences.getString(key, null)
        if (firstOpenDay == null) {
            preferences.edit().putString(key, today).apply()
        } else if (firstOpenDay != today) {
            recordAction(storyId, topicId, authorId, languageCode, "reread", 6f)
        }
    }

    fun recordReading(
        storyId: String,
        topicId: String,
        authorId: String,
        languageCode: String,
        progress: Float,
        totalEngagedSeconds: Int
    ) {
        if (totalEngagedSeconds >= 30) {
            recordAction(storyId, topicId, authorId, languageCode, "engaged_30", 2f)
        }
        if (progress >= 0.70f) {
            recordAction(storyId, topicId, authorId, languageCode, "progress_70", 4f)
        }
        if (progress >= 0.95f) {
            recordAction(storyId, topicId, authorId, languageCode, "complete", 5f)
        }
    }

    fun vectors(preferredTopics: Set<String> = emptySet()): GuestFeedVectors = GuestFeedVectors(
        topics = serializeTop(decayedScores(KEY_TOPICS).apply {
            preferredTopicScores(preferredTopics).forEach { (topic, score) ->
                this[topic] = maxOf(this[topic] ?: 0f, score)
            }
        }, 8),
        authors = serializeTop(decayedScores(KEY_AUTHORS), 8),
        languages = serializeTop(decayedScores(KEY_LANGUAGES), 4)
    )

    private fun decayedScores(key: String): MutableMap<String, Float> {
        val scores = readScores(key)
        val elapsedDays = ((System.currentTimeMillis() - preferences.getLong(KEY_LAST_DECAY, System.currentTimeMillis()))
            .coerceAtLeast(0L) / 86_400_000f)
        if (elapsedDays <= 0f) return scores
        val factor = 0.5f.pow(elapsedDays / 30f)
        return scores.mapValuesTo(mutableMapOf()) { (_, value) -> value * factor }
    }

    private fun readScores(key: String): MutableMap<String, Float> {
        val json = runCatching { JSONObject(preferences.getString(key, "{}") ?: "{}") }.getOrElse { JSONObject() }
        return buildMap {
            json.keys().forEach { dimension ->
                val value = json.optDouble(dimension, 0.0).toFloat()
                if (value.isFinite() && dimension.isNotBlank()) put(dimension, value.coerceIn(-20f, 20f))
            }
        }.toMutableMap()
    }

    private fun saveScores(key: String, scores: Map<String, Float>) {
        val compact = scores.entries
            .sortedByDescending { kotlin.math.abs(it.value) }
            .take(MAX_DIMENSIONS)
        val json = JSONObject()
        compact.forEach { (dimension, score) -> json.put(dimension, score.coerceIn(-20f, 20f)) }
        preferences.edit().putString(key, json.toString()).apply()
    }

    private fun add(scores: MutableMap<String, Float>, key: String, weight: Float) {
        if (key.isBlank()) return
        scores[key] = ((scores[key] ?: 0f) + weight).coerceIn(-20f, 20f)
    }

    private fun serializeTop(scores: Map<String, Float>, limit: Int): String? {
        val entries = scores.entries
            .filter { it.value > 0.05f }
            .sortedByDescending { it.value }
            .take(limit)
        if (entries.isEmpty()) return null
        return entries.joinToString(",") { (key, value) ->
            val encoded = URLEncoder.encode(key, StandardCharsets.UTF_8.toString())
            "$encoded:${"%.3f".format(java.util.Locale.US, value)}"
        }
    }

    private companion object {
        const val KEY_TOPICS = "guest_feed_topic_scores"
        const val KEY_AUTHORS = "guest_feed_author_scores"
        const val KEY_LANGUAGES = "guest_feed_language_scores"
        const val KEY_ACTIONS = "guest_feed_action_keys"
        const val KEY_LAST_DECAY = "guest_feed_last_decay"
        const val KEY_FIRST_OPEN_PREFIX = "guest_feed_first_open_"
        const val MAX_DIMENSIONS = 100
        const val MAX_ACTION_KEYS = 500
    }
}
