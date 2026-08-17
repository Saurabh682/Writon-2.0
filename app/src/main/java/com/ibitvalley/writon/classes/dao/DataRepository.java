package com.ibitvalley.writon.classes.dao;

import android.app.Application;
import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.lifecycle.LiveData;
import androidx.lifecycle.MediatorLiveData;
import androidx.paging.DataSource;
import androidx.paging.LivePagedListBuilder;
import androidx.paging.PagedList;

import com.ibitvalley.writon.classes.model.BookMark_List;
import com.ibitvalley.writon.classes.model.PersonalPost_List;
import com.ibitvalley.writon.classes.model.Posts_List;
import com.ibitvalley.writon.classes.model.Posts_List_Response;
import com.ibitvalley.writon.classes.roomdataclasses.BookMark_List_Data;
import com.ibitvalley.writon.classes.roomdataclasses.PersonalPost_List_Data;
import com.ibitvalley.writon.classes.roomdataclasses.Post_List_Data;
import com.ibitvalley.writon.model.DefaultResponse;
import com.ibitvalley.writon.model.LatestPost;
import com.ibitvalley.writon.model.MyWorldModel;
import com.ibitvalley.writon.model.MyWorldResponse;
import com.ibitvalley.writon.model.User;
import com.ibitvalley.writon.model.UserData;
import com.ibitvalley.writon.pagination.BlogDataSourceFactory;
import com.ibitvalley.writon.retroFit.RetroFitClient;
import com.ibitvalley.writon.retroFit.ServiceGenerator;
import com.ibitvalley.writon.utils.AppUtils;
import com.ibitvalley.writon.utils.WritOnPreference;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Executor;
import java.util.concurrent.Executors;

import io.reactivex.Flowable;
import io.reactivex.Observable;
import io.reactivex.Single;
import io.reactivex.SingleObserver;
import io.reactivex.android.schedulers.AndroidSchedulers;
import io.reactivex.disposables.CompositeDisposable;
import io.reactivex.disposables.Disposable;
import io.reactivex.functions.Consumer;
import io.reactivex.observers.DisposableObserver;
import io.reactivex.schedulers.Schedulers;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

import static android.content.Context.MODE_PRIVATE;

public class DataRepository  {

    private static final String TAG = "Data Repository";
    private CompositeDisposable compositeDisposable = new CompositeDisposable();
    Disposable dLatest,dRecent, dBookmark,dPersonalPost,dPersonalPost2;
    SharedPreferences preferences;
    User userData;
    //private Boolean blogListLoading=false;
    private OtherUserDao mDataDao;
    private Context context;
    DisposableObserver<Posts_List>getObserver;

    PagedList.Config pagedListConfig;
    private final Executor executor = Executors.newSingleThreadExecutor();

    public DataRepository(Application application) {
        MyDatabase dataRoombase = MyDatabase.getDatabase(application);
        this.mDataDao = dataRoombase.OUD();
        this.context = application.getApplicationContext();
        preferences = application.getSharedPreferences("mPrefs", MODE_PRIVATE);
        userData = WritOnPreference.getInstance(application).getUserDetails();

        pagedListConfig =
                (new PagedList.Config.Builder())
                        .setEnablePlaceholders(true)
                        .setInitialLoadSizeHint(10)
                        .setPageSize(20)
                        .build();
        //Log.d(TAG, "DataRepository: BlogListLoadStat : "+ blogListLoading);
    }

    //Post_List_Data
    public Single< Post_List_Data> getBlogDetails(String blogID) {
        return mDataDao.getBlogDetails(blogID);
    }

    public Observable<Posts_List> getBlogDetails(String blogID,String userId) {
        RetroFitClient PostList = ServiceGenerator.getRetrofit().create(RetroFitClient.class);
        Observable<Posts_List> observable = PostList.getPostDetailsRx(blogID,userId);

        return observable;
    }

    public Flowable< PersonalPost_List_Data> getBlogDetailsPersonal(String blogID) {
        return mDataDao.getBlogDetailsPersonal(blogID);
    }

    public Flowable<List<Post_List_Data>> getAllPostRx() {
        return mDataDao.getAllPostRx();
    }

    public Flowable<List<Post_List_Data>> getTopRated() {
        return mDataDao.getTopRated();
    }

    public Flowable<List<Post_List_Data>> getMostFollowed() {
        return mDataDao.getMostFollowed();
    }

    public Flowable<List<Post_List_Data>> getAllPostRxTest() {
        return mDataDao.getAllPostRxTest();
    }

    public void LoadlatestRx() {

        RetroFitClient PostList = ServiceGenerator.getRetrofit().create(RetroFitClient.class);
        Observable<Posts_List> observable = PostList.getPostDataRx(userData.getId(),20);

        dLatest = observable.subscribeOn(Schedulers.io())
                .observeOn(AndroidSchedulers.mainThread())
                .subscribeWith(new DisposableObserver<Posts_List>()
        {
            @Override
            public void onNext(Posts_List posts_list) {
                if ( posts_list!=null && posts_list.getData()!=null && posts_list.getData().size()>0 )
                insertAllPost(posts_list.getData());
                executor.execute( new Runnable() {
                    @Override
                    public void run() {
                        Post_List_Data post_list_data=mDataDao.getBlogDetailsTest(posts_list.getData().get(0).getBlogId() );
                        Log.d(TAG, "onLoadLatest: "+ post_list_data.getUserName());

                    }
                } );

                Log.d(TAG, "onLoadLatest: "+ posts_list.getMessage());
            }
            @Override
            public void onError(Throwable e) {

                Toast.makeText(context,
                        e.getMessage(),
                        Toast.LENGTH_SHORT)
                        .show();
                Log.d(TAG, "onError: "+e.getLocalizedMessage());
            }

            @Override
            public void onComplete() {

                dLatest.dispose();
            }
        });


    }

    public void getUpdatedLatestPosts(int page,MediatorLiveData<List<Post_List_Data>> listLiveData) {

        RetroFitClient PostList = ServiceGenerator.getRetrofit().create(RetroFitClient.class);
        Observable<Posts_List> observable = PostList.getPostDataPagintion(userData.getId(),20,page);

        getBlogsFromDB(listLiveData);

        dLatest = observable.subscribeOn(Schedulers.io())
                .observeOn(AndroidSchedulers.mainThread())
                .subscribeWith(new DisposableObserver<Posts_List>()
                {
                    @Override
                    public void onNext(Posts_List posts_list) {
                        if ( posts_list!=null && posts_list.getData()!=null && posts_list.getData().size()>0 )
                        {
                            listLiveData.postValue( posts_list.getData() );
                            insertAllPost(posts_list.getData());
                        }

                    }
                    @Override
                    public void onError(Throwable e) {
                        listLiveData.postValue( null);
                       //donothing
                    }

                    @Override
                    public void onComplete() {
                        dLatest.dispose();
                    }
                });


    }

    public LiveData<PagedList<Post_List_Data>> getUpdatedLatestPostsPagintion(int intiPage) {

        BlogDataSourceFactory   blogDataSourceFactory=new BlogDataSourceFactory( compositeDisposable,mDataDao,
                    Executors.newSingleThreadExecutor(),intiPage,userData);

        LivePagedListBuilder<Integer,Post_List_Data> pagedListLiveData=new LivePagedListBuilder<Integer,Post_List_Data>( blogDataSourceFactory,pagedListConfig);

        return pagedListLiveData.build();
    }

    public LiveData<PagedList<Post_List_Data>> getUpdatedLatestPostsPagintion2(int intiPage) {

        DataSource.Factory<Integer, Post_List_Data>    blogDataSourceFactory=mDataDao.getAllPostRxPagi();

        LivePagedListBuilder<Integer,Post_List_Data> pagedListLiveData=new LivePagedListBuilder<Integer,Post_List_Data>( blogDataSourceFactory,pagedListConfig);

        return pagedListLiveData.build();
    }

    synchronized public void loadMorePosts(int currentPage)
    {
        RetroFitClient PostList = ServiceGenerator.getRetrofit().create(RetroFitClient.class);

        PostList.getPostDataPagintion(userData.getId(),20,currentPage )
                .subscribeOn(
                        Schedulers.io() ).observeOn( AndroidSchedulers.mainThread() ).subscribe(
                new Consumer<Posts_List>() {
                    @Override
                    public void accept(final Posts_List posts_list) throws Exception {

                        if ( !AppUtils.isNull( posts_list ) && !AppUtils.isNull(
                                posts_list.getData() ) && posts_list.getData().size() > 0 )
                            executor.execute( () ->
                                    mDataDao.insertAllBlogs( posts_list.getData() ) );
                    }
                } , new Consumer<Throwable>() {
                    @Override
                    public void accept(Throwable throwable) throws Exception {

                    }
                } );
    }


    public void getBlogsFromDB(MediatorLiveData<List<Post_List_Data>> listLiveData)
    {
        getAllPostRx().subscribeOn( Schedulers.io() ).observeOn( AndroidSchedulers.mainThread() ).subscribe( new Consumer<List<Post_List_Data>>() {
            @Override
            public void accept(List<Post_List_Data> post_list_data) throws Exception {
                if ( !AppUtils.isNull( post_list_data ) && post_list_data.size()>0 )
                    listLiveData.postValue( post_list_data);

            }
        } , new Consumer<Throwable>() {
            @Override
            public void accept(Throwable throwable) throws Exception {
            }
        } );
    }




    public LiveData<Integer> getBlogCount( ){
        return mDataDao.getCountBlogs();
    }

    public void insertAllPost(List<Post_List_Data> listData ){
        if ( listData!=null && listData.size()>0)
        executor.execute(() -> mDataDao.insertAllBlogs(listData));
    }

    public void insertBookmarkPost(List<BookMark_List_Data> listData ){
        executor.execute(new Runnable() {
            @Override
            public void run() {

                mDataDao.insertBookMarkList(listData);

            }
        });
    }

    public void insertPostUser(Post_List_Data postData ){
        executor.execute(() -> mDataDao.insertBlog(postData));
    }

    public void udateViewCount(int viewCount,  String blogId) {
        executor.execute(() -> mDataDao.updateViewCount(viewCount, blogId));
    }


    // TODO Personal Post

    public Flowable<List<PersonalPost_List_Data>> getAllPersonalPostRx() {
        return mDataDao.getPersonalPostRx();
    }

    public void LoadPersonalPostRx(String uId,MediatorLiveData<List<PersonalPost_List_Data>> mListPersonalPostListRx) {

        mDataDao.getPersonalPostMainRx(uId).subscribeOn(Schedulers.io()).observeOn( AndroidSchedulers.mainThread() )
        .subscribe( new Consumer<List<PersonalPost_List_Data>>() {
            @Override
            public void accept(List<PersonalPost_List_Data> personalPost_list_data) throws Exception {
                if ( !AppUtils.isNull( personalPost_list_data ) && personalPost_list_data.size()>0 )
                    mListPersonalPostListRx.postValue( personalPost_list_data );
            }
        } );

    }

    public void getAllPersonalPostMainRx(String uId,MediatorLiveData<List<PersonalPost_List_Data>> mListPersonalPostListRx) {

        LoadPersonalPostRx(uId,mListPersonalPostListRx);

        RetroFitClient PostList = ServiceGenerator.getRetrofit().create(RetroFitClient.class);
        Observable<PersonalPost_List> observable = PostList.getPersonalPostRx(userData.getId() ==null ? userData.getuId() : userData.getId(),0);
        //Call<Posts_List> call = PostList.getPostData(userData.getId(),100);

        dPersonalPost = observable.subscribeOn(Schedulers.io())
                .observeOn(AndroidSchedulers.mainThread())
                .subscribeWith(new DisposableObserver<PersonalPost_List>() {
                    //private int i=0;

                    @Override
                    public void onNext(PersonalPost_List posts_list) {
                        if(posts_list.getData()!= null && posts_list.getData().size()>0) {
                            mListPersonalPostListRx.postValue( posts_list.getData() );
                            insertAllPersonalPost(posts_list.getData());
                        }else
                            mListPersonalPostListRx.postValue( null );

                    }

                    @Override
                    public void onError(Throwable e) {
                        //do nothing
                        mListPersonalPostListRx.postValue( null );
                    }

                    @Override
                    public void onComplete() {
                    }
                });

    }

    public void insertAllPersonalPost(List<PersonalPost_List_Data> listData ){
        executor.execute(() -> mDataDao.insertPersonalPostList(listData));
    }

    public void insertPersonalPost(Post_List_Data postData ){
        executor.execute(() -> mDataDao.insertBlog(postData));
    }

    public LiveData<Integer> getPersonalPostCount( ){
        return mDataDao.getCountPersonalPost();
    }



    // TODO Blog details
    public void LoadBlogDetailsRx(String bid) {
        //blogListLoading = true;

        RetroFitClient PostList = ServiceGenerator.getRetrofit().create(RetroFitClient.class);
        Observable<Posts_List> observable = PostList.getPostDetailsRx(bid,userData.getId());
        //Call<Posts_List> call = PostList.getPostData(userData.getId(),100);

        dRecent = observable.subscribeOn(Schedulers.io())
                .observeOn(AndroidSchedulers.mainThread())
                .subscribeWith(new DisposableObserver<Posts_List>() {
                    @Override
                    public void onNext(Posts_List posts_list) {
                        insertPostUser(posts_list.getData().get(0));

                        Log.d(TAG, "onLoadRecentRead: "+ posts_list.getMessage());
                    }

                    @Override
                    public void onError(Throwable e) {
                        /*Toast.makeText(context,
                                e.getMessage(),
                                Toast.LENGTH_SHORT)
                                .show();*/
                    }

                    @Override
                    public void onComplete() {

                        dRecent.dispose();
                    }
                });
        //.subscribe(posts_list -> insertAllPost(posts_list.getData()) , System.out::println);

        //compositeDisposable.add(d);
    }

    // TODO Recent read
    private void LoadRecentReadRx() {
        //blogListLoading = true;

        RetroFitClient PostList = ServiceGenerator.getRetrofit().create(RetroFitClient.class);
        Observable<Posts_List> observable = PostList.getPostDataRx(userData.getId(),100);
        //Call<Posts_List> call = PostList.getPostData(userData.getId(),100);

        dRecent = observable.subscribeOn(Schedulers.io())
                .observeOn(AndroidSchedulers.mainThread())
                .subscribeWith(new DisposableObserver<Posts_List>() {
                    @Override
                    public void onNext(Posts_List posts_list) {
                        insertAllPost(posts_list.getData());

                        Log.d(TAG, "onLoadRecentRead: "+ posts_list.getMessage());
                    }

                    @Override
                    public void onError(Throwable e) {
                        Toast.makeText(context,
                                e.getMessage(),
                                Toast.LENGTH_SHORT)
                                .show();
                    }

                    @Override
                    public void onComplete() {
                        Toast.makeText(context,
                                "Recent Read Updated",
                                Toast.LENGTH_SHORT)
                                .show();
                        Log.d(TAG, "Recent Read Updated");
                        dRecent.dispose();
                    }
                });
        //.subscribe(posts_list -> insertAllPost(posts_list.getData()) , System.out::println);

        //compositeDisposable.add(d);
    }


    //TODO Bookmark Updates

    public void getBookmarkList(MediatorLiveData<List<BookMark_List_Data>> mediatorLiveData) {
         mDataDao.getBookMarktoCopyRx().subscribeOn( Schedulers.io() ).observeOn( AndroidSchedulers.mainThread() )
         .subscribe( new Consumer<List<BookMark_List_Data>>() {
             @Override
             public void accept(List<BookMark_List_Data> post_list_data) throws Exception {
                 if ( !AppUtils.isNull( post_list_data ) && post_list_data.size()>1 )
                     mediatorLiveData.postValue( post_list_data );
                 else
                     mediatorLiveData.postValue( null );
             }
         } );
    }

    public Flowable<List<BookMark_List_Data>> getBookMarktoCopyRx() {
        return mDataDao.getBookMarktoCopyRx();
    }

    public void LoadBookmarkRx(MediatorLiveData<List<BookMark_List_Data>> mediatorLiveData) {
        //blogListLoading = true;
        //Log.d(TAG, "onBookmark: ");
        RetroFitClient PostList = ServiceGenerator.getRetrofit().create(RetroFitClient.class);
        Observable<BookMark_List> observable = PostList.getBookmarkDataRx(userData.getId(),500);
        //Call<Posts_List> call = PostList.getPostData(userData.getId(),100);
        getBookmarkList(mediatorLiveData);
        dBookmark = observable.subscribeOn(Schedulers.io())
                .observeOn(AndroidSchedulers.mainThread())
                .subscribeWith(new DisposableObserver<BookMark_List>() {
                    @Override
                    public void onNext(BookMark_List bookMark_list) {
                        if ( !AppUtils.isNull( bookMark_list ) && !AppUtils.isNull( bookMark_list.getData() ) && bookMark_list.getData().size()>0 )
                        {
                            mediatorLiveData.postValue( bookMark_list.getData() );
                            insertBookmarkPost(bookMark_list.getData());
                        }else
                        {
                            getBookmarkList(mediatorLiveData);
                        }

                    }

                    @Override
                    public void onError(Throwable e) {
                        getBookmarkList(mediatorLiveData);
                    }

                    @Override
                    public void onComplete() {
                            dBookmark.dispose();

                    }
                });
        //.subscribe(posts_list -> insertAllPost(posts_list.getData()) , System.out::println);
        //compositeDisposable.add(d);
    }

    //TODO Room Updates

    public Boolean updateBookmarkRoom(BookMark_List_Data bookMark_list_data, boolean value) {

            updateBookmark(value, bookMark_list_data.getUserName(), bookMark_list_data.getBlogId(), bookMark_list_data.getTitle(), bookMark_list_data.getUserId());


        executor.execute(() -> {

            MyDatabase.getDatabase(context).OUD().setBookMarkTrue(bookMark_list_data.getBlogId(), value);

            if ( value )
                MyDatabase.getDatabase(context).OUD().insertBookMark(bookMark_list_data);
            else
                MyDatabase.getDatabase(context).OUD().deleteBookmarkedPost(bookMark_list_data.getBlogId());
        });
        //mDataRepository.insert(dataItem);
        return true;
    }

    public void updateFollowRoom(String dataItem, boolean value, int followValue, String otherUserID,
                             String otherUsername, String postTitle) {

            Log.i(TAG, "updateFollowRoom: "+ dataItem+" ---- "+value);
            updateFollow(value, otherUsername, dataItem, postTitle, otherUserID);

        executor.execute(() -> {
            MyDatabase.getDatabase(context).OUD().setFollowedStatus(otherUserID, value, followValue);
        });

    }

    public void updateRateRoom(String dataItem, boolean value, int rateValue, String otherUserID,
                           String otherUsername, String postTitle) {


        updateRating(value, otherUsername, dataItem, postTitle, otherUserID);


        Log.i(TAG, "updateRateRoom: "+ dataItem+" ---- "+value);
        executor.execute(() -> {
            MyDatabase.getDatabase(context).OUD().setRatedStat(dataItem, value, rateValue);
        });

    }

    public Boolean updateCommentRoom(String blogID, String comment, String otherUserID,
                                  String otherUsername, String postTitle, int commentCount) {


        Log.i(TAG, "updateCommentRoom: "+ blogID+" ---- "+comment);
        updateComment(comment, otherUsername, blogID, postTitle, otherUserID);
        executor.execute(() -> {
            MyDatabase.getDatabase(context).OUD().updateCommentCount(blogID, commentCount);
        });
        //mDataRepository.insert(dataItem);
        return true;
    }


    // TODO All links

    private void updateBookmark(Boolean Bookmark, String writerName, String bId,String postTitle,String otherUserID) {
        RetroFitClient PostList = ServiceGenerator.getRetrofitOld().create(RetroFitClient.class);
        Single<String> call = null;
        if(Bookmark) {
             call = PostList.bookmark(userData.getAccess_token(),bId, String.valueOf(userData.getId()));
        }else{
           call = PostList.unBookmark(userData.getAccess_token(),bId,String.valueOf(userData.getId()));
        }

//        call.enqueue(new Callback<String>() {
//            @Override
//            public void onResponse(@NonNull Call<String> call, @NonNull Response<String> response) {
//                assert response.body() != null;
//                //Call for FCM Notification
//                if(Bookmark) {
//
//                    fcm_noti_single("bookmark", otherUserID, writerName, postTitle);
//                    fcm_noti_Multi("bookmark", otherUserID, writerName, postTitle);
//                }
//                Log.d(TAG, "onResponse Bookmark: " + response.body());
//            }
//
//            @Override
//            public void onFailure(@NonNull Call <String> call, @NonNull Throwable t) {
//                String message = t.toString();
//                Toast.makeText(context, message, Toast.LENGTH_LONG).show();
//                Log.d(TAG,"UnSuccessful Bookmark>>"+ message);
//            }
//        });

        call.subscribeOn( Schedulers.io() )
                .observeOn( AndroidSchedulers.mainThread() )
                .subscribe( new Consumer<String>() {
                    @Override
                    public void accept(String s) throws Exception {
                        if(Bookmark) {

                            AppUtils.fcm_noti_single( otherUserID,"bookmark",writerName,postTitle );
                            AppUtils.fcm_noti_single( otherUserID,"bookmark",writerName,postTitle );
                        }
                    }
                } , new Consumer<Throwable>() {
                    @Override
                    public void accept(Throwable throwable) throws Exception {

                        Toast.makeText(context, throwable.getMessage(), Toast.LENGTH_LONG).show();
                        Log.d(TAG,"UnSuccessful Bookmark>>"+ throwable.getMessage());
                    }
                } );



    }

    private void updateFollow(Boolean Follow, String writerName, String bId, String postTitle, String otherUserID) {
        RetroFitClient PostList = ServiceGenerator.getRetrofit().create(RetroFitClient.class);
        Call<DefaultResponse> call = null;
//        if(Follow) {
            call = PostList.follow(userData.getAccess_token(),otherUserID, String.valueOf(userData.getId()));
//        }else{
//            call = PostList.unfollow(userData.getAccess_token(),bId, String.valueOf(userData.getId()!=null? userData.getId():userData.getuId()));
//        }

        call.enqueue(new Callback<DefaultResponse>() {
            @Override
            public void onResponse(@NonNull Call<DefaultResponse> call, @NonNull Response<DefaultResponse> response) {
                assert response.body() != null;
                Log.i(TAG, "onResponse Follow: " + response.body());
                //Call for FCM Notification
                if(Follow) {

                    AppUtils.fcm_noti_single( otherUserID,"follow",writerName,postTitle );
                    AppUtils.fcm_noti_Multi( userData.getId(),"followed",writerName,writerName,postTitle ,bId,otherUserID);

                }
            }

            @Override
            public void onFailure(@NonNull Call <DefaultResponse> call, @NonNull Throwable t) {
                String message = t.toString();
                Toast.makeText(context, message, Toast.LENGTH_LONG).show();
                Log.d(TAG,"UnSuccessful Follow>>"+ message);
            }
        });
    }


    private void updateRating(Boolean Rate, String writerName, String bId, String postTitle, String otherUserID) {
            RetroFitClient PostList = ServiceGenerator.getRetrofit().create(RetroFitClient.class);


        PostList.addRating( bId,String.valueOf( userData.getId()==null ? userData.getuId(): userData.getId() ),String.valueOf(Rate? 1:-1) ).subscribeOn( Schedulers.io() )
                .observeOn( AndroidSchedulers.mainThread() )
                .subscribe( new SingleObserver<String>() {
                    @Override
                    public void onSubscribe(Disposable d) {

                    }

                    @Override
                    public void onSuccess(String s) {
                        if(Rate) {
                            AppUtils.fcm_noti_single( otherUserID,"rate",writerName,postTitle );
                            AppUtils.fcm_noti_Multi( userData.getId(),"rated",writerName,writerName,postTitle ,bId,otherUserID);
                        }
                    }

                    @Override
                    public void onError(Throwable e) {
                        Toast.makeText(context, e.getMessage(), Toast.LENGTH_LONG).show();
                        Log.i(TAG, "onResponse Rate: " + e.getMessage());

                    }
                } );
        }

    private void updateComment(String comment, String writerName, String bId, String postTitle, String otherUserID) {
        RetroFitClient PostList = ServiceGenerator.getRetrofitOld().create(RetroFitClient.class);

        Call<LatestPost> call = PostList.postComment(userData.getAccess_token(),String.valueOf(userData.getId()),bId,comment);

        call.enqueue(new Callback<LatestPost>() {
            @Override
            public void onResponse(@NonNull Call<LatestPost> call, @NonNull Response<LatestPost> response) {
                assert response.body() != null;
                Log.i(TAG, "onResponse Rate: " + response.body());
                //Call for FCM Notification


                AppUtils.fcm_noti_single( otherUserID,"comment",writerName,postTitle );
                AppUtils.fcm_noti_Multi( userData.getId(),"commented",writerName,writerName,postTitle ,bId,otherUserID);

            }

            @Override
            public void onFailure(@NonNull Call <LatestPost> call, @NonNull Throwable t) {
                String message = t.toString();
                Toast.makeText(context, message, Toast.LENGTH_LONG).show();
                Log.d(TAG,"UnSuccessful Follow >>"+ message);
            }
        });
    }

//    public void updateProfile(String Pname, String Uname, String Wo, String Intro, String dob) {
//        RetroFitClient PostList = ServiceGenerator.getRetrofitOld().create(RetroFitClient.class);
//
//        Call<UserData> call = PostList.updateProfile(userData.getId(), Pname, Uname, Wo, Intro, dob );
//
//        call.enqueue(new Callback<UserData>() {
//            @Override
//            public void onResponse(@NonNull Call<UserData> call, @NonNull Response<UserData> response) {
//                assert response.body() != null;
//                Log.i(TAG, "onResponse Rate: " + response.body());
//
//            }
//
//            @Override
//            public void onFailure(@NonNull Call <UserData> call, @NonNull Throwable t) {
//                String message = t.toString();
//                Toast.makeText(context, message, Toast.LENGTH_LONG).show();
//                Log.d(TAG,"Profile Update UnSuccessful >>"+ message);
//            }
//        });
//    }


    public void getBlogsByCategory(String subCategory,MediatorLiveData<List<Post_List_Data>> liveData)
    {
        RetroFitClient blogCategory = ServiceGenerator.getRetrofitOld().create(RetroFitClient.class);

        compositeDisposable.add( blogCategory.searchBlogByCategory( userData.getAccess_token(),subCategory )
        .subscribeOn( Schedulers.io() )
        .observeOn( AndroidSchedulers.mainThread() )
        .subscribe( new Consumer<Posts_List_Response>() {
            @Override
            public void accept(Posts_List_Response post_list_data) throws Exception {
                if ( post_list_data!=null && post_list_data.getData().getData()!=null)
                {
                    liveData.postValue( post_list_data.getData().getData() );
                }else
                {
                    executor.execute(() -> {
                        List<Post_List_Data> post_list_data1=MyDatabase.getDatabase(context).OUD().getBlogsByCategory( subCategory );
                        if ( post_list_data1!=null )
                            liveData.postValue( post_list_data1 );
                    });
                }


            }
        } , new Consumer<Throwable>() {
            @Override
            public void accept(Throwable throwable) throws Exception {
                executor.execute(() -> {
                    List<Post_List_Data> post_list_data1=MyDatabase.getDatabase(context).OUD().getBlogsByCategory( subCategory );
                    if ( post_list_data1!=null )
                        liveData.postValue( post_list_data1 );
                });
            }
        } ));

    }

    public void getMYWorldData(MediatorLiveData<List<MyWorldModel>> liveData)
    {
        RetroFitClient getMyWorldBlogs = ServiceGenerator.getRetrofit().create(RetroFitClient.class);
        getMyWorldBlogs.getMyWorldBlogs( userData.getAccess_token(),userData.getId(),50 )
                .subscribeOn( Schedulers.computation() )
                .observeOn( AndroidSchedulers.mainThread() )
                .subscribe( new Consumer<MyWorldResponse>() {
                    @Override
                    public void accept(MyWorldResponse myWorldResponse) throws Exception {

                        if ( myWorldResponse.getSuccess().equals( "1" ))
                        {
                            if ( !AppUtils.isNull( myWorldResponse.getData() ) )
                            {
                                executor.execute(() -> mDataDao.insertAllMyWorldData(myWorldResponse.getData()));
                                liveData.postValue( myWorldResponse.getData() );
                            }else
                            {
                                executor.execute(() -> {
                                    List<MyWorldModel> myworldData=MyDatabase.getDatabase(context).OUD().getAllMyworldData(  );
                                    if ( myworldData!=null )
                                        liveData.postValue( myworldData );
                                    else
                                        liveData.postValue( null );
                                });
                            }
                        }
                        else
                        {
                            String message = myWorldResponse.getMessage();

                            executor.execute(() -> {
                                List<MyWorldModel> myworldData=MyDatabase.getDatabase(context).OUD().getAllMyworldData(  );
                                if ( myworldData!=null )
                                    liveData.postValue( myworldData );
                                else
                                    liveData.postValue( null );
                            });

//                            getTrendingUsers();
                        }
                    }
                } , new Consumer<Throwable>() {
                    @Override
                    public void accept(Throwable throwable) throws Exception {
//                        AppUtils.ShowView( progressBar,false );
                        executor.execute(() -> {
                            List<MyWorldModel> myworldData=MyDatabase.getDatabase(context).OUD().getAllMyworldData(  );
                            if ( myworldData!=null )
                                liveData.postValue( myworldData );
                            else
                            {
                                liveData.postValue( null );
                            }

                        });
                    }
                } );
    }

    public void deleteBlogById(long blogId)
    {
        executor.execute(() -> {
            mDataDao.deleteBlogPost( blogId );
            mDataDao.deletePersonalBlogPost(blogId);
        });

    }

    public void clearMyWorldData()
    {
        executor.execute(() -> {
            MyDatabase.getDatabase(context).OUD().clearMyWorldData();
            });

    }
}


