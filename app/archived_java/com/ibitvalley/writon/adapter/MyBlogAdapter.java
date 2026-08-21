package com.ibitvalley.writon.adapter;

import android.app.Activity;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Typeface;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.RequiresApi;
import androidx.appcompat.app.AlertDialog;
import androidx.fragment.app.FragmentActivity;
import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.RecyclerView;

import com.android.volley.VolleyError;
import com.ibitvalley.writon.ActionType;
import com.ibitvalley.writon.AddNewDeleteEvent;
import com.ibitvalley.writon.AddNewEvent;
import com.ibitvalley.writon.Constants;
import com.ibitvalley.writon.R;
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

import org.greenrobot.eventbus.EventBus;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Objects;

import de.hdodenhof.circleimageview.CircleImageView;

import static android.content.Context.MODE_PRIVATE;

/**
 * Created by kushwaha on 26-Oct-16.
 */

public class MyBlogAdapter extends RecyclerView.Adapter<MyBlogAdapter.ImagecategoryViewHolder> {
    private static final String TAG = "MyBlogAdapter";
    private Context curr_context;
    private Activity curr_activity;
    private List<Post_List_Data> arrappliedjob;
    private SharedPreferences preferences;
    private Post_List_Data show;
    //SharedPreferences preferences;
    Typeface tf;
    String Title= "";
    private String currUserId, blogUserID;
    private User userData2;
    private OUD_Viewmodel oud_Viewmodel;

    public MyBlogAdapter(Activity curr_activity, Context curr_context, List<Post_List_Data> arrappliedjob, String title) {
        this.curr_activity = curr_activity;
        this.curr_context = curr_context;
        this.arrappliedjob = arrappliedjob;
        System.out.println("Array Size In Adapter : " + arrappliedjob.size());
        tf = Typeface.createFromAsset(curr_context.getAssets(),"Lato-Regular.ttf");
        this.Title = title;
        oud_Viewmodel = new ViewModelProvider( (FragmentActivity) curr_context ).get(OUD_Viewmodel.class);

    }

    @Override
    public MyBlogAdapter.ImagecategoryViewHolder onCreateViewHolder(ViewGroup parent, int viewType) {

        View itemView = LayoutInflater.from(parent.getContext()).inflate(R.layout.myblogitem, parent, false);

        /*ImageView iV = (ImageView) curr_activity.findViewById(R.id.IMOption);
        iV.setVisibility(View.GONE);*/
        return new ImagecategoryViewHolder(itemView);
    }


    @RequiresApi(api = Build.VERSION_CODES.KITKAT)
    @Override
    public void onBindViewHolder(final MyBlogAdapter.ImagecategoryViewHolder holder, final int position) {
        System.out.println("Entering onbind");

        show = arrappliedjob.get(position);
        preferences = Objects.requireNonNull(curr_context).getSharedPreferences(Constants.PREFREFRENCE, MODE_PRIVATE);

        final  String  UserId = preferences.getString(Constants.KEY_PREF_USERID, "0");

        //final String UserName = preferences.getString(Constants.KEY_PREF_DISPLAY_NAME, "0");


        holder.TVWrite.setText(String.format("%s, %s (%s)", show.getCategory(), show.getSubCat(), show.getLanguage()));
        holder.TVTitle.setText(show.getTitle());
        holder.TVViewCount.setText(""+show.getViewCount());
        holder.TVCommentCount.setText(""+show.getCommentsCount());
        holder.TVRating.setText(""+show.getRatingCount());
        blogUserID = show.getUserId();

        if(show.getUserImage() != null){
            Picasso.get().load(show.getUserImage()).placeholder(R.drawable.usermale).into(holder.list_image2);
        }

        if(this.Title.equals("Bookmarked")){
            holder.IMOption.setVisibility(View.GONE);
        }
        /*SharedPreferences sharedPref = Current().getPreferences(Context.MODE_PRIVATE);
        String highScore = sharedPref.getString("PenName", defaultValue);*/
        userData2 = WritOnPreference.getInstance(curr_context.getApplicationContext()).getUserDetails();
        currUserId = userData2.getId();
       if(show.getUserId().equals(userData2.getId())) {
            holder.IMOption.setVisibility(View.VISIBLE);
        }else{
           holder.IMOption.setVisibility(View.INVISIBLE);
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

    public class ImagecategoryViewHolder extends RecyclerView.ViewHolder {

        TextView TVTitle, TVWrite, duration, TVViewCount, TVCommentCount, TVRating;
        ImageView  IMOption, img_Delete;
        CircleImageView list_image2;

        public ImagecategoryViewHolder(View view) {
            super(view);

            this.TVWrite = view.findViewById(R.id.TVWrite);
            this.TVWrite.setTypeface(tf);
            this.TVTitle = view.findViewById(R.id.TVTitle);
            this.TVTitle.setTypeface(tf);
            this.TVViewCount = view.findViewById(R.id.TVViewCount);
            this.TVCommentCount = view.findViewById(R.id.TVCommentCount);
            this.TVRating = view.findViewById(R.id.TVRating);
            this.list_image2 = view.findViewById(R.id.list_image2);
            this.IMOption = view.findViewById(R.id.IMOption);
            //if() {IMOption.setVisibility(View.VISIBLE);}
            /*if(blogUserID.equals(currUserId)) {
                IMOption.setVisibility(View.VISIBLE);
            }*/

            this.duration = (TextView) view.findViewById(R.id.duration);
            //this.img_Delete = (ImageView) view.findViewById(R.id.img_Delete);



            view.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    Intent blogprofile = new Intent(curr_context, ShowBlogDetails.class);
                    Bundle bundle = new Bundle();
                    bundle.putSerializable("BlogObject", arrappliedjob.get(getAdapterPosition()));
                    blogprofile.putExtras(bundle);
                    blogprofile.putExtra("boxTitle", Title);
                    curr_context.startActivity(blogprofile);

                }
            });

            this.IMOption.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    AlertDialog.Builder builder = new AlertDialog.Builder(curr_context);
                    builder.setTitle("Delete");
                    builder.setMessage("Do you want to delete this creation ?.");
                    builder.setPositiveButton("Confirm", new DialogInterface.OnClickListener() {
                        @Override
                        public void onClick(DialogInterface dialog, int which) {
                            Post_List_Data blog =  arrappliedjob.get(getAdapterPosition());
                            deleteBlogApi(blog.getBlogId());
                            arrappliedjob.remove(getAdapterPosition());
                            notifyItemRemoved(getAdapterPosition());
                            notifyItemRangeChanged(getAdapterPosition(), arrappliedjob.size());
                        }
                    });
                    builder.setNegativeButton("Cancel", new DialogInterface.OnClickListener() {
                        @Override
                        public void onClick(DialogInterface dialog, int which) {
                            dialog.dismiss();
                            //WriteB
                            // log.super.onBackPressed();
                        }
                    });
                    AlertDialog dialog = builder.create();
                    dialog.show();
                    Log.d("CDA", "onBackPressed Called");
                }
            });

        }
    }


    private void  deleteBlogApi(String BlogID)  {
        HashMap <String, String> hmHomeParam = new HashMap <>();
        hmHomeParam.put("BlogId", BlogID);
        SmartPostWebRequest mainCategory = new SmartPostWebRequest(WebConstants.delete_post_url, curr_activity, false, hmHomeParam, new OnResponseListener() {
            @Override
            public ArrayList<Blog> onSuccess(Object result) {
                try {
                    JSONObject jsonResponse = new JSONObject(result.toString());
                    int status = jsonResponse.getInt("success");
                    if (status == 1) {
                        String message = jsonResponse.getString("message");
                        Toast.makeText(curr_activity, message, Toast.LENGTH_LONG).show();
                        oud_Viewmodel.deleteByBlogId(Long.valueOf( BlogID ));
                        EventBus.getDefault().post(new AddNewDeleteEvent(  BlogID ));
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
}

