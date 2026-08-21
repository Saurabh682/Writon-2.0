package com.ibitvalley.writon.classes.view_model;

import android.app.Application;
import android.content.Context;

import androidx.annotation.NonNull;
import androidx.lifecycle.AndroidViewModel;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.MediatorLiveData;
import androidx.paging.PagedList;

import com.ibitvalley.writon.classes.dao.DataRepository;
import com.ibitvalley.writon.classes.dao.MyDatabase;
import com.ibitvalley.writon.classes.model.BookMark_List;
import com.ibitvalley.writon.classes.model.Posts_List;
import com.ibitvalley.writon.classes.roomdataclasses.BookMark_List_Data;
import com.ibitvalley.writon.classes.roomdataclasses.PersonalPost_List_Data;
import com.ibitvalley.writon.classes.roomdataclasses.Post_List_Data;
import com.ibitvalley.writon.model.MyWorldModel;
import com.ibitvalley.writon.model.User;
import com.ibitvalley.writon.utils.WritOnPreference;

import java.util.ArrayList;
import java.util.List;

import io.reactivex.Flowable;
import io.reactivex.Observable;
import io.reactivex.Single;


public class OUD_Viewmodel extends AndroidViewModel {
    private DataRepository mDataRepository;
    private MediatorLiveData<List<Post_List_Data>> mListLiveData=new MediatorLiveData<>();
    private MediatorLiveData<List<MyWorldModel>> myWorldData=new MediatorLiveData<>();

    private MediatorLiveData<List<BookMark_List_Data>> mListLveBookmark=new MediatorLiveData<>();
    private Flowable<List<Post_List_Data>> mListLiveBlogDataRx, mTopRatedData,mMostFollowedData;
    private MediatorLiveData<List<PersonalPost_List_Data>> mListPersonalPostListRx=new MediatorLiveData<>();
    LiveData<PagedList<Post_List_Data>> latestBlogs;
    private LiveData<Integer> userCount,blogCount,personalPostCount;
    private LiveData<Boolean> bmStat;
    private Flowable<Post_List_Data> mLiveBlogDetails;
    private Context context;
    private MyDatabase appDatabase;
    User userData;


    public OUD_Viewmodel(@NonNull Application application) {
        super(application);
        appDatabase = MyDatabase.getDatabase(application);
        this.context = application.getApplicationContext();
        mDataRepository = new DataRepository((application));
//        mListLiveBlogDataRxTest=mDataRepository.getAllPostRxTest();
//        mListLveBookmark = mDataRepository.getBookMarktoCopyRx();
        //mListPersonalPostListRx = mDataRepository.getAllPersonalPostRx();
        userData = WritOnPreference.getInstance(context).getUserDetails();
        /*TinyDB tinydb = new TinyDB(getApplication());
        String userId = tinydb.getString("userId");
        System.out.println("UserID: "+ userId);*/

        personalPostCount = mDataRepository.getPersonalPostCount();
    }




    //Post_List_Data



    public Single<Post_List_Data> getBlogDetails(String blogID) {
        return mDataRepository.getBlogDetails(blogID);
    }

    public Observable<Posts_List> getBlogDetails(String blogID, String userId) {
        return mDataRepository.getBlogDetails(blogID,userId);
    }

    public Flowable<PersonalPost_List_Data> getBlogDetailsPersonal(String blogID) {
        return mDataRepository.getBlogDetailsPersonal(blogID);
    }

    public void getUpdatedPosts(int page)
    {
        mDataRepository.getUpdatedLatestPosts( page,mListLiveData );
    }


    public void getUpdatedPostsPagi(int initPage)
    {
        latestBlogs=mDataRepository.getUpdatedLatestPostsPagintion2( initPage );
    }

    public void loadMorePosts(int initPage)
    {
        mDataRepository.loadMorePosts( initPage);
    }


    public LiveData<PagedList<Post_List_Data>> getLatestBlogsLiveData()
    {
        return latestBlogs;
    }
    public void getUpdatedPostsDB()
    {
        mDataRepository.getBlogsFromDB( mListLiveData );
    }


    public Flowable<List<Post_List_Data>> getAllBlogRx() {
        mListLiveBlogDataRx = mDataRepository.getAllPostRx();
        return mListLiveBlogDataRx;
    }

    public Flowable<List<Post_List_Data>> getTopRated() {
        mTopRatedData = mDataRepository.getTopRated();
        return mTopRatedData;
    }

    public Flowable<List<Post_List_Data>> getMostFollowed() {
        mMostFollowedData = mDataRepository.getTopRated();
        return mMostFollowedData;
    }

    public void loadAllPostRx() {
        mDataRepository.LoadlatestRx();
    }

    public void insertAllPost(List<Post_List_Data> listData){
        mDataRepository.insertAllPost(listData);
    }

    public void insertPost(String bid){
        mDataRepository.LoadBlogDetailsRx(bid);
    }

    public LiveData<Integer> getBlogCount() {

        blogCount = mDataRepository.getBlogCount();
        return blogCount;
    }


    //Personal_Post_List_Data


    public void getAllPersonalPostRx() {
        if(userData!=null){
            mDataRepository.getAllPersonalPostMainRx(userData.getId(),mListPersonalPostListRx);}

    }

    public MediatorLiveData<List<PersonalPost_List_Data>> getAllPersonalPostMainRx() {
        return mListPersonalPostListRx;
    }


    public LiveData<Integer> getPersonalPostCount() {
        return personalPostCount;
    }


    //Bookmark
    public MediatorLiveData<List<BookMark_List_Data>> getBookMarksLiveData() {
        return mListLveBookmark;
    }

    public void loadBookmarkListRx() {
        mDataRepository.LoadBookmarkRx(mListLveBookmark);
    }

    public void loadBookmarks() {
        //mDataRepository.LoadBookmarkRx();
    }

    public void updateBookmark(BookMark_List_Data bookMark_list_data, boolean value) {
        mDataRepository.updateBookmarkRoom(bookMark_list_data, value);
        //return true;
    }

    public void updateFollowRoom(String bid, boolean value,int followValue,String otherUserID ,String otherUsername, String postTitle) {
        mDataRepository.updateFollowRoom(bid, value, followValue, otherUserID, otherUsername, postTitle);
    }

    public void updateRateRoom(String bid, boolean value, int rateValue , String otherUserID ,String otherUsername, String postTitle) {
        mDataRepository.updateRateRoom(bid, value, rateValue,otherUserID, otherUsername, postTitle);
    }

    public void updateCommentRoom(String bid, String value,  String otherUserID ,String otherUsername, String postTitle, int commentCount) {
        mDataRepository.updateCommentRoom(bid, value, otherUserID, otherUsername, postTitle, commentCount);
    }

//    public void updateProfile(String Pname, String Uname, String Wo, String Intro, String dob) {
//        mDataRepository.updateProfile(Pname,  Uname,  Wo,  Intro,  dob);
//    }

    public void updateViewCount(int viewCount,  String blogId) {
        mDataRepository.udateViewCount(viewCount, blogId);
    }

    public void addRating(String id,String bid)
    {

    }

    public void searchBlogByCategory(String subCateogry)
    {
        mDataRepository.getBlogsByCategory( subCateogry,mListLiveData );
    }

    public MediatorLiveData<List<Post_List_Data>> getmListLiveData() {
        return mListLiveData;
    }

    public void setmListLiveData(MediatorLiveData<List<Post_List_Data>> mListLiveData) {
        this.mListLiveData = mListLiveData;
    }


    public void getMyWorldData()
    {
        mDataRepository.getMYWorldData(myWorldData);
    }

    public void setMyWorldData(MediatorLiveData<List<MyWorldModel>> myWorldData) {
        this.myWorldData = myWorldData;
    }

    public MediatorLiveData<List<MyWorldModel>> getMyWorldLiveData()
    {
        return  myWorldData;
    }

    public void removeMyWorldNotifications()
    {
        mDataRepository.clearMyWorldData();
    }

    public void deleteByBlogId(long blogId)
    {
        mDataRepository.deleteBlogById( blogId );
    }

}
