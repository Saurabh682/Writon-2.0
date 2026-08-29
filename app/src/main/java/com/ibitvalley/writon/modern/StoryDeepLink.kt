package com.ibitvalley.writon.modern

import java.net.URI

private val supportedStoryHosts = setOf(
    "writon-powerup.onrender.com",
    "writon.co",
    "www.writon.co"
)

private val safeStorySlug = Regex("^[A-Za-z0-9_-]+$")

internal fun resolveStoryDeepLink(url: String?): String? {
    if (url.isNullOrBlank()) return null

    val uri = runCatching { URI(url) }.getOrNull() ?: return null
    if (!uri.scheme.equals("https", ignoreCase = true)) return null
    if (uri.host?.lowercase() !in supportedStoryHosts) return null

    val segments = uri.path.orEmpty().trim('/').split('/')
    if (segments.size != 2 || segments.first() !in setOf("stories", "posts")) return null

    val slug = segments.last()
    if (!safeStorySlug.matches(slug)) return null
    return "reader/$slug"
}
