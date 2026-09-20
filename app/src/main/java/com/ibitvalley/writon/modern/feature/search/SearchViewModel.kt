package com.ibitvalley.writon.modern.feature.search

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ibitvalley.writon.modern.core.database.dao.PostDao
import com.ibitvalley.writon.modern.core.database.dao.UserDao
import com.ibitvalley.writon.modern.core.database.model.PostEntity
import com.ibitvalley.writon.modern.core.network.WritOnApiService
import com.ibitvalley.writon.modern.core.network.model.AuthorDto
import com.ibitvalley.writon.modern.core.network.model.PostDto
import com.ibitvalley.writon.modern.core.network.model.TagDto
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

enum class SearchResultState { IDLE, LOADING, FRESH, CACHED, EMPTY, ERROR }

internal fun resolveSearchResultState(remoteSucceeded: Boolean, hasResults: Boolean): SearchResultState = when {
    remoteSucceeded && hasResults -> SearchResultState.FRESH
    remoteSucceeded -> SearchResultState.EMPTY
    hasResults -> SearchResultState.CACHED
    else -> SearchResultState.ERROR
}

class SearchViewModel(
    private val apiService: WritOnApiService,
    private val postDao: PostDao? = null,
    private val userDao: UserDao? = null,
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO
) : ViewModel() {

    var results by mutableStateOf<List<PostDto>>(emptyList())
        private set

    var writerResults by mutableStateOf<List<AuthorDto>>(emptyList())
        private set

    var tagResults by mutableStateOf<List<TagDto>>(emptyList())
        private set

    var isLoading by mutableStateOf(false)
        private set

    var resultState by mutableStateOf(SearchResultState.IDLE)
        private set

    private var searchJob: Job? = null
    private var searchRequestId = 0L

    fun search(query: String, tab: String = "Stories") {
        searchJob?.cancel()
        val requestId = ++searchRequestId
        searchJob = viewModelScope.launch {
            isLoading = true
            resultState = SearchResultState.LOADING
            try {
                delay(if (query.isBlank()) 0 else 150)
                val cleanQuery = query.trim().takeIf { it.isNotBlank() }
                withContext(ioDispatcher) {
                    when (tab) {
                        "Writers" -> {
                            val remoteUsers = try {
                                val response = apiService.getUsers(query = cleanQuery)
                                if (response.isSuccessful && response.body() != null) response.body()!!.users else null
                            } catch (error: CancellationException) {
                                throw error
                            } catch (_: Exception) {
                                null
                            }
                            ensureActive()
                            writerResults = if (remoteUsers != null) remoteUsers else localWriters(cleanQuery)
                            resultState = resolveSearchResultState(remoteUsers != null, writerResults.isNotEmpty())
                        }
                        "Tags" -> {
                            val remoteTags = try {
                                val response = apiService.getTags(query = cleanQuery)
                                if (response.isSuccessful && response.body() != null) response.body()!!.tags else null
                            } catch (error: CancellationException) {
                                throw error
                            } catch (_: Exception) {
                                null
                            }
                            ensureActive()
                            tagResults = remoteTags ?: postDao?.getLocalTagsMatching(cleanQuery ?: "")?.map {
                                TagDto(name = it.name, count = it.count)
                            }.orEmpty()
                            resultState = resolveSearchResultState(remoteTags != null, tagResults.isNotEmpty())
                        }
                        else -> {
                            val remotePosts = try {
                                val response = apiService.getPosts(searchQuery = cleanQuery)
                                if (response.isSuccessful && response.body() != null) response.body()!!.posts else null
                            } catch (error: CancellationException) {
                                throw error
                            } catch (_: Exception) {
                                null
                            }
                            ensureActive()
                            results = remotePosts ?: run {
                                postDao?.getLocalPostsMatching(cleanQuery ?: "")?.map { it.asPostDto() }.orEmpty()
                            }
                            resultState = resolveSearchResultState(remotePosts != null, results.isNotEmpty())
                        }
                    }
                }
            } catch (error: CancellationException) {
                throw error
            } finally {
                if (requestId == searchRequestId) isLoading = false
            }
        }
    }

    private suspend fun localWriters(cleanQuery: String?): List<AuthorDto> {
        val fromPosts = postDao?.getLocalAuthorsMatching(cleanQuery ?: "")?.map {
            AuthorDto(it.authorId, it.authorPenName, it.authorName, it.authorAvatarUrl, null, null, 0, 0)
        }.orEmpty()
        val fromProfiles = userDao?.searchUsers(cleanQuery ?: "")?.map {
            AuthorDto(it.id, it.penName, it.fullName, it.avatarUrl, it.bio, it.quoteOfDay, it.followersCnt, it.followingCnt)
        }.orEmpty()
        return (fromPosts + fromProfiles).distinctBy { it.penName.lowercase() }
    }

    private fun PostEntity.asPostDto() = PostDto(
        id = id,
        slug = slug,
        title = title,
        summary = summary,
        content = content,
        category = category,
        coverImage = coverImage,
        readingTimeMin = readingTimeMin,
        likesCnt = likesCnt,
        commentsCnt = commentsCnt,
        bookmarksCnt = bookmarksCnt,
        createdAt = createdAt,
        author = AuthorDto(
            id = authorId,
            penName = authorPenName,
            fullName = authorName,
            avatarUrl = authorAvatarUrl,
            bio = null,
            quoteOfDay = null,
            followersCnt = 0,
            followingCnt = 0
        ),
        isLiked = isLiked,
        isBookmarked = isBookmarked,
        isFollowingAuthor = false
    )
}


