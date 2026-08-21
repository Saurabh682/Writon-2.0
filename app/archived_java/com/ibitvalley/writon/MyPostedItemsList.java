package com.ibitvalley.writon;

import android.content.Context;
import android.content.DialogInterface;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.os.Bundle;
import android.os.Handler;
import android.os.Parcelable;
import android.util.Log;
import android.view.View;
import android.widget.ImageView;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.Observer;
import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.DefaultItemAnimator;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.ibitvalley.writon.fragment.LatestFragment;
import com.ibitvalley.writon.googleAnalytics.MyApplication;
import com.ibitvalley.writon.adapter.MyBlogAdapter_two;
import com.ibitvalley.writon.adapter.PersonalBlogAdapter;
import com.ibitvalley.writon.classes.roomdataclasses.PersonalPost_List_Data;
import com.ibitvalley.writon.classes.view_model.OUD_Viewmodel;
import com.ibitvalley.writon.utils.AppUtils;

import java.util.List;
import java.util.Objects;

import butterknife.BindView;
import butterknife.ButterKnife;
import io.reactivex.android.schedulers.AndroidSchedulers;
import io.reactivex.disposables.CompositeDisposable;
import io.reactivex.schedulers.Schedulers;

public class MyPostedItemsList extends BaseActivity {
    private static final String TAG = "PersonalPostFrag";
    private View rootView;

    private Context thiscontext;
    private PersonalBlogAdapter latestLatestBlogAdapter;
    //private RecyclerView recyclerViewLatest;
    private Handler handler;
    @BindView(R.id.recyclerViewMyPost)
    RecyclerView recyclerViewLatest;
    @BindView(R.id.ivErrorView)
    ImageView ivErrorV;
    @BindView(R.id.progress_bar)
    ProgressBar progressBar;
    @BindView(R.id.txt_no_records)
    TextView txt_no_records;
    private OUD_Viewmodel oud_Viewmodel;
    private LinearLayoutManager linearLayoutManager;
    static Fragment newInstance() {
        return new LatestFragment();
    }
    public static final String ARG_OBJECT = "object";
    CompositeDisposable disposable = new CompositeDisposable();

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_my_posted_items_list);
        ButterKnife.bind(this);
        oud_Viewmodel = new ViewModelProvider(this).get(OUD_Viewmodel.class);
        linearLayoutManager = new LinearLayoutManager(this);
        thiscontext = this;
        MyApplication.getInstance().trackEvent("Posts", "Read Post List", "Latest posts");
        MyApplication.getInstance().trackScreenView("Latest Post");
        //UpdateRecyclerView();
        //progressBar.setVisibility(View.GONE);

        //oud_Viewmodel.loadAllPersonalPostRx();
        UpdateRecyclerView();


    }

    void UpdateRecyclerView(){
        AppUtils.ShowView( progressBar,true );
        oud_Viewmodel.getAllPersonalPostRx();
        oud_Viewmodel.getAllPersonalPostMainRx().observe( this ,
                new Observer<List<PersonalPost_List_Data>>() {
                    @Override
                    public void onChanged(List<PersonalPost_List_Data> personalPost_list_data) {
                        AppUtils.ShowView( progressBar,false );
                        if ( !AppUtils.isNull( personalPost_list_data ) && personalPost_list_data.size()>0 )
                            displayLatestPost( personalPost_list_data );
                        else
                        {

                            AppUtils.ShowView( txt_no_records,true );
                        }
                    }
                });

        oud_Viewmodel.getBlogCount().observe(this, new Observer<Integer>() {
            @Override
            public void onChanged(@Nullable Integer integer) {
                Log.i(TAG, "onChanged2: " + integer);
            }
        });

    }

    private void displayLatestPost(List<PersonalPost_List_Data> latestBlog){
        linearLayoutManager.setOrientation(LinearLayoutManager.VERTICAL);
        recyclerViewLatest.setLayoutManager(linearLayoutManager);
        recyclerViewLatest.setItemAnimator(new DefaultItemAnimator());
        Parcelable recyclerViewState;
        recyclerViewState = Objects.requireNonNull(recyclerViewLatest.getLayoutManager()).onSaveInstanceState();
        MyBlogAdapter_two myBlogAdapter;
        myBlogAdapter = new MyBlogAdapter_two(this, this, latestBlog, "PersonalPostList");
        recyclerViewLatest.setAdapter(myBlogAdapter);
        recyclerViewLatest.setHasFixedSize(true);
        myBlogAdapter.notifyDataSetChanged();
        recyclerViewLatest.getLayoutManager().onRestoreInstanceState(recyclerViewState);
        if(myBlogAdapter.getItemCount()>0) {
            progressBar.setVisibility(View.GONE);
        }}

}