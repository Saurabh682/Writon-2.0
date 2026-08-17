package com.ibitvalley.writon.adapter;

import android.app.Activity;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.os.Parcelable;
import android.text.Html;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AlertDialog;
import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentActivity;
import androidx.lifecycle.LifecycleOwner;
import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.RecyclerView;

import com.android.volley.Request;
import com.android.volley.RequestQueue;
import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.StringRequest;
import com.android.volley.toolbox.Volley;
import com.ibitvalley.writon.Blog_Profile;
import com.ibitvalley.writon.classes.roomdataclasses.BookMark_List_Data;
import com.ibitvalley.writon.fragment.Home_Fragment2;
import com.ibitvalley.writon.Home_Activity;
import com.ibitvalley.writon.R;
import com.ibitvalley.writon.Report;
import com.ibitvalley.writon.ShowBlogDetails;
import com.ibitvalley.writon.classes.roomdataclasses.Post_List_Data;
import com.ibitvalley.writon.classes.view_model.OUD_Viewmodel;
import com.ibitvalley.writon.model.Blog;
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
import java.util.List;

import de.hdodenhof.circleimageview.CircleImageView;

import static android.content.Context.MODE_PRIVATE;

/**
 * Created by  on 30-09-2016.
 */

public class PersonalBlogAdapter extends RecyclerView.Adapter<PersonalBlogAdapter.ImagecategoryViewHolder> {
    private Context curr_context;
    private Activity curr_activity;
    private String uName,bTitle;
    List<Post_List_Data> arrappliedjob;
    SharedPreferences preferences;
    User userData;
    private OUD_Viewmodel oud_Viewmodel;
    private String username;
    private LifecycleOwner lifeCycleOwner;
    private Post_List_Data blog;
    //boolean isAll = false;

    public PersonalBlogAdapter(Activity curr_activity, Context curr_context, List<Post_List_Data> arrappliedjob, LifecycleOwner lifecycleOwner, boolean isAll) {
        this.curr_activity = curr_activity;
        this.curr_context = curr_context;
        this.arrappliedjob = arrappliedjob;
        this.lifeCycleOwner = lifecycleOwner;
        preferences = curr_activity.getSharedPreferences("mPrefs", MODE_PRIVATE);
        userData = WritOnPreference.getInstance(curr_context).getUserDetails();
        oud_Viewmodel = new ViewModelProvider((FragmentActivity) curr_context).get(OUD_Viewmodel.class);
        //this.isAll = isAll;
    }

    @NonNull
    @Override
    public ImagecategoryViewHolder onCreateViewHolder(ViewGroup parent, int viewType) {
        View itemView = LayoutInflater.from(parent.getContext()).inflate(R.layout.blog_card, parent, false);
        return new ImagecategoryViewHolder(itemView);
    }

    @Override
    public void onBindViewHolder(final ImagecategoryViewHolder holder, final int position) {

        final Post_List_Data show = arrappliedjob.get(position);
        uName = show.getUserId();
        bTitle = show.getTitle();

        holder.TVCategory.setText(String.format("%s, %s (%s)", show.getCategory(), show.getSubCat(), show.getLanguage()));
        holder.Username.setText(show.getUserName());
        holder.TVTitle.setText(show.getTitle());

        if(show.getShortDescription() != null) {

            holder.TVShortDesc.setText(Html.fromHtml(String.valueOf(show.getShortDescription())));
        } else {
                holder.TVShortDesc.setText(" ");

        }

        if (show.getIsBookmarked() != null ) {
            if (show.getIsBookmarked()) {
            holder.IVBookmarked.setImageResource(R.drawable.bookmarkyellow);
        } else {
                holder.IVBookmarked.setImageResource(R.drawable.bookmarkblue);
            }
        }


        if(show.getIsFollowed() != null ) {
            if (show.getIsFollowed()) {
            holder.TVFollow.setText("UN FOLLOW");
        } else {
                holder.TVFollow.setText("FOLLOW");
            }
        }

        holder.TVViewCount.setText(String.valueOf(show.getViewCount()));
        holder.TVCommentCount.setText(String.valueOf(show.getCommentsCount()));
        if(show.getRatingCount() != null) {
            holder.TVRating.setText(String.valueOf(show.getRatingCount()));
        }else{
            holder.TVRating.setText("0");
        }
        holder.tv_user_followers_count.setText(String.format("%s FOLLOWERS", show.getUserFollowersCount()));

        if(show.getUserImage() != null) {
            Picasso.get().load(show.getUserImage()).placeholder(R.drawable.generic_male).into(holder.list_image);
        }

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
        LinearLayout LLContent, ll_FArrow;
        TextView TVHeader1, TVFollow;

        public ImagecategoryViewHolder(View view) {
            super(view);


            this.Username = view.findViewById(R.id.name);
            this.TVTitle = view.findViewById(R.id.TVTitle);
            this.TVShortDesc = view.findViewById(R.id.TVShortDesc);
            this.TVCategory = view.findViewById(R.id.TVCategory);
            //this.blogType = (TextView) view.findViewById(R.id.blogType);
            //this.blogType.setTypeface(tf);
            //this.blogType.setText("Latest");
            this.IVBookmarked = view.findViewById(R.id.IVBookmarked);
            this.TVViewCount = view.findViewById(R.id.TVViewCount);
            this.TVbookmarkCount = view.findViewById(R.id.TVbookmarkCount);
            this.TVCommentCount = view.findViewById(R.id.TVCommentCount);
            this.TVRating = view.findViewById(R.id.TVRating);

            this.TVFollow = view.findViewById(R.id.TVFollow);

            this.list_image = view.findViewById(R.id.list_image);

            this.img_Option = view.findViewById(R.id.img_Option);

            this.tv_user_followers_count = view.findViewById(R.id.tv_user_followers_count);
            this.ll_FArrow = view.findViewById(R.id.ll_FArrow);

            /*if(isAll){
                this.ll_FArrow.setVisibility(View.GONE);
            }*/

            LLContent = view.findViewById(R.id.LLContent);
            LLContent.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    //Intent blogprofile = new Intent(curr_context, ShowBlog.class);
                    Intent blogprofile = new Intent(curr_context, ShowBlogDetails.class);
                    Bundle bundle = new Bundle();
                    bundle.putSerializable("BlogObject", arrappliedjob.get(getAdapterPosition()));
                    blogprofile.putExtras(bundle);
                    System.out.println("POSITION is: " + getAdapterPosition());
                    blogprofile.putExtra("boxTitle", "Latest");
                    curr_context.startActivity(blogprofile);
                }
            });

            this.TVFollow.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    //final String followUserID, final String userID
                    Post_List_Data blog = arrappliedjob.get(getAdapterPosition());
                    if(blog.getIsFollowed()) {
                        blog.setIsFollowed(false);
                        TVFollow.setText("FOLLOW");
                        int i = blog.getRatingCount()-1;
                        oud_Viewmodel.updateFollowRoom(blog.getBlogId(), false,i,blog.getUserId(), blog.getUserName(),blog.getTitle());
                        //unFollowUser(blog.getUserId(), userData.getId());
                    } else {
                        blog.setIsFollowed(true);
                        TVFollow.setText("UN FOLLOW");
                        //fcmNotify("follow");
                        username=blog.getUserName();
                        int i = blog.getRatingCount()+1;
                        oud_Viewmodel.updateFollowRoom(blog.getBlogId(), true,i,blog.getUserId(),blog.getUserName(),blog.getTitle());
                        //fcmNotifyAll("follow");
                        //followUser(blog.getUserId(), userData.getId());
                    }
                }
            });

            this.img_Option.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    blog = arrappliedjob.get(getAdapterPosition());
                    final String UserId = preferences.getString("UserId", "0");

                    String shareContent = String.format("\"%s\" by %s \n\n %s \n Read more %s @WritOn %s", blog.getTitle(), blog.getUserId(), Html.fromHtml(blog.getLongDescription()), blog.getCategory(), "https://goo.gl/Cx4oPk");
                    //if (!blog.getUserID().equals(UserId)) {
                    String[] arrString = {"Report", "Share"};
                    showPopupMenu(arrString, shareContent, blog.getBlogId());
                    /*} else {
                        String[] arrString = {"Share"};
                        showPopupMenu(arrString, shareContent);
                    }*/

                }
            });


            list_image.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    Post_List_Data show = arrappliedjob.get(getAdapterPosition());
                    if (!show.getUserId().equals(userData.getId())) {
                        Intent blogprofile = new Intent(curr_context, Blog_Profile.class);
                        blogprofile.putExtra("BlogObject", (Parcelable) arrappliedjob.get(getAdapterPosition()));
                        blogprofile.putExtra("UserID", show.getUserId());
                        curr_context.startActivity(blogprofile);
                    } else {
                        Fragment fragment = new Home_Fragment2();
                        ((Home_Activity) curr_activity).replaceFragment(fragment);
                    }
                }
            });


            this.IVBookmarked.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    blog = arrappliedjob.get(getAdapterPosition());
                    BookMark_List_Data bookMark_list_data=new BookMark_List_Data(blog);
                    if (blog.getIsBookmarked()) {
                        //unbookmarkRequest(userData.getId(), blog.getBlogId());
                        //blog.setIsBookmarked(false);
                        oud_Viewmodel.updateBookmark(bookMark_list_data,false);
                        IVBookmarked.setImageResource(R.drawable.bookmarkblue);
                        //getBMStat();
                    } else {
                        oud_Viewmodel.updateBookmark(bookMark_list_data,true);
                        //fcmNotify("bookmark");
                        //fcmNotifyAll("bookmark");
                        //bookmarkRequest(userData.getId(), blog.getBlogId());
                        //blog.setIsBookmarked(true);
                        IVBookmarked.setImageResource(R.drawable.bookmarkyellow);
                        //getBMStat();
                    }




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
                    int status = jsonResponse.getInt("success");
                    if (status == 1) {
                        String message = jsonResponse.getString("message");
                        Toast.makeText(curr_activity, message, Toast.LENGTH_LONG).show();
                    }else{
                        String message = jsonResponse.getString("message");
                        Toast.makeText(curr_activity, message, Toast.LENGTH_LONG).show();
                    }
                } catch (JSONException e) {
                    e.printStackTrace();
                }
                return null;
            }
            @Override
            public void onError(VolleyError error) {
                Log.d("Latest Blog Adapter: ",error.toString());
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
                    int status = jsonResponse.getInt("success");
                    if (status == 1) {
                        String message = jsonResponse.getString("message");
                        Toast.makeText(curr_activity, message, Toast.LENGTH_LONG).show();
                    }else{
                        String message = jsonResponse.getString("message");
                        Toast.makeText(curr_activity, message, Toast.LENGTH_LONG).show();
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
                    int status = jsonResponse.getInt("success");
                    if (status == 1) {
                        String message = jsonResponse.getString("message");
                        Toast.makeText(curr_activity, message, Toast.LENGTH_LONG).show();
                    } else{
                        String message = jsonResponse.getString("message");
                        Toast.makeText(curr_activity, message, Toast.LENGTH_LONG).show();
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
                    int status = jsonResponse.getInt("success");
                    if (status == 1) {
                        String message = jsonResponse.getString("message");
                        Toast.makeText(curr_activity, message, Toast.LENGTH_LONG).show();
                    } else {
                        String message = jsonResponse.getString("message");
                        Toast.makeText(curr_activity, message, Toast.LENGTH_LONG).show();
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






