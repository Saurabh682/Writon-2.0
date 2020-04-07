package com.ibitvalley.writon;

import android.os.Bundle;
import android.util.Log;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.recyclerview.widget.DefaultItemAnimator;
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
import com.ibitvalley.writon.adapter.DiscusListAdapter;
import com.ibitvalley.writon.adapter.TopFollowersAdapter;
import com.ibitvalley.writon.model.BlogComment;
import com.ibitvalley.writon.model.TrendingPost_Model;
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

public class discus extends AppCompatActivity {


    RecyclerView recyclerView1;
    DiscusListAdapter adapter;
    ArrayList<BlogComment> arrComments;
    User userData;



    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_discus);
        this.setTitle("Your Discussions");

        userData = WritOnPreference.getInstance(getApplicationContext()).getUserDetails();
        recyclerView1 = (RecyclerView) findViewById(R.id.recyclerView1);
        loadDiscussionData();
    }





    // Fetching Trending Post

    private void loadDiscussionData() {

        HashMap<String, String> hmHomeParam = new HashMap <>();
        hmHomeParam.put("userid", userData.getId());
        SmartPostWebRequest mainCategory = new SmartPostWebRequest(WebConstants.discussions_action, this, false, hmHomeParam, new OnResponseListener() {
            @Override
            public void onSuccess(Object result) {
                try {
                    JSONObject jsonResponse = new JSONObject(result.toString());
                    if (jsonResponse != null) {
                        Integer status = jsonResponse.getInt("success");
                        if (status == 1) {
                            JSONArray arrMainCategoryJson = jsonResponse.optJSONArray("data");
                            Type type = new TypeToken<ArrayList<BlogComment>>() {}.getType();
                            ArrayList<BlogComment> trending_post = new Gson().fromJson(arrMainCategoryJson.toString(), type);
                            setAdapterData(trending_post);
                        }else{
                            String message = jsonResponse.getString("message");
                            Toast.makeText(discus.this, message, Toast.LENGTH_LONG).show();
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


    private void setAdapterData(ArrayList<BlogComment> blogComment){
        adapter = new DiscusListAdapter(this, this, blogComment);
        recyclerView1.setHasFixedSize(true);
        LinearLayoutManager layoutManager = new LinearLayoutManager(this);
        layoutManager.setOrientation(LinearLayoutManager.VERTICAL);
        recyclerView1.setLayoutManager(layoutManager);
        recyclerView1.setItemAnimator(new DefaultItemAnimator());
        recyclerView1.setAdapter(adapter);
        adapter.notifyDataSetChanged();

    }
}
