package com.ibitvalley.writon;

import android.app.Activity;
import android.content.Context;
import android.os.Bundle;

import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.DefaultItemAnimator;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import android.util.Log;
import android.widget.TextView;
import android.widget.Toast;

import com.android.volley.VolleyError;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.ibitvalley.writon.adapter.LatestBlogAdapter;
import com.ibitvalley.writon.adapter.ShortStoryAdapter;
import com.ibitvalley.writon.adapter.TopFollowersAdapter;
import com.ibitvalley.writon.adapter.TopRatedAdapter;
import com.ibitvalley.writon.model.Blog;
import com.ibitvalley.writon.model.TrendingPost_Model;
import com.ibitvalley.writon.utils.EndlessRecyclerOnScrollListener;
import com.ibitvalley.writon.utils.VolleySingleton;
import com.ibitvalley.writon.webapi.WebConstants;
import com.ibitvalley.writon.webapi.util.OnResponseListener;
import com.ibitvalley.writon.webapi.util.SmartPostWebRequest;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.HashMap;

public class AllBlogActivity extends AppCompatActivity {


    Activity curr_activity;
    Context curr_context;

    TextView TVHeader1;
    RecyclerView recyclerViewDataShow;
    String screenName;

    LatestBlogAdapter latestLatestBlogAdapter;
    ShortStoryAdapter shortStoryAdapter;
    TopFollowersAdapter topFollowersAdapter;
    TopRatedAdapter topRatedAdapter;

    int pageCount = 1;

    SwipeRefreshLayout swipeRefreshLayout;


    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_all_blog);

        screenName = getIntent().getStringExtra("boxTitle");
        curr_activity = this;
        curr_context = this;

        initControls();
        setValues();

        loadMore();
    }

    private void initControls(){
        TVHeader1 = findViewById(R.id.TVHeader1);
        swipeRefreshLayout = findViewById(R.id.swipeToRefresh);
        recyclerViewDataShow = findViewById(R.id.recyclerViewDataShow);
        //
        list = new ArrayList<>();
        trendingList = new ArrayList<>();
    }

    private void loadMore(){

        /*swipeRefreshLayout.setOnRefreshListener(new SwipeRefreshLayout.OnRefreshListener() {
            @Override
            public void onRefresh() {
                //StartRowNum = 0;
                recyclerViewDataShow.addOnScrollListener(new EndlessRecyclerOnScrollListener() {
                        @Override
                        public void onLoadMore() {
                            //loadMoreItems(false);
                            pageCount = 1;
                            loadLatestPost();
                        }
                    });
                }
        });
        swipeRefreshLayout.setColorSchemeColors(getResources().getColor(R.color.colorAccent));*/

        recyclerViewDataShow.addOnScrollListener(new EndlessRecyclerOnScrollListener() {
            @Override
            public void onLoadMore() {
                pageCount += 1;
                if(screenName.equals("1")){
                    loadLatestPost();
                } else if(screenName.equals("2")){
                    loadTrendingPost();
                } else if(screenName.equals("3")){
                    loadTopFollowers();
                } else if(screenName.equals("4")){
                    loadTopRated();
                }


            }
        });
    }

    private void setValues(){

        if(screenName.equals("1")){
            TVHeader1.setText("Latest Posts");
            loadLatestPost();
        } else if(screenName.equals("2")){
            TVHeader1.setText("Trending Posts");
            loadTrendingPost();
        } else if(screenName.equals("3")){
            TVHeader1.setText("Most Followed Writer's Post");
            loadTopFollowers();
        } else if(screenName.equals("4")){
            TVHeader1.setText("Most Rated Posts");
            loadTopRated();
        }

    }

    ArrayList<Blog> list, newList;


    private void loadLatestPost() {

        swipeRefreshLayout.setRefreshing(false);
        HashMap <String, String> hmHomeParam = new HashMap <>();
        hmHomeParam.put("page", String.valueOf(pageCount));
        SmartPostWebRequest mainCategory = new SmartPostWebRequest(WebConstants.Latest_Post, curr_activity, true, hmHomeParam, new OnResponseListener() {
            @Override
            public void onSuccess(Object result) {
                try {
                    newList = new ArrayList<>();
                    JSONObject jsonResponse = new JSONObject(result.toString());
                    if (jsonResponse != null) {
                        Integer status = jsonResponse.getInt("success");
                        if (status == 1) {
                            JSONObject jsonResponseMain = jsonResponse.getJSONObject("data");
                            JSONArray arrMainCategoryJson = jsonResponseMain.optJSONArray("data");
                            Type type = new TypeToken <ArrayList <Blog>>() {}.getType();
                            ArrayList<Blog> latest_post = new Gson().fromJson(arrMainCategoryJson.toString(), type);
                           for (int lIncr = 0; lIncr < latest_post.size(); lIncr ++){
                               Blog objBlog = latest_post.get(lIncr);
                               newList.add(objBlog);
                           }

                           if(newList.size() > 0){
                               list.addAll(newList);
                               displayLatestPost(list);
                           }

                        }else{
                            String message = jsonResponse.getString("message");
                            Toast.makeText(curr_activity, message, Toast.LENGTH_LONG).show();
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


    private void displayLatestPost(ArrayList<Blog> latestBlog){

        if(pageCount == 1) {
            latestLatestBlogAdapter = new LatestBlogAdapter(curr_activity, curr_context, latestBlog, true);
            //Adapter set to recyclerView
            LinearLayoutManager latestLayoutManager = new LinearLayoutManager(curr_context);
            latestLayoutManager.setOrientation(LinearLayoutManager.VERTICAL);
            recyclerViewDataShow.setHasFixedSize(true);
            recyclerViewDataShow.getRecycledViewPool().clear();
            recyclerViewDataShow.setLayoutManager(latestLayoutManager);
            recyclerViewDataShow.setItemAnimator(new DefaultItemAnimator());
            recyclerViewDataShow.setAdapter(latestLatestBlogAdapter);
            latestLatestBlogAdapter.notifyDataSetChanged();
        }else {
            recyclerViewDataShow.getRecycledViewPool().clear();
            latestLatestBlogAdapter.notifyDataSetChanged();
        }
    }


    ArrayList<TrendingPost_Model> trendingList, trendingNewList;

    private void loadTrendingPost() {

        HashMap<String, String> hmHomeParam = new HashMap <>();
        hmHomeParam.put("page", String.valueOf(pageCount));
        SmartPostWebRequest mainCategory = new SmartPostWebRequest(WebConstants.trending_Post, curr_activity, false, hmHomeParam, new OnResponseListener() {
            @Override
            public void onSuccess(Object result) {
                try {
                    trendingNewList = new ArrayList <>();
                    JSONObject jsonResponse = new JSONObject(result.toString());
                    if (jsonResponse != null) {
                        Integer status = jsonResponse.getInt("success");
                        if (status == 1) {
                            JSONObject jsonResponseMain = jsonResponse.getJSONObject("data");
                            JSONArray arrMainCategoryJson = jsonResponseMain.optJSONArray("data");
                            Type type = new TypeToken<ArrayList<TrendingPost_Model>>() {}.getType();
                            ArrayList<TrendingPost_Model> trending_post = new Gson().fromJson(arrMainCategoryJson.toString(), type);

                            for (int lIncr = 0; lIncr < trending_post.size(); lIncr ++){
                                TrendingPost_Model objBlog = trending_post.get(lIncr);
                                trendingNewList.add(objBlog);
                            }

                            if(trendingNewList.size() > 0){
                                trendingList.addAll(trendingNewList);
                                displayLTrendingPost(trendingList);
                            }

                        }else{
                            String message = jsonResponse.getString("message");
                            Toast.makeText(curr_activity, message, Toast.LENGTH_LONG).show();
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
        if(pageCount == 1) {
            shortStoryAdapter = new ShortStoryAdapter(curr_activity, curr_activity, trendingBlog);
            //Adapter set to recyclerView
            LinearLayoutManager latestLayoutManager = new LinearLayoutManager(curr_context);
            latestLayoutManager.setOrientation(LinearLayoutManager.VERTICAL);
            recyclerViewDataShow.getRecycledViewPool().clear();
            recyclerViewDataShow.setHasFixedSize(true);
            recyclerViewDataShow.setLayoutManager(latestLayoutManager);
            recyclerViewDataShow.setItemAnimator(new DefaultItemAnimator());
            recyclerViewDataShow.setAdapter(shortStoryAdapter);
            shortStoryAdapter.notifyDataSetChanged();
        }else {
            recyclerViewDataShow.getRecycledViewPool().clear();
            shortStoryAdapter.notifyDataSetChanged();
        }

    }



    // Fetching Trending Post

    private void loadTopFollowers() {

        HashMap<String, String> hmHomeParam = new HashMap <>();
        hmHomeParam.put("page", String.valueOf(pageCount));
        SmartPostWebRequest mainCategory = new SmartPostWebRequest(WebConstants.top_followers, curr_activity, false, hmHomeParam, new OnResponseListener() {
            @Override
            public void onSuccess(Object result) {
                try {
                    trendingNewList = new ArrayList <>();
                    JSONObject jsonResponse = new JSONObject(result.toString());
                    if (jsonResponse != null) {
                        Integer status = jsonResponse.getInt("success");
                        if (status == 1) {
                            JSONObject jsonResponseMain = jsonResponse.getJSONObject("data");
                            JSONArray arrMainCategoryJson = jsonResponseMain.optJSONArray("data");
                            Type type = new TypeToken<ArrayList<TrendingPost_Model>>() {}.getType();
                            ArrayList<TrendingPost_Model> trending_post = new Gson().fromJson(arrMainCategoryJson.toString(), type);

                            for (int lIncr = 0; lIncr < trending_post.size(); lIncr ++){
                                TrendingPost_Model objBlog = trending_post.get(lIncr);
                                trendingNewList.add(objBlog);
                            }

                            if(trendingNewList.size() > 0){
                                trendingList.addAll(trendingNewList);
                                displayTopFollowersPost(trendingList);
                            }


                        }else{
                            String message = jsonResponse.getString("message");
                            Toast.makeText(curr_activity, message, Toast.LENGTH_LONG).show();
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

    private void displayTopFollowersPost(ArrayList<TrendingPost_Model> trendingBlog){

        //Adapter set to recyclerView
        if(pageCount == 1) {
            topFollowersAdapter = new TopFollowersAdapter(curr_activity, curr_context, trendingBlog);
            LinearLayoutManager latestLayoutManager = new LinearLayoutManager(curr_context);
            latestLayoutManager.setOrientation(LinearLayoutManager.VERTICAL);
            recyclerViewDataShow.getRecycledViewPool().clear();
            recyclerViewDataShow.setHasFixedSize(true);
            recyclerViewDataShow.setLayoutManager(latestLayoutManager);
            recyclerViewDataShow.setItemAnimator(new DefaultItemAnimator());
            recyclerViewDataShow.setAdapter(topFollowersAdapter);
            topFollowersAdapter.notifyDataSetChanged();
        }else {
            recyclerViewDataShow.getRecycledViewPool().clear();
            topFollowersAdapter.notifyDataSetChanged();
        }

    }

    // Fetching Trending Post

    private void loadTopRated() {

        HashMap<String, String> hmHomeParam = new HashMap <>();
        hmHomeParam.put("page", String.valueOf(pageCount));
        SmartPostWebRequest mainCategory = new SmartPostWebRequest(WebConstants.top_rated, curr_activity, false, hmHomeParam, new OnResponseListener() {
            @Override
            public void onSuccess(Object result) {
                try {
                    trendingNewList = new ArrayList <>();
                    JSONObject jsonResponse = new JSONObject(result.toString());
                    if (jsonResponse != null) {
                        Integer status = jsonResponse.getInt("success");
                        if (status == 1) {
                            JSONObject jsonResponseMain = jsonResponse.getJSONObject("data");
                            JSONArray arrMainCategoryJson = jsonResponseMain.optJSONArray("data");
                            Type type = new TypeToken<ArrayList<TrendingPost_Model>>() {}.getType();
                            ArrayList<TrendingPost_Model> trending_post = new Gson().fromJson(arrMainCategoryJson.toString(), type);

                            for (int lIncr = 0; lIncr < trending_post.size(); lIncr ++){
                                TrendingPost_Model objBlog = trending_post.get(lIncr);
                                trendingNewList.add(objBlog);
                            }

                            if(trendingNewList.size() > 0){
                                trendingList.addAll(trendingNewList);
                                displayTopRatedPost(trendingList);
                            }

                        }else{
                            String message = jsonResponse.getString("message");
                            Toast.makeText(curr_activity, message, Toast.LENGTH_LONG).show();
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

    private void displayTopRatedPost(ArrayList<TrendingPost_Model> trendingBlog){

        if(pageCount == 1) {
            topRatedAdapter = new TopRatedAdapter(curr_activity, curr_context, trendingBlog);
            LinearLayoutManager latestLayoutManager = new LinearLayoutManager(curr_context);
            latestLayoutManager.setOrientation(LinearLayoutManager.VERTICAL);
            recyclerViewDataShow.getRecycledViewPool().clear();
            recyclerViewDataShow.setHasFixedSize(true);
            recyclerViewDataShow.setLayoutManager(latestLayoutManager);
            recyclerViewDataShow.setItemAnimator(new DefaultItemAnimator());
            recyclerViewDataShow.setAdapter(topRatedAdapter);
            topRatedAdapter.notifyDataSetChanged();
        }else {
            recyclerViewDataShow.getRecycledViewPool().clear();
            topRatedAdapter.notifyDataSetChanged();
        }

    }


}
