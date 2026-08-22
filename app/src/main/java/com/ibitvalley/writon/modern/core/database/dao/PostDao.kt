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

    @Query("DELETE FROM posts")
    suspend fun clearAll()
}

