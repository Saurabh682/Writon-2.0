package com.ibitvalley.writon.Fragment;

import android.app.ProgressDialog;
import android.content.Context;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Toast;

import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.DefaultItemAnimator;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.android.volley.VolleyError;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.ibitvalley.writon.R;
import com.ibitvalley.writon.adapter.RecentReadBlogAdapter;
import com.ibitvalley.writon.model.Blog;
import com.ibitvalley.writon.model.User;
import com.ibitvalley.writon.utils.VolleySingleton;
import com.ibitvalley.writon.utils.WritOnPreference;
import com.ibitvalley.writon.webapi.WebConstants;
import com.ibitvalley.writon.webapi.util.OnResponseListener;
import com.ibitvalley.writon.webapi.util.SmartPostWebRequest;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.HashMap;

import static android.content.Context.MODE_PRIVATE;

public class RecentFragment extends Fragment {

    Context thiscontext;
    ArrayList<Blog> myblogArrayList;
    RecentReadBlogAdapter recentBlogAdapter;
    RecyclerView recyclerView1;
    User userData;

    public RecentFragment() {
        // Required empty public constructor

    }


    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        // Inflate the layout for this fragment
        View view = inflater.inflate(R.layout.fragment_recent, container, false);

        thiscontext = container.getContext();
        userData = WritOnPreference.getInstance(thiscontext).getUserDetails();
        recyclerView1 = (RecyclerView) view.findViewById(R.id.recyclerView1);
        loadLatestPost();
        return  view;
    }



    private void loadLatestPost() {

        HashMap <String, String> hmHomeParam = new HashMap <>();
        hmHomeParam.put("page", "1");
        hmHomeParam.put("UserID", userData.getId());
        SmartPostWebRequest mainCategory = new SmartPostWebRequest(WebConstants.recent_blog, getActivity(), true, hmHomeParam, new OnResponseListener() {
            @Override
            public void onSuccess(Object result) {
                try {
                    JSONObject jsonResponse = new JSONObject(result.toString());
                    if (jsonResponse != null) {
                        Integer status = jsonResponse.getInt("success");
                        String message = jsonResponse.getString("message");
                        //Toast.makeText(getActivity(), message, Toast.LENGTH_LONG).show();
                        if (status == 1) {
                            JSONObject jsonResponseMain = jsonResponse.getJSONObject("data");
                            JSONArray arrMainCategoryJson = jsonResponseMain.optJSONArray("data");
                            Type type = new TypeToken <ArrayList <Blog>>() {}.getType();
                            ArrayList<Blog> latest_post = new Gson().fromJson(arrMainCategoryJson.toString(), type);
                            //loadData(arrMainCat);
                            displayLatestPost(latest_post);
                        }else{
                            Toast.makeText(getActivity(), message, Toast.LENGTH_LONG).show();
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
        recentBlogAdapter = new RecentReadBlogAdapter(getActivity(), getContext(), latestBlog);
        //Adapter set to recyclerView
        LinearLayoutManager latestLayoutManager = new LinearLayoutManager(getContext());
        latestLayoutManager.setOrientation(LinearLayoutManager.VERTICAL);
        recyclerView1.setHasFixedSize(true);
        recyclerView1.setLayoutManager(latestLayoutManager);
        recyclerView1.setItemAnimator(new DefaultItemAnimator());
        recyclerView1.setAdapter(recentBlogAdapter);
        recentBlogAdapter.notifyDataSetChanged();
    }



}
