package com.ibitvalley.writon.Fragment;

import android.app.ProgressDialog;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.android.volley.Request;
import com.android.volley.RequestQueue;
import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.JsonObjectRequest;
import com.android.volley.toolbox.Volley;
import com.google.gson.Gson;
import com.ibitvalley.writon.R;
import com.ibitvalley.writon.adapter.NotificationAdapter;
import com.ibitvalley.writon.adapter.RecentReadBlogAdapter;
import com.ibitvalley.writon.model.Blog;
import com.ibitvalley.writon.model.NotifyClass;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;

import static android.content.Context.MODE_PRIVATE;


public class NotificationFragment extends Fragment {

    ArrayList<NotifyClass> myblogArrayList;
    NotificationAdapter adapter;
    RecyclerView recyclerView1;

    public NotificationFragment() {
        // Required empty public constructor
    }


    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        // Inflate the layout for this fragment
        View view = inflater.inflate(R.layout.fragment_notification, container, false);
        recyclerView1 = (RecyclerView) view.findViewById(R.id.recyclerView1);
        LinearLayoutManager layoutManager = new LinearLayoutManager(getContext());
        recyclerView1.setLayoutManager(layoutManager);
        myblogArrayList = new ArrayList<>();
        adapter = new NotificationAdapter(getActivity(), getContext(), myblogArrayList);
        recyclerView1.setAdapter(adapter);
        getBlogsListCallApi();
        return  view;
    }



    ProgressDialog progress;
    private void getBlogsListCallApi() {
        RequestQueue requestQueue;
        progress = new ProgressDialog(getContext());
        progress.show();
        progress.setTitle("Please Wait");
        requestQueue = Volley.newRequestQueue(getContext());
        SharedPreferences preferences = getContext().getSharedPreferences("mPrefs", MODE_PRIVATE);
        final String UserId = preferences.getString("UserId", "0");
        String loginURL = String.format("http://blog.ibitvalley.com/api/GetNotification?UserID=%s", UserId);
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
                                    NotifyClass notifyClass = new Gson().fromJson(blogString, NotifyClass.class);
                                    myblogArrayList.add(notifyClass);
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
