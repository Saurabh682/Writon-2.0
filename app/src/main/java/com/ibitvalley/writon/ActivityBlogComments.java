package com.ibitvalley.writon;

import android.app.Activity;
import android.app.ProgressDialog;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Bundle;
import android.se.omapi.SEService;
import android.util.Log;
import android.view.View;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.Nullable;
import androidx.annotation.RequiresApi;
import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.DefaultItemAnimator;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.android.volley.AuthFailureError;
import com.android.volley.DefaultRetryPolicy;
import com.android.volley.Request;
import com.android.volley.RequestQueue;
import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.JsonObjectRequest;
import com.android.volley.toolbox.StringRequest;
import com.android.volley.toolbox.Volley;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.ibitvalley.writon.adapter.BlogCommentsAdapter;
import com.ibitvalley.writon.adapter.DiscusListAdapter;
import com.ibitvalley.writon.model.Blog;
import com.ibitvalley.writon.model.BlogComment;
import com.ibitvalley.writon.model.TrendingPost_Model;
import com.ibitvalley.writon.model.User;
import com.ibitvalley.writon.utils.VolleySingleton;
import com.ibitvalley.writon.utils.WritOnPreference;
import com.ibitvalley.writon.webapi.WebConstants;
import com.ibitvalley.writon.webapi.util.OnResponseListener;
import com.ibitvalley.writon.webapi.util.SmartPostWebRequest;
import com.squareup.picasso.Picasso;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

import de.hdodenhof.circleimageview.CircleImageView;

/**
 * Created by on 14-10-2016.
 */

public class ActivityBlogComments extends AppCompatActivity {
    RecyclerView recyclerView1;
    //BlogCommentsAdapter adapter;
    ArrayList<BlogComment> arrComments;
    ProgressDialog progress;
    EditText ETWriteComment;
    ImageView IVSend, backbutton;
    Blog currBlog;
    String BlogType, categoryValue, createdByValue, blogTitleValie, blogIDValue;
    TextView TVTitle, TVUserName, TVCategory;
    TrendingPost_Model trendingPost_model;
    DiscusListAdapter adapter;
    CircleImageView list_image;
    Activity curr_activity;
    Context curr_context;
    User userData;


    @RequiresApi(api = Build.VERSION_CODES.KITKAT)
    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_blog_comments);

        BlogType = (String) getIntent().getSerializableExtra("BlogType");

        curr_activity = this;
        curr_context = this;
        list_image = (CircleImageView) findViewById(R.id.list_image);
        backbutton = findViewById(R.id.backbutton);
        userData = WritOnPreference.getInstance(curr_context).getUserDetails();


        recyclerView1 = (RecyclerView) findViewById(R.id.recyclerView1);
        ETWriteComment = (EditText) findViewById(R.id.ETWriteComment);
        TVTitle = (TextView) findViewById(R.id.TVTitle);
        TVUserName = (TextView) findViewById(R.id.TVUserName);
        TVCategory = (TextView) findViewById(R.id.TVCategory);


        IVSend = (ImageView) findViewById(R.id.IVSend);

        if(BlogType.endsWith("cuuBlog")){
            currBlog = (Blog) getIntent().getSerializableExtra("BlogObject");
            categoryValue = String.format("%s, %s (%s)", currBlog.getCategory(), currBlog.getSubCat(), currBlog.getLanguage());
            createdByValue = currBlog.getUser_name();

            blogTitleValie = currBlog.getTitle();
            blogIDValue = currBlog.getBlogId();
            if(currBlog.getUser_image() != null) {
                Picasso.get().load(currBlog.getUser_image()).placeholder(R.drawable.usermale).into(list_image);
            }
            IntegrateWriteCommentAPI(currBlog.getBlogId());
        }else {
            trendingPost_model = (TrendingPost_Model) getIntent().getSerializableExtra("BlogObject");
            categoryValue = String.format("%s, %s (%s)", trendingPost_model.getCategory(), trendingPost_model.getSubCat(), trendingPost_model.getLanguage());
            createdByValue = trendingPost_model.getUser_name();
            blogTitleValie = trendingPost_model.getTitle();
            blogIDValue = trendingPost_model.getBlogId();
            if(trendingPost_model.getUser_image() != null) {
                Picasso.get().load(trendingPost_model.getUser_image()).placeholder(R.drawable.usermale).into(list_image);
            }
            IntegrateWriteCommentAPI(trendingPost_model.getBlogId());
        }

        TVCategory.setText(categoryValue);
        TVUserName.setText(createdByValue);
        TVTitle.setText(blogTitleValie);

        Objects.requireNonNull(getSupportActionBar()).hide();
        arrComments = new ArrayList<>();

        //System.out.println("CommentUsername"+createdByValue);
       // System.out.println("LoginUsername"+userData.getUsername());



        //LinearLayoutManager layoutManager = new LinearLayoutManager(this);
        //recyclerView1.setLayoutManager(layoutManager);
       // adapter = new BlogCommentsAdapter(this, this, arrComments);
        //recyclerView1.setAdapter(adapter);
        //getBlogsListCallApi();


        loadDiscussionData();

        backbutton.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                finish();
            }
        });

    }

    private void IntegrateWriteCommentAPI(final String blogID) {
        IVSend.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (ETWriteComment.getText().toString().trim().length() < 2) {
                    ETWriteComment.setError("Comment Text is to Short.");
                    ETWriteComment.requestFocus();
                } else {
                    ETWriteComment.setError(null);
                    callWriteBLogWebAPI(blogID);
                }
            }
        });
    }

    private void callWriteBLogWebAPI(String blogID) {
        IVSend.setVisibility(View.GONE);

        HashMap<String, String> hmHomeParam = new HashMap <>();
        hmHomeParam.put("BlogId", blogID);
        hmHomeParam.put("UserId", userData.getId());
        hmHomeParam.put("Comment", ETWriteComment.getText().toString());
        SmartPostWebRequest mainCategory = new SmartPostWebRequest(WebConstants.add_comment_url, curr_context, false, hmHomeParam, new OnResponseListener() {
            @Override
            public void onSuccess(Object result) {
                try {
                    JSONObject jsonResponse = new JSONObject(result.toString());
                    Integer status = jsonResponse.getInt("success");
                    if (status == 1) {
                        BlogComment comment = new BlogComment();
                        comment.setComment(ETWriteComment.getText().toString());
                        comment.setUserId(userData.getId());
                        comment.setName(userData.getUsername());
                        comment.setDateTime("Now");
                        trending_post.add(comment);
                        adapter.notifyDataSetChanged();
                        ETWriteComment.setText("");
                        IVSend.setVisibility(View.VISIBLE);
                    }else{
                        IVSend.setVisibility(View.VISIBLE);
                        String message = jsonResponse.getString("message");
                        Toast.makeText(curr_context, message, Toast.LENGTH_LONG).show();
                    }
                } catch (JSONException e) {
                    IVSend.setVisibility(View.VISIBLE);
                    e.printStackTrace();
                }
            }
            @Override
            public void onError(VolleyError error) {
                IVSend.setVisibility(View.VISIBLE);
                Log.d("","");
            }
        });
        VolleySingleton.getInstance().addToRequestQueue(mainCategory);

        /*SharedPreferences preferences = getApplicationContext().getSharedPreferences("mPrefs", MODE_PRIVATE);
        final String userId = preferences.getString("UserId", "");
        final String userName = preferences.getString("UserName", "");
        String URL = WebConstants.add_comment_url;
        StringRequest request = new StringRequest(Request.Method.POST, URL, new Response.Listener<String>() {
            @Override
            public void onResponse(String response) {
                try {
                    IVSend.setVisibility(View.VISIBLE);
                    System.out.println("Response : " + response.toString());
                    JSONObject object = new JSONObject(response.toString());
                    if (object.getBoolean("success") == true) {
                        BlogComment comment = new BlogComment();
                        comment.setComment(ETWriteComment.getText().toString());
                        comment.setUserId(userId);
                        comment.setUserName(userName);
                        comment.setDateTime("Now");
                        arrComments.add(comment);
                        adapter.notifyDataSetChanged();
                        ETWriteComment.setText("");
                        //Toast.makeText(getApplicationContext(), "Comment Added Successfully", Toast.LENGTH_LONG).show();
                    } else {
                        Toast.makeText(getApplicationContext(), "Something went wrong", Toast.LENGTH_LONG).show();
                    }
                } catch (JSONException e) {
                    Toast.makeText(getApplicationContext(), "Something went wrong", Toast.LENGTH_LONG).show();
                    e.printStackTrace();
                }
            }
        }, new Response.ErrorListener() {
            @Override
            public void onErrorResponse(VolleyError error) {
                IVSend.setVisibility(View.VISIBLE);
                Toast.makeText(getApplicationContext(), "Connection Error", Toast.LENGTH_LONG).show();
            }
        }) {
            @Override
            protected Map<String, String> getParams() throws AuthFailureError {
                Map<String, String> params = new HashMap<>();
                params.put("BlogId", currBlog.getBlogId());
                params.put("UserId", userId);
                params.put("Comment", ETWriteComment.getText().toString());
                System.out.println("PARAMS  : " + params.toString());
                return params;
            }
        };
        request.setRetryPolicy(new DefaultRetryPolicy(20000, 0, 0.0f));
        Volley.newRequestQueue(getApplicationContext()).add(request);*/
    }

    private void getBlogsListCallApi() {
        RequestQueue requestQueue;
        progress = new ProgressDialog(this);
        progress.show();
        progress.setTitle("Please Wait");
        requestQueue = Volley.newRequestQueue(this);
        String loginURL = String.format("http://blog.ibitvalley.com/api/GetComments?BlogId=%s", currBlog.getBlogId());
        System.out.println("BLOG COMMENT ID : " + loginURL);
        JsonObjectRequest jor = new JsonObjectRequest(Request.Method.GET, loginURL, null,
                new Response.Listener<JSONObject>() {
                    @RequiresApi(api = Build.VERSION_CODES.KITKAT)
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
                                    BlogComment blog = new Gson().fromJson(blogString, BlogComment.class);
                                    arrComments.add(blog);
                                }
                                adapter.notifyDataSetChanged();
                            }
                        } catch (JSONException ex) {
                            if (progress != null && progress.isShowing())
                                progress.dismiss();
                            Log.d("JSON Exception", Objects.requireNonNull(ex.getMessage()));
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



    ArrayList<BlogComment> trending_post;
    private void loadDiscussionData() {

        HashMap<String, String> hmHomeParam = new HashMap <>();
        hmHomeParam.put("BlogId", blogIDValue);
        SmartPostWebRequest mainCategory = new SmartPostWebRequest(WebConstants.comment_url, curr_context, false, hmHomeParam, new OnResponseListener() {
            @Override
            public void onSuccess(Object result) {
                try {
                    JSONObject jsonResponse = new JSONObject(result.toString());
                    Integer status = jsonResponse.getInt("success");
                    if (status == 1) {
                        JSONArray arrMainCategoryJson = jsonResponse.optJSONArray("data");
                        Type type = new TypeToken <ArrayList<BlogComment>>() {}.getType();
                        trending_post = new Gson().fromJson(arrMainCategoryJson.toString(), type);
                        setAdapterData(trending_post);
                    }else{
                        String message = jsonResponse.getString("message");
                        Toast.makeText(curr_context, message, Toast.LENGTH_LONG).show();
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


    private void setAdapterData(ArrayList<BlogComment> blogComment){
        adapter = new DiscusListAdapter(curr_activity, curr_context, blogComment);
        recyclerView1.setHasFixedSize(true);
        LinearLayoutManager layoutManager = new LinearLayoutManager(curr_context);
        //layoutManager.setOrientation(LinearLayoutManager.VERTICAL);
        recyclerView1.setLayoutManager(layoutManager);
        recyclerView1.setItemAnimator(new DefaultItemAnimator());
        recyclerView1.setAdapter(adapter);
        recyclerView1.getRootView();
        adapter.notifyDataSetChanged();

    }


}
