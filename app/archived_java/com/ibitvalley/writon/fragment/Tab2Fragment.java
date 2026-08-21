package com.ibitvalley.writon.fragment;

import android.app.ProgressDialog;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.util.Log;
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

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.annotation.RequiresApi;
import androidx.appcompat.app.AlertDialog;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.DefaultItemAnimator;
import androidx.recyclerview.widget.GridLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.google.android.material.floatingactionbutton.FloatingActionButton;
import com.google.android.material.tabs.TabLayout;
import com.ibitvalley.writon.googleAnalytics.MyApplication;
import com.ibitvalley.writon.R;
import com.ibitvalley.writon.adapter.FollowersAdapter;
import com.ibitvalley.writon.classes.view_model.OUD_Viewmodel;
import com.ibitvalley.writon.model.Followers;
import com.ibitvalley.writon.model.User;
import com.ibitvalley.writon.model.followData;
import com.ibitvalley.writon.retroFit.RetroFitClient;
import com.ibitvalley.writon.retroFit.ServiceGenerator;
import com.ibitvalley.writon.utils.WritOnPreference;

import java.util.List;
import java.util.Objects;

import butterknife.BindView;
import butterknife.ButterKnife;
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

public class Tab2Fragment extends Fragment {

    private static final String TAG = "Following List";
    private View rootView;
    private TabLayout mTabHost;

    private Context thiscontext;
    private FollowersAdapter latestLatestBlogAdapter;


    private RecyclerView recyclerViewLatest;
    private ImageView ivSearch, ivSearch1, IVSync;
    private Handler handler;
    @BindView(R.id.progress_bar)
    ProgressBar progressBar;
    User userData;




    @RequiresApi(api = Build.VERSION_CODES.KITKAT)
    @Override
    public View onCreateView(LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {

        rootView = inflater.inflate(R.layout.followers_list, container, false);
        thiscontext = container.getContext();
        ivSearch = rootView.findViewById(R.id.ivSearch);
        ivSearch1 = rootView.findViewById(R.id.ivSearch1);
        recyclerViewLatest = rootView.findViewById(R.id.recyclerViewLatest17);
        userData = WritOnPreference.getInstance(getActivity()).getUserDetails();
        ButterKnife.bind(this, rootView);




        String catValue = "";
        if(getArguments()!=null) {
            catValue = String.valueOf(this.getArguments().getString("cName"));
        }
        IVSync = rootView.findViewById(R.id.IVSync16);


        initilize(catValue);

        thiscontext = container.getContext();
        updateFollowersList();
        MyApplication.getInstance().trackEvent("User list", "See User List", "Followers");
        MyApplication.getInstance().trackScreenView("Followers user list");
        return rootView;
    }


    private void updateFollowersList() {
        RetroFitClient PostList = ServiceGenerator.getRetrofit().create(RetroFitClient.class);

        Call<Followers> call = PostList.getFollowingList(userData.getAccess_token(),userData.getId());

        call.enqueue(new Callback<Followers>() {
            @Override
            public void onResponse(@NonNull Call<Followers> call, @NonNull Response<Followers> response) {
                assert response.body() != null;
                Log.i(TAG, "onResponse Followers list: " + response);
                displayLatestPost(response.body().getData());
                progressBar.setVisibility(View.GONE);

            }

            @Override
            public void onFailure(@NonNull Call <Followers> call, @NonNull Throwable t) {
                String message = t.toString();
                Toast.makeText(getContext(), message, Toast.LENGTH_LONG).show();
                Log.d(TAG,"UnSuccessful Followers list >>"+ message);
            }
        });
    }



    ProgressDialog progress;

    @RequiresApi(api = Build.VERSION_CODES.KITKAT)
    private void initilize(final String catValue) {

        GridLayoutManager latestLayoutManager = new GridLayoutManager(thiscontext, 2);
        //latestLayoutManager.setOrientation(LinearLayoutManager.VERTICAL);
        latestLayoutManager.setOrientation(RecyclerView.VERTICAL);
        recyclerViewLatest.setHasFixedSize(true);
        recyclerViewLatest.setLayoutManager(latestLayoutManager);
        recyclerViewLatest.setItemAnimator(new DefaultItemAnimator());

        recyclerViewLatest.setAdapter(latestLatestBlogAdapter);

    }

    private void displayLatestPost(List<followData> latestBlog){
        latestLatestBlogAdapter = new FollowersAdapter(getActivity(), Objects.requireNonNull(getContext()), latestBlog);
        //Adapter set to recyclerView
        recyclerViewLatest.setAdapter(latestLatestBlogAdapter);
        latestLatestBlogAdapter.notifyDataSetChanged();
    }

    @Override
    public void onResume() {
        super.onResume();
    }


}
