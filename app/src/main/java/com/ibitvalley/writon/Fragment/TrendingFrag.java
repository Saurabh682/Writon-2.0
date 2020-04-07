package com.ibitvalley.writon.Fragment;

import android.app.ProgressDialog;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
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
import androidx.appcompat.app.AlertDialog;
import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentTabHost;
import androidx.recyclerview.widget.DefaultItemAnimator;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.android.volley.DefaultRetryPolicy;
import com.android.volley.Request;
import com.android.volley.RequestQueue;
import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.JsonObjectRequest;
import com.android.volley.toolbox.Volley;
import com.google.android.material.floatingactionbutton.FloatingActionButton;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.ibitvalley.writon.AllBlogActivity;
import com.ibitvalley.writon.Draft;
import com.ibitvalley.writon.MyBlog;
import com.ibitvalley.writon.R;
import com.ibitvalley.writon.adapter.BlogBlogAdapter;
import com.ibitvalley.writon.adapter.JokesBlogAdapter;
import com.ibitvalley.writon.adapter.JournalismBlogAdapter;
import com.ibitvalley.writon.adapter.LatestBlogAdapter;
import com.ibitvalley.writon.adapter.MostBookMarkedBlogAdapter;
import com.ibitvalley.writon.adapter.MostReadBlogAdapter;
import com.ibitvalley.writon.adapter.ReviewsBlogAdapter;
import com.ibitvalley.writon.adapter.ShortStoryAdapter;
import com.ibitvalley.writon.adapter.SongsJinglesBlogAdapter;
import com.ibitvalley.writon.adapter.TopFollowersAdapter;
import com.ibitvalley.writon.adapter.TopRatedAdapter;
import com.ibitvalley.writon.classes.ShowBlogIngo;
import com.ibitvalley.writon.discus;
import com.ibitvalley.writon.model.Blog;
import com.ibitvalley.writon.model.TrendingPost_Model;
import com.ibitvalley.writon.utils.VolleySingleton;
import com.ibitvalley.writon.webapi.WebConstants;
import com.ibitvalley.writon.webapi.util.OnResponseListener;
import com.ibitvalley.writon.webapi.util.SmartPostWebRequest;
import com.ibitvalley.writon.writeblogstepone;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.HashMap;

import static android.content.Context.MODE_PRIVATE;

/**
 * Created by Android_PC on 10-08-2016.
 */
public class TrendingFrag extends Fragment{
    private View rootView;
    private FragmentTabHost mTabHost;
    //Recent Blog List
    //ArrayList<Blog> blogArrayList;
    //Most Read Blog List
    //ArrayList<Blog> arrMostReadBlog;
    //Most BookMarked Blog List
    //ArrayList<Blog> arrMostBookMarketBlog;

    private Context thiscontext;
    private LatestBlogAdapter latestLatestBlogAdapter;
    private ShortStoryAdapter shortStoryAdapter;
    TopFollowersAdapter topFollowersAdapter;
    TopRatedAdapter topRatedAdapter;

    private MostReadBlogAdapter mostReadAdapter;
    private MostBookMarkedBlogAdapter mostBookMarkedBlogAdapter;
    private SongsJinglesBlogAdapter songsJinglesBlogAdapter;
    private JokesBlogAdapter jokesBlogAdapter;
    private ReviewsBlogAdapter reviewsBlogAdapter;
    private BlogBlogAdapter blogBlogAdapter;
    private JournalismBlogAdapter journalismBlogAdapter;

    private RecyclerView recyclerViewLatest;
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

    public static Fragment newInstance() {

            return new TrendingFrag();

    }


    @Override
    public View onCreateView(LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {

        rootView = inflater.inflate(R.layout.trending_frag, container, false);
        thiscontext = container.getContext();
        ivSearch = (ImageView) rootView.findViewById(R.id.ivSearch);
        ivSearch1 = (ImageView) rootView.findViewById(R.id.ivSearch1);
        rlLatest = (RelativeLayout) rootView.findViewById(R.id.rlLatesttf);
        rl1 = (RelativeLayout) rootView.findViewById(R.id.rl1);
        rl2 = (RelativeLayout) rootView.findViewById(R.id.rl2);
        rl3 = (RelativeLayout) rootView.findViewById(R.id.rl3);
        rl4 = (RelativeLayout) rootView.findViewById(R.id.rl4);
        rl5 = (RelativeLayout) rootView.findViewById(R.id.rl5);
        rl6 = (RelativeLayout) rootView.findViewById(R.id.rl6);
        rl7 = (RelativeLayout) rootView.findViewById(R.id.rl7);
        rl8 = (RelativeLayout) rootView.findViewById(R.id.rl8);


        tvViewAll = (TextView) rootView.findViewById(R.id.tvViewAll6);
        tvViewAll.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                callAllBlogActivity("2");
            }
        });










        // LLNoPost = (LinearLayout) rootView.findViewById(R.id.LLNoPost);
        // TextView TVnoPost= (TextView) rootView.findViewById(R.id.TVnoPost);
//        TVnoPost.setOnClickListener(new View.OnClickListener() {
//            @Override
//            public void onClick(View v) {
//                Intent intent = new Intent(thiscontext, writeblogstepone.class);
//                startActivity(intent);
//            }
//        });
//        LLNoPost.setOnClickListener(new View.OnClickListener() {
//            @Override
//            public void onClick(View v) {
//                Intent intent = new Intent(thiscontext, writeblogstepone.class);
//                startActivity(intent);
//            }
//        });
        String catValue = "";
        if(getArguments()!=null) {
            catValue = String.valueOf(this.getArguments().getString("cName"));
        }



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
        fabFrame = (FrameLayout) rootView.findViewById(R.id.fabFrame);
        fabSettings = (FloatingActionButton) rootView.findViewById(R.id.fabSetting);

        layoutFabSave = (LinearLayout) rootView.findViewById(R.id.layoutFabSave);
        layoutFabEdit = (LinearLayout) rootView.findViewById(R.id.layoutFabEdit);
        layoutFabPhoto = (LinearLayout) rootView.findViewById(R.id.layoutFabPhoto);
        layoutMyBlog = (LinearLayout)  rootView.findViewById(R.id.layoutMyBlog);
        //layoutFabSettings = (LinearLayout) this.findViewById(R.id.layoutFabSettings);

        //When main Fab (Settings) is clicked, it expands if not expanded already.
        //Collapses if main FAB was open already.
        //This gives FAB (Settings) open/close behavior
        fabSettings.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                if (fabExpanded == true){
                    closeSubMenusFab();
                    fabFrame.setClickable(false);
                } else {
                    openSubMenusFab();
                    fabFrame.setClickable(true);
                }
            }
        });

        //Only main FAB is visible in the beginning
        closeSubMenusFab();


        layoutFabSave.setOnClickListener(new View.OnClickListener() {
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

        return rootView;
    }




    private void callAllBlogActivity(String screenIndex){
        Intent intentBlogList = new Intent(thiscontext, AllBlogActivity.class);
        intentBlogList.putExtra("boxTitle", screenIndex);
        startActivity(intentBlogList);
    }


    //closes FAB submenus
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

    }




    private boolean isNetworkAvailable() {
        ConnectivityManager connectivityManager
                = (ConnectivityManager) thiscontext.getSystemService(Context.CONNECTIVITY_SERVICE);
        NetworkInfo activeNetworkInfo = connectivityManager.getActiveNetworkInfo();
        return activeNetworkInfo != null && activeNetworkInfo.isConnected();
    }

    ProgressDialog progress;

    private void initilize(final String catValue) {
        //blogArrayList = new ArrayList<>();
        //arrMostReadBlog = new ArrayList<>();
        //arrMostBookMarketBlog = new ArrayList<>();
        recyclerViewLatest = (RecyclerView) rootView.findViewById(R.id.recyclerViewLatest16b);


        LinearLayoutManager latestLayoutManager = new LinearLayoutManager(getContext());
        //latestLayoutManager.setOrientation(LinearLayoutManager.VERTICAL);

        recyclerViewLatest.setHasFixedSize(true);
        recyclerViewLatest.setLayoutManager(latestLayoutManager);
        recyclerViewLatest.setItemAnimator(new DefaultItemAnimator());



        // Adapter


        //latestLatestBlogAdapter = new LatestBlogAdapter(getActivity(), getContext(), ShowBlogIngo.blogArrayList, false);
        // shortStoryAdapter = new ShortStoryAdapter(getActivity(), getContext(), ShowBlogIngo.shortStoryArrayList);
        mostReadAdapter = new MostReadBlogAdapter(getActivity(), getContext(), ShowBlogIngo.arrMostReadBlog);
        //mostBookMarkedBlogAdapter = new MostBookMarkedBlogAdapter(getActivity(), getContext(), ShowBlogIngo.arrMostBookMarketBlog);

        //songsJinglesBlogAdapter = new SongsJinglesBlogAdapter(getActivity(), getContext(), ShowBlogIngo.arrSongJingles);
        //jokesBlogAdapter = new JokesBlogAdapter(getActivity(), getContext(), ShowBlogIngo.arrJokes);
        //reviewsBlogAdapter = new ReviewsBlogAdapter(getActivity(), getContext(), ShowBlogIngo.arrReviews);
        //blogBlogAdapter = new BlogBlogAdapter(getActivity(), getContext(), ShowBlogIngo.arrBlog);
        //journalismBlogAdapter = new JournalismBlogAdapter(getActivity(), getContext(), ShowBlogIngo.arrJournalism);

        //Adapter set to recyclerView
        recyclerViewLatest.setAdapter(mostReadAdapter);



//        if(catValue != ""){
//            getBlogsListCallApi(catValue);
//        }

/*        IVSync.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {


                //getBlogsListCallApi(catValue);
                mostReadAdapter.notifyDataSetChanged();

            }
        });*/

        loadTrendingPost();


    }


    // Fetching Latest Post

    private void loadTrendingPost() {

        HashMap<String, String> hmHomeParam = new HashMap <>();
        hmHomeParam.put("page", "1");
        SmartPostWebRequest mainCategory = new SmartPostWebRequest(WebConstants.trending_Post, thiscontext, false, hmHomeParam, new OnResponseListener() {
            @Override
            public void onSuccess(Object result) {
                try {
                    JSONObject jsonResponse = new JSONObject(result.toString());
                    if (jsonResponse != null) {
                        Integer status = jsonResponse.getInt("success");
                        if (status == 1) {
                            JSONObject jsonResponseMain = jsonResponse.getJSONObject("data");
                            JSONArray arrMainCategoryJson = jsonResponseMain.optJSONArray("data");
                            Type type = new TypeToken<ArrayList<TrendingPost_Model>>() {}.getType();
                            ArrayList<TrendingPost_Model> trending_post = new Gson().fromJson(arrMainCategoryJson.toString(), type);
                            //ArrayList<TrendingPost_Model> trending_postOne = new ArrayList <>();
                            //trending_postOne.add(trending_post.get(0));
                            displayLTrendingPost(trending_post);
                        }else{
                            String message = jsonResponse.getString("message");
                            Toast.makeText(thiscontext, message, Toast.LENGTH_LONG).show();
                        }
                    }
                } catch (JSONException e) {
                    e.printStackTrace();
                }
            }
            @Override
            public void onError(VolleyError error) {
                Log.d("","");
            }
        });
        VolleySingleton.getInstance().addToRequestQueue(mainCategory);
    }


    private void displayLTrendingPost(ArrayList<TrendingPost_Model> trendingBlog){
        shortStoryAdapter = new ShortStoryAdapter(getActivity(), getContext(), trendingBlog);
        recyclerViewLatest.setAdapter(shortStoryAdapter);
        shortStoryAdapter.notifyDataSetChanged();

    }



    private void getBlogsListCallApi(String catValue) {
        RequestQueue requestQueue;
        progress = new ProgressDialog(thiscontext);
        progress.show();
        progress.setCancelable(false);
        progress.setTitle("Please Wait");

        requestQueue = Volley.newRequestQueue(thiscontext);
        //String loginURL = String.format("http://blog.ibitvalley.com/api/BlogList?userid=%s", 2);
        SharedPreferences preferences = thiscontext.getSharedPreferences("mPrefs", MODE_PRIVATE);
        String UserID = preferences.getString("UserId", "");
        String getBlogListURL = "";
        if(catValue == "") {
            //getBlogListURL = String.format("http://blog.ibitvalley.com/api/BlogList?UserID=%s", UserID);
            //
            getBlogListURL = String.format("http://blog.ibitvalley.com/api/AllCategoryBlog?UserID=%s", UserID);
        } else {
            getBlogListURL = String.format("http://blog.ibitvalley.com/api/GetBlogsByCategory?UserID=%s&Category=%s", UserID, catValue.replace(" ", "%20"));
        }
        JsonObjectRequest jor = new JsonObjectRequest(Request.Method.GET, getBlogListURL, null,
                new Response.Listener<JSONObject>() {
                    @Override
                    public void onResponse(JSONObject response) {
                        Log.d("True", "");
                        try {
                            if (response.get("success").toString() == "true") {
                                System.out.println("Json == > " + response.toString());
                                JSONObject obj = new JSONObject(response.toString());
                                JSONArray arr = obj.getJSONArray("LatestBlog");

                                if(arr.length()<=0){
                                    LLNoPost.setVisibility(View.VISIBLE);
                                    rlLatest.setVisibility(View.INVISIBLE);
                                    rl1.setVisibility(View.INVISIBLE);
                                    rl2.setVisibility(View.INVISIBLE);
                                    rl3.setVisibility(View.INVISIBLE);
                                    rl4.setVisibility(View.INVISIBLE);
                                    rl5.setVisibility(View.INVISIBLE);
                                    rl6.setVisibility(View.INVISIBLE);
                                    rl6.setVisibility(View.INVISIBLE);
                                    rl8.setVisibility(View.INVISIBLE);
                                } else {
                                    LLNoPost.setVisibility(View.INVISIBLE);
                                    rlLatest.setVisibility(View.VISIBLE);
                                    rl1.setVisibility(View.VISIBLE);
                                    rl2.setVisibility(View.VISIBLE);
                                    rl3.setVisibility(View.VISIBLE);
                                    rl4.setVisibility(View.VISIBLE);
                                    rl5.setVisibility(View.VISIBLE);
                                    rl6.setVisibility(View.VISIBLE);
                                    rl7.setVisibility(View.VISIBLE);
                                    rl8.setVisibility(View.VISIBLE);
                                }

//                                JSONArray arrJsonMostRead = obj.getJSONArray("MostRead");
//                                List<String> listMostRead = new ArrayList<String>();
//                                for(int i = 0; i < arrJsonMostRead.length(); i++){
//                                    listMostRead.add(arrJsonMostRead.getJSONObject(i).getString("BlogID"));
//                                }
//
//                                JSONArray arrJsonMostBookMarked = obj.getJSONArray("MostBookMarked");
//                                List<String> listMostBookMarked = new ArrayList<String>();
//                                for(int i = 0; i < arrJsonMostBookMarked.length(); i++){
//                                    listMostBookMarked.add(arrJsonMostBookMarked.getJSONObject(i).getString("BlogID"));
//                                }



                                for (int i = 0; i < arr.length(); i++) {
                                    String blogString = arr.get(i).toString();
                                    Blog blog = new Gson().fromJson(blogString, Blog.class);
                                    ShowBlogIngo.blogArrayList.add(blog);
                                }


                                JSONArray arrShortStory = obj.getJSONArray("ShortStory");

                                for (int i = 0; i < arrShortStory.length(); i++) {
                                    String blogString = arrShortStory.get(i).toString();
                                    Blog blog = new Gson().fromJson(blogString, Blog.class);
                                    ShowBlogIngo.shortStoryArrayList.add(blog);
                                }

                                JSONArray arrPoetry = obj.getJSONArray("Poetry");

                                for (int i = 0; i < arrPoetry.length(); i++) {
                                    String blogString = arrPoetry.get(i).toString();
                                    Blog blog = new Gson().fromJson(blogString, Blog.class);
                                    ShowBlogIngo.arrMostBookMarketBlog.add(blog);
                                }



                                JSONArray arrShayari = obj.getJSONArray("Shayari");

                                for (int i = 0; i < arrShayari.length(); i++) {
                                    String blogString = arrShayari.get(i).toString();
                                    Blog blog = new Gson().fromJson(blogString, Blog.class);
                                    ShowBlogIngo.arrMostReadBlog.add(blog);
                                }


                                JSONArray arrSongJingles = obj.getJSONArray("SongJingles");

                                for (int i = 0; i < arrSongJingles.length(); i++) {
                                    String blogString = arrSongJingles.get(i).toString();
                                    Blog blog = new Gson().fromJson(blogString, Blog.class);
                                    ShowBlogIngo.arrSongJingles.add(blog);
                                }

                                JSONArray arrJoke = obj.getJSONArray("Jokes");

                                for (int i = 0; i < arrJoke.length(); i++) {
                                    String blogString = arrJoke.get(i).toString();
                                    Blog blog = new Gson().fromJson(blogString, Blog.class);
                                    ShowBlogIngo.arrJokes.add(blog);
                                }

                                JSONArray arrreview = obj.getJSONArray("Reviews");

                                for (int i = 0; i < arrreview.length(); i++) {
                                    String blogString = arrreview.get(i).toString();
                                    Blog blog = new Gson().fromJson(blogString, Blog.class);
                                    ShowBlogIngo.arrReviews.add(blog);
                                }

                                JSONArray arrBlog = obj.getJSONArray("Blog");

                                for (int i = 0; i < arrBlog.length(); i++) {
                                    String blogString = arrBlog.get(i).toString();
                                    Blog blog = new Gson().fromJson(blogString, Blog.class);
                                    ShowBlogIngo.arrBlog.add(blog);
                                }


                                JSONArray arrJournalism = obj.getJSONArray("Journalism");

                                for (int i = 0; i < arrJournalism.length(); i++) {
                                    String blogString = arrJournalism.get(i).toString();
                                    Blog blog = new Gson().fromJson(blogString, Blog.class);
                                    ShowBlogIngo.arrJournalism.add(blog);
                                }


//                                // Most Read
//
//                                 for (int s=0; s< listMostRead.size(); s++){
//                                        for (int i = 0; i < ShowBlogIngo.blogArrayList.size(); i++) {
//                                            if (ShowBlogIngo.blogArrayList.get(i).getBlogId().toString().equals(listMostRead.get(s).toString())) {
//                                                ShowBlogIngo.arrMostReadBlog.add(ShowBlogIngo.blogArrayList.get(i));
//                                                break;
//                                            }
//                                        }
//                                 }
//
//                                // Most BookMarked
//
//                                for (int s=0; s< listMostBookMarked.size(); s++){
//                                    for (int i = 0; i < ShowBlogIngo.blogArrayList.size(); i++) {
//                                        if (ShowBlogIngo.blogArrayList.get(i).getBlogId().toString().equals(listMostBookMarked.get(s).toString())) {
//                                            ShowBlogIngo.arrMostBookMarketBlog.add(ShowBlogIngo.blogArrayList.get(i));
//                                            break;
//                                        }
//                                    }
//                                }



                                if (progress != null && progress.isShowing())
                                    progress.dismiss();

                                latestLatestBlogAdapter.notifyDataSetChanged();
                                mostReadAdapter.notifyDataSetChanged();
                                mostBookMarkedBlogAdapter.notifyDataSetChanged();
                                songsJinglesBlogAdapter.notifyDataSetChanged();
                                jokesBlogAdapter.notifyDataSetChanged();
                                reviewsBlogAdapter.notifyDataSetChanged();
                                blogBlogAdapter.notifyDataSetChanged();
                                journalismBlogAdapter.notifyDataSetChanged();
                                shortStoryAdapter.notifyDataSetChanged();

                            }
                        } catch (JSONException ex) {
                            if (progress != null && progress.isShowing())
                                progress.dismiss();
                            Log.d("JSON Exception", ex.getMessage());
                        }
                    }
                },
                new Response.ErrorListener() {
                    @Override
                    public void onErrorResponse(VolleyError error) {
                        error.printStackTrace();
                        if (progress != null && progress.isShowing())
                            progress.dismiss();
                        Log.e("Volley", "Error" + error.getMessage());
                    }
                }
        );
        jor.setRetryPolicy(new DefaultRetryPolicy(20000, 3, 0.0f));
        requestQueue.add(jor);
    }



    @Override
    public void onResume() {
        super.onResume();
    }
}

