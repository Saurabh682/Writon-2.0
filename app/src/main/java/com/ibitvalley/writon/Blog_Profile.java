package com.ibitvalley.writon;

import android.animation.Animator;
import android.animation.AnimatorListenerAdapter;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.Typeface;
import android.os.Build;
import android.os.Bundle;
import android.text.Html;
import android.transition.Slide;
import android.util.Log;
import android.view.ContextMenu;
import android.view.InflateException;
import android.view.MenuItem;
import android.view.View;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.Nullable;
import androidx.annotation.RequiresApi;
import androidx.appcompat.app.AppCompatActivity;
import androidx.appcompat.widget.Toolbar;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.android.volley.VolleyError;
import com.google.android.material.appbar.AppBarLayout;
import com.google.android.material.appbar.CollapsingToolbarLayout;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.ibitvalley.writon.GoogleAnalytics.MyApplication;
import com.ibitvalley.writon.adapter.DiscusListAdapter;
import com.ibitvalley.writon.adapter.MyBlogAdapter;
import com.ibitvalley.writon.constants.PrefrenceConstants;
import com.ibitvalley.writon.model.Blog;
import com.ibitvalley.writon.model.User;
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

import de.hdodenhof.circleimageview.CircleImageView;

//import com.squareup.picasso.Picasso;

public class Blog_Profile extends AppCompatActivity {


    TextView  TVPubCount, TVFollowers, TVFollowing, tv_about, tv_posted, tv_discussion, TVname, ETQofDay, ETIntro, ETWorkiingon, Text6;
    Button btnLogout;
    SharedPreferences preferences;
    CircleImageView image, image6;
    ImageView IVEdit, IVSeeting;
    Activity curr_activity;
    Context curr_context;
    Typeface tf;

    RecyclerView recyclerView1, recview_discussion;
    LinearLayout ll_about, ll_posted, ll_discussion;
    DiscusListAdapter adapter;
    CollapsingToolbarLayout collapsingToolbarLayout;

    User userData;
    String userID = "", userNameAppbar;
    Toolbar toolbar;

    private static final String EXTRA_IMAGE = "com.antonioleiva.materializeyourapp.extraImage";
    private static final String EXTRA_TITLE = "com.antonioleiva.materializeyourapp.extraTitle";
    // CollapsingToolbarLayout collapsingToolbarLayout;


    @RequiresApi(api = Build.VERSION_CODES.LOLLIPOP)
    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        //requestWindowFeature(Window.FEATURE_NO_TITLE);
        super.onCreate(savedInstanceState);
        //getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);
        userID = getIntent().getStringExtra("UserID");


        initActivityTransitions();
        getUserProfile();
        setContentView(R.layout.activity_blog__profile);

        initControls();
        //getSupportActionBar().hide();


        //collapsingToolbarLayout = findViewById(R.id.collapsing_toolbar);
        //collapsingToolbarLayout.setExpandedTitleColor(getResources().getColor(android.R.color.transparent));
        //collapsingToolbarLayout.setCollapsedTitleTypeface(tf);



        toolbar = findViewById(R.id.toolbar);
        toolbar.setVisibility(View.GONE);


        //toolbar

        //toolbar.setAnimation();
        //toolbar.setCollapseIcon(getResources().getDrawable(android.R.drawable.sym_def_app_icon));


        AppBarLayout appBarLayout;
        appBarLayout = findViewById(R.id.appbar05);
        appBarLayout.addOnOffsetChangedListener(new AppBarLayout.OnOffsetChangedListener() {
            @Override
            public void onOffsetChanged(AppBarLayout appBarLayout, int verticalOffset) {

                if (Math.abs(verticalOffset)-appBarLayout.getTotalScrollRange() == 0)
                {
                    //  Collapsed
                    //toolbar.setAlpha(1f);
                    toolbar.setAlpha(0f);
                    toolbar.setVisibility(View.VISIBLE);
                    toolbar.animate()
                            .alpha(1f)
                            .setDuration(200)
                            .setListener(null);

                }
                else
                {
                    //Expanded
                    /*AlphaAnimation animation1 = new AlphaAnimation(1f, 0f);
                    animation1.setDuration(100);
                    animation1.setStartOffset(1000);
                    animation1.setFillAfter(true);
                    toolbar.startAnimation(animation1);*/
                    toolbar.setAlpha(1f);
                    toolbar.animate()
                            .alpha(0f)
                            .setDuration(200)
                            .setListener(new AnimatorListenerAdapter() {
                                @Override
                                public void onAnimationEnd(Animator animation) {
                                    toolbar.setVisibility(View.GONE);
                                }
                            });
                    //toolbar.setAlpha(0f);

                }
            }
        });


        MyApplication.getInstance().trackEvent("User Profile", "View Other Users Profile", "Othe User Profile");
        MyApplication.getInstance().trackScreenView("Other User Profile");
    }





    private void initActivityTransitions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            android.transition.Slide transition = new Slide();
            transition.excludeTarget(android.R.id.statusBarBackground, true);
            getWindow().setEnterTransition(transition);
            getWindow().setReturnTransition(transition);
        }
    }


    private void initControls(){
        try {

            curr_activity = this;
            curr_context = this;
            userData = WritOnPreference.getInstance(curr_context).getUserDetails();



            tf = Typeface.createFromAsset(curr_context.getAssets(),"Lato-Regular.ttf");
            preferences = curr_context.getSharedPreferences(Constants.PREFREFRENCE, MODE_PRIVATE);

            final String UserId = preferences.getString(Constants.KEY_PREF_USERID, "0");

            TVname = findViewById(R.id.TVname);
            Text6 = findViewById(R.id.Text6);
            TVname.setTypeface(tf);
            ETQofDay = findViewById(R.id.ETQofDay);
            ETQofDay.setTypeface(tf);
            ETIntro = findViewById(R.id.ETIntro);
            ETIntro.setTypeface(tf);
            ETWorkiingon = findViewById(R.id.ETWorkiingon);
            ETWorkiingon.setTypeface(tf);
            TVname.setEnabled(false);
            ETQofDay.setEnabled(false);
            ETIntro.setEnabled(false);
            ETWorkiingon.setEnabled(false);


            tv_about = (TextView) findViewById(R.id.tv_about);
            tv_posted = (TextView) findViewById(R.id.tv_posted);
            tv_discussion = (TextView) findViewById(R.id.tv_discussion);

            ll_about = (LinearLayout) findViewById(R.id.ll_about);
            //ll_about.setVisibility(View.GONE);
            ll_posted = (LinearLayout) findViewById(R.id.ll_posted);
            //ll_posted.setVisibility(View.VISIBLE);
            //ll_discussion = (LinearLayout) findViewById(R.id.ll_discussion);

            recyclerView1 = (RecyclerView) findViewById(R.id.recyclerView1);
            recview_discussion = (RecyclerView) findViewById(R.id.recview_discussion);

            tv_about.setTextColor(Color.parseColor("#2196f3"));
            tv_about.setText(Html.fromHtml("<u>About</u>"));


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

            btnLogout = (Button) findViewById(R.id.btnLogout);
            btnLogout.setTypeface(tf);
            TVPubCount = (TextView) findViewById(R.id.TVPubCount);
            TVFollowers = (TextView) findViewById(R.id.TVFollowers);
            TVFollowing = (TextView) findViewById(R.id.TVFollowing);
            image = (CircleImageView) findViewById(R.id.image);
            IVEdit = (ImageView) findViewById(R.id.IVEdit);
            image6 = (CircleImageView) findViewById(R.id.image6);

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
                try {
                    JSONObject jsonResponse = new JSONObject(result.toString());
                    int status = jsonResponse.getInt("success");
                    if (status == 1) {
                        JSONObject jsonResponseMain = jsonResponse.getJSONObject("data");
                        JSONArray arrMainCategoryJson = jsonResponseMain.optJSONArray("data");
                        Type type = new TypeToken<ArrayList<Blog>>() {}.getType();
                        assert arrMainCategoryJson != null;
                        ArrayList<Blog> trending_post = new Gson().fromJson(arrMainCategoryJson.toString(), type);
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
            public void onError(VolleyError error) {
                Log.d("","");
            }
        });
        VolleySingleton.getInstance().addToRequestQueue(mainCategory);
    }


    MyBlogAdapter myBlogAdapter;
    private void displayLTrendingPost(ArrayList<Blog> trendingBlog){
        myBlogAdapter = new MyBlogAdapter(Blog_Profile.this, curr_context, trendingBlog, "Latest");
        LinearLayoutManager layoutManager = new LinearLayoutManager(curr_context);
        recyclerView1.setLayoutManager(layoutManager);
        recyclerView1.setAdapter(myBlogAdapter);
        myBlogAdapter.notifyDataSetChanged();

    }



    private void getUserProfile(){

        HashMap<String, String> hmUserProfileParams = WebApiParams.getyserProfileParam(userID);

        SmartPostWebRequest mainCategory = new SmartPostWebRequest(WebConstants.user_profile, curr_context, false, hmUserProfileParams, new OnResponseListener() {
            @Override
            public ArrayList<Blog> onSuccess(Object result) {
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



    private void setUserData(JSONObject jsonobject) throws JSONException {

        //JSONObject jsonobject= (JSONObject) userData.get(0);
        TVname.setText(jsonobject.get("username").toString());
        Text6.setText(jsonobject.get("username").toString());
        userNameAppbar = jsonobject.get("username").toString();
        //System.out.println(userNameAppbar);

        //collapsingToolbarLayout.setTitle(userNameAppbar);
        System.out.println(userNameAppbar);
        TVPubCount.setText(jsonobject.get("published_count").toString());
        TVFollowers.setText(jsonobject.get("followers_count").toString());
        TVFollowing.setText(jsonobject.get("following_count").toString());

        if (!jsonobject.get("QuoteofDay").toString().equals("null")) {
            ETQofDay.setText(jsonobject.get("QuoteofDay").toString());
        } else {
            ETQofDay.setText("");
        }

        if (!jsonobject.get("Introducation").toString().equals("null")) {
            ETIntro.setText(jsonobject.get("Introducation").toString());
        } else {
            ETIntro.setText("");
        }

        if (!jsonobject.get("WorkingOn").toString().equals("null")) {
            ETWorkiingon.setText(jsonobject.get("WorkingOn").toString());
        } else {
            ETWorkiingon.setText("");
        }

        if (!jsonobject.get("image_url").toString().equals("null")) {
            Picasso.get().load(jsonobject.get("image_url").toString()).placeholder(R.drawable.usermale).into(image);
            Picasso.get().load(jsonobject.get("image_url").toString()).placeholder(R.drawable.usermale).into(image6);
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
        editorClear.clear();
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

}

