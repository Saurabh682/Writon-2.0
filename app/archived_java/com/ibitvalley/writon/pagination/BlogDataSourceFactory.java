package com.ibitvalley.writon.pagination;

import android.app.Application;

import androidx.lifecycle.MutableLiveData;
import androidx.paging.DataSource;
import androidx.paging.PageKeyedDataSource;

import com.ibitvalley.writon.classes.dao.OtherUserDao;
import com.ibitvalley.writon.classes.roomdataclasses.Post_List_Data;
import com.ibitvalley.writon.model.User;
import com.ibitvalley.writon.retroFit.RetroFitClient;

import org.jetbrains.annotations.NotNull;

import java.util.concurrent.Executor;

import io.reactivex.disposables.CompositeDisposable;

public class BlogDataSourceFactory extends DataSource.Factory<Integer, Post_List_Data> {


    CompositeDisposable compositeDisposable;
    RetroFitClient retroFitClient;
    OtherUserDao blogsDao;
    Executor executor;
    int initialPageNumber;
    BlogsDataSource dataSource;

    User userData;
    public BlogDataSourceFactory(CompositeDisposable compositeDisposable, OtherUserDao blogsDao , Executor executor , int initialPageNumber , User userData) {
        this.compositeDisposable = compositeDisposable;
        this.blogsDao = blogsDao;
        this.executor = executor;
        this.initialPageNumber = initialPageNumber;
        this.userData = userData;
    }

    @NotNull
    @Override
    public DataSource<Integer, Post_List_Data> create() {
        return new BlogsDataSource( userData,compositeDisposable,blogsDao,executor,initialPageNumber );
    }



}
