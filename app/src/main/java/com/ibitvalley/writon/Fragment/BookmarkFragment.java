package com.ibitvalley.writon.Fragment;

import android.app.ProgressDialog;
import android.os.Bundle;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Toast;

import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.android.volley.VolleyError;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.ibitvalley.writon.GoogleAnalytics.MyApplication;
import com.ibitvalley.writon.R;
import com.ibitvalley.writon.adapter.MyBlogAdapter;
import com.ibitvalley.writon.model.Blog;
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


public class BookmarkFragment extends Fragment {


    ArrayList<Blog> myblogArrayList;
    MyBlogAdapter adapter;
    RecyclerView recyclerView1;

    public BookmarkFragment() {
        // Required empty public constructor
    }


    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        // Inflate the layout for this fragment
        View view = inflater.inflate(R.layout.fragment_bookmark, container, false);
        recyclerView1 = (RecyclerView) view.findViewById(R.id.recyclerView1);

        myblogArrayList = new ArrayList<>();
        //adapter = new MyBlogAdapter(getActivity(), getContext(), myblogArrayList, "Bookmarks");
        //recyclerView1.setAdapter(adapter);
       // getBlogsListCallApi();
        MyApplication.getInstance().trackEvent("Bookmark", "View Bookmark", "BookMark");
        MyApplication.getInstance().trackScreenView("Bookmark");
        loadTopFollowers();
        return  view;


    }


    ProgressDialog progress;



    // Fetching Trending Post

    private void loadTopFollowers() {

        HashMap<String, String> hmHomeParam = new HashMap <>();
        //hmHomeParam.put("page", "1");
        SmartPostWebRequest mainCategory = new SmartPostWebRequest(WebConstants.bookmarked_api, getContext(), true, hmHomeParam, new OnResponseListener() {
            @Override
            public ArrayList<Blog> onSuccess(Object result) {
                try {
                    JSONObject jsonResponse = new JSONObject(result.toString());
                    if (jsonResponse != null) {
                        Integer status = jsonResponse.getInt("success");
                        if (status == 1) {
                            JSONObject jsonResponseMain = jsonResponse.getJSONObject("data");
                            JSONArray arrMainCategoryJson = jsonResponseMain.optJSONArray("data");
                            Type type = new TypeToken<ArrayList<Blog>>() {}.getType();
                            ArrayList<Blog> trending_post = new Gson().fromJson(arrMainCategoryJson.toString(), type);
                            displayTopFollowersPost(trending_post);
                        }else{
                            String message = jsonResponse.getString("message");
                            Toast.makeText(getContext(), message, Toast.LENGTH_LONG).show();
                        }
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


    private void displayTopFollowersPost(ArrayList<Blog> trendingBlog){
        LinearLayoutManager layoutManager = new LinearLayoutManager(getContext());
        recyclerView1.setLayoutManager(layoutManager);
        adapter = new MyBlogAdapter(getActivity(), getContext(), trendingBlog, "Bookmarked");
        recyclerView1.setAdapter(adapter);
        adapter.notifyDataSetChanged();

    }

}
