package com.ibitvalley.writon.adapter;

import android.app.Activity;
import android.app.ProgressDialog;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Typeface;
import android.text.Html;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.RelativeLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;
import androidx.recyclerview.widget.RecyclerView;

import com.android.volley.AuthFailureError;
import com.android.volley.DefaultRetryPolicy;
import com.android.volley.Request;
import com.android.volley.RequestQueue;
import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.StringRequest;
import com.android.volley.toolbox.Volley;
import com.ibitvalley.writon.R;
import com.ibitvalley.writon.Report;
import com.ibitvalley.writon.model.Blog;
import com.ibitvalley.writon.utils.Const;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;

import de.hdodenhof.circleimageview.CircleImageView;

import static android.content.Context.MODE_PRIVATE;

/**
 * Created by  on 30-09-2016.
 */

public class FeedAdapter extends RecyclerView.Adapter<FeedAdapter.ImagecategoryViewHolder> {
    private Context curr_context;
    private Activity curr_activity;
    ArrayList<Blog> arrappliedjob;
    SharedPreferences preferences;

    String WriterName;

    Typeface tf, tfBold, tfopenSansSemiBold, tfopenSansRegular;

    public FeedAdapter(Activity curr_activity, Context curr_context, ArrayList<Blog> arrappliedjob, String writerName) {
        this.curr_activity = curr_activity;
        this.curr_context = curr_context;
        this.arrappliedjob = arrappliedjob;
        preferences = curr_activity.getSharedPreferences("mPrefs", MODE_PRIVATE);
        System.out.println("Array Size In Adapter : " + arrappliedjob.size());
        tf = Typeface.createFromAsset(curr_context.getAssets(),"MONTSERRAT-REGULAR.TTF");
        tfBold = Typeface.createFromAsset(curr_context.getAssets(),"MONTSERRAT-BOLD.TTF");
        tfopenSansSemiBold = Typeface.createFromAsset(curr_context.getAssets(),"OPENSANS-SEMIBOLD_0.TTF");
        tfopenSansRegular = Typeface.createFromAsset(curr_context.getAssets(),"OPENSANS-REGULAR_0.TTF");
        this.WriterName = writerName;
    }

    @Override
    public ImagecategoryViewHolder onCreateViewHolder(ViewGroup parent, int viewType) {
        //View itemView = LayoutInflater.from(parent.getContext()).inflate(R.layout.list_item_writer_blog, parent, false);
        View itemView = LayoutInflater.from(parent.getContext()).inflate(R.layout.feeditem, parent, false);
        return new ImagecategoryViewHolder(itemView);
    }

    @Override
    public void onBindViewHolder(final ImagecategoryViewHolder holder, final int position) {
        System.out.println("Entering onbind");

        final Blog show = arrappliedjob.get(position);
        holder.TVCategory.setText(String.format("%s, %s (%s)", show.getCategory(), show.getSubCat(), show.getLanguage()));
        holder.title.setText(show.getCreateBy());
        holder.TVTitle.setText(show.getTitle());
        holder.TVShortDesc.setText(Html.fromHtml(String.valueOf(show.getShortDescription())));
//        if (show.isBookMark()) {
//            holder.IVBookmarked.setColorFilter(ContextCompat.getColor(curr_activity, R.color.colorGreen));
//        } else {
//            holder.IVBookmarked.setColorFilter(ContextCompat.getColor(curr_activity, R.color.colorGrey));
//        }
        holder.TVViewCount.setText(show.getBookMarkedCount());
        holder.TVCommentCount.setText(show.getCommentCount());
        holder.TVRatingCount.setText(show.getRating());
        //holder.IVProgileImage.setImageResource(AvtarUtil.getAvtarDrawableByType(show.getAvatorCode()));

    }


    @Override
    public int getItemCount() {
        if (arrappliedjob != null) {
            return arrappliedjob.size();
        } else {
            return 0;
        }
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

    public class ImagecategoryViewHolder extends RecyclerView.ViewHolder {
//        TextView Username, Title, ShortDesc, category, TVbookmarkCount, TVCommentCount, TVRating, blogType;
//        CircleImageView IVProgileImage;
//        ImageView IVBookmarked, drawer;
//        LinearLayout LLContent;
          TextView title, artist, TVFollow, TVTitle, TVCategory, TVShortDesc, TVViewCount, TVCommentCount, TVRatingCount;
          RelativeLayout RLBigBaner, RLSmallBaner;
        public ImagecategoryViewHolder(View view) {
            super(view);


            title = (TextView) view.findViewById(R.id.title);
            artist = (TextView) view.findViewById(R.id.artist);
            TVFollow = (TextView) view.findViewById(R.id.TVFollow);
            TVTitle = (TextView) view.findViewById(R.id.TVTitle);
            TVCategory = (TextView) view.findViewById(R.id.TVCategory);
            TVShortDesc = (TextView) view.findViewById(R.id.TVShortDesc);
            TVViewCount = (TextView) view.findViewById(R.id.TVViewCount);
            TVCommentCount = (TextView) view.findViewById(R.id.TVCommentCount);
            TVRatingCount = (TextView) view.findViewById(R.id.TVRatingCount);
            title.setTypeface(tf);
            TVFollow.setTypeface(tf);
            artist.setTypeface(tfBold);
            TVViewCount.setTypeface(tfBold);
            TVCommentCount.setTypeface(tfBold);
            TVRatingCount.setTypeface(tfBold);
            TVTitle.setTypeface(tfopenSansSemiBold);
            TVCategory.setTypeface(tfopenSansRegular);
            TVShortDesc.setTypeface(tfopenSansRegular);

           // RLBigBaner = (RelativeLayout) view.findViewById(R.id.RLBigBaner);
            //RLSmallBaner = (RelativeLayout) view.findViewById(R.id.RLSmallBaner);
           // RLBigBaner.setVisibility(View.INVISIBLE);


//            this.Username = (TextView) view.findViewById(R.id.name);
//            this.Username.setTypeface(tf);
//            this.Title = (TextView) view.findViewById(R.id.name2);
//            this.Title.setTypeface(tf);
//            this.ShortDesc = (TextView) view.findViewById(R.id.name3);
//            this.ShortDesc.setTypeface(tf);
//            this.category = (TextView) view.findViewById(R.id.category);
//            this.category.setTypeface(tf);
//            //this.blogType = (TextView) view.findViewById(R.id.blogType);
//           // this.blogType.setTypeface(tf);
//            this.IVBookmarked = (ImageView) view.findViewById(R.id.IVBookmarked);
//            this.TVbookmarkCount = (TextView) view.findViewById(R.id.TVbookmarkCount);
//            this.TVCommentCount = (TextView) view.findViewById(R.id.TVCommentCount);
//            this.TVRating = (TextView) view.findViewById(R.id.TVRating);


//            LLContent = (LinearLayout) view.findViewById(R.id.LLContent);
//            LLContent.setOnClickListener(new View.OnClickListener() {
//                @Override
//                public void onClick(View v) {
//                    Intent blogprofile = new Intent(curr_context, ShowBlog.class);
//                    blogprofile.putExtra("BlogObject", arrappliedjob.get(getPosition()));
//                    blogprofile.putExtra("boxTitle", WriterName);
//                    curr_context.startActivity(blogprofile);
//                }
//            });
//            this.drawer = (ImageView) view.findViewById(R.id.drawer);
//            this.IVProgileImage = (CircleImageView) view.findViewById(R.id.IVProgileImage);
//
//            drawer.setOnClickListener(new View.OnClickListener() {
//                @Override
//                public void onClick(View v) {
//                    Blog blog = arrappliedjob.get(getPosition());
//
//                    final String UserId = preferences.getString("UserId", "0");
//
//                    String shareContent = String.format("\"%s\" by %s \n\n %s \n Read more %s @WritOn %s", blog.getTitle(), blog.getCreateBy(),  Html.fromHtml(blog.getLongDescripton()), blog.getCategory(), "https://goo.gl/Cx4oPk");
//                    if (!blog.getUserID().equals(UserId)) {
//                        String[] arrString = {"Report", "Share"};
//                        showPopupMenu(arrString, shareContent);
//                    } else {
//                        String[] arrString = {"Share"};
//                        showPopupMenu(arrString, shareContent);
//                    }
//                }
//            });
//
//            IVProgileImage.setOnClickListener(new View.OnClickListener() {
//                @Override
//                public void onClick(View v) {
//                    final String UserId = preferences.getString("UserId", "0");
//                    Blog show = arrappliedjob.get(getPosition());
//                    if (!show.getUserID().equals(UserId)) {
//                        Intent blogprofile = new Intent(curr_context, Blog_Profile.class);
//                        blogprofile.putExtra("BlogObject", arrappliedjob.get(getPosition()));
//                        curr_context.startActivity(blogprofile);
//                    } else {
//                        Fragment fragment = new Home_Fragment2();
//                        ((Home_Activity) curr_activity).replaceFragment(fragment);
//                    }
//                }
//            });
//
//
//
//            this.IVBookmarked.setOnClickListener(new View.OnClickListener() {
//                @Override
//                public void onClick(View v) {
//                    Blog blog = arrappliedjob.get(getPosition());
//                    SharedPreferences preferences = curr_context.getSharedPreferences("mPrefs", MODE_PRIVATE);
//                    bookmarkRequest(preferences.getString("UserId", ""), blog.getBlogId());
//                    if (blog.isBookMark()) {
//                        blog.setBookMark(false);
//                        IVBookmarked.setColorFilter(ContextCompat.getColor(curr_activity, R.color.colorGrey));
//                    } else {
//                        blog.setBookMark(true);
//                        IVBookmarked.setColorFilter(ContextCompat.getColor(curr_activity, R.color.colorGreen));
//                    }
//                }
//            });
        }

    }

    private void bookmarkRequest(final String UserID, final String BlogID) {
        RequestQueue requestQueue;
        final ProgressDialog dialog = new ProgressDialog(curr_context);
        dialog.setMessage("Please wait...");
        dialog.show();
        requestQueue = Volley.newRequestQueue(curr_context);
        StringRequest jor = new StringRequest(Request.Method.POST, String.format("%s%s", Const.BASE_URL, "/BookMark"),
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
                params.put("BlogID", BlogID);
                return params;
            }
        };
        jor.setRetryPolicy(new DefaultRetryPolicy(20000, 0, 0.0f));
        requestQueue.add(jor);
    }

}

