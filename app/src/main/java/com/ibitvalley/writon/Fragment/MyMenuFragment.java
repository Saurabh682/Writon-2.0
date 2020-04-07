package com.ibitvalley.writon.Fragment;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import android.view.InflateException;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.LinearLayout;
import android.widget.Toast;

import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.DefaultItemAnimator;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.android.volley.VolleyError;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.ibitvalley.writon.Draft;
import com.ibitvalley.writon.MyBlog;
import com.ibitvalley.writon.R;
import com.ibitvalley.writon.adapter.MyWorldAdapter;
import com.ibitvalley.writon.adapter.TrendingUsersAdapter;
import com.ibitvalley.writon.discus;
import com.ibitvalley.writon.model.TrendingPost_Model;
import com.ibitvalley.writon.model.User;
import com.ibitvalley.writon.utils.VolleySingleton;
import com.ibitvalley.writon.utils.WritOnPreference;
import com.ibitvalley.writon.webapi.WebApiParams;
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

/**
 * Created by Android_PC on 10-08-2016.
 */
public class MyMenuFragment extends Fragment implements View.OnClickListener {


    private View rootView;
    Context thiscontext;
    LinearLayout LLCreateNew, LLdraft, LLMyBlog, LLDiscus;

    User userData;
    RecyclerView rvmyWorld;
    MyWorldAdapter myWorldAdapter;

    TrendingUsersAdapter trendingUsersAdapter;

    @Override
    public View onCreateView(LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        if (rootView != null) {
            ViewGroup parent = (ViewGroup) rootView.getParent();
            if (parent != null)
                parent.removeView(rootView);
        }
        thiscontext = container.getContext();
        userData = WritOnPreference.getInstance(thiscontext).getUserDetails();
        try {
            rootView = inflater.inflate(R.layout.home_fragment4, container, false);
            LLCreateNew = (LinearLayout) rootView.findViewById(R.id.LLCreateNew);
            LLCreateNew.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    //Intent intent = new Intent(getContext(), WriteBlog.class);
                    Intent intent = new Intent(getContext(), writeblogstepone.class);
                    startActivity(intent);
                }
            });

            LLdraft = (LinearLayout) rootView.findViewById(R.id.LLdraft);
            LLdraft.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    Intent intent = new Intent(getContext(), Draft.class);
                    startActivity(intent);
                }
            });

            LLMyBlog = (LinearLayout) rootView.findViewById(R.id.LLMyBlog);
            LLMyBlog.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    Intent intent = new Intent(getContext(), MyBlog.class);
                    startActivity(intent);
                }
            });


            LLDiscus = (LinearLayout) rootView.findViewById(R.id.LLDiscus);
            LLDiscus.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    Intent intent = new Intent(getContext(), discus.class);
                    startActivity(intent);
                }
            });


        } catch (InflateException e) {
            e.printStackTrace();
        }
        initilize();

        getMyWordData();
        return rootView;
    }

    private void initilize() {
        rvmyWorld = rootView.findViewById(R.id.rvmyWorld);
    }

    @Override
    public void onClick(View v) {
    }

    // Fetching Trending Post

    private void getMyWordData() {

        HashMap<String, String> hmMyWorldParams = WebApiParams.getyserProfileParam(userData.getId());
        SmartPostWebRequest mainCategory = new SmartPostWebRequest(WebConstants.myworld_action, thiscontext, true, hmMyWorldParams, new OnResponseListener() {
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
                            displayLTrendingPost(trending_post);
                        }else{
                            String message = jsonResponse.getString("message");
                            Toast.makeText(thiscontext, message, Toast.LENGTH_LONG).show();
                            getTrendingUsers();
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
        myWorldAdapter = new MyWorldAdapter(getActivity(), getContext(), trendingBlog);
        RecyclerView.LayoutManager mLayoutManager = new LinearLayoutManager(thiscontext);
        rvmyWorld.setLayoutManager(mLayoutManager);
        rvmyWorld.setItemAnimator(new DefaultItemAnimator());
        rvmyWorld.setAdapter(myWorldAdapter);
        rvmyWorld.setNestedScrollingEnabled(false);
        myWorldAdapter.notifyDataSetChanged();

    }





    private void getTrendingUsers() {

        HashMap<String, String> hmMyWorldParams = WebApiParams.getyserProfileParam(userData.getId());
        hmMyWorldParams.put("page", "1");
        SmartPostWebRequest mainCategory = new SmartPostWebRequest(WebConstants.trending_users, thiscontext, true, hmMyWorldParams, new OnResponseListener() {
            @Override
            public void onSuccess(Object result) {
                try {
                    JSONObject jsonResponse = new JSONObject(result.toString());
                    if (jsonResponse != null) {
                        Integer status = jsonResponse.getInt("success");
                        if (status == 1) {
                            //JSONObject jsonResponseMain = jsonResponse.getJSONObject("data");
                            JSONArray arrMainCategoryJson = jsonResponse.optJSONArray("data");
                            Type type = new TypeToken<ArrayList<TrendingPost_Model>>() {}.getType();
                            ArrayList<TrendingPost_Model> trending_post = new Gson().fromJson(arrMainCategoryJson.toString(), type);
                            displayLTrendingUser(trending_post);
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


    private void displayLTrendingUser(ArrayList<TrendingPost_Model> trendingBlog){
        trendingUsersAdapter = new TrendingUsersAdapter(getActivity(), getContext(), trendingBlog);
        RecyclerView.LayoutManager mLayoutManager = new LinearLayoutManager(thiscontext);
        rvmyWorld.setLayoutManager(mLayoutManager);
        rvmyWorld.setItemAnimator(new DefaultItemAnimator());
        rvmyWorld.setAdapter(trendingUsersAdapter);
        rvmyWorld.setNestedScrollingEnabled(false);
        trendingUsersAdapter.notifyDataSetChanged();
    }

}


