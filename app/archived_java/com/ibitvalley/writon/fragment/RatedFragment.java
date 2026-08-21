package com.ibitvalley.writon.fragment;

import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
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
import android.widget.LinearLayout;
import android.widget.ProgressBar;
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
import com.ibitvalley.writon.MyWorldActionListener;
import com.ibitvalley.writon.classes.roomdataclasses.BookMark_List_Data;
import com.ibitvalley.writon.googleAnalytics.MyApplication;
import com.ibitvalley.writon.R;
import com.ibitvalley.writon.adapter.LatestBlogAdapter;
import com.ibitvalley.writon.adapter.MostReadBlogAdapter;
import com.ibitvalley.writon.classes.roomdataclasses.Post_List_Data;
import com.ibitvalley.writon.classes.view_model.OUD_Viewmodel;
import com.ibitvalley.writon.model.MyWorldModel;

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
public class RatedFragment extends Fragment{
    private View rootView;


    private Context thiscontext;
    private LatestBlogAdapter latestLatestBlogAdapter;

    private MostReadBlogAdapter mostReadAdapter;

    private RecyclerView recyclerViewLatest;
    private Handler handler;

    private FrameLayout fabFrame;
    private boolean fabExpanded = false;
    private FloatingActionButton fabSettings;
    private LinearLayout layoutFabSave;
    private LinearLayout layoutFabEdit;
    private LinearLayout layoutFabPhoto;
    private LinearLayout layoutMyBlog;
    private OUD_Viewmodel oud_Viewmodel;
    private TextView tvViewAll;
    @BindView(R.id.progress_bar_LatestPost) ProgressBar progressBar;

    private LinearLayoutManager linearLayoutManager;
    private CompositeDisposable disposable= new CompositeDisposable();

    public static Fragment newInstance() {

        return new RatedFragment();

    }


    @RequiresApi(api = Build.VERSION_CODES.KITKAT)
    @Override
    public View onCreateView(LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {

        rootView = inflater.inflate(R.layout.rated_frag, container, false);
        ButterKnife.bind(this, rootView);
        oud_Viewmodel = new ViewModelProvider(this).get(OUD_Viewmodel.class);
        thiscontext = getContext();


        linearLayoutManager = new LinearLayoutManager(getContext());
        recyclerViewLatest = (RecyclerView) rootView.findViewById(R.id.recyclerViewLatest16);
        //ivSearch = (ImageView) rootView.findViewById(R.id.ivSearch);
       // ivSearch1 = (ImageView) rootView.findViewById(R.id.ivSearch1);

        //initilize(catValue);



        MyApplication.getInstance().trackEvent("Posts", "Read Post List", "Most rated posts");
        MyApplication.getInstance().trackScreenView("Most rated");

        disposable.add(oud_Viewmodel.getTopRated()
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

    void UpdateRecyclerView(){


    }



    @RequiresApi(api = Build.VERSION_CODES.KITKAT)
    private void displayLatestPost(List<Post_List_Data> latestBlog){


        linearLayoutManager.setOrientation(LinearLayoutManager.VERTICAL);
        recyclerViewLatest.setLayoutManager(linearLayoutManager);
        recyclerViewLatest.setItemAnimator(new DefaultItemAnimator());
        Collections.sort(latestBlog, new Comparator<Post_List_Data>() {
            @Override
            public int compare(Post_List_Data lhs, Post_List_Data rhs) {
                return rhs.getRatingCount().compareTo(lhs.getRatingCount());
            }
        });
        Parcelable recyclerViewState;
        recyclerViewState = Objects.requireNonNull(recyclerViewLatest.getLayoutManager()).onSaveInstanceState();
        latestLatestBlogAdapter = new LatestBlogAdapter( Objects.requireNonNull( getActivity() ) ,
                getContext() , latestBlog , new MyWorldActionListener() {
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
        if(latestLatestBlogAdapter.getItemCount()>0) {
            progressBar.setVisibility(View.GONE);
        }
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

