package com.ibitvalley.writon.adapter;

import android.app.Activity;
import android.content.Context;
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

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.android.volley.VolleyError;
import com.ibitvalley.writon.R;
import com.ibitvalley.writon.model.Blog;
import com.ibitvalley.writon.model.DefaultResponse;
import com.ibitvalley.writon.model.UserModel;
import com.ibitvalley.writon.model.User;
import com.ibitvalley.writon.retroFit.RetroFitClient;
import com.ibitvalley.writon.retroFit.ServiceGenerator;
import com.ibitvalley.writon.utils.AppUtils;
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
import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

import static android.content.Context.MODE_PRIVATE;

/**
 * Created by  on 30-09-2016.
 */

public class TrendingUsersAdapter extends RecyclerView.Adapter<TrendingUsersAdapter.ImagecategoryViewHolder> {
    private static final String TAG = "TAG";
    private Context curr_context;
    private Activity curr_activity;
    private ArrayList<UserModel> arrappliedjob;
    private SharedPreferences preferences;
    private Typeface tf;
    private User userData;
    private String bTitle;
    private String username;

    public TrendingUsersAdapter(Activity curr_activity, Context curr_context, ArrayList<UserModel> arrappliedjob) {
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

        final UserModel show = arrappliedjob.get(position);
        bTitle = show.getTitle();
        username = show.getUser_name();
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
                    UserModel blog = arrappliedjob.get(getPosition());
                    if(!blog.isIs_followed()) {
                        AppUtils.fcm_noti_single( userData.getId() ,"follow",userData.getUsername(),bTitle);
                        blog.setIs_followed(true);
                        TVFollow.setText("UN FOLLOW");
                        updateFollow(true,userData.getName(),blog.getUserID(),bTitle,userData.getId());
                    } else {
                        blog.setIs_followed(false);
                        TVFollow.setText("FOLLOW");
                        updateFollow(false,userData.getName(),blog.getUserID(),bTitle,userData.getId());
                    }
                }
            });


        }
    }


    private void updateFollow(Boolean Follow, String writerName, String bId, String postTitle, String otherUserID) {
        RetroFitClient PostList = ServiceGenerator.getRetrofit().create(RetroFitClient.class);
        Call<DefaultResponse> call = null;
//        if(Follow) {
            call = PostList.follow(userData.getAccess_token(),bId, String.valueOf(userData.getId()!=null? userData.getId():userData.getuId()));
//        }else{
//            call = PostList.unfollow(userData.getAccess_token(),bId, String.valueOf(userData.getId()!=null? userData.getId():userData.getuId()));
//        }

        call.enqueue(new Callback<DefaultResponse>() {
            @Override
            public void onResponse(@NonNull Call<DefaultResponse> call, @NonNull Response<DefaultResponse> response) {
                assert response.body() != null;
                Log.i(TAG, "onResponse Follow: " + response.body());
                if(Follow) {
                    AppUtils.fcm_noti_single( otherUserID,"bookmark",writerName,postTitle );
                    AppUtils.fcm_noti_single( otherUserID,"bookmark",writerName,postTitle );
                }
            }

            @Override
            public void onFailure(@NonNull Call <DefaultResponse> call, @NonNull Throwable t) {
                String message = t.toString();
                Log.d(TAG,"UnSuccessful Follow>>"+ message);
            }
        });
    }

}

