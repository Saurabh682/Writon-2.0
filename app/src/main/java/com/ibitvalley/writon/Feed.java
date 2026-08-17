package com.ibitvalley.writon;

import android.app.ProgressDialog;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.util.Log;
import android.widget.TextView;

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
import com.ibitvalley.writon.adapter.FeedAdapter;
import com.ibitvalley.writon.model.Blog;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;

public class Feed extends AppCompatActivity {



    ArrayList<Blog> myblogArrayList;
    FeedAdapter adapter;
    RecyclerView recyclerView1;
    String WID = "0";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_feed);
        getSupportActionBar().hide();

        recyclerView1 = (RecyclerView) findViewById(R.id.recyclerView1);
        LinearLayoutManager layoutManager = new LinearLayoutManager(this);
        recyclerView1.setLayoutManager(layoutManager);
        myblogArrayList = new ArrayList<>();
        String WID = getIntent().getExtras().getString("WriterID");
        String writerName = getIntent().getExtras().getString("WriterName");
        adapter = new FeedAdapter(this, this, myblogArrayList, writerName);
        recyclerView1.setAdapter(adapter);
        getBlogsListCallApi(WID);

    }

    ProgressDialog progress;
    private void getBlogsListCallApi(String WID) {
        RequestQueue requestQueue;
        progress = new ProgressDialog(this);
        progress.show();
        progress.setTitle("Please Wait");
        requestQueue = Volley.newRequestQueue(this);
        SharedPreferences preferences = getApplicationContext().getSharedPreferences("mPrefs", MODE_PRIVATE);
        final String UserId = preferences.getString("UserId", "0");
        String loginURL = String.format("http://blog.ibitvalley.com/api/BlogListByUserId?UserID=%s", WID);
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
                                    myblogArrayList.add(blog);
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


}
