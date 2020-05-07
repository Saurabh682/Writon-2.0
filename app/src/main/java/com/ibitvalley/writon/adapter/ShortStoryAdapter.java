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
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.RecyclerView;

import com.android.volley.VolleyError;
import com.ibitvalley.writon.Blog_Profile;
import com.ibitvalley.writon.Fragment.Home_Fragment2;
import com.ibitvalley.writon.Home_Activity;
import com.ibitvalley.writon.R;
import com.ibitvalley.writon.Report;
import com.ibitvalley.writon.ShowBlogDetails;
import com.ibitvalley.writon.model.Blog;
import com.ibitvalley.writon.model.TrendingPost_Model;
import com.ibitvalley.writon.model.User;
import com.ibitvalley.writon.utils.VolleySingleton;
import com.ibitvalley.writon.utils.WritOnPreference;
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

public class ShortStoryAdapter extends RecyclerView.Adapter<ShortStoryAdapter.ImagecategoryViewHolder> {
    private Context curr_context;
    private Activity curr_activity;
    ArrayList<TrendingPost_Model> arrappliedjob;
    SharedPreferences preferences;
    Typeface tf;
    User userData;

    public ShortStoryAdapter(Activity curr_activity, Context curr_context, ArrayList<TrendingPost_Model> arrappliedjob) {
        this.curr_activity = curr_activity;
        this.curr_context = curr_context;
        this.arrappliedjob = arrappliedjob;
        preferences = curr_activity.getSharedPreferences("mPrefs", MODE_PRIVATE);
        System.out.println("Array Size In Adapter : " + arrappliedjob.size());
        userData = WritOnPreference.getInstance(curr_context).getUserDetails();
        tf = Typeface.createFromAsset(curr_context.getAssets(),"Lato-Regular.ttf");
    }

    @Override
    public ImagecategoryViewHolder onCreateViewHolder(ViewGroup parent, int viewType) {
        View itemView = LayoutInflater.from(parent.getContext()).inflate(R.layout.blog_card, parent, false);
        return new ImagecategoryViewHolder(itemView);
    }

    @Override
    public void onBindViewHolder(final ImagecategoryViewHolder holder, final int position) {
        System.out.println("Entering onbind");

        final TrendingPost_Model show = arrappliedjob.get(position);
        holder.TVCategory.setText(String.format("%s, %s (%s)", show.getCategory(), show.getSubCat(), show.getLanguage()));
        holder.Username.setText(show.getUser_name());
        holder.TVTitle.setText(show.getTitle());


        if(show.getShortDescription() != null){
            holder.TVShortDesc.setText(Html.fromHtml(String.valueOf(show.getShortDescription())));
        }else {
            holder.TVShortDesc.setText(Html.fromHtml(String.valueOf(show.getLongDescription())));
        }

        if (show.isBookMark()) {
            holder.IVBookmarked.setImageResource(R.drawable.bookmarknew);
        } else {
            holder.IVBookmarked.setImageResource(R.drawable.unbookmark);
        }

        if(show.isIs_followed()) {
            holder.TVFollow.setText("UN FOLLOW");
        } else {
            holder.TVFollow.setText("FOLLOW");
        }

        holder.TVViewCount.setText(show.getView_count());
        holder.TVCommentCount.setText(show.getComments_count());
        holder.TVRating.setText(show.getVotes_count());
        holder.tv_user_followers_count.setText(String.format("%s FOLLOWERS", show.getUser_followers_count()));

        if(show.getUser_image() != null){
            Picasso.get().load(show.getUser_image()).placeholder(R.drawable.usermale).into(holder.list_image);
        }


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

    private void showPopupMenu(final String[] arrString, final String shareContent, final String blogID) {
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

    public class ImagecategoryViewHolder extends RecyclerView.ViewHolder {
        TextView Username, TVTitle, TVShortDesc, TVCategory, TVbookmarkCount, TVCommentCount, TVRating, blogType, TVViewCount,
                tv_user_followers_count;
        CircleImageView IVProgileImage, list_image;
        ImageView IVBookmarked, drawer, right_arrow, img_Option;
        LinearLayout LLContent;
        TextView TVHeader1, TVFollow;
        public ImagecategoryViewHolder(View view) {
            super(view);

            this.TVHeader1 = (TextView) view.findViewById(R.id.TVHeader1);
            this.TVHeader1.setText("TRENDING");
            this.Username = (TextView) view.findViewById(R.id.name);
            this.Username.setTypeface(tf);
            this.TVTitle = (TextView) view.findViewById(R.id.TVTitle);
            this.TVTitle.setTypeface(tf);
            this.TVShortDesc = (TextView) view.findViewById(R.id.TVShortDesc);
            this.TVShortDesc.setTypeface(tf);
            this.TVCategory = (TextView) view.findViewById(R.id.TVCategory);
            this.TVCategory.setTypeface(tf);
            //this.blogType = (TextView) view.findViewById(R.id.blogType);
            //this.blogType.setTypeface(tf);
            //this.blogType.setText("Latest");
            this.IVBookmarked = (ImageView) view.findViewById(R.id.IVBookmarked);
            this.TVViewCount = (TextView) view.findViewById(R.id.TVViewCount);
            this.TVbookmarkCount = (TextView) view.findViewById(R.id.TVbookmarkCount);
             this.TVCommentCount = (TextView) view.findViewById(R.id.TVCommentCount);
            this.TVRating = (TextView) view.findViewById(R.id.TVRating);
            this.tv_user_followers_count = (TextView) view.findViewById(R.id.tv_user_followers_count);
            //this.right_arrow = (ImageView) view.findViewById(R.id.right_arrow);
            LLContent = (LinearLayout) view.findViewById(R.id.LLContent);
            list_image = (CircleImageView) view.findViewById(R.id.list_image);
            this.TVFollow = (TextView) view.findViewById(R.id.TVFollow);

            this.img_Option = (ImageView) view.findViewById(R.id.img_Option);

            LLContent.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    //Intent blogprofile = new Intent(curr_context, ShowBlog.class);
                    Intent blogprofile = new Intent(curr_context, ShowBlogDetails.class);
                    blogprofile.putExtra("BlogObject", arrappliedjob.get(getPosition()));
                    blogprofile.putExtra("boxTitle", "Trending");
                    curr_context.startActivity(blogprofile);
                }
            });

            this.IVBookmarked.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    TrendingPost_Model blog = arrappliedjob.get(getPosition());
                    SharedPreferences preferences = curr_context.getSharedPreferences("mPrefs", MODE_PRIVATE);

                    if (blog.isBookMark()) {
                        unbookmarkRequest(userData.getId(), blog.getBlogId());
                        blog.setBookMark(false);
                        IVBookmarked.setImageResource(R.drawable.unbookmark);
                    } else {
                        bookmarkRequest(userData.getId(), blog.getBlogId());
                        blog.setBookMark(true);
                        IVBookmarked.setImageResource(R.drawable.bookmarknew);
                    }
                }
            });

            this.TVFollow.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    //final String followUserID, final String userID
                    TrendingPost_Model blog = arrappliedjob.get(getPosition());
                    if(blog.isIs_followed()) {
                        blog.setIs_followed(false);
                        TVFollow.setText("FOLLOW");
                        unFollowUser(blog.getUser_id(), userData.getId());
                    } else {
                        blog.setIs_followed(true);
                        TVFollow.setText("UN FOLLOW");
                        followUser(blog.getUser_id(), userData.getId());
                    }
                }
            });

            list_image.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    TrendingPost_Model show = arrappliedjob.get(getPosition());
                    if (!show.getUser_id().equals(userData.getId())) {
                        Intent blogprofile = new Intent(curr_context, Blog_Profile.class);
                        blogprofile.putExtra("BlogObject", arrappliedjob.get(getPosition()));
                        blogprofile.putExtra("UserID", show.getUser_id());
                        curr_context.startActivity(blogprofile);
                    } else {
                        Fragment fragment = new Home_Fragment2();
                        ((Home_Activity) curr_activity).replaceFragment(fragment);
                    }
                }
            });


            this.img_Option.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    TrendingPost_Model blog = arrappliedjob.get(getPosition());
                    final String UserId = preferences.getString("UserId", "0");

                    String shareContent = String.format("\"%s\" by %s \n\n %s \n Read more %s @WritOn %s", blog.getTitle(), blog.getUser_name(),  Html.fromHtml(blog.getLongDescription()), blog.getCategory(), "https://goo.gl/Cx4oPk");
                    //if (!blog.getUserID().equals(UserId)) {
                    String[] arrString = {"Report", "Share"};
                    showPopupMenu(arrString, shareContent, blog.getBlogID());
                    /*} else {
                        String[] arrString = {"Share"};
                        showPopupMenu(arrString, shareContent);
                    }*/

                }
            });

        }
    }

    private void bookmarkRequest(final String UserID, final String BlogID) {
        HashMap<String, String> hmHomeParam = new HashMap <>();
        hmHomeParam.put("blogid", BlogID);
        hmHomeParam.put("userid", UserID);
        SmartPostWebRequest mainCategory = new SmartPostWebRequest(WebConstants.mark_bookmark_api, curr_activity, false, hmHomeParam, new OnResponseListener() {
            @Override
            public ArrayList<Blog> onSuccess(Object result) {
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
                return null;
            }
            @Override
            public void onError(VolleyError error) {
                Log.d("","");
            }
        });
        VolleySingleton.getInstance().addToRequestQueue(mainCategory);
    }

    private void unbookmarkRequest(final String UserID, final String BlogID) {
        HashMap<String, String> hmHomeParam = new HashMap <>();
        hmHomeParam.put("blogid", BlogID);
        hmHomeParam.put("userid", UserID);
        SmartPostWebRequest mainCategory = new SmartPostWebRequest(WebConstants.mark_unbookmark_api, curr_activity, false, hmHomeParam, new OnResponseListener() {
            @Override
            public ArrayList<Blog> onSuccess(Object result) {
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
                return null;
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
            public ArrayList<Blog> onSuccess(Object result) {
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
                return null;
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
            public ArrayList<Blog> onSuccess(Object result) {
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
                return null;
            }
            @Override
            public void onError(VolleyError error) {
                Log.d("","");
            }
        });
        VolleySingleton.getInstance().addToRequestQueue(mainCategory);
    }


}

