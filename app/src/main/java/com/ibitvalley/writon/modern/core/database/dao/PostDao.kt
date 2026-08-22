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

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPosts(posts: List<PostEntity>)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPost(post: PostEntity)

    @Update
    suspend fun updatePost(post: PostEntity)

    @Query("UPDATE posts SET isLiked = :isLiked, likesCnt = :likesCount WHERE id = :postId")
    suspend fun updateLikeStatus(postId: String, isLiked: Boolean, likesCount: Int)

    @Query("UPDATE posts SET isBookmarked = :isBookmarked, bookmarksCnt = :bookmarksCount WHERE id = :postId")
    suspend fun updateBookmarkStatus(postId: String, isBookmarked: Boolean, bookmarksCount: Int)

    @Query("DELETE FROM posts WHERE id = :postId")
    suspend fun deletePostById(postId: String)

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
}


