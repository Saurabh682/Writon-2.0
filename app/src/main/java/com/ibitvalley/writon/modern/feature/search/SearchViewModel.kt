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
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class SearchViewModel(
    private val apiService: WritOnApiService,
    private val postDao: PostDao? = null,
    private val userDao: UserDao? = null
) : ViewModel() {

    var results by mutableStateOf<List<PostDto>>(emptyList())
        private set

    var writerResults by mutableStateOf<List<AuthorDto>>(emptyList())
        private set

    var tagResults by mutableStateOf<List<TagDto>>(emptyList())
        private set

    var isLoading by mutableStateOf(false)
        private set

    private var searchJob: Job? = null

    fun search(query: String, tab: String = "Stories") {
        searchJob?.cancel()
        searchJob = viewModelScope.launch {
            isLoading = true
            delay(if (query.isBlank()) 0 else 150)
            val cleanQuery = query.trim().takeIf { it.isNotBlank() }

            withContext(Dispatchers.IO) {
                try {
                    when (tab) {
                        "Writers" -> {
                            val remoteUsers = try {
                                val response = apiService.getUsers(query = cleanQuery)
                                if (response.isSuccessful) response.body()?.users.orEmpty() else emptyList()
                            } catch (_: Exception) {
                                emptyList()
                            }

                            val localAuthorsFromPosts = postDao?.getLocalAuthorsMatching(cleanQuery ?: "")?.map {
                                AuthorDto(
                                    id = it.authorId,
                                    penName = it.authorPenName,
                                    fullName = it.authorName,
                                    avatarUrl = it.authorAvatarUrl,
                                    bio = null,
                                    quoteOfDay = null,
                                    followersCnt = 0,
                                    followingCnt = 0
                                )
                            }.orEmpty()

                            val localUsers = userDao?.searchUsers(cleanQuery ?: "")?.map {
                                AuthorDto(
                                    id = it.id,
                                    penName = it.penName,
                                    fullName = it.fullName,
                                    avatarUrl = it.avatarUrl,
                                    bio = it.bio,
                                    quoteOfDay = it.quoteOfDay,
                                    followersCnt = it.followersCnt,
                                    followingCnt = it.followingCnt
                                )
                            }.orEmpty()

                            val combined = (remoteUsers + localAuthorsFromPosts + localUsers)
                                .distinctBy { it.penName.lowercase() }
                            writerResults = combined
                        }
                        "Tags" -> {
                            val remoteTags = try {
                                val response = apiService.getTags(query = cleanQuery)
                                if (response.isSuccessful) response.body()?.tags.orEmpty() else emptyList()
                            } catch (_: Exception) {
                                emptyList()
                            }

                            val localTags = postDao?.getLocalTagsMatching(cleanQuery ?: "")?.map {
                                TagDto(name = it.name, count = it.count)
                            }.orEmpty()

                            val combined = (remoteTags + localTags)
                                .distinctBy { it.name.lowercase() }
                            tagResults = combined
                        }
                        else -> {
                            val remotePosts = try {
                                val response = apiService.getPosts(searchQuery = cleanQuery)
                                if (response.isSuccessful) response.body()?.posts.orEmpty() else emptyList()
                            } catch (_: Exception) {
                                emptyList()
                            }

                            val localPosts = if (remotePosts.isEmpty()) {
                                postDao?.getLocalPostsMatching(cleanQuery ?: "")?.map { it.asPostDto() }.orEmpty()
                            } else emptyList()

                            results = (remotePosts + localPosts).distinctBy { it.id }
                        }
                    }
                } catch (_: Exception) {
                    // Fallback to local
                }
            }

            isLoading = false
        }
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


