package com.ibitvalley.writon.adapter;

import android.app.Activity;
import android.content.Context;
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

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.android.volley.Request;
import com.android.volley.RequestQueue;
import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.StringRequest;
import com.android.volley.toolbox.Volley;
import com.ibitvalley.writon.R;
import com.ibitvalley.writon.model.Blog;
import com.ibitvalley.writon.model.User;
import com.ibitvalley.writon.model.followData;
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

public class FollowersAdapter extends RecyclerView.Adapter<FollowersAdapter.ImagecategoryViewHolder> {

    private Context curr_context;
    private Activity curr_activity;
    private List<followData> arrappliedjob;
    private SharedPreferences preferences;
    private Typeface tf;
    private User userData;
    private String notifyUser, bTitle;
    private String username;


    public FollowersAdapter(Activity curr_activity, Context curr_context, List<followData> arrappliedjob) {

        this.curr_activity = curr_activity;
        this.curr_context = curr_context;
        this.arrappliedjob = arrappliedjob;
        //preferences = curr_activity.getSharedPreferences("mPrefs", MODE_PRIVATE);
        tf = Typeface.createFromAsset(curr_context.getAssets(),"Lato-Regular.ttf");

        userData = WritOnPreference.getInstance(curr_context).getUserDetails();
    }

    @NonNull
    @Override
    public FollowersAdapter.ImagecategoryViewHolder onCreateViewHolder(ViewGroup parent, int viewType) {
        View itemView = LayoutInflater.from(parent.getContext()).inflate(R.layout.followerlist_style, parent, false);
        return new FollowersAdapter.ImagecategoryViewHolder(itemView);
    }



    @Override
    public void onBindViewHolder(final FollowersAdapter.ImagecategoryViewHolder holder, final int position) {

        final followData show = arrappliedjob.get(position);

        holder.Username.setText(show.getUserName());
        holder.tv_user_followers_count.setText("Followers : "+show.getUserFollowersCount());
        username = show.getUserName();
        if(show.getIsFollowed()){
            holder.TVFollow.setText("UnFollow");
        }else {
            holder.TVFollow.setText("Follow");
        }

        Picasso.get().load(show.getUserImage()).placeholder(R.drawable.generic_male).into(holder.list_imageone);


    }


    @Override
    public int getItemCount() {
        if (arrappliedjob != null) {
            return arrappliedjob.size();
        } else {
            return 0;
        }
    }



    public class ImagecategoryViewHolder extends RecyclerView.ViewHolder {
        TextView Username, tv_user_followers_count;
        CircleImageView IVProgileImage;
        ImageView list_image, list_imageone;
        LinearLayout LLContent;
        TextView TVHeader1;
        Button TVFollow;

        public ImagecategoryViewHolder(View view) {
            super(view);

            this.Username = view.findViewById(R.id.name);
            this.Username.setTypeface(tf);

            this.tv_user_followers_count = view.findViewById(R.id.tv_user_followers_count);

            this.list_imageone = view.findViewById(R.id.list_imageone);
            this.TVFollow = view.findViewById(R.id.TVFollow);
            TVFollow.setTypeface(tf);
            TVFollow.setTextSize(12f);

            this.TVFollow.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    //final String followUserID, final String userID
                    followData blog = arrappliedjob.get(getAdapterPosition());

                    if(!blog.getIsFollowed()) {

                        blog.setIsFollowed(true);
                        TVFollow.setText("UN FOLLOW");
                        followUser(blog.getUserID(), userData.getId());
                        notifyUser = blog.getUserID();
                        System.out.println("What is going on : >>>>"+blog.toString());
                        fcmNotify("follow");
                        fcmNotifyAll("follow");
                    } else {
                        blog.setIsFollowed(false);
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


    private void fcmNotify(String who) {
        User userData2 = WritOnPreference.getInstance(curr_context.getApplicationContext()).getUserDetails();
        String urlExt = "";
        // Instantiate the RequestQueue.
        switch (who) {
            case "bookmark":
                urlExt = notifyUser+"&sp=your post is getting popular&tp="+bTitle+" has been bookmarked by "+userData2.getUsername();
                break;
            case "follow":
                urlExt = notifyUser+"&sp=you are getting noticed&tp="+userData2.getUsername()+" has started following you. Keep up your writing";
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


    private void fcmNotifyAll(String who) {
        User userData2 = WritOnPreference.getInstance(curr_context.getApplicationContext()).getUserDetails();
        String urlExt = "";
        // Instantiate the RequestQueue.
        switch (who) {
            case "bookmark":
                urlExt = userData2.getId()+"&sp="+userData2.getUsername()+" has bookmarked a post. &tp="+bTitle+" has been bookmarked by "+userData2.getUsername();
                break;
            case "follow":
                urlExt = userData2.getId()+"&sp="+userData2.getUsername()+" has started following a new user. &tp="+userData2.getUsername()+" has started following "+username;
                break;
            case "rate":
                urlExt = userData2.getId()+"&sp="+userData2.getUsername()+" has rated a post. &tp="+bTitle+" has been rated by "+userData2.getUsername();
                break;

            //default:
            //console.log('Sorry, we are out of ' + expr + '.');
        }


        RequestQueue queue = Volley.newRequestQueue(curr_context);
        String url ="https://www.writon.co/Mine/fcm_noti_multiuser.php?id="+urlExt;
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
