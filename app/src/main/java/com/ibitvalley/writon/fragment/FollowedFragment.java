package com.ibitvalley.writon.fragment;

import android.content.Context;
import android.content.DialogInterface;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Parcelable;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.RelativeLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.Nullable;
import androidx.annotation.RequiresApi;
import androidx.appcompat.app.AlertDialog;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.DefaultItemAnimator;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.google.android.material.floatingactionbutton.FloatingActionButton;
import com.google.android.material.tabs.TabLayout;
import com.ibitvalley.writon.MyWorldActionListener;
import com.ibitvalley.writon.R;
import com.ibitvalley.writon.adapter.LatestBlogAdapter;
import com.ibitvalley.writon.adapter.MostReadBlogAdapter;
import com.ibitvalley.writon.adapter.TopFollowersAdapter;
import com.ibitvalley.writon.classes.roomdataclasses.BookMark_List_Data;
import com.ibitvalley.writon.classes.roomdataclasses.Post_List_Data;
import com.ibitvalley.writon.classes.view_model.OUD_Viewmodel;
import com.ibitvalley.writon.googleAnalytics.MyApplication;
import com.ibitvalley.writon.model.MyWorldModel;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

import butterknife.BindView;
import butterknife.ButterKnife;
import io.reactivex.android.schedulers.AndroidSchedulers;
import io.reactivex.disposables.CompositeDisposable;
import io.reactivex.functions.Consumer;
import io.reactivex.schedulers.Schedulers;

/**
 * Created by Android_PC on 10-08-2016.
 */
public class FollowedFragment extends Fragment{
    private View rootView;
    private TabLayout mTabHost;
    //Recent Blog List
    //ArrayList<Blog> blogArrayList;
    //Most Read Blog List
    //ArrayList<Blog> arrMostReadBlog;
    //Most BookMarked Blog List
    //ArrayList<Blog> arrMostBookMarketBlog;
   /* @BindView(R.id.ivDownloadingiew) ImageView ivDownV;
    @BindView(R.id.ivErrorView) ImageView ivErrorV;*/


    private Context thiscontext;
    private LatestBlogAdapter latestLatestBlogAdapter;



    private RecyclerView recyclerViewLatest;




    private OUD_Viewmodel oud_Viewmodel;
    @BindView(R.id.progress_bar_LatestPost) ProgressBar progressBar;

    private LinearLayoutManager linearLayoutManager;
    private TextView tvViewAll, tvViewAllztwo, tvViewAllzthree, tvViewAllzfour;
    private CompositeDisposable disposable = new CompositeDisposable();

    public static Fragment newInstance() {

        return new FollowedFragment();

    }


    @RequiresApi(api = Build.VERSION_CODES.KITKAT)
    @Override
    public View onCreateView(LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {

        rootView = inflater.inflate(R.layout.followed_frag, container, false);
        ButterKnife.bind(this, rootView);
        oud_Viewmodel = new ViewModelProvider(this).get(OUD_Viewmodel.class);
        thiscontext = getContext();
        linearLayoutManager = new LinearLayoutManager(getContext());
        recyclerViewLatest = (RecyclerView) rootView.findViewById(R.id.recyclerViewLatest16);



        MyApplication.getInstance().trackEvent("Posts", "Read Post List", "Most followed posts");
        MyApplication.getInstance().trackScreenView("Most followed");

        disposable.add(oud_Viewmodel.getMostFollowed()
                .subscribeOn(Schedulers.computation())
                .observeOn(AndroidSchedulers.mainThread())
                .subscribe(new Consumer<List<Post_List_Data>>() {
                               @Override
                               public void accept(List<Post_List_Data> listData) throws Exception {
                                   progressBar.setVisibility(View.GONE);
                                   displayLatestPost(listData);
                               }
                           }, new Consumer<Throwable>() {
                               @Override
                               public void accept(Throwable throwable) throws Exception {
                                   Toast.makeText(getContext(),
                                           "Error: " + throwable,
                                           Toast.LENGTH_SHORT)
                                           .show();

                               }
                           }
                ));
        return rootView;
    }


    @RequiresApi(api = Build.VERSION_CODES.KITKAT)
    private void displayLatestPost(List<Post_List_Data> latestBlog){
        linearLayoutManager.setOrientation(LinearLayoutManager.VERTICAL);
        recyclerViewLatest.setLayoutManager(linearLayoutManager);
        recyclerViewLatest.setItemAnimator(new DefaultItemAnimator());
        List<Post_List_Data> noRepeat = new ArrayList<Post_List_Data>();

        for (Post_List_Data event : latestBlog) {
            boolean isFound = false;
            // check if the event name exists in noRepeat
            for (Post_List_Data e : noRepeat) {
                if (e.getUserName().equals(event.getUserName()) || (e.equals(event))) {
                    isFound = true;
                    break;
                }
            }
            if (!isFound) noRepeat.add(event);
        }
        Collections.sort(noRepeat, new Comparator<Post_List_Data>() {
            @Override
            public int compare(Post_List_Data lhs, Post_List_Data rhs) {
                return rhs.getUserFollowersCount().compareTo(lhs.getUserFollowersCount());
            }
        });

        Parcelable recyclerViewState;
        recyclerViewState = Objects.requireNonNull(recyclerViewLatest.getLayoutManager()).onSaveInstanceState();
        latestLatestBlogAdapter = new LatestBlogAdapter( Objects.requireNonNull( getActivity() ) ,
                getContext() , noRepeat , new MyWorldActionListener() {
            @Override
            public void onClick(int position , String action , String blogId , boolean value , String userId , String username , String title) {
                latestBlog.get( position ).setIsFollowed( value );
                oud_Viewmodel.updateFollowRoom(blogId, value,value ? 1 : 0,userId, username,title);
                latestLatestBlogAdapter.notifyDataSetChanged();
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
        recyclerViewLatest.setHasFixedSize(true);
        latestLatestBlogAdapter.notifyDataSetChanged();
        recyclerViewLatest.getLayoutManager().onRestoreInstanceState(recyclerViewState);
        progressBar.setVisibility(View.GONE);
    }


    @Override
    public void onResume() {
        super.onResume();
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        disposable.clear();
    }



}

