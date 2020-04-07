package com.ibitvalley.writon.adapter;

import android.app.Activity;
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
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;
import androidx.recyclerview.widget.RecyclerView;

import com.android.volley.VolleyError;
import com.ibitvalley.writon.Blog_Profile;
import com.ibitvalley.writon.R;
import com.ibitvalley.writon.Report;
import com.ibitvalley.writon.ShowBlogDetails;
import com.ibitvalley.writon.model.TrendingPost_Model;
import com.ibitvalley.writon.utils.VolleySingleton;
import com.ibitvalley.writon.webapi.WebConstants;
import com.ibitvalley.writon.webapi.util.OnResponseListener;
import com.ibitvalley.writon.webapi.util.SmartPostWebRequest;
import com.squareup.picasso.Picasso;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashMap;

import de.hdodenhof.circleimageview.CircleImageView;

import static android.content.Context.MODE_PRIVATE;

/**
 * Created by  on 30-09-2016.
 */

public class MyWorldAdapter extends RecyclerView.Adapter<MyWorldAdapter.ImagecategoryViewHolder> {
    private Context curr_context;
    private Activity curr_activity;
    ArrayList<TrendingPost_Model> arrappliedjob;
    SharedPreferences preferences;
    Typeface tf;
    public MyWorldAdapter(Activity curr_activity, Context curr_context, ArrayList<TrendingPost_Model> arrappliedjob) {
        this.curr_activity = curr_activity;
        this.curr_context = curr_context;
        this.arrappliedjob = arrappliedjob;
        preferences = curr_activity.getSharedPreferences("mPrefs", MODE_PRIVATE);
        System.out.println("Array Size In Adapter : " + arrappliedjob.size());
        tf = Typeface.createFromAsset(curr_context.getAssets(),"Lato-Regular.ttf");
    }

    @Override
    public ImagecategoryViewHolder onCreateViewHolder(ViewGroup parent, int viewType) {
        View itemView = LayoutInflater.from(parent.getContext()).inflate(R.layout.myworld_list_item_view, parent, false);
        return new ImagecategoryViewHolder(itemView);
    }

    @Override
    public void onBindViewHolder(final ImagecategoryViewHolder holder, final int position) {
        System.out.println("Entering onbind");

        final TrendingPost_Model show = arrappliedjob.get(position);
        // holder.Username.setText(show.getUser_name());
        holder.nameone.setText(Html.fromHtml(show.getMessage()));
        holder.tv_duration.setText(show.getHuman_date());

        if (show.getBlogreferenced() != null) {
            holder.tv_FollowUserName.setVisibility(View.GONE);
            holder.TVCategory.setVisibility(View.VISIBLE);
            holder.Username.setVisibility(View.VISIBLE);
            holder.TVCategory.setVisibility(View.VISIBLE);
            holder.TVShortDesc.setVisibility(View.VISIBLE);
            holder.TVShortDesc.setText(Html.fromHtml(String.valueOf(show.getBlogreferenced().getTitle())));
            holder.TVCategory.setText(String.format("%s, %s (%s)", show.getBlogreferenced().getCategory(), show.getBlogreferenced().getSubCat(), show.getBlogreferenced().getLanguage()));
            holder.TVViewCount.setText(show.getBlogreferenced().getView_count());
            holder.TVCommentCount.setText(show.getBlogreferenced().getComments_count());
            holder.TVRating.setText(show.getBlogreferenced().getVotes_count());
            holder.Username.setText(show.getBlogreferenced().getUser_name());

        } else if (show.getUserReferenced() != null) {
            holder.Username.setVisibility(View.GONE);
            holder.TVCategory.setVisibility(View.GONE);
            holder.TVShortDesc.setVisibility(View.GONE);
            holder.tv_FollowUserName.setVisibility(View.VISIBLE);
            holder.tv_FollowUserName.setText(show.getUserReferenced().getUsername());
        }


        if (show.getUserReferenced() != null){
            //Picasso.with(curr_context).load(show.getUserReferenced().getImageUrl()).placeholder(R.drawable.usermale).into(holder.list_image);
         }

         if(show.getUserCreated() != null){
             Picasso.get().load(show.getUserCreated().getImageUrl()).placeholder(R.drawable.usermale).into(holder.list_imageone);
         }




         /*if (show.isBookMark()) {
            holder.IVBookmarked.setColorFilter(ContextCompat.getColor(curr_activity, R.color.colorGreen));
        } else {
            holder.IVBookmarked.setColorFilter(ContextCompat.getColor(curr_activity, R.color.colorGrey));
        }*/

//
        //  holder.tv_user_followers_count.setText(String.format("%s FOLLOWERS", show.getUser_followers_count()));
        //holder.IVProgileImage.setImageResource(AvtarUtil.getAvtarDrawableByType(show.getAvatorCode()));
//        if(position ==0){
//            holder.right_arrow.setVisibility(View.VISIBLE);
//        } else {
//            holder.right_arrow.setVisibility(View.INVISIBLE);
//        }

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
        TextView Username, nameone, TVShortDesc, TVCategory, TVbookmarkCount, TVCommentCount, TVRating, blogType, TVViewCount,
                tv_user_followers_count, tv_duration, tv_FollowUserName;
        CircleImageView IVProgileImage;
        ImageView IVBookmarked, drawer, right_arrow;
        CircleImageView list_image, list_imageone;
        LinearLayout LLContent;
        TextView TVHeader1;
        public ImagecategoryViewHolder(View view) {
            super(view);

            // this.TVHeader1 = (TextView) view.findViewById(R.id.TVHeader1);
            // this.TVHeader1.setText("TRENDING");
            this.Username = (TextView) view.findViewById(R.id.name);
            this.Username.setTypeface(tf);
            this.nameone = (TextView) view.findViewById(R.id.nameone);
            this.nameone.setTypeface(tf);

            this.tv_duration = (TextView) view.findViewById(R.id.tv_duration);
            this.tv_duration.setTypeface(tf);

            this.tv_FollowUserName = (TextView) view.findViewById(R.id.tv_FollowUserName);
            this.tv_FollowUserName.setTypeface(tf);

            this.TVShortDesc = (TextView) view.findViewById(R.id.TVShortDesc);
            this.TVShortDesc.setTypeface(tf);
            this.TVCategory = (TextView) view.findViewById(R.id.TVCategory);
            this.TVCategory.setTypeface(tf);

            //this.list_image = (CircleImageView) view.findViewById(R.id.list_image);
            this.list_imageone = (CircleImageView) view.findViewById(R.id.list_imageone);

            //this.blogType = (TextView) view.findViewById(R.id.blogType);
            //this.blogType.setTypeface(tf);
            //this.blogType.setText("Latest");
            this.IVBookmarked = (ImageView) view.findViewById(R.id.IVBookmarked);
            this.TVViewCount = (TextView) view.findViewById(R.id.TVViewCount);
            this.TVbookmarkCount = (TextView) view.findViewById(R.id.TVbookmarkCount);
            this.TVCommentCount = (TextView) view.findViewById(R.id.TVCommentCount);
            this.TVRating = (TextView) view.findViewById(R.id.TVRating);
            // this.tv_user_followers_count = (TextView) view.findViewById(R.id.tv_user_followers_count);
            //this.right_arrow = (ImageView) view.findViewById(R.id.right_arrow);
            LLContent = (LinearLayout) view.findViewById(R.id.activity_feed);
            LLContent.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    //Intent blogprofile = new Intent(curr_context, ShowBlog.class);
                    if(arrappliedjob.get(getPosition()).getBlogreferenced() != null) {

                        TrendingPost_Model objTrending = new TrendingPost_Model();
                        objTrending.setBlogID(arrappliedjob.get(getPosition()).getBlogreferenced().getBlogId());
                        objTrending.setCategory(arrappliedjob.get(getPosition()).getBlogreferenced().getCategory());
                        objTrending.setSubCat(arrappliedjob.get(getPosition()).getBlogreferenced().getSubCat());
                        objTrending.setTitle(arrappliedjob.get(getPosition()).getBlogreferenced().getTitle());
                        objTrending.setShortDescription(arrappliedjob.get(getPosition()).getBlogreferenced().getShortDescription());
                        objTrending.setLongDescription(arrappliedjob.get(getPosition()).getBlogreferenced().getLongDescription());
                        objTrending.setLanguage(arrappliedjob.get(getPosition()).getBlogreferenced().getLanguage());
                        objTrending.setView_count(arrappliedjob.get(getPosition()).getBlogreferenced().getView_count());
                        objTrending.setComments_count(arrappliedjob.get(getPosition()).getBlogreferenced().getComments_count());
                        objTrending.setView_count(arrappliedjob.get(getPosition()).getBlogreferenced().getView_count());
                        objTrending.setVotes_count(arrappliedjob.get(getPosition()).getBlogreferenced().getVotes_count());
                        objTrending.setUserID(arrappliedjob.get(getPosition()).getBlogreferenced().getUser_id());
                        objTrending.setUser_name(arrappliedjob.get(getPosition()).getBlogreferenced().getUser_name());
                        objTrending.setUser_followers_count(arrappliedjob.get(getPosition()).getBlogreferenced().getUser_followers_count());
                        objTrending.setBookMark(arrappliedjob.get(getPosition()).getBlogreferenced().getIs_bookmarked());

                        Intent blogprofile = new Intent(curr_context, ShowBlogDetails.class);
                        blogprofile.putExtra("BlogObject", objTrending);
                        blogprofile.putExtra("boxTitle", "Trending");
                        curr_context.startActivity(blogprofile);

                    }else if(arrappliedjob.get(getPosition()).getUserCreated() != null) {
                        Intent blogprofile = new Intent(curr_context, Blog_Profile.class);
                        blogprofile.putExtra("UserID", arrappliedjob.get(getPosition()).getUserCreated().getId());
                        curr_context.startActivity(blogprofile);
                    }
                }
            });

            /*this.IVBookmarked.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    TrendingPost_Model blog = arrappliedjob.get(getPosition());
                    SharedPreferences preferences = curr_context.getSharedPreferences("mPrefs", MODE_PRIVATE);
                    bookmarkRequest(preferences.getString("UserId", ""), blog.getBlogId());
                    if (blog.isBookMark()) {
                        blog.setBookMark(false);
                        IVBookmarked.setColorFilter(ContextCompat.getColor(curr_activity, R.color.colorGrey));
                    } else {
                        blog.setBookMark(true);
                        IVBookmarked.setColorFilter(ContextCompat.getColor(curr_activity, R.color.colorGreen));
                    }
                }
            });*/

        }
    }

    private void bookmarkRequest(final String UserID, final String BlogID) {
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

}

