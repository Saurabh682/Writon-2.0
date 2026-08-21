package com.ibitvalley.writon.fragment;

import android.content.Context;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.annotation.RequiresApi;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.Observer;
import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.DefaultItemAnimator;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.android.volley.VolleyError;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.ibitvalley.writon.MyWorldActionListener;
import com.ibitvalley.writon.R;
import com.ibitvalley.writon.adapter.LatestBlogAdapter;
import com.ibitvalley.writon.classes.roomdataclasses.BookMark_List_Data;
import com.ibitvalley.writon.classes.roomdataclasses.Post_List_Data;
import com.ibitvalley.writon.classes.view_model.OUD_Viewmodel;
import com.ibitvalley.writon.model.Blog;
import com.ibitvalley.writon.model.MyWorldModel;
import com.ibitvalley.writon.retroFit.RetroFitClient;
import com.ibitvalley.writon.retroFit.ServiceGenerator;
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
import java.util.List;

import butterknife.BindView;
import butterknife.ButterKnife;


public class CategoryListBlogFragment extends Fragment {



    View rootView;
    Context thiscontext;
    Handler handler;
    LatestBlogAdapter categoryBlogAdapter;
    RecyclerView recyclerView1;
    ArrayList<Blog> blogArrayList;
    TextView blogType;
    private OUD_Viewmodel oud_Viewmodel;


    ProgressBar progressBar;
    TextView txtRecords;


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
        recyclerView1 = (RecyclerView) rootView.findViewById(R.id.recyclerView1);
        blogType = (TextView) rootView.findViewById(R.id.blogType);
        txtRecords=(TextView) rootView.findViewById( R.id.txt_no_records );
        progressBar=(ProgressBar) rootView.findViewById( R.id.progress_bar );

        return  rootView;
    }

    @Override
    public void onViewCreated(@NonNull View view , @Nullable Bundle savedInstanceState) {
        super.onViewCreated( view , savedInstanceState );
        oud_Viewmodel = new ViewModelProvider(this).get( OUD_Viewmodel.class);
        String catValue = "";
        if(getArguments()!=null) {
            catValue = String.valueOf(this.getArguments().getString("cName"));
            blogType.setText(catValue);
            searchBlogPost(catValue);
        }
    }

    private void searchBlogPost(String subCategory) {

        AppUtils.ShowView( progressBar,true );
        oud_Viewmodel.searchBlogByCategory( subCategory );
            oud_Viewmodel.getmListLiveData().observe( this , new Observer<List<Post_List_Data>>() {
                @Override
                public void onChanged(List<Post_List_Data> post_list_data) {
                    AppUtils.ShowView( progressBar,false );

                    if ( !AppUtils.isNull( post_list_data ) && post_list_data.size()>0  )
                        displayLatestPost(post_list_data);
                    else
                        AppUtils.ShowView( txtRecords,true );
                }
            } );

    }


    @RequiresApi(api = Build.VERSION_CODES.KITKAT)
    private void displayLatestPost(List<Post_List_Data> latestBlog){

        categoryBlogAdapter = new LatestBlogAdapter( getActivity() , thiscontext , latestBlog ,
                new MyWorldActionListener() {
                    @Override
                    public void onClick(int position , String action , String blogId , boolean value , String userId , String username , String title) {
                        latestBlog.get( position ).setIsFollowed( value );
                        oud_Viewmodel.updateFollowRoom(blogId, value,value ? 1 : 0,userId, username,title);
                        categoryBlogAdapter.notifyDataSetChanged();
                    }

                    @Override
                    public void onClickBookmark(int position , MyWorldModel myWorldModel , boolean value) {
                        BookMark_List_Data bookMark_list_data=new BookMark_List_Data( myWorldModel );
                        oud_Viewmodel.updateBookmark( bookMark_list_data,value);
                        latestBlog.get( position ).setIsBookmarked( value );
                        categoryBlogAdapter.notifyDataSetChanged();
                    }
                } );
        //Adapter set to recyclerView
        LinearLayoutManager latestLayoutManager = new LinearLayoutManager(thiscontext);
        latestLayoutManager.setOrientation(LinearLayoutManager.VERTICAL);
        recyclerView1.getRecycledViewPool().clear();
        recyclerView1.setLayoutManager(latestLayoutManager);
        recyclerView1.setItemAnimator(new DefaultItemAnimator());
        recyclerView1.setAdapter(categoryBlogAdapter);
        categoryBlogAdapter.notifyDataSetChanged();

    }





}

