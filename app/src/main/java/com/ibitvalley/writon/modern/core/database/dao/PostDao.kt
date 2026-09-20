package com.ibitvalley.writon.modern.core.database.dao

import androidx.room.*
import com.ibitvalley.writon.modern.core.database.model.PostEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface PostDao {

    @Query("SELECT * FROM posts ORDER BY createdAt DESC")
    fun getAllPosts(): Flow<List<PostEntity>>

    @Query("SELECT * FROM posts WHERE title LIKE '%' || :query || '%' OR summary LIKE '%' || :query || '%' OR authorName LIKE '%' || :query || '%' ORDER BY createdAt DESC")
    fun searchAllPosts(query: String): Flow<List<PostEntity>>

    @Query("SELECT * FROM posts WHERE category = :category AND (title LIKE '%' || :query || '%' OR summary LIKE '%' || :query || '%' OR authorName LIKE '%' || :query || '%') ORDER BY createdAt DESC")
    fun searchPostsByCategory(category: String, query: String): Flow<List<PostEntity>>

    @Query("SELECT * FROM posts WHERE id = :id OR slug = :id LIMIT 1")
    fun getPostById(id: String): Flow<PostEntity?>

    @Query("SELECT * FROM posts WHERE id = :id OR slug = :id LIMIT 1")
    suspend fun getPostSnapshot(id: String): PostEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPosts(posts: List<PostEntity>)

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    suspend fun insertPostsIfMissing(posts: List<PostEntity>): List<Long>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPost(post: PostEntity)

    @Update
    suspend fun updatePost(post: PostEntity)

    @Query("UPDATE posts SET isLiked = :isLiked, likesCnt = :likesCount WHERE id = :postId")
    suspend fun updateLikeStatus(postId: String, isLiked: Boolean, likesCount: Int)

    @Query("UPDATE posts SET isBookmarked = :isBookmarked, bookmarksCnt = :bookmarksCount WHERE id = :postId")
    suspend fun updateBookmarkStatus(postId: String, isBookmarked: Boolean, bookmarksCount: Int)

    @Query("UPDATE posts SET commentsCnt = :count WHERE id = :postId OR slug = :postId")
    suspend fun updateCommentsCount(postId: String, count: Int)

    @Query("UPDATE posts SET commentsCnt = commentsCnt + 1 WHERE id = :postId OR slug = :postId")
    suspend fun incrementCommentsCount(postId: String)

    @Query("DELETE FROM posts WHERE id = :postId OR slug = :postId")
    suspend fun deletePostById(postId: String)

    @Query("DELETE FROM posts WHERE id IN (:postIds)")
    suspend fun deletePostsByIds(postIds: List<String>)

    @Query("DELETE FROM posts WHERE title LIKE '%The Architecture of Tech%' OR slug LIKE '%the-architecture-of-tech%' OR title LIKE '%Geometric Grace%' OR slug LIKE '%geometric-grace%' OR content LIKE '%SystemState%'")
    suspend fun purgeDisallowedStories()

    @Query("SELECT DISTINCT authorId, authorName, authorPenName, authorAvatarUrl FROM posts WHERE authorName LIKE '%' || :query || '%' OR authorPenName LIKE '%' || :query || '%'")
    suspend fun getLocalAuthorsMatching(query: String): List<com.ibitvalley.writon.modern.core.database.model.PostAuthorTuple>

    @Query("SELECT category as name, count(*) as count FROM posts WHERE category LIKE '%' || :query || '%' GROUP BY category")
    suspend fun getLocalTagsMatching(query: String): List<com.ibitvalley.writon.modern.core.database.model.PostTagTuple>

    @Query("SELECT * FROM posts WHERE title LIKE '%' || :query || '%' OR summary LIKE '%' || :query || '%' OR authorName LIKE '%' || :query || '%' OR authorPenName LIKE '%' || :query || '%' ORDER BY createdAt DESC")
    suspend fun getLocalPostsMatching(query: String): List<PostEntity>

    @Query("SELECT COUNT(*) FROM posts")
    suspend fun getPostCount(): Int

    @Query("DELETE FROM posts")
    suspend fun clearAll()

    @Query("DELETE FROM posts WHERE category = :category")
    suspend fun deletePostsByCategory(category: String)

    @Query(
        """DELETE FROM posts
           WHERE (:category IS NULL OR lower(category) = lower(:category))
             AND (
               :query = ''
               OR title LIKE '%' || :query || '%'
               OR coalesce(summary, '') LIKE '%' || :query || '%'
               OR authorName LIKE '%' || :query || '%'
             )"""
    )
    suspend fun deleteMatchingPosts(category: String?, query: String)

    @Query(
        """DELETE FROM posts
           WHERE (:category IS NULL OR lower(category) = lower(:category))
             AND (
               :query = ''
               OR title LIKE '%' || :query || '%'
               OR coalesce(summary, '') LIKE '%' || :query || '%'
               OR authorName LIKE '%' || :query || '%'
             )
             AND id NOT IN (:retainedPostIds)"""
    )
    suspend fun deleteMatchingPostsExcept(
        category: String?,
        query: String,
        retainedPostIds: List<String>
    )

    /**
     * Updates list-card fields without replacing a full body that was already downloaded
     * by the reader. Feed responses intentionally use an empty content field to stay small.
     */
    @Query(
        """UPDATE posts SET
            authorId = :authorId,
            authorName = :authorName,
            authorPenName = :authorPenName,
            authorAvatarUrl = :authorAvatarUrl,
            title = :title,
            slug = :slug,
            summary = :summary,
            content = CASE WHEN :content = '' THEN content ELSE :content END,
            category = :category,
            coverImage = :coverImage,
            readingTimeMin = :readingTimeMin,
            likesCnt = :likesCnt,
            commentsCnt = :commentsCnt,
            bookmarksCnt = :bookmarksCnt,
            isLiked = :isLiked,
            isBookmarked = :isBookmarked,
            createdAt = :createdAt,
            languageCode = :languageCode
            WHERE id = :id"""
    )
    suspend fun updateFeedPostKeepingContent(
        id: String,
        authorId: String,
        authorName: String,
        authorPenName: String,
        authorAvatarUrl: String?,
        title: String,
        slug: String,
        summary: String?,
        content: String,
        category: String,
        coverImage: String?,
        readingTimeMin: Int,
        likesCnt: Int,
        commentsCnt: Int,
        bookmarksCnt: Int,
        isLiked: Boolean,
        isBookmarked: Boolean,
        createdAt: String,
        languageCode: String
    )

    @Transaction
    suspend fun mergeFeedPosts(posts: List<PostEntity>) {
        val insertResults = insertPostsIfMissing(posts)
        posts.zip(insertResults).forEach { (post, insertResult) ->
            if (insertResult == -1L) {
                updateFeedPostKeepingContent(
                    id = post.id,
                    authorId = post.authorId,
                    authorName = post.authorName,
                    authorPenName = post.authorPenName,
                    authorAvatarUrl = post.authorAvatarUrl,
                    title = post.title,
                    slug = post.slug,
                    summary = post.summary,
                    content = post.content,
                    category = post.category,
                    coverImage = post.coverImage,
                    readingTimeMin = post.readingTimeMin,
                    likesCnt = post.likesCnt,
                    commentsCnt = post.commentsCnt,
                    bookmarksCnt = post.bookmarksCnt,
                    isLiked = post.isLiked,
                    isBookmarked = post.isBookmarked,
                    createdAt = post.createdAt,
                    languageCode = post.languageCode
                )
            }
        }
    }

    @Transaction
    suspend fun replaceAllPosts(posts: List<PostEntity>) {
        replaceMatchingPosts(category = null, query = "", posts = posts)
    }

    @Transaction
    suspend fun replaceCategoryPosts(category: String, posts: List<PostEntity>) {
        replaceMatchingPosts(category = category, query = "", posts = posts)
    }

    /**
     * Reconciles the locally visible result set after a successful first-page response.
     * Cached rows are retained on network failure because this method is never called then.
     */
    @Transaction
    suspend fun replaceMatchingPosts(category: String?, query: String, posts: List<PostEntity>) {
        mergeFeedPosts(posts)
        if (posts.isEmpty()) {
            deleteMatchingPosts(category, query)
        } else {
            deleteMatchingPostsExcept(category, query, posts.map { it.id })
        }
    }
}


