package com.ibitvalley.writon.fragment;

import android.content.Context;
import android.content.DialogInterface;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Parcelable;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.annotation.RequiresApi;
import androidx.appcompat.app.AlertDialog;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.Observer;
import androidx.lifecycle.ViewModelProvider;
import androidx.paging.PagedList;
import androidx.recyclerview.widget.DefaultItemAnimator;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;


import com.ibitvalley.writon.ActionType;
import com.ibitvalley.writon.AddNewDeleteEvent;
import com.ibitvalley.writon.AddNewEvent;
import com.ibitvalley.writon.AddNewPostEvent;
import com.ibitvalley.writon.InternetConnectionEvent;
import com.ibitvalley.writon.MyWorldActionListener;
import com.ibitvalley.writon.adapter.PostListPaginationAdapter;
import com.ibitvalley.writon.classes.roomdataclasses.BookMark_List_Data;
import com.ibitvalley.writon.googleAnalytics.MyApplication;
import com.ibitvalley.writon.R;
import com.ibitvalley.writon.adapter.LatestBlogAdapter;
import com.ibitvalley.writon.classes.roomdataclasses.Post_List_Data;
import com.ibitvalley.writon.classes.view_model.OUD_Viewmodel;
import com.ibitvalley.writon.model.MyWorldModel;
import com.ibitvalley.writon.utils.AppUtils;
import com.paginate.Paginate;

import org.greenrobot.eventbus.EventBus;
import org.greenrobot.eventbus.Subscribe;
import org.greenrobot.eventbus.ThreadMode;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;

import butterknife.BindView;
import butterknife.ButterKnife;
import io.reactivex.Observable;
import io.reactivex.android.schedulers.AndroidSchedulers;
import io.reactivex.disposables.CompositeDisposable;
import io.reactivex.functions.Consumer;
import io.reactivex.schedulers.Schedulers;

/**
 * Created by Android_PC on 10-08-2016.
 */
public class LatestFragment extends Fragment implements Paginate.Callbacks {
    private static final String TAG = "LatestFrag";
    private View rootView;

    private LatestBlogAdapter latestLatestBlogAdapter;
    private RecyclerView recyclerViewLatest;
    @BindView(R.id.progress_bar) ProgressBar progressBar;
    @BindView(R.id.txt_no_records)
    TextView txt_no_records;
//    @BindView(R.id.SingleSwipe)
//    SwipeRefreshLayout SwipeRefresh;

    private OUD_Viewmodel oud_Viewmodel;
    private LinearLayoutManager linearLayoutManager;
    private List<Post_List_Data> latestBlog=new ArrayList<>(  );
    private boolean hasLoadedAllItems=false;
    private boolean isLoading=false;

    static Fragment newInstance() {
        return new LatestFragment();
    }
    public static final String ARG_OBJECT = "object";
    CompositeDisposable disposable = new CompositeDisposable();

    @Override
    public void onAttach(@NonNull Context context) {
        super.onAttach( context );
        oud_Viewmodel = new ViewModelProvider(this).get(OUD_Viewmodel.class);
    }


    int initPage=1;


    @RequiresApi(api = Build.VERSION_CODES.KITKAT)
    @Override
    public View onCreateView(LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {

        rootView = inflater.inflate(R.layout.latest_frag, container, false);
        ButterKnife.bind(this, rootView);


        linearLayoutManager = new LinearLayoutManager(getContext());
        recyclerViewLatest = rootView.findViewById(R.id.recyclerViewLatest16);

        MyApplication.getInstance().trackEvent("Posts", "Read Post List", "Latest posts");
        MyApplication.getInstance().trackScreenView("Latest Post");

        linearLayoutManager.setOrientation(LinearLayoutManager.VERTICAL);
        recyclerViewLatest.setLayoutManager(linearLayoutManager);
//        recyclerViewLatest.setItemAnimator(new DefaultItemAnimator());
        Parcelable recyclerViewState;
        recyclerViewState = Objects.requireNonNull(recyclerViewLatest.getLayoutManager()).onSaveInstanceState();
        recyclerViewLatest.setItemAnimator(null);

        latestLatestBlogAdapter = new LatestBlogAdapter( Objects.requireNonNull( getActivity() ) ,
                getContext() ,latestBlog , new MyWorldActionListener() {
            @Override
            public void onClick(int position , String action , String blogId , boolean value , String userId , String username , String title) {
                if ( action.equals( "followed" ) )
                {
                    latestBlog.get( position ).setIsFollowed( value );
                    oud_Viewmodel.updateFollowRoom(blogId, value,value ? 1 : 0,userId, username,title);
                    latestLatestBlogAdapter.notifyDataSetChanged();
                }else if ( action.equals( "View" ) )
                {
                    oud_Viewmodel.updateViewCount(latestBlog.get( position ).getViewCount(),latestBlog.get( position ).getBlogId());
                    latestBlog.get( position ).setViewCount( latestBlog.get( position ).getViewCount() );
                    latestLatestBlogAdapter.notifyDataSetChanged();
                }

            }

            @Override
            public void onClickBookmark(int position , MyWorldModel myWorldModel , boolean value) {
                BookMark_List_Data bookMark_list_data=new BookMark_List_Data( myWorldModel );
                oud_Viewmodel.updateBookmark( bookMark_list_data,value);
                latestBlog.get( position ).setIsBookmarked( value );
                latestLatestBlogAdapter.notifyDataSetChanged();

            }
        } );

        recyclerViewLatest.setAdapter(latestLatestBlogAdapter);
//        Paginate.with(recyclerViewLatest, this).build();

        recyclerViewLatest.addOnScrollListener(new RecyclerView.OnScrollListener() {
            @Override
            public void onScrollStateChanged(RecyclerView recyclerView, int newState) {
                super.onScrollStateChanged(recyclerView, newState);

                if (!recyclerView.canScrollVertically(1) && newState==RecyclerView.SCROLL_STATE_IDLE) {
                    if ( !isLoading )
                        callUpdatedPostAPI(initPage++);
                }
            }
        });

        recyclerViewLatest.getLayoutManager().onRestoreInstanceState(recyclerViewState);

        AppUtils.ShowView( progressBar,true );

        oud_Viewmodel.getUpdatedPosts(initPage);

        oud_Viewmodel.getmListLiveData().observe( this ,
                new Observer<List<Post_List_Data>>() {
                    @Override
                    public void onChanged(List<Post_List_Data> post_list_data) {
                        isLoading=false;
                        if ( !AppUtils.isNull( post_list_data ) && post_list_data.size()>0 )
                            displayLatestPost(post_list_data);
                    }
                });

        return rootView;
    }



    public void callUpdatedPostAPI(int initPage)
    {
        isLoading=true;
        oud_Viewmodel.getUpdatedPosts(initPage);
    }

    private void displayLatestPost(List<Post_List_Data> latestBlog){
        AppUtils.ShowView( progressBar,false );
        AppUtils.ShowView( txt_no_records,false );

        latestLatestBlogAdapter.addItems(latestBlog);
    }

    @Subscribe(threadMode = ThreadMode.MAIN)
    public void setAddNewPostEvent(AddNewPostEvent addNewPostEvent) {
        List<Post_List_Data> temp=this.latestBlog;
        temp.add(  addNewPostEvent.getPost_list_data());
        temp.addAll(this.latestBlog  );
        latestLatestBlogAdapter.addItems( temp );
        recyclerViewLatest.smoothScrollToPosition( 0 );
//        this.latestBlog.add( 0 ,addNewPostEvent.getPost_list_data());
//        latestLatestBlogAdapter.notifyDataSetChanged();

    }

    @Subscribe(threadMode = ThreadMode.MAIN)
    public void setAddNewEvent(AddNewEvent addNewEvent) {
        if ( addNewEvent.getType().equals( ActionType.FOLLOW ) )
            latestBlog.get( addNewEvent.getPosition() ).setIsFollowed( addNewEvent.getValue() );
        else if ( addNewEvent.getType().equals( ActionType.RATE ))
            latestBlog.get( addNewEvent.getPosition() ).setIsRated( addNewEvent.getValue() );
        else if ( addNewEvent.getType().equals( ActionType.BOOKMARK ) )
            latestBlog.get( addNewEvent.getPosition() ).setIsBookmarked( addNewEvent.getValue() );

        latestLatestBlogAdapter.notifyDataSetChanged();

    }

    @Subscribe(threadMode = ThreadMode.MAIN)
    public void setAddDeleteEvent(AddNewDeleteEvent addNewEvent) {
        for (Post_List_Data post_list_data: latestBlog)
        {
            if ( post_list_data.getBlogId().equals( addNewEvent.getId() ) )
            {
                latestBlog.remove( post_list_data );
                latestLatestBlogAdapter.notifyDataSetChanged();
                recyclerViewLatest.smoothScrollToPosition( 0 );

            }
        }
    }

    @Override
    public void onResume() {
        if (!EventBus.getDefault().isRegistered(this)) {
            EventBus.getDefault().register(this);
        }
        super.onResume();
    }

    @Override
    public void onPause() {
        if (!EventBus.getDefault().isRegistered(this)) {
            EventBus.getDefault().unregister(this);
        }
        super.onPause();
    }

    @Override
    public void onLoadMore() {
        isLoading=true;
    }

    @Override
    public boolean isLoading() {

        return isLoading;
    }

    @Override
    public boolean hasLoadedAllItems() {
        return hasLoadedAllItems;
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        disposable.clear();
    }
}
