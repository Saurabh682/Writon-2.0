package com.ibitvalley.writon.modern.feature.reader.card

/**
 * Heuristic extractor that finds candidate excerpt lines from a story's content.
 * Reusable across Card generator auto-suggestion and reader excerpts.
 */
object ExcerptSuggester {

    fun suggestExcerpt(content: String, title: String): String {
        val clean = content
            .replace(Regex("#+\\s+"), "")
            .replace(Regex("[*_`~]"), "")
            .replace(Regex(">\\s+"), "")
            .trim()

        if (clean.isBlank()) return title

        // Split by paragraph first to preserve literary cohesion
        val paragraphs = clean.split(Regex("\n\n+"))
            .map { it.trim() }
            .filter { it.isNotBlank() && !it.startsWith("http") }

        // Find a paragraph with good length (between 40 and 240 chars)
        val suitableParagraph = paragraphs.firstOrNull { it.length in 40..240 }
        if (suitableParagraph != null) {
            return suitableParagraph
        }

        // Fallback to sentence extraction
        val sentences = clean.split(Regex("(?<=[.!?])\\s+"))
            .map { it.trim() }
            .filter { it.length in 30..220 }

        if (sentences.isNotEmpty()) {
            return sentences.first()
        }

        // If story is very short, take opening characters
        return clean.take(200).trimEnd()
    }
}
