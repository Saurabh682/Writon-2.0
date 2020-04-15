package com.ibitvalley.writon;

import android.app.Activity;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.text.Html;
import android.util.Log;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.LayoutInflater;
import android.view.Menu;
import android.view.MenuInflater;
import android.view.MenuItem;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.PopupWindow;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.ActionBar;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;

import com.android.volley.VolleyError;
import com.ibitvalley.writon.GoogleAnalytics.MyApplication;
import com.ibitvalley.writon.model.Blog;
import com.ibitvalley.writon.model.TrendingPost_Model;
import com.ibitvalley.writon.model.User;
import com.ibitvalley.writon.utils.VolleySingleton;
import com.ibitvalley.writon.utils.WritOnPreference;
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

public class ShowBlogDetails extends AppCompatActivity {

    TextView TVTitle, TVDescription, TVWriterName, tv_Category, tv_subCategory, tv_language,
            TVViewCount, TVCommentCount, TVRating, tv_user_followers_count;
    Blog cuuBlog;
    TrendingPost_Model trendingPost_model;
    ScrollView activity_show_blog_details;
    ImageView list_image, img_bookmark, img_Option, img_rating;

    Activity curr_activity;
    Context curr_context;
    Button TVFollow;
    String blogID = "";
    LinearLayout ll_Discuss;
    User userData;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
         //Making notification bar transparent

        setContentView(R.layout.activity_show_blog_details);


        curr_activity = this;
        curr_context = this;
        userData = WritOnPreference.getInstance(curr_context).getUserDetails();

        TVTitle = (TextView) findViewById(R.id.TVTitle);
        TVDescription = (TextView) findViewById(R.id.TVDescription);
        TVWriterName = (TextView) findViewById(R.id.TVWriterName);
        tv_user_followers_count = findViewById(R.id.tv_user_followers_count);

        tv_Category = (TextView) findViewById(R.id.tv_Category);
        tv_subCategory = (TextView) findViewById(R.id.tv_subCategory);
        tv_language = (TextView) findViewById(R.id.tv_language);
        list_image = (CircleImageView) findViewById(R.id.list_image);
        img_bookmark = (ImageView) findViewById(R.id.img_bookmark);
        img_Option = (ImageView) findViewById(R.id.img_Option);

        TVViewCount = (TextView) findViewById(R.id.TVViewCount);
        TVCommentCount = (TextView) findViewById(R.id.TVCommentCount);
        TVRating = (TextView) findViewById(R.id.TVRating);
        ll_Discuss = (LinearLayout) findViewById(R.id.ll_Discuss);
        TVFollow = findViewById(R.id.TVFollow);
        img_rating = findViewById(R.id.img_rating);

        String screenName = getIntent().getStringExtra("boxTitle");

        if(screenName.equals("Latest") || screenName.equals("Bookmarked") || screenName.equals("Recent Read")) {
            cuuBlog = (Blog) getIntent().getSerializableExtra("BlogObject");
            TVTitle.setText(cuuBlog.getTitle());
            TVTitle.setTextSize(26);
            TVWriterName.setText(String.format("%s", cuuBlog.getUser_name()));
            //this.setTitle(cuuBlog.getTitle());
            if(cuuBlog.getLongDescripton() != null){
                TVDescription.setText(Html.fromHtml(cuuBlog.getLongDescripton()));
            }else if(cuuBlog.getShortDescription() != null){
                TVDescription.setText(Html.fromHtml(cuuBlog.getShortDescription()));
            }

            /*tv_Category.setText(cuuBlog.getCategory());
            tv_subCategory.setText(cuuBlog.getSubCat());
            tv_language.setText(cuuBlog.getLanguage());*/

            tv_Category.setText(String.format("%s, %s (%s)", cuuBlog.getCategory(), cuuBlog.getSubCat(), cuuBlog.getLanguage()));

            tv_user_followers_count.setText(String.format("%s FOLLOWERS", cuuBlog.getUser_followers_count()));

            if(cuuBlog.getUser_image() != null){
                Picasso.get().load(cuuBlog.getUser_image()).placeholder(R.drawable.usermale).into(list_image);
            }

            blogID = cuuBlog.getBlogId();

            if (cuuBlog.isBookMark()) {
                img_bookmark.setImageResource(R.drawable.bookmarkyellow);
            } else {
                img_bookmark.setImageResource(R.drawable.bookmarkblue);
            }

            if (cuuBlog.isIs_rated()) {
                img_rating.setImageResource(R.drawable.staryellow);
            } else {
                img_rating.setImageResource(R.drawable.starblue);
            }


            img_bookmark.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    if(cuuBlog.isBookMark()){
                        unbookmarkRequest(userData.getId(), blogID, cuuBlog.isBookMark());
                    }else {
                        bookmarkRequest(userData.getId(), blogID, cuuBlog.isBookMark());
                    }
                }
            });

            this.img_Option.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    Blog blog = cuuBlog;
                    String shareContent = String.format("\"%s\" by %s \n\n %s \n Read more %s @WritOn %s", blog.getTitle(), blog.getUser_name(),  Html.fromHtml(blog.getLongDescripton()), blog.getCategory(), "https://goo.gl/Cx4oPk");
                    //if (!blog.getUserID().equals(UserId)) {
                    String[] arrString = {"Report", "Share"};
                    showPopupMenu(arrString, shareContent);
                }
            });

            TVViewCount.setText(cuuBlog.getView_count());
            TVCommentCount.setText(cuuBlog.getComments_count());
            TVRating.setText(cuuBlog.getVotes_count());
            ll_Discuss.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    Intent intentShowBlogDetails = new Intent(ShowBlogDetails.this, ActivityBlogComments.class);
                    intentShowBlogDetails.putExtra("BlogObject", cuuBlog);
                    intentShowBlogDetails.putExtra("BlogType", "cuuBlog");
                    startActivity(intentShowBlogDetails);
                }
            });

            TVFollow.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    //final String followUserID, final String userID
                    if(cuuBlog.isIs_followed()) {
                        TVFollow.setText("FOLLOW");
                        cuuBlog.setIs_followed(false);
                        unFollowUser(cuuBlog.getUser_id(), userData.getId());
                    } else {
                        TVFollow.setText("UN FOLLOW");
                        cuuBlog.setIs_followed(true);
                        followUser(cuuBlog.getUser_id(), userData.getId());
                    }
                }
            });


            if(cuuBlog.isIs_followed()) {
                TVFollow.setText("UN FOLLOW");
            } else {
                TVFollow.setText("FOLLOW");
            }

            img_rating.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    if (cuuBlog.isIs_rated()) {
                        addRating(blogID, userData.getId(), "0");
                        cuuBlog.setIs_rated(false);
                        img_rating.setImageResource(R.drawable.starblue);
                    } else {
                        addRating(blogID, userData.getId(), "1");
                        cuuBlog.setIs_rated(true);
                        img_rating.setImageResource(R.drawable.staryellow);
                    }
                }
            });

        }else if(screenName.equals("Trending")) {
            trendingPost_model = (TrendingPost_Model) getIntent().getSerializableExtra("BlogObject");
            TVTitle.setText(trendingPost_model.getTitle());
            TVTitle.setTextSize(26);
            TVWriterName.setText(String.format("%s", trendingPost_model.getUser_name()));
            //this.setTitle(cuuBlog.getTitle());
            if(trendingPost_model.getLongDescription() != null){
                TVDescription.setText(Html.fromHtml(trendingPost_model.getLongDescription()));
            }else if(trendingPost_model.getShortDescription() != null){
                TVDescription.setText(Html.fromHtml(trendingPost_model.getShortDescription()));
            }

            /*tv_Category.setText(trendingPost_model.getCategory());
            tv_subCategory.setText(trendingPost_model.getSubCat());
            tv_language.setText(trendingPost_model.getLanguage());*/

            if(trendingPost_model.getUser_image() != null){
                Picasso.get().load(trendingPost_model.getUser_image()).placeholder(R.drawable.usermale).into(list_image);
            }
            tv_Category.setText(String.format("%s, %s (%s)", trendingPost_model.getCategory(), trendingPost_model.getSubCat(), trendingPost_model.getLanguage()));
            tv_user_followers_count.setText(String.format("%s FOLLOWERS", trendingPost_model.getUser_followers_count()));

            blogID = trendingPost_model.getBlogId();

            if (trendingPost_model.isBookMark()) {
                //img_bookmark.setColorFilter(ContextCompat.getColor(curr_activity, R.color.colorGreen));
                img_bookmark.setImageResource(R.drawable.bookmarknew);
            } else {
                //img_bookmark.setColorFilter(ContextCompat.getColor(curr_activity, R.color.colorGrey));
                img_bookmark.setImageResource(R.drawable.unbookmark);
            }


            if (trendingPost_model.isIs_rated()) {
                img_rating.setImageResource(R.drawable.starnewselected);
            } else {
                img_rating.setImageResource(R.drawable.starnew);
            }

            this.img_Option.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    TrendingPost_Model blog = trendingPost_model;
                    String shareContent = String.format("\"%s\" by %s \n\n %s \n Read more %s @WritOn %s", blog.getTitle(), blog.getCreateBy(),  Html.fromHtml(blog.getLongDescription()), blog.getCategory(), "https://goo.gl/Cx4oPk");
                    //if (!blog.getUserID().equals(UserId)) {
                    String[] arrString = {"Report", "Share"};
                    showPopupMenu(arrString, shareContent);
                }
            });

            TVViewCount.setText(trendingPost_model.getView_count());
            TVCommentCount.setText(trendingPost_model.getComments_count());
            TVRating.setText(trendingPost_model.getVotes_count());

            ll_Discuss.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    Intent intentShowBlogDetails = new Intent(ShowBlogDetails.this, ActivityBlogComments.class);
                    intentShowBlogDetails.putExtra("BlogObject", trendingPost_model);
                    intentShowBlogDetails.putExtra("BlogType", "trendingPost_model");
                    startActivity(intentShowBlogDetails);
                }
            });


            if(trendingPost_model.isIs_followed()) {
                TVFollow.setText("UNFOLLOW");
            } else {
                TVFollow.setText("FOLLOW");
            }

            TVFollow.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    //final String followUserID, final String userID
                    if(trendingPost_model.isIs_followed()) {
                        TVFollow.setText("FOLLOW");
                        trendingPost_model.setIs_followed(false);
                        unFollowUser(trendingPost_model.getUserID(), userData.getId());

                    } else {
                        TVFollow.setText("UN FOLLOW");
                        trendingPost_model.setIs_followed(true);
                        followUser(trendingPost_model.getUserID(), userData.getId());
                    }
                }
            });

            img_rating.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    if (cuuBlog.isIs_rated()) {
                        addRating(blogID, userData.getId(), "0");
                        cuuBlog.setIs_rated(false);
                        img_rating.setImageResource(R.drawable.starnew);
                    } else {
                        addRating(blogID, userData.getId(), "1");
                        cuuBlog.setIs_rated(true);
                        img_rating.setImageResource(R.drawable.starnewselected);
                    }
                }
            });
        }

        markAsView();
        activity_show_blog_details = (ScrollView) findViewById(R.id.activity_show_blog_details);

        MyApplication.getInstance().trackEvent("ShowBlogDetail", "Blog Details", "Blog reading screen.");
        MyApplication.getInstance().trackScreenView("HomeScreen");
        //toggleHideyBar();
    }


    private void bookmarkRequest(final String UserID, final String BlogID, boolean isBookMark) {
        HashMap<String, String> hmHomeParam = new HashMap <>();
        hmHomeParam.put("blogid", BlogID);
        hmHomeParam.put("userid", UserID);
        SmartPostWebRequest mainCategory = new SmartPostWebRequest(WebConstants.mark_bookmark_api, curr_activity, false, hmHomeParam, new OnResponseListener() {
            @Override
            public void onSuccess(Object result) {
                try {
                    JSONObject jsonResponse = new JSONObject(result.toString());
                    if (jsonResponse != null) {
                        Integer status = jsonResponse.getInt("success");
                        if (status == 1) {
                            String message = jsonResponse.getString("message");
                            Toast.makeText(curr_activity, message, Toast.LENGTH_LONG).show();

                            if (cuuBlog.isBookMark()) {
                                img_bookmark.setImageResource(R.drawable.unbookmark);
                            } else {
                                img_bookmark.setImageResource(R.drawable.bookmarknew);
                            }


                        }else{
                            String message = jsonResponse.getString("message");
                            Toast.makeText(curr_activity, message, Toast.LENGTH_LONG).show();
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


    private void unbookmarkRequest(final String UserID, final String BlogID, boolean isBookMark) {
        HashMap<String, String> hmHomeParam = new HashMap <>();
        hmHomeParam.put("blogid", BlogID);
        hmHomeParam.put("userid", UserID);
        SmartPostWebRequest mainCategory = new SmartPostWebRequest(WebConstants.mark_unbookmark_api, curr_activity, false, hmHomeParam, new OnResponseListener() {
            @Override
            public void onSuccess(Object result) {
                try {
                    JSONObject jsonResponse = new JSONObject(result.toString());
                    if (jsonResponse != null) {
                        Integer status = jsonResponse.getInt("success");
                        if (status == 1) {
                            String message = jsonResponse.getString("message");
                            Toast.makeText(curr_activity, message, Toast.LENGTH_LONG).show();
                            if (cuuBlog.isBookMark()) {
                                img_bookmark.setImageResource(R.drawable.unbookmark);
                                ;
                            } else {
                                img_bookmark.setImageResource(R.drawable.bookmarknew);
                            }
                        }else{
                            String message = jsonResponse.getString("message");
                            Toast.makeText(curr_activity, message, Toast.LENGTH_LONG).show();
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


    private void showPopupMenu(final String[] arrString, final String shareContent) {
        AlertDialog.Builder builderSingle = new AlertDialog.Builder(curr_activity);
        //String[] arr = {"Report"};
        builderSingle.setCancelable(true);
        builderSingle.setItems(arrString, new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                if(arrString[which].equals("Report")){
                    Intent blogprofile = new Intent(curr_context, Report.class);
                    blogprofile.putExtra("blogID", blogID);
                    curr_context.startActivity(blogprofile);
                } else if(arrString[which].equals("Share")){
                    share(shareContent);
                }
            }
        });
        builderSingle.show();
    }

    private void share(String shareContent){
        Intent sendIntent = new Intent();
        // Set the action to be performed i.e 'Send Data'
        sendIntent.setAction(Intent.ACTION_SEND);
        // Add the text to the intent
        sendIntent.putExtra(Intent.EXTRA_TEXT, shareContent);
        // Set the type of data i.e 'text/plain'
        sendIntent.setType("text/plain");
        //intent.setData(Uri.parse("market://details?id=com.ibitvalley.writon"));
        // Launches the activity; Open 'Text editor' if you set it as default app to handle Text
        curr_activity.startActivity(sendIntent);
    }


    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        MenuInflater inflater = getMenuInflater();
        inflater.inflate(R.menu.menu_rtool, menu);
        return true;
    }

    private PopupWindow pwindo;

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        switch (item.getItemId()) {
            // action with ID action_refresh was selected
            case R.id.action_settings:
                initiatePopupWindow();
                //Toast.makeText(this, "Skip selected", Toast.LENGTH_SHORT).show();
                break;
            case android.R.id.home:
                //Toast.makeText(ShowBlogDetails.this, "Hkasjhfksjfksdjfds", Toast.LENGTH_LONG).show();
                finish();
               // NavUtils.navigateUpFromSameTask(this);
                return true;
            default:
                break;
        }
        return true;
    }

    ImageView fontSizeSmall, fontSizeMedium, fontSizeLarge;
    TextView TVClose;
    View View2, View3, View4, View5;
    Button BTNReset;

    private void initiatePopupWindow() {
        try {
            // We need to get the instance of the LayoutInflater
            LayoutInflater inflater = (LayoutInflater) ShowBlogDetails.this.getSystemService(Context.LAYOUT_INFLATER_SERVICE);
            View layout = inflater.inflate(R.layout.popup_layout, (ViewGroup) findViewById(R.id.popup_element));
            pwindo = new PopupWindow(layout, ViewGroup.LayoutParams.MATCH_PARENT, ActionBar.LayoutParams.WRAP_CONTENT, true);
            pwindo.showAtLocation(layout, Gravity.CENTER, 0, 0);
            fontSizeSmall = (ImageView) layout.findViewById(R.id.fontSizeSmall);
            TVClose = (TextView) layout.findViewById(R.id.TVClose);
            TVClose.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    pwindo.dismiss();
                }
            });
            fontSizeSmall.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    TVDescription.setTextSize(16);
                }
            });
            fontSizeMedium = (ImageView) layout.findViewById(R.id.fontSizeMedium);
            fontSizeMedium.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    TVDescription.setTextSize(22);
                }
            });
            fontSizeLarge = (ImageView) layout.findViewById(R.id.fontSizeLarge);
            fontSizeLarge.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    TVDescription.setTextSize(26);
                }
            });
            //
            View2 = (View) layout.findViewById(R.id.View2);
            View2.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    activity_show_blog_details.setBackgroundColor(Color.parseColor("#ffffff"));
                    TVTitle.setTextColor(Color.parseColor("#000000"));
                    TVDescription.setTextColor(Color.parseColor("#000000"));
                }
            });
            View3 = (View) layout.findViewById(R.id.View3);
            View3.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    activity_show_blog_details.setBackgroundColor(Color.parseColor("#e7dec7"));
                    TVTitle.setTextColor(Color.parseColor("#5d4232"));
                    TVDescription.setTextColor(Color.parseColor("#5d4232"));
                }
            });
            View4 = (View) layout.findViewById(R.id.View4);
            View4.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    activity_show_blog_details.setBackgroundColor(Color.parseColor("#000000"));
                    TVTitle.setTextColor(Color.parseColor("#ffffff"));
                    TVDescription.setTextColor(Color.parseColor("#ffffff"));
                }
            });


            BTNReset = (Button) layout.findViewById(R.id.BTNReset);
            BTNReset.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    activity_show_blog_details.setBackgroundColor(Color.WHITE);
                    TVTitle.setTextColor(Color.BLACK);
                    TVDescription.setTextColor(Color.BLACK);
                    TVDescription.setTextSize(16);
                }
            });

        } catch (Exception e) {
            e.printStackTrace();
        }
    }


    /**
     * Detects and toggles immersive mode (also known as "hidey bar" mode).
     */
    public void toggleHideyBar() {


        if (Build.VERSION.SDK_INT >= 21) {
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
        }
        // BEGIN_INCLUDE (get_current_ui_flags)
        // The UI options currently enabled are represented by a bitfield.
        // getSystemUiVisibility() gives us that bitfield.
        int uiOptions = getWindow().getDecorView().getSystemUiVisibility();
        int newUiOptions = uiOptions;
        // END_INCLUDE (get_current_ui_flags)
        // BEGIN_INCLUDE (toggle_ui_flags)
        boolean isImmersiveModeEnabled =
                ((uiOptions | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY) == uiOptions);
        if (isImmersiveModeEnabled) {
            Log.i("", "Turning immersive mode mode off. ");
        } else {
            Log.i("", "Turning immersive mode mode on.");
        }

        // Navigation bar hiding:  Backwards compatible to ICS.
        if (Build.VERSION.SDK_INT >= 14) {
            newUiOptions ^= View.SYSTEM_UI_FLAG_HIDE_NAVIGATION;
        }

        // Status bar hiding: Backwards compatible to Jellybean
        if (Build.VERSION.SDK_INT >= 16) {
            newUiOptions ^= View.SYSTEM_UI_FLAG_FULLSCREEN;
        }

        // Immersive mode: Backward compatible to KitKat.
        // Note that this flag doesn't do anything by itself, it only augments the behavior
        // of HIDE_NAVIGATION and FLAG_FULLSCREEN.  For the purposes of this sample
        // all three flags are being toggled together.
        // Note that there are two immersive mode UI flags, one of which is referred to as "sticky".
        // Sticky immersive mode differs in that it makes the navigation and status bars
        // semi-transparent, and the UI flag does not get cleared when the user interacts with
        // the screen.
        if (Build.VERSION.SDK_INT >= 18) {
            newUiOptions ^= View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY;
        }

        getWindow().getDecorView().setSystemUiVisibility(newUiOptions);
        //END_INCLUDE (set_ui_flags)
    }


    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        switch (keyCode) {
            case KeyEvent.KEYCODE_BACK:
                finish();
                return true;
        }
        return super.onKeyDown(keyCode, event);
    }



    private void markAsView() {

        HashMap <String, String> hmHomeParam = new HashMap <>();
        hmHomeParam.put("BlogID", blogID);
        SmartPostWebRequest mainCategory = new SmartPostWebRequest(WebConstants.mark_as_View, curr_activity, false, hmHomeParam, new OnResponseListener() {
            @Override
            public void onSuccess(Object result) {
                try {
                    JSONObject jsonResponse = new JSONObject(result.toString());
                    if (jsonResponse != null) {
                        Integer status = jsonResponse.getInt("success");
                        if (status == 1) {
                            //Toast.makeText(curr_activity, "Blog Viewed", Toast.LENGTH_LONG).show();
                        }else{
                            String message = jsonResponse.getString("message");
                            Toast.makeText(curr_activity, message, Toast.LENGTH_LONG).show();
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


    private void followUser(final String followUserID, final String userID) {
        HashMap<String, String> hmHomeParam = new HashMap <>();
        hmHomeParam.put("FollowerID", followUserID);
        hmHomeParam.put("UserID", userID);
        SmartPostWebRequest mainCategory = new SmartPostWebRequest(WebConstants.follow_user, curr_activity, false, hmHomeParam, new OnResponseListener() {
            @Override
            public void onSuccess(Object result) {
                try {
                    JSONObject jsonResponse = new JSONObject(result.toString());
                    if (jsonResponse != null) {
                        Integer status = jsonResponse.getInt("success");
                        if (status == 1) {
                            String message = jsonResponse.getString("message");
                            Toast.makeText(curr_activity, message, Toast.LENGTH_LONG).show();
                        } else{
                            String message = jsonResponse.getString("message");
                            Toast.makeText(curr_activity, message, Toast.LENGTH_LONG).show();
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


    private void unFollowUser(final String followUserID, final String userID) {
        HashMap<String, String> hmHomeParam = new HashMap <>();
        hmHomeParam.put("FollowerID", followUserID);
        hmHomeParam.put("UserID", userID);
        SmartPostWebRequest mainCategory = new SmartPostWebRequest(WebConstants.un_follow_user, curr_activity, false, hmHomeParam, new OnResponseListener() {
            @Override
            public void onSuccess(Object result) {
                try {
                    JSONObject jsonResponse = new JSONObject(result.toString());
                    if (jsonResponse != null) {
                        Integer status = jsonResponse.getInt("success");
                        if (status == 1) {
                            String message = jsonResponse.getString("message");
                            Toast.makeText(curr_activity, message, Toast.LENGTH_LONG).show();
                        } else {
                            String message = jsonResponse.getString("message");
                            Toast.makeText(curr_activity, message, Toast.LENGTH_LONG).show();
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


    private void addRating(final String blogId, final String userID, final String ratingValue) {
        HashMap<String, String> hmHomeParam = new HashMap <>();
        hmHomeParam.put("BlogId", blogId);
        hmHomeParam.put("Rating", ratingValue);
        hmHomeParam.put("UserId", userID);
        SmartPostWebRequest mainCategory = new SmartPostWebRequest(WebConstants.add_rating_url, curr_activity, false, hmHomeParam, new OnResponseListener() {
            @Override
            public void onSuccess(Object result) {
                try {
                    JSONObject jsonResponse = new JSONObject(result.toString());
                    if (jsonResponse != null) {
                        Integer status = jsonResponse.getInt("success");
                        if (status == 1) {
                            String message = jsonResponse.getString("message");
                            Toast.makeText(curr_activity, message, Toast.LENGTH_LONG).show();
                        } else {
                            String message = jsonResponse.getString("message");
                            Toast.makeText(curr_activity, message, Toast.LENGTH_LONG).show();
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





}
