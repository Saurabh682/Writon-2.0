package com.ibitvalley.writon.Fragment;

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
import android.widget.RelativeLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.Nullable;
import androidx.annotation.RequiresApi;
import androidx.appcompat.app.AlertDialog;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.DefaultItemAnimator;
import androidx.recyclerview.widget.GridLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.android.volley.VolleyError;
import com.google.android.material.floatingactionbutton.FloatingActionButton;
import com.google.android.material.tabs.TabLayout;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.ibitvalley.writon.AllBlogActivity;
import com.ibitvalley.writon.GoogleAnalytics.MyApplication;
import com.ibitvalley.writon.R;
import com.ibitvalley.writon.adapter.FollowersAdapter;
import com.ibitvalley.writon.model.Followers;
import com.ibitvalley.writon.model.User;
import com.ibitvalley.writon.utils.VolleySingleton;
import com.ibitvalley.writon.utils.WritOnPreference;
import com.ibitvalley.writon.webapi.WebConstants;
import com.ibitvalley.writon.webapi.util.OnResponseListener2;
import com.ibitvalley.writon.webapi.util.SmartPostWebRequest;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Objects;

public class Tab2Fragment extends Fragment {

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


    RelativeLayout rlMain;
    private FrameLayout fabFrame;
    private boolean fabExpanded = false;
    private FloatingActionButton fabSettings;
    private LinearLayout layoutFabSave;
    private LinearLayout layoutFabEdit;
    private LinearLayout layoutFabPhoto;
    private LinearLayout layoutMyBlog;

    private TextView tvViewAll, tvViewAllztwo, tvViewAllzthree, tvViewAllzfour;

    static Fragment newInstance() {
        return new LatestFragment();
    }


    @RequiresApi(api = Build.VERSION_CODES.KITKAT)
    @Override
    public View onCreateView(LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {

        rootView = inflater.inflate(R.layout.followers_list, container, false);
        assert container != null;
        thiscontext = container.getContext();
        ivSearch = rootView.findViewById(R.id.ivSearch);
        ivSearch1 = rootView.findViewById(R.id.ivSearch1);
        rlLatest = rootView.findViewById(R.id.rlLatest);
        recyclerViewLatest = rootView.findViewById(R.id.recyclerViewLatest17);
        /*rl1 = rootView.findViewById(R.id.rl1);
        rl2 = rootView.findViewById(R.id.rl2);
        rl3 = rootView.findViewById(R.id.rl3);
        rl4 = rootView.findViewById(R.id.rl4);
        rl5 = rootView.findViewById(R.id.rl5);
        rl6 = rootView.findViewById(R.id.rl6);
        rl7 = rootView.findViewById(R.id.rl7);
        rl8 = rootView.findViewById(R.id.rl8);*/


       /* tvViewAll = rootView.findViewById(R.id.tvViewAll6);
        tvViewAll.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                callAllBlogActivity("1");
            }
        });*/




        String catValue = "";
        if(getArguments()!=null) {
            catValue = String.valueOf(this.getArguments().getString("cName"));
        }
        /*ivSearch.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                //Toast.makeText(getActivity(), "Coming soon", Toast.LENGTH_LONG).show();
                Intent intentSearch = new Intent(thiscontext, BlogSearch.class);
                startActivity(intentSearch);
            }
        });
        ivSearch1.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {

                Intent homeActivity = new Intent(thiscontext, Home_Activity.class);
                homeActivity.putExtra("pageActionValue", 2);
                startActivity(homeActivity);

            }
        });*/

        IVSync = rootView.findViewById(R.id.IVSync16);


        initilize(catValue);

        try {

            handler = new Handler();
            handler.postDelayed(new Runnable() {
                public void run() {
                    if (!isNetworkAvailable()) {
                        //Toast.makeText(this, "No Internet Connection", Toast.LENGTH_SHORT).show();
                        new AlertDialog.Builder(thiscontext)
                                .setIcon(android.R.drawable.ic_dialog_alert)
                                .setTitle("No Internet Connection")
                                .setMessage("No Internet Connection, check your settings")
                                .setPositiveButton("Close", new DialogInterface.OnClickListener() {
                                    @Override
                                    public void onClick(DialogInterface dialog, int which) {
                                        //finish();
                                    }

                                })
                                .show();
                    }
                }
            }, 2000);
        }catch (Exception ex){

        }


        // rlMain = (RelativeLayout) rootView.findViewById(R.id.rlMain);
        /*fabFrame = (FrameLayout) rootView.findViewById(R.id.fabFrame);
        fabSettings = (FloatingActionButton) rootView.findViewById(R.id.fabSetting);

        layoutFabSave = (LinearLayout) rootView.findViewById(R.id.layoutFabSave);
        layoutFabEdit = (LinearLayout) rootView.findViewById(R.id.layoutFabEdit);
        layoutFabPhoto = (LinearLayout) rootView.findViewById(R.id.layoutFabPhoto);*/
        layoutMyBlog = (LinearLayout)  rootView.findViewById(R.id.layoutMyBlog);
        //layoutFabSettings = (LinearLayout) this.findViewById(R.id.layoutFabSettings);

        //When main Fab (Settings) is clicked, it expands if not expanded already.
        //Collapses if main FAB was open already.
        //This gives FAB (Settings) open/close behavior
        /*fabSettings.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                if (fabExpanded){
                    closeSubMenusFab();
                    fabFrame.setClickable(false);
                } else {
                    openSubMenusFab();
                    fabFrame.setClickable(true);
                }
            }
        });*/

        //Only main FAB is visible in the beginning
        //closeSubMenusFab();


       /* layoutFabSave.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Intent intent = new Intent(getContext(), Draft.class);
                startActivity(intent);
            }
        });

        layoutFabEdit.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Intent intent = new Intent(getContext(), writeblogstepone.class);
                startActivity(intent);
            }
        });


        layoutFabPhoto.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Intent intent = new Intent(getContext(), discus.class);
                startActivity(intent);
            }
        });

        layoutMyBlog.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Intent intent = new Intent(getContext(), MyBlog.class);
                startActivity(intent);
            }
        });
*/
        thiscontext = container.getContext();

        MyApplication.getInstance().trackEvent("User list", "See User List", "Followers");
        MyApplication.getInstance().trackScreenView("Followers user list");
        return rootView;
    }




    private void callAllBlogActivity(String screenIndex){
        Intent intentBlogList = new Intent(thiscontext, AllBlogActivity.class);
        intentBlogList.putExtra("boxTitle", screenIndex);
        startActivity(intentBlogList);
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




    private boolean isNetworkAvailable() {
        ConnectivityManager connectivityManager
                = (ConnectivityManager) thiscontext.getSystemService(Context.CONNECTIVITY_SERVICE);
        assert connectivityManager != null;
        NetworkInfo activeNetworkInfo = connectivityManager.getActiveNetworkInfo();
        return activeNetworkInfo != null && activeNetworkInfo.isConnected();
    }

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

        loadLatestPost();


    }


    // Fetching Latest Post

    @RequiresApi(api = Build.VERSION_CODES.KITKAT)
    private void loadLatestPost() {

        User userData2 = WritOnPreference.getInstance(Objects.requireNonNull(getContext()).getApplicationContext()).getUserDetails();
        //LLNoPost.setVisibility(View.INVISIBLE);
        rlLatest.setVisibility(View.VISIBLE);


        HashMap<String, String> hmHomeParam = new HashMap <>();
        //hmHomeParam.put("page", "1");
        hmHomeParam.put("id", userData2.getId());
        SmartPostWebRequest mainCategory = new SmartPostWebRequest(WebConstants.Following_List, thiscontext, true, hmHomeParam, new OnResponseListener2() {
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
    }


    @RequiresApi(api = Build.VERSION_CODES.KITKAT)
    private void displayLatestPost(ArrayList<Followers> latestBlog){
        latestLatestBlogAdapter = new FollowersAdapter(getActivity(), getContext(), latestBlog);
        //Adapter set to recyclerView
        recyclerViewLatest.setAdapter(latestLatestBlogAdapter);
        latestLatestBlogAdapter.notifyDataSetChanged();
    }




    @Override
    public void onResume() {
        super.onResume();
    }


}
