package com.ibitvalley.writon;

import android.app.ProgressDialog;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;

import androidx.annotation.RequiresApi;
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
import com.ibitvalley.writon.adapter.MyBlogAdapter;
import com.ibitvalley.writon.classes.model.Posts_List;
import com.ibitvalley.writon.classes.roomdataclasses.Post_List_Data;
import com.ibitvalley.writon.model.Blog;
import com.ibitvalley.writon.retroFit.RetroFitClient;
import com.ibitvalley.writon.retroFit.ServiceGenerator;
import com.ibitvalley.writon.utils.AppUtils;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

import io.reactivex.android.schedulers.AndroidSchedulers;
import io.reactivex.functions.Consumer;
import io.reactivex.schedulers.Schedulers;

public class MyBlog extends BaseActivity {

    List<Post_List_Data> myblogArrayList;
    MyBlogAdapter adapter;
    RecyclerView recyclerView1;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_my_blog);
        this.setTitle("Your Creations");
        recyclerView1 = findViewById(R.id.recyclerView1);
        LinearLayoutManager layoutManager = new LinearLayoutManager(this);
        recyclerView1.setLayoutManager(layoutManager);
        myblogArrayList = new ArrayList<>();
        adapter = new MyBlogAdapter(this, this, myblogArrayList, "Your Creation");
        recyclerView1.setAdapter(adapter);
        getBlogsListCallApi();
    }

    ProgressDialog progress;



    private void getBlogsListCallApi() {
        RequestQueue requestQueue;
        progress = new ProgressDialog(this);
        progress.show();
        progress.setTitle("Please Wait");

        SharedPreferences preferences = getApplicationContext().getSharedPreferences("mPrefs", MODE_PRIVATE);
        final String UserId = preferences.getString("UserId", "0");

        RetroFitClient publishedPosts = ServiceGenerator.getRetrofitOld().create(RetroFitClient.class);
        publishedPosts.getBlogListByUserID( UserId )
                .subscribeOn( Schedulers.io() )
                .observeOn( AndroidSchedulers.mainThread() )
                .subscribe( new Consumer<Posts_List>() {
                    @Override
                    public void accept(Posts_List posts_list) throws Exception {

                        if (progress != null && progress.isShowing())
                            progress.dismiss();

                        if ( !AppUtils.isNull( posts_list ) && !AppUtils.isNull( posts_list.getData() ) )
                        {
                            myblogArrayList.addAll( posts_list.getData());
                            adapter.notifyDataSetChanged();
                        }

                    }
                } , new Consumer<Throwable>() {
                    @Override
                    public void accept(Throwable throwable) throws Exception {
                        if (progress != null && progress.isShowing())
                            progress.dismiss();
                    }
                } );

    }
}
