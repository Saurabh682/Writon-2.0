package com.ibitvalley.writon.fragment;

import android.content.Context;
import android.os.Bundle;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.DefaultItemAnimator;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.android.volley.VolleyError;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.ibitvalley.writon.MyWorldActionListener;
import com.ibitvalley.writon.adapter.LatestBlogAdapter;
import com.ibitvalley.writon.classes.model.Posts_List;
import com.ibitvalley.writon.classes.model.Posts_List_Response;
import com.ibitvalley.writon.classes.roomdataclasses.BookMark_List_Data;
import com.ibitvalley.writon.classes.roomdataclasses.Post_List_Data;
import com.ibitvalley.writon.classes.view_model.OUD_Viewmodel;
import com.ibitvalley.writon.googleAnalytics.MyApplication;
import com.ibitvalley.writon.R;
import com.ibitvalley.writon.adapter.RecentReadBlogAdapter;
import com.ibitvalley.writon.model.Blog;
import com.ibitvalley.writon.model.MyWorldModel;
import com.ibitvalley.writon.model.User;
import com.ibitvalley.writon.retroFit.RetroFitClient;
import com.ibitvalley.writon.retroFit.ServiceGenerator;
import com.ibitvalley.writon.utils.AppUtils;
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
import java.util.List;

import butterknife.BindView;
import butterknife.ButterKnife;
import io.reactivex.android.schedulers.AndroidSchedulers;
import io.reactivex.functions.Consumer;
import io.reactivex.schedulers.Schedulers;

public class RecentFragment extends Fragment {

    Context thiscontext;
    ArrayList<Blog> myblogArrayList;
    LatestBlogAdapter recentBlogAdapter;
    RecyclerView recyclerView1;
    User userData;
    private OUD_Viewmodel oud_Viewmodel;

    @BindView( R.id.progress_bar )
    ProgressBar progressBar;

    @BindView( R.id.txt_no_records )
    TextView txt_no_records;

    public RecentFragment() {
        // Required empty public constructor

    }


    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        // Inflate the layout for this fragment
        View view = inflater.inflate(R.layout.fragment_recent, container, false);

        oud_Viewmodel = new ViewModelProvider(this).get(OUD_Viewmodel.class);
        ButterKnife.bind( this,view );

        thiscontext = container.getContext();
        userData = WritOnPreference.getInstance(thiscontext).getUserDetails();
        recyclerView1 = (RecyclerView) view.findViewById(R.id.recyclerView1);
        loadLatestPost();

        MyApplication.getInstance().trackEvent("Posts", "Read Post List", "Recent read posts");
        MyApplication.getInstance().trackScreenView("Recent Read");
        return  view;
    }



    private void loadLatestPost() {
        AppUtils.ShowView( progressBar,true );
        RetroFitClient recentBlogs = ServiceGenerator.getRetrofit().create(RetroFitClient.class);

        recentBlogs.getRecentReadBlogs( userData.getAccess_token(),userData.getId(),"25" ).subscribeOn( Schedulers.io() )
                .observeOn( AndroidSchedulers.mainThread() )
                .subscribe( new Consumer<Posts_List>() {
                    @Override
                    public void accept(Posts_List response) throws Exception {
                        AppUtils.ShowView( progressBar,false );
                        if (!AppUtils.isNull( response ) && !AppUtils.isNull( response.getData() )  )
                            displayLatestPost( response.getData() );
                        else
                            AppUtils.ShowView( txt_no_records,true );
                    }
                } , new Consumer<Throwable>() {
                    @Override
                    public void accept(Throwable throwable) throws Exception {
                        AppUtils.ShowView( progressBar,false );
                        AppUtils.ShowView( txt_no_records,true );
                    }
                } );

    }


    private void displayLatestPost(List<Post_List_Data> latestBlog){

        recentBlogAdapter = new LatestBlogAdapter(getActivity(), getContext(), latestBlog, new MyWorldActionListener() {
            @Override
            public void onClick(int position , String action , String blogId , boolean value , String userId , String username , String title) {
                latestBlog.get( position ).setIsFollowed( value );
                oud_Viewmodel.updateFollowRoom(blogId, value,value ? 1 : 0,userId, username,title);
                recentBlogAdapter.notifyDataSetChanged();
            }

            @Override
            public void onClickBookmark(int position , MyWorldModel myWorldModel , boolean value) {
                BookMark_List_Data bookMark_list_data=new BookMark_List_Data( myWorldModel );
                oud_Viewmodel.updateBookmark( bookMark_list_data,value);
                latestBlog.get( position ).setIsBookmarked( value );
                recentBlogAdapter.notifyDataSetChanged();
            }
        });

        //Adapter set to recyclerView
        LinearLayoutManager latestLayoutManager = new LinearLayoutManager(getContext());
        latestLayoutManager.setOrientation(LinearLayoutManager.VERTICAL);
        recyclerView1.setLayoutManager(latestLayoutManager);
        recyclerView1.setItemAnimator(new DefaultItemAnimator());
        recyclerView1.setAdapter(recentBlogAdapter);
        recentBlogAdapter.notifyDataSetChanged();

    }



}
