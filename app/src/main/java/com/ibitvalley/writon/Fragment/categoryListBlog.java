package com.ibitvalley.writon.Fragment;

import android.app.ProgressDialog;
import android.content.Context;
import android.content.DialogInterface;
import android.content.SharedPreferences;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.RequiresApi;
import androidx.appcompat.app.AlertDialog;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.DefaultItemAnimator;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.android.volley.VolleyError;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.ibitvalley.writon.R;
import com.ibitvalley.writon.adapter.LatestBlogAdapter;
import com.ibitvalley.writon.classes.ShowBlogIngo;
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
import java.util.Objects;

import static android.content.Context.MODE_PRIVATE;


public class categoryListBlog extends Fragment {



    View rootView;
    Context thiscontext;
    Handler handler;
    LatestBlogAdapter categoryBlogAdapter;
    RecyclerView recyclerView1;
    ArrayList<Blog> blogArrayList;
    TextView blogType;



    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

    }

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        // Inflate the layout for this fragment
        rootView = inflater.inflate(R.layout.fragment_category_list_blog, container, false);
        thiscontext = container.getContext();
        isConnected();
        recyclerView1 = (RecyclerView) rootView.findViewById(R.id.recyclerView1);
        blogType = (TextView) rootView.findViewById(R.id.blogType);


        String catValue = "";
        if(getArguments()!=null) {
            catValue = String.valueOf(this.getArguments().getString("cName"));
            blogType.setText(catValue);
            searchBlogPost(catValue);
        }


        /*blogArrayList = new ArrayList<>();
        LinearLayoutManager latestLayoutManager = new LinearLayoutManager(getContext());
        latestLayoutManager.setOrientation(LinearLayoutManager.VERTICAL);
        recyclerView1.setHasFixedSize(true);
        recyclerView1.setLayoutManager(latestLayoutManager);
        recyclerView1.setItemAnimator(new DefaultItemAnimator());
        categoryBlogAdapter = new CategoryBlogAdapter(getActivity(), getContext(), blogArrayList);
        getBlogsListCallApi(catValue);

        recyclerView1.setAdapter(categoryBlogAdapter);*/

        return  rootView;
    }

    private void isConnected(){
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
    }



    private boolean isNetworkAvailable() {
        ConnectivityManager connectivityManager
                = (ConnectivityManager) thiscontext.getSystemService(Context.CONNECTIVITY_SERVICE);
        assert connectivityManager != null;
        NetworkInfo activeNetworkInfo = connectivityManager.getActiveNetworkInfo();
        return activeNetworkInfo != null && activeNetworkInfo.isConnected();
    }





    private void searchBlogPost(String subCategory) {


        HashMap <String, String> hmHomeParam = new HashMap <>();
        hmHomeParam.put("subcategory", subCategory);
        SmartPostWebRequest mainCategory = new SmartPostWebRequest(WebConstants.search_url, thiscontext, true, hmHomeParam, new OnResponseListener() {
            @RequiresApi(api = Build.VERSION_CODES.KITKAT)
            @Override
            public void onSuccess(Object result) {
                try {
                    JSONObject jsonResponse = new JSONObject(result.toString());
                    if (jsonResponse != null) {
                        Integer status = jsonResponse.getInt("success");
                        if (status == 1) {
                            JSONObject jsonResponseMain = jsonResponse.getJSONObject("data");
                            JSONArray arrMainCategoryJson = jsonResponseMain.optJSONArray("data");
                            Type type = new TypeToken <ArrayList <Blog>>() {}.getType();
                            ArrayList<Blog> latest_post = new Gson().fromJson(arrMainCategoryJson.toString(), type);
                            displayLatestPost(latest_post);
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


    @RequiresApi(api = Build.VERSION_CODES.KITKAT)
    private void displayLatestPost(ArrayList<Blog> latestBlog){

        categoryBlogAdapter = new LatestBlogAdapter(Objects.requireNonNull(getActivity()), thiscontext, latestBlog, false);
        //Adapter set to recyclerView
        LinearLayoutManager latestLayoutManager = new LinearLayoutManager(thiscontext);
        latestLayoutManager.setOrientation(LinearLayoutManager.VERTICAL);
        recyclerView1.setHasFixedSize(true);
        recyclerView1.getRecycledViewPool().clear();
        recyclerView1.setLayoutManager(latestLayoutManager);
        recyclerView1.setItemAnimator(new DefaultItemAnimator());
        recyclerView1.setAdapter(categoryBlogAdapter);
        categoryBlogAdapter.notifyDataSetChanged();

    }



}

