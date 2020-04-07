package com.ibitvalley.writon;

import android.app.ProgressDialog;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.util.Log;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.android.volley.DefaultRetryPolicy;
import com.android.volley.Request;
import com.android.volley.RequestQueue;
import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.JsonObjectRequest;
import com.android.volley.toolbox.StringRequest;
import com.android.volley.toolbox.Volley;
import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.ibitvalley.writon.adapter.CategoryBlogAdapter;
import com.ibitvalley.writon.adapter.LatestBlogAdapter;
import com.ibitvalley.writon.adapter.MyBlogAdapter;
import com.ibitvalley.writon.model.Blog;
import com.ibitvalley.writon.utils.Const;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;

public class ActivityCategoryBlogs extends AppCompatActivity {

    ArrayList<Blog> myblogArrayList;
    CategoryBlogAdapter adapter;
    RecyclerView recyclerView1;
    String currCategory = "";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_categoryblogs);
        currCategory = getIntent().getStringExtra("Category");
        this.setTitle(currCategory);
        recyclerView1 = (RecyclerView) findViewById(R.id.recyclerView1);
        LinearLayoutManager layoutManager = new LinearLayoutManager(this);
        recyclerView1.setLayoutManager(layoutManager);
        myblogArrayList = new ArrayList<>();
        adapter = new CategoryBlogAdapter(this, this, myblogArrayList);
        recyclerView1.setAdapter(adapter);
        getBlogsListCallApi();
    }


    private void getBlogsListCallApi() {
        RequestQueue requestQueue;
        final ProgressDialog dialog = new ProgressDialog(this);
        dialog.setMessage("Please wait...");
        dialog.show();
        currCategory = currCategory.replace(" ", "%20");
        String url = String.format("%s%s?Category=%s", Const.BASE_URL, "GetBlogsByCategory", currCategory);
        requestQueue = Volley.newRequestQueue(this);
        StringRequest jor = new StringRequest(Request.Method.GET, url,
                new Response.Listener<String>() {
                    @Override
                    public void onResponse(String resp) {
                        Log.d("True", "");
                        try {
                            JSONObject response = new JSONObject(resp);
                            dialog.dismiss();
                            System.out.println("Json == > " + response.toString());
                            JSONObject obj = new JSONObject(response.toString());
                            if (response.get("success").toString() == "true") {
                                JSONArray arr = obj.getJSONArray("Result");
                                for (int i = 0; i < arr.length(); i++) {
                                    String blogString = arr.get(i).toString();
                                    Blog blog = new Gson().fromJson(blogString, Blog.class);
                                    myblogArrayList.add(blog);
                                }
                                if (myblogArrayList.isEmpty()) {
                                    Toast.makeText(getApplicationContext(), "There are No BLog In this Categories", Toast.LENGTH_LONG).show();
                                }
                                adapter.notifyDataSetChanged();
                            } else {
                                Toast.makeText(getApplicationContext(), "Something Went Wrong", Toast.LENGTH_LONG).show();
                            }
                        } catch (JSONException ex) {
                            dialog.dismiss();
                            Toast.makeText(getApplicationContext(), "Something Went Wrong On Server.Please Try Again Later", Toast.LENGTH_LONG).show();
                            Log.d("JSON Exception", ex.getMessage());
                        }
                    }
                },
                new Response.ErrorListener() {
                    @Override
                    public void onErrorResponse(VolleyError error) {
                        dialog.dismiss();
                        Toast.makeText(getApplicationContext(), "Connection Error. Please Check Your Internet Connection", Toast.LENGTH_LONG).show();
                        error.printStackTrace();
                        Log.e("Volley", "Error" + error.getMessage());
                    }
                }
        );
        jor.setRetryPolicy(new DefaultRetryPolicy(20000, 0, 0.0f));
        requestQueue.add(jor);
    }


}
