package com.ibitvalley.writon.classes.dao;

import androidx.lifecycle.LiveData;
import androidx.paging.DataSource;
import androidx.paging.PagedList;
import androidx.room.Dao;
import androidx.room.Insert;
import androidx.room.OnConflictStrategy;
import androidx.room.Query;

import com.ibitvalley.writon.classes.roomdataclasses.BookMark_List_Data;
import com.ibitvalley.writon.classes.roomdataclasses.PersonalPost_List_Data;
import com.ibitvalley.writon.classes.roomdataclasses.Post_List_Data;
import com.ibitvalley.writon.model.MyWorldModel;

import java.util.ArrayList;
import java.util.List;

import io.reactivex.Flowable;
import io.reactivex.Single;


@Dao
public interface OtherUserDao {

    // Post_List_Data

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    void insertBlog(Post_List_Data PostData);

    @Insert(onConflict = OnConflictStrategy.IGNORE)
    void insertAllBlogs(List<Post_List_Data> PostDataList);


    @Insert(onConflict = OnConflictStrategy.IGNORE)
    void insertAllMyWorldData(List<MyWorldModel> myworldData);



    @Query("SELECT * FROM BlogList WHERE blogId=:Blogid AND creationDate <= DATETIME('now') ORDER BY blogId DESC")
    LiveData<Post_List_Data> getPostLive(String Blogid);

    @Query("SELECT * FROM BlogList WHERE creationDate BETWEEN datetime('now', '-30 days') AND datetime('now', 'localtime') ORDER BY creationDate DESC")
    Flowable<List<Post_List_Data>> getAllPostRx();

    @Query("SELECT * FROM BlogList WHERE creationDate BETWEEN datetime('now', '-30 days') AND datetime('now', 'localtime') ORDER BY creationDate DESC")
    DataSource.Factory<Integer, Post_List_Data> getAllPostRxPagi();

    @Query("SELECT * FROM BlogList ORDER BY ratingCount DESC")
    Flowable<List<Post_List_Data>> getTopRated();

    @Query("SELECT * FROM BlogList ORDER BY userFollowersCount DESC")
    Flowable<List<Post_List_Data>> getMostFollowed();

    @Query("SELECT * FROM BlogList")
    Flowable<List<Post_List_Data>> getAllPostRxTest();

    @Query("SELECT * FROM myWorld")
    List<MyWorldModel> getAllMyworldData();

    @Query("Delete FROM myWorld")
    void clearMyWorldData();


    @Query("SELECT * FROM BlogList WHERE creationDate BETWEEN datetime('now', '-30 days') AND datetime('now', 'localtime') AND subCat=:subCat ORDER BY blogId DESC")
    List<Post_List_Data> getBlogsByCategory(String subCat);

    @Query("SELECT * FROM BlogList WHERE isBookmarked = 1")
    Flowable<List<Post_List_Data>> getBookMarkListRx();

    @Query("SELECT * FROM BlogList ORDER BY blogId DESC")
    LiveData<List<Post_List_Data>> getRecentRead();

    @Query("SELECT * FROM BlogList WHERE blogId = :blogId")
    Single<Post_List_Data> getBlogDetails(String blogId);

    @Query("SELECT * FROM BlogList WHERE blogId = :blogId")
    Post_List_Data getBlogDetailsTest(String blogId);


    @Query("SELECT COUNT(*) FROM BlogList")
    LiveData<Integer> getCountBlogs();

    @Query("UPDATE BlogList SET  isBookmarked = :value WHERE blogId = :blogId ")
    void setBookMarkTrue(String blogId, boolean value);


    /*@Query("INSERT INTO BlogList SELECT id=null,userId,title,category,subCat,longDescription,shortDescription," +
            "creationDate, language,blogId,userName,userImage,quoteofDay,introducation,workingOn,userCreationDate," +
            "updatedAt,isRated,isBookmarked,isFollowed,bookMarkedCount,viewCount,ratingCount,commentsCount,userFollowersCount,userFollowingCount,total FROM BookMarkList")
    void copyBookmarkToMain();*/

    @Query("SELECT isBookmarked from BlogList WHERE blogId = :blogId")
    LiveData<Boolean>getBMStatus(String blogId);

    @Query("UPDATE BlogList SET  userFollowersCount= :followCount, isFollowed = :value WHERE userId = :blogId ")
    void setFollowedStatus(String blogId, boolean value, int followCount);

    @Query("UPDATE BlogList SET  commentsCount= :updateCommentCount WHERE blogId = :blogId ")
    void updateCommentCount(String blogId, int updateCommentCount);


    @Query("SELECT isFollowed from BlogList WHERE blogId = :blogId")
    LiveData<Boolean>getFollowedStatus(String blogId);

    @Query("UPDATE BlogList SET  ratingCount= :rateCount ,isRated = :value WHERE blogId = :blogId ")
    void setRatedStat(String blogId, boolean value, int rateCount);

    @Query("SELECT isRated from BlogList WHERE blogId = :blogId")
    LiveData<Boolean>getRatedStatus(String blogId);

    @Query("UPDATE BlogList SET  viewCount= :viewCount WHERE blogId = :blogId")
    void updateViewCount(int viewCount,  String blogId);

    // User_List_Data

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    void insertBookmark(BookMark_List_Data bookMark);

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    void insertBookMarkList(List<BookMark_List_Data> bookMarkList);

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    void insertBookMark(BookMark_List_Data bookMarkList);

    @Query("SELECT * FROM BookMarkList ORDER BY blogId DESC")
    Flowable<List<BookMark_List_Data>> getBookMarktoCopyRx();


    @Query("Delete FROM BookMarkList where blogId= :blogId")
    void deleteBookmarkedPost(String blogId);

    @Query("Delete FROM BlogList where blogId= :blogId")
    void deleteBlogPost(long blogId);



    // PersonalPost_List_Data

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    void insertPersonalPost(PersonalPost_List_Data personalPost);

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    void insertPersonalPostList(List<PersonalPost_List_Data> personalPostList);

    @Query("SELECT * FROM PersonalPostList ORDER BY blogId DESC")
    Flowable<List<PersonalPost_List_Data>> getPersonalPostRx();

    @Query("SELECT * FROM personalPostList WHERE userId = :uId")
    Flowable<List<PersonalPost_List_Data>> getPersonalPostMainRx(String uId);

    @Query("Delete FROM personalPostList where blogId= :blogId")
    void deletePersonalBlogPost(long blogId);

    @Query("SELECT COUNT(*) FROM personalPostList")
    LiveData<Integer> getCountPersonalPost();

    @Query("SELECT * FROM personalPostList WHERE blogId = :blogId")
    Flowable<PersonalPost_List_Data> getBlogDetailsPersonal(String blogId);






}
