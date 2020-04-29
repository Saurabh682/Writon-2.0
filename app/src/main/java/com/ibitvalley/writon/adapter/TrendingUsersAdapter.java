package com.ibitvalley.writon.adapter;

import android.app.Activity;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Typeface;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.recyclerview.widget.RecyclerView;

import com.android.volley.Request;
import com.android.volley.RequestQueue;
import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.StringRequest;
import com.android.volley.toolbox.Volley;
import com.ibitvalley.writon.R;
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

public class TrendingUsersAdapter extends RecyclerView.Adapter<TrendingUsersAdapter.ImagecategoryViewHolder> {
    private Context curr_context;
    private Activity curr_activity;
    private ArrayList<TrendingPost_Model> arrappliedjob;
    private SharedPreferences preferences;
    private Typeface tf;
    private User userData;
    private String bTitle;

    public TrendingUsersAdapter(Activity curr_activity, Context curr_context, ArrayList<TrendingPost_Model> arrappliedjob) {
        this.curr_activity = curr_activity;
        this.curr_context = curr_context;
        this.arrappliedjob = arrappliedjob;
        preferences = curr_activity.getSharedPreferences("mPrefs", MODE_PRIVATE);
        System.out.println("Array Size In Adapter : " + arrappliedjob.size());
        tf = Typeface.createFromAsset(curr_context.getAssets(),"Lato-Regular.ttf");

        userData = WritOnPreference.getInstance(curr_context).getUserDetails();
    }

    @Override
    public ImagecategoryViewHolder onCreateViewHolder(ViewGroup parent, int viewType) {
        View itemView = LayoutInflater.from(parent.getContext()).inflate(R.layout.trendinguser_card, parent, false);
        return new ImagecategoryViewHolder(itemView);
    }

    @Override
    public void onBindViewHolder(final ImagecategoryViewHolder holder, final int position) {

        final TrendingPost_Model show = arrappliedjob.get(position);
        bTitle = show.getTitle();
        holder.Username.setText(show.getUsername());
        holder.tv_user_followers_count.setText(String.format("%s Followers", show.getFollowers_count()));

        if(show.isIs_followed()){
            holder.TVFollow.setText("UnFollow");
        }else {
            holder.TVFollow.setText("Follow");
        }

        Picasso.get().load(show.getProfile_image_url()).placeholder(R.drawable.usermale).into(holder.list_imageone);


    }


    @Override
    public int getItemCount() {
        if (arrappliedjob != null) {
            return arrappliedjob.size();
        } else {
            return 0;
        }
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
        Button TVFollow;

        public ImagecategoryViewHolder(View view) {
            super(view);

            this.Username = (TextView) view.findViewById(R.id.name);
            this.Username.setTypeface(tf);

            this.tv_user_followers_count = (TextView) view.findViewById(R.id.tv_user_followers_count);

            this.list_imageone = (CircleImageView) view.findViewById(R.id.list_imageone);
            this.TVFollow = (Button) view.findViewById(R.id.TVFollow);

            this.TVFollow.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    //final String followUserID, final String userID
                    TrendingPost_Model blog = arrappliedjob.get(getPosition());
                    if(!blog.isIs_followed()) {
                        fcmNotify("follow");
                        blog.setIs_followed(true);
                        TVFollow.setText("UN FOLLOW");
                        followUser(blog.getUserID(), userData.getId());
                    } else {
                        blog.setIs_followed(false);
                        TVFollow.setText("FOLLOW");
                        unFollowUser(blog.getUserID(), userData.getId());
                    }
                }
            });


        }
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


    private void fcmNotify(String who) {
        User userData2 = WritOnPreference.getInstance(curr_context.getApplicationContext()).getUserDetails();
        String urlExt = "";
        // Instantiate the RequestQueue.
        switch (who) {
            case "bookmark":
                urlExt = userData.getId()+"&sp=your post is getting popular&tp="+bTitle+" has been bookmarked by "+userData2.getUsername();
                break;
            case "follow":
                urlExt = userData.getId()+"&sp=you are getting noticed&tp="+userData2.getUsername()+" has started following you. Keep up your writing";
                break;

            //default:
            //console.log('Sorry, we are out of ' + expr + '.');
        }


        RequestQueue queue = Volley.newRequestQueue(curr_context);
        String url ="https://www.writon.co/Mine/fcm_noti_single.php?id="+urlExt ;
        System.out.println("Bookmark Notify: "+url);
        // Request a string response from the provided URL.
        StringRequest stringRequest = new StringRequest(Request.Method.GET, url,
                new Response.Listener<String>() {
                    @Override
                    public void onResponse(String response) {
                        // Display the first 500 characters of the response string.
                        System.out.println("Response is: "+ response);
                    }
                }, new Response.ErrorListener() {
            @Override
            public void onErrorResponse(VolleyError error) {
                System.out.println("That didn't work!");
            }
        });

        // Add the request to the RequestQueue.
        queue.add(stringRequest);

    }



}

