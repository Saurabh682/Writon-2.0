package com.ibitvalley.writon.fragment;

import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.RelativeLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.Nullable;
import androidx.annotation.RequiresApi;
import androidx.appcompat.app.AlertDialog;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.DefaultItemAnimator;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.google.android.material.floatingactionbutton.FloatingActionButton;
import com.google.android.material.tabs.TabLayout;
import com.ibitvalley.writon.Draft;
import com.ibitvalley.writon.MyBlog;
import com.ibitvalley.writon.MyWorldActionListener;
import com.ibitvalley.writon.R;
import com.ibitvalley.writon.adapter.LatestBlogAdapter;
import com.ibitvalley.writon.adapter.MostReadBlogAdapter;
import com.ibitvalley.writon.adapter.TopFollowersAdapter;
import com.ibitvalley.writon.adapter.TopRatedAdapter;
import com.ibitvalley.writon.classes.roomdataclasses.BookMark_List_Data;
import com.ibitvalley.writon.classes.roomdataclasses.Post_List_Data;
import com.ibitvalley.writon.classes.view_model.OUD_Viewmodel;
import com.ibitvalley.writon.discus;
import com.ibitvalley.writon.model.MyWorldModel;
import com.ibitvalley.writon.writeblogstepone;

import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

import butterknife.BindView;
import butterknife.ButterKnife;
import io.reactivex.android.schedulers.AndroidSchedulers;
import io.reactivex.disposables.CompositeDisposable;
import io.reactivex.functions.Consumer;
import io.reactivex.schedulers.Schedulers;

/**
 * Created by Android_PC on 10-08-2016.
 */
public class MostFollowedFragment extends Fragment{
    private View rootView;
    private TabLayout mTabHost;
    //Recent Blog List
    //ArrayList<Blog> blogArrayList;
    //Most Read Blog List
    //ArrayList<Blog> arrMostReadBlog;
    //Most BookMarked Blog List
    //ArrayList<Blog> arrMostBookMarketBlog;

    private Context thiscontext;
    private LatestBlogAdapter latestLatestBlogAdapter;
    TopFollowersAdapter topFollowersAdapter;
    TopRatedAdapter topRatedAdapter;

    private MostReadBlogAdapter mostReadAdapter;


    private RecyclerView recyclerViewLatest;
    private RelativeLayout rlLatest, rl1, rl2, rl3, rl4, rl5, rl6, rl7, rl8;
    private Handler handler;



    private FrameLayout fabFrame;
    private boolean fabExpanded = false;
    private FloatingActionButton fabSettings;
    private LinearLayout layoutFabSave;
    private LinearLayout layoutFabEdit;
    private LinearLayout layoutFabPhoto;
    private LinearLayout layoutMyBlog;
    private OUD_Viewmodel oud_Viewmodel;
    private TextView tvViewAll, tvViewAllztwo, tvViewAllzthree, tvViewAllzfour;
    @BindView(R.id.progress_bar_LatestPost)
    ProgressBar progressBar;
    private CompositeDisposable disposable = new CompositeDisposable();

    public static Fragment newInstance() {

        return new MostFollowedFragment();

    }


    @Override
    public View onCreateView(LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {

        rootView = inflater.inflate(R.layout.rated_frag, container, false);
        thiscontext = container.getContext();
        ButterKnife.bind(this, rootView);
        oud_Viewmodel = new ViewModelProvider(this).get(OUD_Viewmodel.class);
        //ivSearch = (ImageView) rootView.findViewById(R.id.ivSearch);
       // ivSearch1 = (ImageView) rootView.findViewById(R.id.ivSearch1);
        rlLatest = (RelativeLayout) rootView.findViewById(R.id.rlLatesttf);
        rl1 = (RelativeLayout) rootView.findViewById(R.id.rl1);
        rl2 = (RelativeLayout) rootView.findViewById(R.id.rl2);
        rl3 = (RelativeLayout) rootView.findViewById(R.id.rl3);
        rl4 = (RelativeLayout) rootView.findViewById(R.id.rl4);
        rl5 = (RelativeLayout) rootView.findViewById(R.id.rl5);
        rl6 = (RelativeLayout) rootView.findViewById(R.id.rl6);
        rl7 = (RelativeLayout) rootView.findViewById(R.id.rl7);
        rl8 = (RelativeLayout) rootView.findViewById(R.id.rl8);


        tvViewAll = (TextView) rootView.findViewById(R.id.tvViewAll6);


        // rlMain = (RelativeLayout) rootView.findViewById(R.id.rlMain);
        fabFrame = (FrameLayout) rootView.findViewById(R.id.fabFrame);
        fabSettings = (FloatingActionButton) rootView.findViewById(R.id.fabSetting);

        layoutFabSave = (LinearLayout) rootView.findViewById(R.id.layoutFabSave);
        layoutFabEdit = (LinearLayout) rootView.findViewById(R.id.layoutFabEdit);
        layoutFabPhoto = (LinearLayout) rootView.findViewById(R.id.layoutFabPhoto);
        layoutMyBlog = (LinearLayout)  rootView.findViewById(R.id.layoutMyBlog);
        //layoutFabSettings = (LinearLayout) this.findViewById(R.id.layoutFabSettings);

        //When main Fab (Settings) is clicked, it expands if not expanded already.
        //Collapses if main FAB was open already.
        //This gives FAB (Settings) open/close behavior
        fabSettings.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                if (fabExpanded == true){
                    closeSubMenusFab();
                    fabFrame.setClickable(false);
                } else {
                    openSubMenusFab();
                    fabFrame.setClickable(true);
                }
            }
        });

        //Only main FAB is visible in the beginning
        closeSubMenusFab();


        layoutFabSave.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Intent intent = new Intent(getContext(), Draft.class);
                startActivity(intent);
            }
        });

        layoutFabEdit.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Intent intent = new Intent(getContext(), writeblogstepone.class);
                startActivity(intent);
            }
        });


        layoutFabPhoto.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Intent intent = new Intent(getContext(), discus.class);
                startActivity(intent);
            }
        });

        layoutMyBlog.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Intent intent = new Intent(getContext(), MyBlog.class);
                startActivity(intent);
            }
        });

        disposable.add(oud_Viewmodel.getAllBlogRx()
                .subscribeOn(Schedulers.computation())
                .observeOn(AndroidSchedulers.mainThread())
                .subscribe(new Consumer<List<Post_List_Data>>() {
                               @Override
                               public void accept(List<Post_List_Data> listData) throws Exception {
                                   progressBar.setVisibility(View.GONE);
                                   displayLatestPost(listData);
                               }
                           }, new Consumer<Throwable>() {
                               @Override
                               public void accept(Throwable throwable) throws Exception {
                                   Toast.makeText(getContext(),
                                           "Error: " + throwable,
                                           Toast.LENGTH_SHORT)
                                           .show();

                               }
                           }
                ));
        return rootView;
    }



    //closes FAB submenus
    private void closeSubMenusFab(){
        layoutFabSave.setVisibility(View.INVISIBLE);
        layoutFabEdit.setVisibility(View.INVISIBLE);
        layoutFabPhoto.setVisibility(View.INVISIBLE);
        layoutMyBlog.setVisibility(View.INVISIBLE);
        //fabSettings.setImageResource(R.drawable.ic_autorenew_black_24dp);
        fabExpanded = false;

    }

    //Opens FAB submenus
    private void openSubMenusFab(){
        layoutFabSave.setVisibility(View.VISIBLE);
        layoutFabEdit.setVisibility(View.VISIBLE);
        layoutFabPhoto.setVisibility(View.INVISIBLE);
        layoutMyBlog.setVisibility(View.INVISIBLE);
        //Change settings icon to 'X' icon
        //fabSettings.setImageResource(R.drawable.ic_check_black_24dp);
        fabExpanded = true;

    }


    /*ProgressDialog progress;

    @RequiresApi(api = Build.VERSION_CODES.KITKAT)
    private void initilize(final String catValue) {
        //blogArrayList = new ArrayList<>();
        //arrMostReadBlog = new ArrayList<>();
        //arrMostBookMarketBlog = new ArrayList<>();
        recyclerViewLatest = (RecyclerView) rootView.findViewById(R.id.recyclerViewLatest16b);


        LinearLayoutManager latestLayoutManager = new LinearLayoutManager(getContext());
        //latestLayoutManager.setOrientation(LinearLayoutManager.VERTICAL);

        recyclerViewLatest.setHasFixedSize(true);
        recyclerViewLatest.setLayoutManager(latestLayoutManager);
        recyclerViewLatest.setItemAnimator(new DefaultItemAnimator());



        // Adapter


        //latestLatestBlogAdapter = new LatestBlogAdapter(getActivity(), getContext(), ShowBlogIngo.blogArrayList, false);
        // shortStoryAdapter = new ShortStoryAdapter(getActivity(), getContext(), ShowBlogIngo.shortStoryArrayList);
        mostReadAdapter = new MostReadBlogAdapter(getActivity(), Objects.requireNonNull(getContext()), ShowBlogIngo.arrMostReadBlog);
        //mostBookMarkedBlogAdapter = new MostBookMarkedBlogAdapter(getActivity(), getContext(), ShowBlogIngo.arrMostBookMarketBlog);

        //songsJinglesBlogAdapter = new SongsJinglesBlogAdapter(getActivity(), getContext(), ShowBlogIngo.arrSongJingles);
        //jokesBlogAdapter = new JokesBlogAdapter(getActivity(), getContext(), ShowBlogIngo.arrJokes);
        //reviewsBlogAdapter = new ReviewsBlogAdapter(getActivity(), getContext(), ShowBlogIngo.arrReviews);
        //blogBlogAdapter = new BlogBlogAdapter(getActivity(), getContext(), ShowBlogIngo.arrBlog);
        //journalismBlogAdapter = new JournalismBlogAdapter(getActivity(), getContext(), ShowBlogIngo.arrJournalism);

        //Adapter set to recyclerView
        recyclerViewLatest.setAdapter(mostReadAdapter);



      *//*if(catValue != ""){
           getBlogsListCallApi(catValue);
     }
*//*
        *//*IVSync.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {


                //getBlogsListCallApi(catValue);
                mostReadAdapter.notifyDataSetChanged();

            }
        });*//*

        //loadTopRated();


    }*/


    // Fetching Top Rated Post



    /*private void loadTopRated() {

        HashMap<String, String> hmHomeParam = new HashMap <>();
        hmHomeParam.put("page", "1");
        SmartPostWebRequest mainCategory = new SmartPostWebRequest(WebConstants.top_followers, thiscontext, false, hmHomeParam, new OnResponseListener() {
            @Override
            public ArrayList<Blog> onSuccess(Object result) {
                try {
                    JSONObject jsonResponse = new JSONObject(result.toString());
                    int status = jsonResponse.getInt("success");
                    if (status == 1) {
                        //JSONObject jsonResponseMain = jsonResponse.getJSONObject("data");
                        JSONArray arrMainCategoryJson = jsonResponse.getJSONArray("data");
                        Type type = new TypeToken<ArrayList<TrendingPost_Model>>() {}.getType();
                        ArrayList<TrendingPost_Model> trending_post = new Gson().fromJson(arrMainCategoryJson.toString(), type);
                        //ArrayList<TrendingPost_Model> trending_postOne = new ArrayList <>();
                        //trending_postOne.add(trending_post.get(0));
                        displayTopRatedPost(trending_post);
                    }else{
                        String message = jsonResponse.getString("message");
                        Toast.makeText(thiscontext, message, Toast.LENGTH_LONG).show();
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
*/

    @RequiresApi(api = Build.VERSION_CODES.KITKAT)
    private void displayLatestPost(List<Post_List_Data> latestBlog){
        //HashSet hs = new HashSet();
        Set<Post_List_Data> hashsetList = new HashSet<>(latestBlog);
        //hs.addAll(hashsetList);
        latestBlog.clear();
        latestBlog.addAll(hashsetList);
        for (Post_List_Data user : hashsetList) {
            System.out.println(user.getUserName());
        }
        recyclerViewLatest = (RecyclerView) rootView.findViewById(R.id.recyclerViewLatest16);
        LinearLayoutManager latestLayoutManager = new LinearLayoutManager(getContext());
        latestLayoutManager.setOrientation(LinearLayoutManager.VERTICAL);
        recyclerViewLatest.setLayoutManager(latestLayoutManager);
        recyclerViewLatest.setItemAnimator(new DefaultItemAnimator());

        Collections.sort(latestBlog, new Comparator<Post_List_Data>() {
            @Override
            public int compare(Post_List_Data lhs, Post_List_Data rhs) {
                return rhs.getUserFollowersCount().compareTo(lhs.getUserFollowersCount());
            }
        });

        latestLatestBlogAdapter = new LatestBlogAdapter( Objects.requireNonNull( getActivity() ) ,
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
        recyclerViewLatest.setAdapter(latestLatestBlogAdapter);
        recyclerViewLatest.setHasFixedSize(true);
        latestLatestBlogAdapter.notifyDataSetChanged();
        if(latestLatestBlogAdapter.getItemCount()>0) {
            progressBar.setVisibility(View.GONE);
        }
    }

   /* private void getBlogsListCallApi(String catValue) {
        RequestQueue requestQueue;
        progress = new ProgressDialog(thiscontext);
        progress.show();
        progress.setCancelable(false);
        progress.setTitle("Please Wait");

        requestQueue = Volley.newRequestQueue(thiscontext);
        //String loginURL = String.format("http://blog.ibitvalley.com/api/BlogList?userid=%s", 2);
        SharedPreferences preferences = thiscontext.getSharedPreferences("mPrefs", MODE_PRIVATE);
        String UserID = preferences.getString("UserId", "");
        String getBlogListURL = "";
        if(catValue == "") {
            //getBlogListURL = String.format("http://blog.ibitvalley.com/api/BlogList?UserID=%s", UserID);
            //
            getBlogListURL = String.format("http://blog.ibitvalley.com/api/AllCategoryBlog?UserID=%s", UserID);
        } else {
            getBlogListURL = String.format("http://blog.ibitvalley.com/api/GetBlogsByCategory?UserID=%s&Category=%s", UserID, catValue.replace(" ", "%20"));
        }
        JsonObjectRequest jor = new JsonObjectRequest(Request.Method.GET, getBlogListURL, null,
                new Response.Listener<JSONObject>() {
                    @RequiresApi(api = Build.VERSION_CODES.KITKAT)
                    @Override
                    public void onResponse(JSONObject response) {
                        Log.d("True", "");
                        try {
                            if (response.get("success").toString() == "true") {
                                System.out.println("Json == > " + response.toString());
                                JSONObject obj = new JSONObject(response.toString());
                                JSONArray arr = obj.getJSONArray("LatestBlog");

                                if(arr.length()<=0){
                                    //LLNoPost.setVisibility(View.VISIBLE);
                                    rlLatest.setVisibility(View.INVISIBLE);
                                    rl1.setVisibility(View.INVISIBLE);
                                    rl2.setVisibility(View.INVISIBLE);
                                    rl3.setVisibility(View.INVISIBLE);
                                    rl4.setVisibility(View.INVISIBLE);
                                    rl5.setVisibility(View.INVISIBLE);
                                    rl6.setVisibility(View.INVISIBLE);
                                    rl6.setVisibility(View.INVISIBLE);
                                    rl8.setVisibility(View.INVISIBLE);
                                } else {
                                    //LLNoPost.setVisibility(View.INVISIBLE);
                                    rlLatest.setVisibility(View.VISIBLE);
                                    rl1.setVisibility(View.VISIBLE);
                                    rl2.setVisibility(View.VISIBLE);
                                    rl3.setVisibility(View.VISIBLE);
                                    rl4.setVisibility(View.VISIBLE);
                                    rl5.setVisibility(View.VISIBLE);
                                    rl6.setVisibility(View.VISIBLE);
                                    rl7.setVisibility(View.VISIBLE);
                                    rl8.setVisibility(View.VISIBLE);
                                }

//                                JSONArray arrJsonMostRead = obj.getJSONArray("MostRead");
//                                List<String> listMostRead = new ArrayList<String>();
//                                for(int i = 0; i < arrJsonMostRead.length(); i++){
//                                    listMostRead.add(arrJsonMostRead.getJSONObject(i).getString("BlogID"));
//                                }
//
//                                JSONArray arrJsonMostBookMarked = obj.getJSONArray("MostBookMarked");
//                                List<String> listMostBookMarked = new ArrayList<String>();
//                                for(int i = 0; i < arrJsonMostBookMarked.length(); i++){
//                                    listMostBookMarked.add(arrJsonMostBookMarked.getJSONObject(i).getString("BlogID"));
//                                }



                                for (int i = 0; i < arr.length(); i++) {
                                    String blogString = arr.get(i).toString();
                                    Blog blog = new Gson().fromJson(blogString, Blog.class);
                                    ShowBlogIngo.blogArrayList.add(blog);
                                }


                                if (progress != null && progress.isShowing())
                                    progress.dismiss();


                                mostReadAdapter.notifyDataSetChanged();


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
                        error.printStackTrace();
                        if (progress != null && progress.isShowing())
                            progress.dismiss();
                        Log.e("Volley", "Error" + error.getMessage());
                    }
                }
        );
        jor.setRetryPolicy(new DefaultRetryPolicy(20000, 3, 0.0f));
        requestQueue.add(jor);
    }
*/


    @Override
    public void onResume() {
        super.onResume();
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
       // disposable.clear();
    }
}

