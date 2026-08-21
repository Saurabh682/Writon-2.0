package com.ibitvalley.writon;

import android.app.ProgressDialog;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.TextView;
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
import com.ibitvalley.writon.utils.AppUtils;
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

public class Draft extends BaseActivity {
    ArrayList<Blog> draftblogArrayList;
    DraftBlogAdapter adapter;
    RecyclerView recyclerView1;
    TextView txt_no_records;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_draft);
        this.setTitle("Draft");
        recyclerView1 = (RecyclerView) findViewById(R.id.recyclerView1);
        LinearLayoutManager layoutManager = new LinearLayoutManager(this);
        recyclerView1.setLayoutManager(layoutManager);
        draftblogArrayList = new ArrayList<>();
        adapter = new DraftBlogAdapter( Draft.this , Draft.this , draftblogArrayList ,
                new onDeleteClick() {
                    @Override
                    public void onDelete(int position) {
                        if ( adapter.getArrappliedjob().size()==0  )
                            txt_no_records.setVisibility( View.VISIBLE );
                    }
                } );
        recyclerView1.setAdapter(adapter);
        txt_no_records=findViewById( R.id.txt_no_records );

        getDraftBlog();
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

        if ( AppUtils.isNull( trendingBlog )  ||  trendingBlog.size()==0)
            txt_no_records.setVisibility( View.VISIBLE );
        else
        {
            txt_no_records.setVisibility( View.GONE );

            draftblogArrayList.addAll( trendingBlog );
            recyclerView1.setAdapter(adapter);
            adapter.notifyDataSetChanged();
        }
    }


    public interface onDeleteClick
    {
        void onDelete(int position);
    }
}
