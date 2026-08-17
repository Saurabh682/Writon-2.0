package com.ibitvalley.writon;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Bundle;
import android.text.Html;
import android.util.Log;
import android.view.ContextMenu;
import android.view.Gravity;
import android.view.InflateException;
import android.view.MenuItem;
import android.view.View;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.android.volley.VolleyError;
import com.google.android.material.appbar.AppBarLayout;
import com.google.android.material.appbar.CollapsingToolbarLayout;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.ibitvalley.writon.adapter.DiscusListAdapter;
import com.ibitvalley.writon.adapter.MyBlogAdapter;
import com.ibitvalley.writon.classes.model.Posts_List;
import com.ibitvalley.writon.classes.roomdataclasses.Post_List_Data;
import com.ibitvalley.writon.constants.PrefrenceConstants;
import com.ibitvalley.writon.model.Blog;
import com.ibitvalley.writon.model.User;
import com.ibitvalley.writon.retroFit.RetroFitClient;
import com.ibitvalley.writon.retroFit.ServiceGenerator;
import com.ibitvalley.writon.utils.AppUtils;
import com.ibitvalley.writon.utils.VolleySingleton;
import com.ibitvalley.writon.utils.WritOnPreference;
import com.ibitvalley.writon.webapi.WebApiParams;
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
import java.util.List;

import de.hdodenhof.circleimageview.CircleImageView;
import io.reactivex.android.schedulers.AndroidSchedulers;
import io.reactivex.functions.Consumer;
import io.reactivex.schedulers.Schedulers;

//import com.squareup.picasso.Picasso;

public class Blog_Profile extends BaseActivity {


    TextView  TVPubCount, TVFollowers, TVFollowing, tv_about, tv_posted, tv_discussion, TVname, ETQofDay, ETIntro, ETWorkiingon;
    Button btnLogout;
    SharedPreferences preferences;
    CircleImageView image;
    ImageView IVEdit, IVSeeting;
    Activity curr_activity;
    Context curr_context;
    Typeface tf;

    RecyclerView recyclerView1, recview_discussion;
    LinearLayout ll_about, ll_posted, ll_discussion;
    DiscusListAdapter adapter;

    User userData;
    String userID = "";

    TextView userHeader;
    CollapsingToolbarLayout collapsingToolbarLayout;
    AppBarLayout appBarLayout;
    Toolbar toolbar;
    TextView txt_workingon,txt_introduction,txt_quote;
    ProgressBar progressBar;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        //requestWindowFeature(Window.FEATURE_NO_TITLE);
        super.onCreate(savedInstanceState);
        //getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);

        setContentView(R.layout.activity_blog__profile);

        //getSupportActionBar().hide();

        userID = getIntent().getStringExtra("UserID");

        initControls();

        getUserProfile();
    }


    private void initControls(){
        try {

            curr_activity = this;
            curr_context = this;
            userData = WritOnPreference.getInstance(curr_context).getUserDetails();



            tf = Typeface.createFromAsset(curr_context.getAssets(),"Lato-Regular.ttf");
            preferences = curr_context.getSharedPreferences(Constants.PREFREFRENCE, MODE_PRIVATE);

            final String UserId = preferences.getString(Constants.KEY_PREF_USERID, "0");

            TVname = (TextView) findViewById(R.id.TVname);
            TVname.setTypeface(tf);
            ETQofDay = (TextView) findViewById(R.id.ETQofDay);
            ETQofDay.setTypeface(tf);
            ETIntro = (TextView) findViewById(R.id.ETIntro);
            ETIntro.setTypeface(tf);
            ETWorkiingon = (TextView) findViewById(R.id.ETWorkiingon);
            userHeader=findViewById( R.id.Text6 );
            collapsingToolbarLayout=findViewById( R.id.collapsing_toolbar );
            appBarLayout=findViewById( R.id.appbar05 );
            ETWorkiingon.setTypeface(tf);
            TVname.setEnabled(false);
            ETQofDay.setEnabled(false);
            ETIntro.setEnabled(false);
            ETWorkiingon.setEnabled(false);


            tv_about = (TextView) findViewById(R.id.tv_about);
            tv_posted = (TextView) findViewById(R.id.tv_posted);
            tv_discussion = (TextView) findViewById(R.id.tv_discussion);

            ll_about = (LinearLayout) findViewById(R.id.ll_about);
            ll_posted = (LinearLayout) findViewById(R.id.ll_posted);
            //ll_discussion = (LinearLayout) findViewById(R.id.ll_discussion);

            recyclerView1 = (RecyclerView) findViewById(R.id.recyclerView1);
            recview_discussion = (RecyclerView) findViewById(R.id.recview_discussion);
            toolbar=findViewById( R.id.toolbar );
            tv_about.setTextColor(Color.parseColor("#2196f3"));
            tv_about.setText(Html.fromHtml("<u>About</u>"));
            progressBar=findViewById( R.id.progress_bar );
            txt_workingon=findViewById( R.id.txt_working_on );
            txt_introduction=findViewById( R.id.txt_introduction );
            txt_quote=findViewById( R.id.txt_quote );
            tv_about.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    tv_about.setTextColor(Color.parseColor("#2196f3"));
                    tv_about.setText(Html.fromHtml("<u>About</u>"));

                    //

                    tv_posted.setTextColor(Color.parseColor("#5c5c5c"));
                    tv_posted.setText(Html.fromHtml("Posted"));
//                    tv_discussion.setTextColor(Color.parseColor("#5c5c5c"));
//                    tv_discussion.setText(Html.fromHtml("Discussion"));

                    //

                    ll_about.setVisibility(View.VISIBLE);
                    ll_posted.setVisibility(View.GONE);
//                    ll_discussion.setVisibility(View.GONE);
                }
            });


            tv_posted.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    tv_posted.setTextColor(Color.parseColor("#2196f3"));
                    tv_posted.setText(Html.fromHtml("<u>Posted</u>"));

                    //
                    tv_about.setTextColor(Color.parseColor("#5c5c5c"));
                    tv_about.setText(Html.fromHtml("About"));
//                    tv_discussion.setTextColor(Color.parseColor("#5c5c5c"));
//                    tv_discussion.setText(Html.fromHtml("Discussion"));

                    //

                    ll_about.setVisibility(View.GONE);
                    //ll_discussion.setVisibility(View.GONE);
                    ll_posted.setVisibility(View.VISIBLE);
                    loadTrendingPost();
                }
            });


//            appBarLayout.addOnOffsetChangedListener(new   AppBarLayout.OnOffsetChangedListener() {
//                @Override
//                public void onOffsetChanged(AppBarLayout appBarLayout, int verticalOffset) {
//                    float percentage = ((float)Math.abs(verticalOffset)/appBarLayout.getTotalScrollRange());
////                    fadedView.setAlpha(percentage);
//                    if (percentage > 0.8) {
////                        collapsingToolbar.setTitle("Collapsed");
//                        Toast.makeText( getApplicationContext(),"Collapsed",Toast.LENGTH_LONG ).show();
//                    } else {
////                        collapsingToolbar.setTitle("Expanded");
//                        Toast.makeText( getApplicationContext(),"Expanded",Toast.LENGTH_LONG ).show();
//                    }
//                }
//            });



            appBarLayout.addOnOffsetChangedListener(new   AppBarLayout.OnOffsetChangedListener() {
                @Override
                public void onOffsetChanged(AppBarLayout appBarLayout, int verticalOffset) {
                    if (verticalOffset == -collapsingToolbarLayout.getHeight() + toolbar.getHeight()) {
                        //toolbar is collapsed here
                        //write your code here
                    }

                    if (((float)Math.abs(verticalOffset) - appBarLayout.getTotalScrollRange() == 0)) {
                        toolbar.setVisibility( View.VISIBLE );
                    } else if (verticalOffset == 0) {
                        toolbar.setVisibility( View.GONE );
                    } else {
                        // Idle
                    }
                }
            });


            btnLogout = (Button) findViewById(R.id.btnLogout);
            btnLogout.setTypeface(tf);
            TVPubCount = (TextView) findViewById(R.id.TVPubCount);
            TVFollowers = (TextView) findViewById(R.id.TVFollowers);
            TVFollowing = (TextView) findViewById(R.id.TVFollowing);
            image = (CircleImageView) findViewById(R.id.image);

        } catch (InflateException e) {
        }
    }


    private void loadTrendingPost() {


        HashMap<String, String> hmHomeParam = new HashMap <>();
        hmHomeParam.put("page", "1");
        hmHomeParam.put("UserID", userID);
        SmartPostWebRequest mainCategory = new SmartPostWebRequest(WebConstants.published_Post, curr_context, false, hmHomeParam, new OnResponseListener() {
            @Override
            public ArrayList<Blog> onSuccess(Object result) {
                showProgressBar(false);
                try {
                    JSONObject jsonResponse = new JSONObject(result.toString());
                    int status = jsonResponse.getInt("success");
                    if (status == 1) {
                        JSONObject jsonResponseMain = jsonResponse.getJSONObject("data");
                        JSONArray arrMainCategoryJson = jsonResponseMain.optJSONArray("data");
                        Type type = new TypeToken<List<Post_List_Data>>() {}.getType();
                        List<Post_List_Data> trending_post = new Gson().fromJson(arrMainCategoryJson.toString(), type);
                        displayLTrendingPost(trending_post);
                    }else{
                        String message = jsonResponse.getString("message");
                        Toast.makeText(curr_context, message, Toast.LENGTH_LONG).show();
                    }
                } catch (JSONException e) {
                    e.printStackTrace();
                }
                return null;
            }
            @Override
            public void onError(VolleyError error)
            {
                showProgressBar(false);
                Log.d("","");
            }
        });
        VolleySingleton.getInstance().addToRequestQueue(mainCategory);

//        showProgressBar(true);
//        RetroFitClient publishedPosts = ServiceGenerator.getRetrofitOld().create(RetroFitClient.class);
//        publishedPosts.getPublishedPosts( userData.getAccess_token(),userID,"1" )
//                .subscribeOn( Schedulers.io() )
//                .observeOn( AndroidSchedulers.mainThread() )
//                .subscribe( new Consumer<Posts_List>() {
//                    @Override
//                    public void accept(Posts_List posts_list) throws Exception {
//                        showProgressBar(false);
//                        if ( !AppUtils.isNull( posts_list ) && !AppUtils.isNull( posts_list.getData() ) )
//                            displayLTrendingPost( posts_list.getData() );
//
//                        Log.d( "publised posts", posts_list.getData().get( 0 ).getTitle() );
//                    }
//                } , new Consumer<Throwable>() {
//                    @Override
//                    public void accept(Throwable throwable) throws Exception {
//                        showProgressBar(false);
//                        Log.d( "publised posts"," posts_list.getData().get( 0 ).getTitle()" );
//                    }
//                } );

    }


    MyBlogAdapter myBlogAdapter;
    private void displayLTrendingPost(List<Post_List_Data> trendingBlog){
        myBlogAdapter = new MyBlogAdapter(Blog_Profile.this, curr_context, trendingBlog, "Latest");
        LinearLayoutManager layoutManager = new LinearLayoutManager(curr_context);
        recyclerView1.setLayoutManager(layoutManager);
        recyclerView1.setAdapter(myBlogAdapter);
        myBlogAdapter.notifyDataSetChanged();

    }



    private void getUserProfile(){

        showProgressBar(true);
        HashMap<String, String> hmUserProfileParams = WebApiParams.getyserProfileParam(userID);

        SmartPostWebRequest mainCategory = new SmartPostWebRequest(WebConstants.user_profile, curr_context, false, hmUserProfileParams, new OnResponseListener() {
            @Override
            public ArrayList<Blog> onSuccess(Object result) {
                showProgressBar(false);
                try {
                    JSONObject jsonResponse = new JSONObject(result.toString());
                    int status = jsonResponse.getInt("success");
                    if (status == 1) {
                        JSONObject userData = jsonResponse.getJSONObject("data");
                        setUserData(userData);

                    }else{
                        String message = jsonResponse.getString("message");
                        Toast.makeText(curr_context, message, Toast.LENGTH_LONG).show();
                        if(status == -1){
                            logout();
                        }
                    }
                } catch (JSONException e) {
                    showProgressBar(false);

                    e.printStackTrace();
                }
                return null;
            }
            @Override
            public void onError(VolleyError error) {

                showProgressBar(false);
                Log.d("","");
            }
        });
        VolleySingleton.getInstance().addToRequestQueue(mainCategory);


    }



    private void setUserData(JSONObject jsonobject) throws JSONException {

        //JSONObject jsonobject= (JSONObject) userData.get(0);
        TVname.setText(jsonobject.get("username").toString());
        userHeader.setText(jsonobject.get("username").toString());
        TVPubCount.setText(jsonobject.get("published_count").toString());
        TVFollowers.setText(jsonobject.get("followers_count").toString());
        TVFollowing.setText(jsonobject.get("following_count").toString());

        if (!jsonobject.get("QuoteofDay").toString().equals("null")) {
            ETQofDay.setText(jsonobject.get("QuoteofDay").toString());
        } else {
            ETQofDay.setText("-");
            ETQofDay.setGravity( Gravity.CENTER );        }

        if (!jsonobject.get("Introducation").toString().equals("null")) {
            ETIntro.setText(jsonobject.get("Introducation").toString());
        } else {
            ETIntro.setText("-");
            ETIntro.setGravity( Gravity.CENTER );        }

        if (!jsonobject.get("WorkingOn").toString().equals("null")) {
            ETWorkiingon.setText(jsonobject.get("WorkingOn").toString());
        } else {
            ETWorkiingon.setText("-");
            ETWorkiingon.setGravity( Gravity.CENTER );
        }

        if (!jsonobject.get("image_url").toString().equals("null")) {
            Picasso.get().load(jsonobject.get("image_url").toString()).placeholder(R.drawable.usermale).into(image);
        }
    }



    private void logout() {
        SharedPreferences preferences = curr_activity.getSharedPreferences("mPrefs", MODE_PRIVATE);
        SharedPreferences.Editor editor = preferences.edit();
        editor.putString(Constants.KEY_PREF_USERID, "");
        editor.putString(Constants.KEY_PREF_U_NAME, "");
        editor.putString(Constants.KEY_PREF_U_EMAIL, "");
        editor.putString(Constants.KEY_PREF_U_DOB, "");

        // New Changes...(01-11-2016)
        editor.putString(Constants.KEY_PREF_WORKINGON, "");
        editor.putString(Constants.KEY_PREF_INTRO, "");
        editor.putString(Constants.KEY_PREF_QUOTEOFDAY, "");
        editor.putString(Constants.KEY_PREF_FOLLOWINGCOUNT, "");
        editor.putString(Constants.KEY_PREF_FOLLOWERCOUNT, "");
        editor.putString(Constants.KEY_PREF_BLOGPUBLISHCOUNT, "");
        editor.commit();


        SharedPreferences.Editor editorClear = curr_activity.getSharedPreferences(PrefrenceConstants.KEY_USER_JSON_DETAILS, 0).edit();
        editorClear .clear();
        editorClear.apply();

        Intent intent = new Intent(curr_activity, LoginActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_CLEAR_TASK);
        curr_activity.startActivity(intent);
        curr_activity.finish();
    }


    public void onHelp(View v) {
        openContextMenu(v);
    }



    @Override
    public void onCreateContextMenu(ContextMenu menu, View v, ContextMenu.ContextMenuInfo menuInfo) {
        super.onCreateContextMenu(menu, v, menuInfo);
        menu.setHeaderTitle("Select The Action");
        menu.add(0, v.getId(), 0, "Report as Inappropriate");
        menu.add(0, v.getId(), 0, "Block");
    }

    @Override
    public boolean onContextItemSelected(MenuItem item) {
        if (item.getTitle() == "Report as Inappropriate") {
            Toast.makeText(this, "Reported Successfully", Toast.LENGTH_SHORT).show();
        } else if (item.getTitle() == "Block") {
            Toast.makeText(this, "Block successfully", Toast.LENGTH_SHORT).show();
        } else {
            return false;
        }
        return super.onContextItemSelected(item);
    }

    public void showProgressBar(boolean showProgressBar)
    {
        progressBar.setVisibility( showProgressBar? View.VISIBLE  :  View.GONE  );
    }

    @Override
    public void onBackPressed() {
        if ( isTaskRoot() )
        {
            Intent home = new Intent(Blog_Profile.this, Home_Activity.class);
            startActivity(home);
            finish();
        }else
            super.onBackPressed();
    }
}

