package com.ibitvalley.writon.modern

import android.content.Intent
import java.net.URI
import java.net.URLEncoder

private val supportedStoryHosts = setOf(
    "writon.cc",
    "www.writon.cc",
    "api.writon.cc",
    "writon-app-2020.web.app"
)

private val safeStorySlug = Regex("^[A-Za-z0-9_-]+$")
private val bareStoryId = Regex("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$")

private fun storyRouteForId(value: String?): String? =
    value?.trim()?.takeIf(safeStorySlug::matches)?.let { "reader/$it" }

internal fun canonicalStoryShareUrl(slug: String): String =
    "https://writon.cc/stories/${URLEncoder.encode(slug, Charsets.UTF_8.name()).replace("+", "%20")}"

internal fun cardStoryShareUrl(slug: String): String =
    "${canonicalStoryShareUrl(slug)}?src=card"

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

internal fun normalizeNotificationRoute(value: String?): String? {
    val route = value?.trim()?.trimStart('/')?.takeIf(String::isNotEmpty) ?: return null
    if (route in setOf("home", "notifications", "write")) return route
    resolveStoryDeepLink(route)?.let { return it }

    val path = if (route.startsWith("writon://")) {
        val uri = runCatching { URI(route) }.getOrNull() ?: return null
        listOfNotNull(uri.host, uri.path?.trim('/')?.takeIf(String::isNotEmpty)).joinToString("/")
    } else route
    val segments = path.split('/')
    val storyId = when {
        segments.size == 1 && bareStoryId.matches(segments[0]) -> segments[0]
        segments.size == 2 && segments[0] in setOf("reader", "stories", "posts") -> segments[1]
        else -> return null
    }
    return if (safeStorySlug.matches(storyId)) "reader/$storyId" else null
}

internal fun extractNotificationTargetRoute(intent: Intent?): String? {
    if (intent == null) return null
    val explicitRoutes = listOf("targetRoute", "target_route", "route")
        .mapNotNull(intent::getStringExtra)
    explicitRoutes.firstNotNullOfOrNull { normalizeNotificationRoute(it)?.takeIf { route -> route.startsWith("reader/") } }
        ?.let { return it }
    listOf("storyId", "story_id", "postId", "post_id")
        .mapNotNull(intent::getStringExtra)
        .firstNotNullOfOrNull(::storyRouteForId)
        ?.let { return it }
    listOfNotNull(intent.dataString, intent.getStringExtra("url"), intent.getStringExtra("link"))
        .firstNotNullOfOrNull { normalizeNotificationRoute(it)?.takeIf { route -> route.startsWith("reader/") } }
        ?.let { return it }
    return explicitRoutes.firstNotNullOfOrNull(::normalizeNotificationRoute)
}
