package com.ibitvalley.writon;

import android.app.Activity;
import android.app.ProgressDialog;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Typeface;
import android.os.Bundle;
import android.text.Html;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.PopupWindow;
import android.widget.RatingBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;

import com.android.volley.AuthFailureError;
import com.android.volley.DefaultRetryPolicy;
import com.android.volley.Request;
import com.android.volley.RequestQueue;
import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.JsonObjectRequest;
import com.android.volley.toolbox.StringRequest;
import com.android.volley.toolbox.Volley;
import com.ibitvalley.writon.GoogleAnalytics.MyApplication;
import com.ibitvalley.writon.model.AvtarUtil;
import com.ibitvalley.writon.model.Blog;
import com.ibitvalley.writon.utils.Const;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.HashMap;
import java.util.Map;

import de.hdodenhof.circleimageview.CircleImageView;

public class ShowBlog extends AppCompatActivity {

    TextView TVComment, TVWriterName, TVCategory, TVShortDesc, TVTitle, TVBloggerName, TVbookmarkCount, TVCommentCount, TVRating, TVType;
    Button BTReadOn;
    TextView btnDiscuss;
    Blog currBlog;
    Activity curr_activity;
    Context curr_context;
    ImageView drawer;
    RatingBar ratingbar1;
    CircleImageView image;
    Typeface tf;


    private void setTFace(){
        TVType.setTypeface(tf);
        TVCategory.setTypeface(tf);
        TVWriterName.setTypeface(tf);
        TVTitle.setTypeface(tf);
        TVShortDesc.setTypeface(tf);
        TVBloggerName.setTypeface(tf);
        TVComment.setTypeface(tf);
        BTReadOn.setTypeface(tf);
        btnDiscuss.setTypeface(tf);
    }
    SharedPreferences preferences;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_show_blog);
        //getSupportActionBar().hide();
        this.setTitle("Blog Details");
        curr_activity = this;
        curr_context = this;
        tf = Typeface.createFromAsset(curr_context.getAssets(),"Lato-Regular.ttf");
        currBlog = (Blog) getIntent().getSerializableExtra("BlogObject");

        TVType = (TextView) findViewById(R.id.TVType);
        String title = getIntent().getExtras().getString("boxTitle");
        TVType = (TextView) findViewById(R.id.TVType);
        TVType.setText(title);



        TVbookmarkCount = (TextView) findViewById(R.id.TVbookmarkCount);
        TVCommentCount = (TextView) findViewById(R.id.TVCommentCount);
        TVRating = (TextView) findViewById(R.id.TVRating);
        image = (CircleImageView) findViewById(R.id.image);
        ratingbar1 = (RatingBar)findViewById(R.id.ratingBar1);
        TVbookmarkCount.setText(currBlog.getBookMarkedCount());
        TVCommentCount.setText(currBlog.getCommentCount());
        TVRating.setText(currBlog.getRating());


        preferences = getApplicationContext().getSharedPreferences("mPrefs", MODE_PRIVATE);
        ratingbar1.setOnRatingBarChangeListener(new RatingBar.OnRatingBarChangeListener() {
            @Override
            public void onRatingChanged(RatingBar ratingBar, float rating, boolean fromUser) {
                //String rating=String.valueOf(ratingbar1.getRating());
                if(!preferences.getString("UserId", "").toString().equals(currBlog.getUserID().toString())) {
                    blogRating(currBlog.getBlogId(), preferences.getString("UserId", ""), String.valueOf(Math.round(rating)));
                } else {
                    ratingbar1.setRating(0.0f);
                    Toast.makeText(curr_context, "You Can't rate yourself.", Toast.LENGTH_SHORT).show();
                }
            }
        });


        BTReadOn = (Button) findViewById(R.id.BTReadOn);
        BTReadOn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {

                recentRead(preferences.getString("UserId", ""), currBlog.getBlogId() );

            }
        });
        btnDiscuss = (TextView) findViewById(R.id.btnDiscuss);
        btnDiscuss.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Intent intentShowBlogDetails = new Intent(ShowBlog.this, ActivityBlogComments.class);
                intentShowBlogDetails.putExtra("BlogObject", currBlog);
                startActivity(intentShowBlogDetails);
            }
        });
        TVComment = (TextView) findViewById(R.id.TVComment);
        TVBloggerName = (TextView) findViewById(R.id.TVBloggerName);



        TVTitle = (TextView) findViewById(R.id.TVTitle);
        TVWriterName = (TextView) findViewById(R.id.TVWriterName);
        TVCategory = (TextView) findViewById(R.id.TVCategory);
        TVShortDesc = (TextView) findViewById(R.id.shortDesc);
        drawer = (ImageView) findViewById(R.id.drawer);
        TVWriterName.setText(currBlog.getCreateBy());
        if(currBlog.getShortDescription() != null) {
            TVShortDesc.setText(Html.fromHtml(currBlog.getShortDescription()));
        }
        TVTitle.setText(currBlog.getTitle());
        // TVMainContent.setText(Html.fromHtml(currBlog.getLongDescripton()));
        //TVCategory.setText(currBlog.getCategory());
        TVCategory.setText(String.format("%s, %s(%s)", currBlog.getCategory(), currBlog.getSubCat(), currBlog.getLanguage()));
        image.setImageResource(AvtarUtil.getAvtarDrawableByType(currBlog.getAvatorCode()));
        drawer.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
               //final String[] arr;
                if (!currBlog.getUserID().equals(preferences.getString("UserId", "").toString())) {
                    String[] arr = {"Share", "Follow", "Report"};
                    showPopupMenu(currBlog, arr);
                } else {
                    String[] arr = {"Share", "Report"};
                    showPopupMenu(currBlog, arr);
                }

            }
        });
        setTFace();

        //ratingWithLatestComment(preferences.getString("UserId", ""), currBlog.getBlogId());

        MyApplication.getInstance().trackEvent("ShowBlog Screen", "Blog", "Show blog summary.");
        MyApplication.getInstance().trackScreenView("ShowBlog");

    }

    private void showPopupMenu(final Blog blog, final String[] arr) {
        AlertDialog.Builder builderSingle = new AlertDialog.Builder(curr_activity);
        final ArrayAdapter<String> arrayAdapter = new ArrayAdapter<String>(
                curr_context,
                android.R.layout.select_dialog_singlechoice);


        builderSingle.setCancelable(true);
        builderSingle.setItems(arr, new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                if (which == 0) {
                    String shareContent = String.format("\"%s\" by %s \n\n %s \n Read more %s @WritOn %s", currBlog.getTitle(), currBlog.getCreateBy(),  Html.fromHtml(currBlog.getLongDescripton()), currBlog.getCategory(), "https://goo.gl/Cx4oPk");
                    share(shareContent);
                } else if(which == 1){
                    SharedPreferences preferences = curr_context.getSharedPreferences("mPrefs", MODE_PRIVATE);
                    fllowRequest(preferences.getString("UserId", ""), blog.getUserID());

                } else if(which == 2){
                    Intent blogprofile = new Intent(curr_context, Report.class);
                    curr_context.startActivity(blogprofile);
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
        startActivity(sendIntent);
    }

    private void fllowRequest(final String UserID, final String FollowingID) {
        RequestQueue requestQueue;
        final ProgressDialog dialog = new ProgressDialog(curr_context);
        dialog.setMessage("Please wait...");
        dialog.show();
        requestQueue = Volley.newRequestQueue(curr_context);
        StringRequest jor = new StringRequest(Request.Method.POST, String.format("%s%s", Const.BASE_URL, "/Following"),
                new Response.Listener<String>() {
                    @Override
                    public void onResponse(String response) {
                        dialog.dismiss();
                        Log.d("True", "");
                        try {
                            JSONObject jsonObject = new JSONObject(response);
                            if (jsonObject.get("success").toString() == "true") {
                                Toast.makeText(curr_context, "" + jsonObject.get("message"), Toast.LENGTH_LONG).show();
                            } else {
                                Toast.makeText(curr_context, "" + jsonObject.get("message"), Toast.LENGTH_LONG).show();
                            }
                        } catch (JSONException ex) {
                            //progress.dismiss();
                            Log.d("JSON Exception", ex.getMessage());
                        }
                    }
                },
                new Response.ErrorListener() {
                    @Override
                    public void onErrorResponse(VolleyError error) {
                        dialog.dismiss();
                        Log.e("Volley", "Error");
                    }
                }
        ) {
            @Override
            protected Map<String, String> getParams() throws AuthFailureError {
                HashMap<String, String> params = new HashMap<>();
                params.put("UserID", UserID);
                params.put("FollowingID", FollowingID);
                return params;
            }
        };
        jor.setRetryPolicy(new DefaultRetryPolicy(20000, 0, 0.0f));
        requestQueue.add(jor);
    }
    // Recent Web API
    private void recentRead(final String UserID, final String BlogID) {
        RequestQueue requestQueue;
        final ProgressDialog dialog = new ProgressDialog(curr_context);
        dialog.setMessage("Please wait...");
        dialog.show();
        requestQueue = Volley.newRequestQueue(curr_context);
        StringRequest jor = new StringRequest(Request.Method.POST, String.format("%s%s", Const.BASE_URL, "RecentRead"),
                new Response.Listener<String>() {
                    @Override
                    public void onResponse(String response) {
                        dialog.dismiss();
                        Log.d("True", "");
                        try {
                            JSONObject jsonObject = new JSONObject(response);
                            if (jsonObject.get("success").toString() == "true") {
                                Intent intentShowBlogDetails = new Intent(ShowBlog.this, ShowBlogDetails.class);
                                intentShowBlogDetails.putExtra("BlogObject", currBlog);
                                startActivity(intentShowBlogDetails);
                                //Toast.makeText(curr_context, "" + jsonObject.get("message"), Toast.LENGTH_LONG).show();
                            } else {
                                Toast.makeText(curr_context, "" + jsonObject.get("message"), Toast.LENGTH_LONG).show();
                            }
                        } catch (JSONException ex) {
                            //progress.dismiss();
                            Log.d("JSON Exception", ex.getMessage());
                        }
                    }
                },
                new Response.ErrorListener() {
                    @Override
                    public void onErrorResponse(VolleyError error) {
                        dialog.dismiss();
                        Log.e("Volley", "Error");
                    }
                }
        ) {
            @Override
            protected Map<String, String> getParams() throws AuthFailureError {
                HashMap<String, String> params = new HashMap<>();
                params.put("UserID", UserID);
                params.put("BlogID", BlogID);
                return params;
            }
        };
        jor.setRetryPolicy(new DefaultRetryPolicy(20000, 0, 0.0f));
        requestQueue.add(jor);
    }
    // Blog Rating API
    private void blogRating(final String BlogID, final String UserID, final String Rating) {
        RequestQueue requestQueue;
        final ProgressDialog dialog = new ProgressDialog(ShowBlog.this);

        dialog.setMessage("Please wait...");
        dialog.show();
        requestQueue = Volley.newRequestQueue(getApplicationContext());
        StringRequest jor = new StringRequest(Request.Method.POST, String.format("%s%s", Const.BASE_URL, "/Rating"),
                new Response.Listener<String>() {
                    @Override
                    public void onResponse(String response) {
                        dialog.dismiss();
                        Log.d("True", "");
                        try {
                            JSONObject jsonObject = new JSONObject(response);
                            if (jsonObject.get("success").toString() == "true") {
                               // Toast.makeText(getApplicationContext(), "" + jsonObject.get("message"), Toast.LENGTH_LONG).show();
                            } else {
                                //Toast.makeText(getApplicationContext(), "" + jsonObject.get("message"), Toast.LENGTH_LONG).show();
                            }
                        } catch (JSONException ex) {
                            //progress.dismiss();
                            Log.d("JSON Exception", ex.getMessage());
                        }
                    }
                },
                new Response.ErrorListener() {
                    @Override
                    public void onErrorResponse(VolleyError error) {
                        dialog.dismiss();
                        Log.e("Volley", "Error");
                    }
                }
        ) {
            @Override
            protected Map<String, String> getParams() throws AuthFailureError {
                HashMap<String, String> params = new HashMap<>();
                params.put("BlogID", BlogID);
                params.put("UserID", UserID);
                params.put("Rating", Rating);
                return params;
            }
        };
        jor.setRetryPolicy(new DefaultRetryPolicy(20000, 0, 0.0f));
        requestQueue.add(jor);
    }

    private void ratingWithLatestComment(final String UserID, final String BlogID)
    {
        try{
            RequestQueue requestQueue;
            final ProgressDialog dialog = new ProgressDialog(ShowBlog.this);
            dialog.setMessage("Please wait...");
            dialog.show();
            requestQueue = Volley.newRequestQueue(getApplicationContext());
            String loginURL = String.format(Const.BASE_URL + "RatingWithLatestBlog?UserID=%s&BlogID=%s", UserID, BlogID);
            Log.d("URL", loginURL);
            loginURL = loginURL.replace(" ", "%20");
            JsonObjectRequest jor = new JsonObjectRequest(Request.Method.GET, loginURL, null,
                    new Response.Listener<JSONObject>() {
                        @Override
                        public void onResponse(JSONObject response) {
                            dialog.dismiss();
                            Log.d("True", "");
                            try {
                                if (response.get("success").toString() == "true") {
                                    String UserName = response.get("UserName").toString();
                                    String Comment = response.get("Comment").toString();
                                    if(!UserName.equals("")){
                                        TVBloggerName.setText(UserName);
                                        TVComment.setText(Comment);
                                    }
                                    String CreationDate = response.get("CreationDate").toString();
                                    String Rating = response.get("Rating").toString();
                                    ratingbar1.setRating(Float.parseFloat(Rating));

                                } else {

                                    Toast.makeText(ShowBlog.this, response.get("message").toString(), Toast.LENGTH_LONG).show();
                                }
                            } catch (JSONException ex) {
                                Log.d("JSON Exception", ex.getMessage());
                            }
                        }
                    },
                    new Response.ErrorListener() {
                        @Override
                        public void onErrorResponse(VolleyError error) {
                            dialog.dismiss();
                            error.printStackTrace();
                            Log.e("Volley", "Error");
                        }
                    }
            );
            jor.setRetryPolicy(new DefaultRetryPolicy(20000, 3, 0.0f));
            requestQueue.add(jor);
        }
        catch (Exception ex)
        {
            Log.d("ratingWithLatestComment", ex.getMessage());
        }
    }

}
