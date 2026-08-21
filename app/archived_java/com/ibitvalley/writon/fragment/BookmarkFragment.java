package com.ibitvalley.writon.fragment;

import android.app.ProgressDialog;
import android.os.Bundle;
import android.os.Parcelable;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.Observer;
import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.DefaultItemAnimator;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.ibitvalley.writon.MyWorldActionListener;
import com.ibitvalley.writon.adapter.BookmarksBlogAdapter;
import com.ibitvalley.writon.classes.roomdataclasses.BookMark_List_Data;
import com.ibitvalley.writon.googleAnalytics.MyApplication;
import com.ibitvalley.writon.R;
import com.ibitvalley.writon.adapter.LatestBlogAdapter;
import com.ibitvalley.writon.adapter.MyBlogAdapter;
import com.ibitvalley.writon.classes.roomdataclasses.Post_List_Data;
import com.ibitvalley.writon.classes.view_model.OUD_Viewmodel;
import com.ibitvalley.writon.model.Blog;
import com.ibitvalley.writon.model.MyWorldModel;
import com.ibitvalley.writon.utils.AppUtils;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

import butterknife.BindView;
import butterknife.ButterKnife;
import io.reactivex.android.schedulers.AndroidSchedulers;
import io.reactivex.disposables.CompositeDisposable;
import io.reactivex.functions.Consumer;
import io.reactivex.schedulers.Schedulers;


public class BookmarkFragment extends Fragment {


    private static final String TAG = "BookMarkFrag";
    ArrayList<Blog> myblogArrayList;
    private RecyclerView recyclerViewLatest;
    private BookmarksBlogAdapter latestLatestBlogAdapter;
    MyBlogAdapter adapter;
    RecyclerView recyclerView1;
    @BindView(R.id.ivErrorView)
    ImageView ivErrorV;
    @BindView(R.id.progress_bar)
    ProgressBar progressBar;

    @BindView(R.id.txt_no_records)
    TextView txt_no_records;
    private OUD_Viewmodel oud_Viewmodel;
    private LinearLayoutManager linearLayoutManager;
    CompositeDisposable disposable = new CompositeDisposable();
    private ArrayList<BookMark_List_Data> latestBlog=new ArrayList<>(  );

    public BookmarkFragment() {
        // Required empty public constructor
    }


    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        // Inflate the layout for this fragment
        View view = inflater.inflate(R.layout.fragment_bookmark, container, false);
        ButterKnife.bind(this, view);
        oud_Viewmodel = new ViewModelProvider(this).get(OUD_Viewmodel.class);
        recyclerViewLatest = view.findViewById(R.id.recyclerViewLatest16);
        linearLayoutManager = new LinearLayoutManager(getContext());
        //recyclerViewLatest = rootView.findViewById(R.id.recyclerViewLatest16);
        myblogArrayList = new ArrayList<>();
        //adapter = new MyBlogAdapter(getActivity(), getContext(), myblogArrayList, "Bookmarks");
        //recyclerView1.setAdapter(adapter);
       // getBlogsListCallApi();
        MyApplication.getInstance().trackEvent("Bookmark", "View Bookmark", "BookMark");
        MyApplication.getInstance().trackScreenView("Bookmark");
        //loadTopFollowers();
        AppUtils.ShowView( progressBar,true );
        oud_Viewmodel.loadBookmarkListRx();
        UpdateRecyclerView();


        return  view;

    }

    void UpdateRecyclerView() {

        linearLayoutManager.setOrientation( LinearLayoutManager.VERTICAL );
        recyclerViewLatest.setLayoutManager( linearLayoutManager );
        recyclerViewLatest.setItemAnimator( new DefaultItemAnimator() );
        latestLatestBlogAdapter = new BookmarksBlogAdapter( Objects.requireNonNull( getActivity() ) ,
                getContext() , latestBlog , new MyWorldActionListener() {
            @Override
            public void onClick(int position , String action , String blogId , boolean value , String userId , String username , String title) {
                latestBlog.get( position ).setIsFollowed( value );
                oud_Viewmodel.updateFollowRoom(blogId, value,value ? 1 : 0,userId, username,title);
                latestLatestBlogAdapter.notifyDataSetChanged();
            }

            @Override
            public void onClickBookmark(int position , MyWorldModel myWorldModel , boolean value) {
                BookMark_List_Data bookMark_list_data=new BookMark_List_Data( myWorldModel );
                oud_Viewmodel.updateBookmark( bookMark_list_data,value);
                latestBlog.get( position ).setIsBookmarked( value );
                latestLatestBlogAdapter.notifyDataSetChanged();
            }
        } );
        recyclerViewLatest.setAdapter( latestLatestBlogAdapter );
        latestLatestBlogAdapter.notifyDataSetChanged();


        oud_Viewmodel.getBookMarksLiveData().observe( this , new Observer<List<BookMark_List_Data>>() {
            @Override
            public void onChanged(List<BookMark_List_Data> post_list_data) {
                AppUtils.ShowView( progressBar,false );
                if ( !AppUtils.isNull( post_list_data ) && post_list_data.size()>0 )
                    displayLatestPost( post_list_data );
                else
                {
                    AppUtils.ShowView( txt_no_records,true );

                }

            }
        } );
        oud_Viewmodel.getBlogCount().observe(this, new Observer<Integer>() {
            @Override
            public void onChanged(@Nullable Integer integer) {
                Log.i(TAG, "Total Blogs: " + integer);
            }
        });
    }

    private void displayLatestPost(List<BookMark_List_Data> bookmarkList) {

       latestBlog.clear();
       latestBlog.addAll( bookmarkList );
        latestLatestBlogAdapter.notifyDataSetChanged();
    }

    ProgressDialog progress;

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        disposable.clear();
    }

    // Fetching Trending Post

   /* private void loadTopFollowers() {

        HashMap<String, String> hmHomeParam = new HashMap <>();
        //hmHomeParam.put("page", "1");
        SmartPostWebRequest mainCategory = new SmartPostWebRequest(WebConstants.bookmarked_api, getContext(), true, hmHomeParam, new OnResponseListener() {
            @Override
            public ArrayList<Blog> onSuccess(Object result) {
                try {
                    JSONObject jsonResponse = new JSONObject(result.toString());
                    if (jsonResponse != null) {
                        Integer status = jsonResponse.getInt("success");
                        if (status == 1) {
                            JSONObject jsonResponseMain = jsonResponse.getJSONObject("data");
                            JSONArray arrMainCategoryJson = jsonResponseMain.optJSONArray("data");
                            Type type = new TypeToken<ArrayList<Blog>>() {}.getType();
                            ArrayList<Blog> trending_post = new Gson().fromJson(arrMainCategoryJson.toString(), type);
                            displayTopFollowersPost(trending_post);
                        }else{
                            String message = jsonResponse.getString("message");
                            Toast.makeText(getContext(), message, Toast.LENGTH_LONG).show();
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
    }*/



}
