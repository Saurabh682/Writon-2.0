package com.ibitvalley.writon;

import android.app.ProgressDialog;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.util.Log;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.android.volley.Request;
import com.android.volley.RequestQueue;
import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.JsonObjectRequest;
import com.android.volley.toolbox.Volley;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.ibitvalley.writon.adapter.DraftBlogAdapter;
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

public class Draft extends AppCompatActivity {
    ArrayList<Blog> draftblogArrayList;
    DraftBlogAdapter adapter;
    RecyclerView recyclerView1;
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_draft);
        this.setTitle("Draft");
        recyclerView1 = (RecyclerView) findViewById(R.id.recyclerView1);
        LinearLayoutManager layoutManager = new LinearLayoutManager(this);
        recyclerView1.setLayoutManager(layoutManager);
        draftblogArrayList = new ArrayList<>();
        adapter = new DraftBlogAdapter(this, this, draftblogArrayList);
        recyclerView1.setAdapter(adapter);
        //getBlogsListCallApi();
        getDraftBlog();
    }


    ProgressDialog progress;

    private void getBlogsListCallApi() {

        RequestQueue requestQueue;
        progress = new ProgressDialog(this);
        progress.show();
        progress.setTitle("Please Wait");
        requestQueue = Volley.newRequestQueue(this);
        SharedPreferences preferences = getApplicationContext().getSharedPreferences("mPrefs", MODE_PRIVATE);
        final String UserId = preferences.getString("UserId", "0");
        String loginURL = String.format("http://blog.ibitvalley.com/api/DraftBlogsByUserId?UserID=%s", UserId);
        System.out.println("URL : " + loginURL);
        JsonObjectRequest jor = new JsonObjectRequest(Request.Method.GET, loginURL, null,
                new Response.Listener<JSONObject>() {
                    @Override
                    public void onResponse(JSONObject response) {
                        Log.d("True", "");
                        try {
                            if (progress != null && progress.isShowing())
                                progress.dismiss();
                            if (response.get("success").toString() == "true") {
                                System.out.println("Json == > " + response.toString());
                                JSONObject obj = new JSONObject(response.toString());
                                JSONArray arr = obj.getJSONArray("Result");
                                for (int i = 0; i < arr.length(); i++) {
                                    String blogString = arr.get(i).toString();
                                    Blog blog = new Gson().fromJson(blogString, Blog.class);
                                    draftblogArrayList.add(blog);
                                }
                                adapter.notifyDataSetChanged();
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
                        if (progress != null && progress.isShowing())
                            progress.dismiss();
                        error.printStackTrace();
                        Log.e("Volley", "Error" + error.getMessage());
                    }
                }
        );
        requestQueue.add(jor);
    }


    private void getDraftBlog() {

        HashMap<String, String> hmLoginParams = new HashMap <>();
        SmartPostWebRequest mainCategory = new SmartPostWebRequest(WebConstants.drafts_api, Draft.this, true, hmLoginParams, new OnResponseListener() {
            @Override
            public ArrayList<Blog> onSuccess(Object result) {
                try {
                    JSONObject jsonResponse = new JSONObject(result.toString());
                    if (jsonResponse != null) {
                        Integer status = jsonResponse.getInt("success");
                        if (status == 1) {
                            JSONArray arrMainCategoryJson = jsonResponse.optJSONArray("data");
                            Type type = new TypeToken<ArrayList<Blog>>() {}.getType();
                            ArrayList<Blog> draft_post = new Gson().fromJson(arrMainCategoryJson.toString(), type);
                            displayDraftPost(draft_post);
                        }else{
                            String message = jsonResponse.getString("message");
                            Toast.makeText(Draft.this, message, Toast.LENGTH_LONG).show();
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


    private void displayDraftPost(ArrayList<Blog> trendingBlog){
        adapter = new DraftBlogAdapter(Draft.this, Draft.this, trendingBlog);
        recyclerView1.setAdapter(adapter);
        adapter.notifyDataSetChanged();

    }


}
