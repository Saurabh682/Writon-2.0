package com.ibitvalley.writon.pagination;

import android.app.Application;
import android.util.Log;

import androidx.paging.PageKeyedDataSource;
import androidx.paging.PagingSource;

import com.ibitvalley.writon.classes.dao.OtherUserDao;
import com.ibitvalley.writon.classes.model.Posts_List;
import com.ibitvalley.writon.classes.roomdataclasses.Other_Users_Room;
import com.ibitvalley.writon.classes.roomdataclasses.Post_List_Data;
import com.ibitvalley.writon.model.User;
import com.ibitvalley.writon.retroFit.RetroFitClient;
import com.ibitvalley.writon.retroFit.ServiceGenerator;
import com.ibitvalley.writon.utils.AppUtils;
import com.ibitvalley.writon.utils.WritOnPreference;

import org.jetbrains.annotations.NotNull;
import org.jetbrains.annotations.Nullable;

import java.util.List;
import java.util.concurrent.Executor;

import io.reactivex.android.schedulers.AndroidSchedulers;
import io.reactivex.disposables.CompositeDisposable;
import io.reactivex.functions.Consumer;
import io.reactivex.schedulers.Schedulers;
import kotlin.coroutines.Continuation;

public class BlogsDataSource extends PageKeyedDataSource<Integer, Post_List_Data> {


    CompositeDisposable compositeDisposable;
    OtherUserDao blogsDao;
    Executor executor;
    int initialPageNumber;
    User userData;

    public BlogsDataSource(User user,CompositeDisposable compositeDisposable  , OtherUserDao blogsDao , Executor executor , int initialPageNumber) {
        this.compositeDisposable = compositeDisposable;
        this.blogsDao = blogsDao;
        this.executor = executor;
        this.initialPageNumber = initialPageNumber;
        userData=user;
    }

    @Override
    public void loadAfter(@NotNull LoadParams<Integer> loadParams , @NotNull LoadCallback<Integer, Post_List_Data> loadCallback) {
        getPostsByPage( loadParams.key,loadParams.key+1,null,loadCallback );

    }

    @Override
    public void loadBefore(@NotNull LoadParams<Integer> loadParams , @NotNull LoadCallback<Integer, Post_List_Data> loadCallback) {
        getPostsByPage( loadParams.key,loadParams.key-1,null,loadCallback );

    }

    @Override
    public void loadInitial(@NotNull LoadInitialParams<Integer> loadInitialParams , @NotNull LoadInitialCallback<Integer, Post_List_Data> loadInitialCallback) {
        getPostsByPage( initialPageNumber,initialPageNumber+1,loadInitialCallback,null );


    }

    public void getPostsByPage(final int currentPage, final int nextPage, final LoadInitialCallback<Integer, Post_List_Data> initialCallback, final LoadCallback<Integer,Post_List_Data> loadCallback)
    {
        RetroFitClient PostList = ServiceGenerator.getRetrofit().create(RetroFitClient.class);

         blogsDao.getAllPostRx().subscribeOn( Schedulers.io() ).observeOn( AndroidSchedulers.mainThread() )
                .subscribe( new Consumer<List<Post_List_Data>>() {
                    @Override
                    public void accept(List<Post_List_Data> post_list_data) throws Exception {
                        if ( !AppUtils.isNull( post_list_data ) && post_list_data.size()>0 )
                            initialCallback.onResult( post_list_data , null ,
                                    nextPage );
                    }
                }, new Consumer<Throwable>() {
                    @Override
                    public void accept(Throwable throwable) throws Exception {
                        //do nothing
                    }
                }   );


        compositeDisposable.add(
                PostList.getPostDataPagintion(userData.getId(),20,currentPage )
                        .subscribeOn(
                                Schedulers.io() ).observeOn( AndroidSchedulers.mainThread() ).subscribe(
                        new Consumer<Posts_List>() {
                            @Override
                            public void accept(final Posts_List posts_list) throws Exception {

                                if ( !AppUtils.isNull( posts_list ) && !AppUtils.isNull( posts_list.getData() ) && posts_list.getData().size()>0 )
                                    executor.execute( new Runnable() {
                                        @Override
                                        public void run() {
                                            blogsDao.insertAllBlogs( posts_list.getData() );
                                        }
                                    } );
                                if ( initialCallback != null ) {
                                    initialCallback.onResult( posts_list.getData() , null ,
                                            nextPage );
                                } else if ( loadCallback != null ) {
                                    loadCallback.onResult( posts_list.getData() ,
                                            nextPage );
                                }

                            }
                        } , new Consumer<Throwable>() {
                            @Override
                            public void accept(Throwable throwable) throws Exception {


                            }
                        } ) );

    }
}
