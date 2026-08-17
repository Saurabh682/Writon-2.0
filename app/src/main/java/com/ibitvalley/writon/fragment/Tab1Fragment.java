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


public class Tab1Fragment extends Fragment {
    private static final String TAG = "Followers List";
    private View rootView;
    private TabLayout mTabHost;
    //Recent Blog List
    //ArrayList<Blog> blogArrayList;
    //Most Read Blog List
    //ArrayList<Blog> arrMostReadBlog;
    //Most BookMarked Blog List
    //ArrayList<Blog> arrMostBookMarketBlog;

    private Context thiscontext;
    private FollowersAdapter latestLatestBlogAdapter;


    private RecyclerView recyclerViewLatest, recyclerView1, recyclerView2, recyclerViewMB, recyclerView4, recyclerView5, recyclerView6, recyclerView7, recyclerView8;
    private ImageView ivSearch, ivSearch1, IVSync;
    private LinearLayout LLNoPost;
    private RelativeLayout rlLatest, rl1, rl2, rl3, rl4, rl5, rl6, rl7, rl8;
    private Handler handler;
    private OUD_Viewmodel oud_Viewmodel;
    @BindView(R.id.progress_bar)
    ProgressBar progressBar;


    RelativeLayout rlMain;
    private FrameLayout fabFrame;
    private boolean fabExpanded = false;
    private FloatingActionButton fabSettings;
    private LinearLayout layoutFabSave;
    private LinearLayout layoutFabEdit;
    private LinearLayout layoutFabPhoto;
    private LinearLayout layoutMyBlog;
    User userData;

    private TextView tvViewAll, tvViewAllztwo, tvViewAllzthree, tvViewAllzfour;

    static Fragment newInstance() {
        return new LatestFragment();
    }


    @RequiresApi(api = Build.VERSION_CODES.KITKAT)
    @Override
    public View onCreateView(LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {

        rootView = inflater.inflate(R.layout.followers_list, container, false);
        thiscontext = container.getContext();
        userData = WritOnPreference.getInstance(getActivity()).getUserDetails();
        ButterKnife.bind(this, rootView);
        rlLatest = rootView.findViewById(R.id.rlLatest);
        recyclerViewLatest = rootView.findViewById(R.id.recyclerViewLatest17);




        String catValue = "";
        if(getArguments()!=null) {
            catValue = String.valueOf(this.getArguments().getString("cName"));
        }

        IVSync = rootView.findViewById(R.id.IVSync16);


        initilize(catValue);

        layoutMyBlog = rootView.findViewById(R.id.layoutMyBlog);

        thiscontext = container.getContext();
        updateFollowersList();
        MyApplication.getInstance().trackEvent("User list", "See User List", "Following");
        MyApplication.getInstance().trackScreenView("Following user list");
        return rootView;
    }


    private void updateFollowersList() {
        RetroFitClient PostList = ServiceGenerator.getRetrofit().create(RetroFitClient.class);

        Call<Followers> call = PostList.getFollowersList(userData.getAccess_token(),userData.getId());

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


   /* //closes FAB submenus
    private void closeSubMenusFab(){
        layoutFabSave.setVisibility(View.INVISIBLE);
        layoutFabEdit.setVisibility(View.INVISIBLE);
        layoutFabPhoto.setVisibility(View.INVISIBLE);
        layoutMyBlog.setVisibility(View.INVISIBLE);
        //fabSettings.setImageResource(R.drawable.ic_autorenew_black_24dp);
        fabExpanded = false;

    }

    //Opens FAB submenus
    private void openSubMenusFab(){
        layoutFabSave.setVisibility(View.VISIBLE);
        layoutFabEdit.setVisibility(View.VISIBLE);
        layoutFabPhoto.setVisibility(View.INVISIBLE);
        layoutMyBlog.setVisibility(View.INVISIBLE);
        //Change settings icon to 'X' icon
        //fabSettings.setImageResource(R.drawable.ic_check_black_24dp);
        fabExpanded = true;

    }*/


    ProgressDialog progress;

    @RequiresApi(api = Build.VERSION_CODES.KITKAT)
    private void initilize(final String catValue) {
        //blogArrayList = new ArrayList<>();
        //arrMostReadBlog = new ArrayList<>();
        //arrMostBookMarketBlog = new ArrayList<>();
        //recyclerViewLatest = rootView.findViewById(R.id.recyclerViewLatest16);


        GridLayoutManager latestLayoutManager = new GridLayoutManager(thiscontext, 2);
        //latestLayoutManager.setOrientation(LinearLayoutManager.VERTICAL);
        latestLayoutManager.setOrientation(RecyclerView.VERTICAL);
        latestLayoutManager.setSmoothScrollbarEnabled(true);
        recyclerViewLatest.setHasFixedSize(true);
        recyclerViewLatest.setLayoutManager(latestLayoutManager);
        recyclerViewLatest.setItemAnimator(new DefaultItemAnimator());



        // Adapter


        //latestLatestBlogAdapter = new LatestBlogAdapter(Objects.requireNonNull(getActivity()), getContext(), ShowBlogIngo.blogArrayList, false);
        // shortStoryAdapter = new ShortStoryAdapter(getActivity(), getContext(), ShowBlogIngo.shortStoryArrayList);
        /*mostReadAdapter = new MostReadBlogAdapter(getActivity(), Objects.requireNonNull(getContext()), ShowBlogIngo.arrMostReadBlog);
        mostBookMarkedBlogAdapter = new MostBookMarkedBlogAdapter(getActivity(), getContext(), ShowBlogIngo.arrMostBookMarketBlog);

        songsJinglesBlogAdapter = new SongsJinglesBlogAdapter(getActivity(), getContext(), ShowBlogIngo.arrSongJingles);
        jokesBlogAdapter = new JokesBlogAdapter(getActivity(), getContext(), ShowBlogIngo.arrJokes);
        reviewsBlogAdapter = new ReviewsBlogAdapter(getActivity(), getContext(), ShowBlogIngo.arrReviews);
        blogBlogAdapter = new BlogBlogAdapter(getActivity(), getContext(), ShowBlogIngo.arrBlog);
        journalismBlogAdapter = new JournalismBlogAdapter(getActivity(), getContext(), ShowBlogIngo.arrJournalism);*/

        //Adapter set to recyclerView
        recyclerViewLatest.setAdapter(latestLatestBlogAdapter);



//        if(catValue != ""){
//            getBlogsListCallApi(catValue);
//        }

        /*IVSync.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {


                //getBlogsListCallApi(catValue);
                latestLatestBlogAdapter.notifyDataSetChanged();

            }
        });*/

        //loadLatestPost();


    }


    // Fetching Latest Post

    @RequiresApi(api = Build.VERSION_CODES.KITKAT)
    /*private void loadLatestPost() {

        User userData2 = WritOnPreference.getInstance(Objects.requireNonNull(getContext()).getApplicationContext()).getUserDetails();
        //LLNoPost.setVisibility(View.INVISIBLE);
        rlLatest.setVisibility(View.VISIBLE);


        HashMap<String, String> hmHomeParam = new HashMap <>();
        //hmHomeParam.put("page", "1");
        hmHomeParam.put("id", userData2.getId());
        SmartPostWebRequest mainCategory = new SmartPostWebRequest(WebConstants.Followers_List, thiscontext, true, hmHomeParam, new OnResponseListener2() {
            @RequiresApi(api = Build.VERSION_CODES.KITKAT)
            @Override
            public ArrayList<Followers> onSuccess(Object result) {
                try {
                    JSONObject jsonResponse = new JSONObject(result.toString());
                    int status = jsonResponse.getInt("success");
                    if (status == 1) {
                        //JSONObject jsonResponseMain = jsonResponse.getJSONObject("data");
                        JSONArray arrMainCategoryJson = jsonResponse.getJSONArray("data");
                        Type type = new TypeToken<ArrayList<Followers>>() {}.getType();
                        ArrayList<Followers> latest_post = new Gson().fromJson(arrMainCategoryJson.toString(), type);
                        //loadData(arrMainCat);
                        displayLatestPost(latest_post);
                    }else{
                        String message = jsonResponse.getString("message");
                        Toast.makeText(thiscontext, message, Toast.LENGTH_LONG).show();
                    }
                } catch (JSONException e) {
                    e.printStackTrace();
                }
                return null;
            }
            @Override
            public void onError(VolleyError error) {
                Log.d("","");
            }
        });
        VolleySingleton.getInstance().addToRequestQueue(mainCategory);
    }*/



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

