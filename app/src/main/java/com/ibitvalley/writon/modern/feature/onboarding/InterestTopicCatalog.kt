package com.ibitvalley.writon.modern.feature.onboarding

import java.util.Locale

data class InterestTopicOption(
    val id: String,
    val canonicalName: String,
)

/**
 * Keeps explicit reader interests aligned with the topic IDs produced by the
 * server feed query from story category names.
 *
 * The existing tags API returns only a category name and count. Until that
 * public contract is deliberately extended, the Android client derives the
 * stable feed topic ID using the same normalization rule and supplies its own
 * localized label for every category it understands.
 */
internal object InterestTopicCatalog {
    val fallbackTopics: List<InterestTopicOption> = listOf(
        InterestTopicOption("reviews", "Reviews"),
        InterestTopicOption("tech", "Tech"),
        InterestTopicOption("culture", "Culture"),
        InterestTopicOption("essays", "Essays"),
        InterestTopicOption("humour", "Humour"),
        InterestTopicOption("poetry", "Poetry"),
        InterestTopicOption("short_stories", "Short Stories"),
        InterestTopicOption("journal", "Journal"),
        InterestTopicOption("journalism", "Journalism"),
        InterestTopicOption("science_health", "Science & Health"),
        InterestTopicOption("business_finance", "Business & Finance"),
        InterestTopicOption("sports", "Sports"),
        InterestTopicOption("entertainment", "Entertainment"),
        InterestTopicOption("shayari", "Shayari"),
        InterestTopicOption("philosophy", "Philosophy"),
        InterestTopicOption("satire", "Satire"),
        InterestTopicOption("fiction", "Fiction"),
    )

    private val supportedById = fallbackTopics.associateBy(InterestTopicOption::id)

    fun fromServerNames(names: List<String>): List<InterestTopicOption> {
        val seen = mutableSetOf<String>()
        val activeTopics = names.mapNotNull { name ->
            val id = normalizeTopicId(name) ?: return@mapNotNull null
            val supported = supportedById[id] ?: return@mapNotNull null
            if (!seen.add(id)) return@mapNotNull null
            supported.copy(canonicalName = name.trim())
        }
        // A successful empty catalog is authoritative, not a network failure.
        return activeTopics
    }

    fun normalizeTopicIds(values: Iterable<String>): Set<String> =
        values.mapNotNull(::normalizeTopicId).toSet()

    /** Do not silently delete legacy choices for which no migration was approved. */
    fun preserveSavedIds(values: Iterable<String>): Set<String> =
        values.map { normalizeTopicId(it) ?: it }.toSet()

    /** Existing API contract; unrepresentable legacy values remain local. */
    fun serverCompatibleIds(values: Set<String>): List<String> =
        values.filter { it.matches(Regex("[a-z0-9_]{1,64}")) }.sorted()

    fun mergeSelection(saved: Set<String>, selected: Set<String>, editable: Set<String>): Set<String> =
        preserveSavedIds(saved).filterNot { it in editable }.toSet() +
            normalizeTopicIds(selected).filter { it in editable }

    fun normalizeTopicId(value: String): String? {
        val id = value
            .trim()
            .lowercase(Locale.US)
            .replace(Regex("[^a-z0-9]+"), "_")
            .trim('_')
        return id.takeIf(supportedById::containsKey)
    }
}
