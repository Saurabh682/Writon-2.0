package com.ibitvalley.writon.adapter;

import android.app.Activity;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Typeface;
import android.os.Build;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.RequiresApi;
import androidx.appcompat.app.AlertDialog;
import androidx.recyclerview.widget.RecyclerView;

import com.android.volley.VolleyError;
import com.ibitvalley.writon.Constants;
import com.ibitvalley.writon.R;
import com.ibitvalley.writon.ShowBlogDetails;
import com.ibitvalley.writon.model.Blog;
import com.ibitvalley.writon.utils.VolleySingleton;
import com.ibitvalley.writon.webapi.WebConstants;
import com.ibitvalley.writon.webapi.util.OnResponseListener;
import com.ibitvalley.writon.webapi.util.SmartPostWebRequest;
import com.squareup.picasso.Picasso;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Objects;

import de.hdodenhof.circleimageview.CircleImageView;

import static android.content.Context.MODE_PRIVATE;

/**
 * Created by kushwaha on 26-Oct-16.
 */

public class MyBlogAdapter extends RecyclerView.Adapter<MyBlogAdapter.ImagecategoryViewHolder> {
    private Context curr_context;
    private Activity curr_activity;
    private ArrayList<Blog> arrappliedjob;
    private SharedPreferences preferences;
    //SharedPreferences preferences;
    Typeface tf;
    String Title= "";
    public MyBlogAdapter(Activity curr_activity, Context curr_context, ArrayList<Blog> arrappliedjob, String title) {
        this.curr_activity = curr_activity;
        this.curr_context = curr_context;
        this.arrappliedjob = arrappliedjob;
        System.out.println("Array Size In Adapter : " + arrappliedjob.size());
        tf = Typeface.createFromAsset(curr_context.getAssets(),"Lato-Regular.ttf");
        this.Title = title;
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

        final Blog show = arrappliedjob.get(position);
        preferences = Objects.requireNonNull(curr_context).getSharedPreferences(Constants.PREFREFRENCE, MODE_PRIVATE);

        final String UserId = preferences.getString(Constants.KEY_PREF_USERID, "0");
        //final String UserName = preferences.getString(Constants.KEY_PREF_DISPLAY_NAME, "0");


        holder.TVWrite.setText(String.format("%s, %s (%s)", show.getCategory(), show.getSubCat(), show.getLanguage()));
        holder.TVTitle.setText(show.getTitle());
        holder.TVViewCount.setText(show.getView_count());
        holder.TVCommentCount.setText(show.getComments_count());
        holder.TVRating.setText(show.getVotes_count());

        if(show.getUser_image() != null){
            Picasso.get().load(show.getUser_image()).placeholder(R.drawable.usermale).into(holder.list_image2);
        }

        if(this.Title == "Bookmarked"){
            holder.IMOption.setVisibility(View.GONE);
        }
        /*SharedPreferences sharedPref = Current().getPreferences(Context.MODE_PRIVATE);
        String highScore = sharedPref.getString("PenName", defaultValue);*/

       if(show.getUser_id() == UserId) {
            holder.IMOption.setVisibility(View.VISIBLE);
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

            this.TVWrite = (TextView) view.findViewById(R.id.TVWrite);
            this.TVWrite.setTypeface(tf);
            this.TVTitle = (TextView) view.findViewById(R.id.TVTitle);
            this.TVTitle.setTypeface(tf);
            this.TVViewCount = (TextView) view.findViewById(R.id.TVViewCount);
            this.TVCommentCount = (TextView) view.findViewById(R.id.TVCommentCount);
            this.TVRating = (TextView) view.findViewById(R.id.TVRating);
            this.list_image2 = (CircleImageView) view.findViewById(R.id.list_image2);
            this.IMOption = (ImageView) view.findViewById(R.id.IMOption);
            this.duration = (TextView) view.findViewById(R.id.duration);
            //this.img_Delete = (ImageView) view.findViewById(R.id.img_Delete);

            view.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    Intent blogprofile = new Intent(curr_context, ShowBlogDetails.class);
                    blogprofile.putExtra("BlogObject", arrappliedjob.get(getAdapterPosition()));
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
                            Blog blog =  arrappliedjob.get(getAdapterPosition());
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

