package com.ibitvalley.writon.adapter;

import android.app.Activity;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.graphics.Typeface;
import android.os.Bundle;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.appcompat.app.AlertDialog;
import androidx.fragment.app.FragmentActivity;
import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.RecyclerView;

import com.android.volley.VolleyError;
import com.ibitvalley.writon.AddNewDeleteEvent;
import com.ibitvalley.writon.R;
import com.ibitvalley.writon.ShowBlogDetails;
import com.ibitvalley.writon.classes.roomdataclasses.PersonalPost_List_Data;
import com.ibitvalley.writon.classes.view_model.OUD_Viewmodel;
import com.ibitvalley.writon.model.Blog;
import com.ibitvalley.writon.utils.AppUtils;
import com.ibitvalley.writon.utils.VolleySingleton;
import com.ibitvalley.writon.webapi.WebConstants;
import com.ibitvalley.writon.webapi.util.OnResponseListener;
import com.ibitvalley.writon.webapi.util.SmartPostWebRequest;

import org.greenrobot.eventbus.EventBus;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;

import de.hdodenhof.circleimageview.CircleImageView;

/**
 * Created by kushwaha on 26-Oct-16.
 */

public class MyBlogAdapter_two extends RecyclerView.Adapter<MyBlogAdapter_two.ImagecategoryViewHolder> {
    private Context curr_context;
    private Activity curr_activity;
    List<PersonalPost_List_Data> arrappliedjob;
    private OUD_Viewmodel oud_Viewmodel;
    //SharedPreferences preferences;
    Typeface tf;
    String Title= "";
    public MyBlogAdapter_two(Activity curr_activity, Context curr_context, List<PersonalPost_List_Data> personalPostListData, String title) {
        this.curr_activity = curr_activity;
        this.curr_context = curr_context;
        this.arrappliedjob = personalPostListData;
        System.out.println("Array Size In Adapter : " + arrappliedjob.size());
        tf = Typeface.createFromAsset(curr_context.getAssets(),"Lato-Regular.ttf");
        oud_Viewmodel = new ViewModelProvider( (FragmentActivity) curr_context ).get(OUD_Viewmodel.class);

        this.Title = title;
    }

    @Override
    public MyBlogAdapter_two.ImagecategoryViewHolder onCreateViewHolder(ViewGroup parent, int viewType) {
        View itemView = LayoutInflater.from(parent.getContext()).inflate(R.layout.myblogitem, parent, false);
        return new ImagecategoryViewHolder(itemView);
    }


    @Override
    public void onBindViewHolder(final MyBlogAdapter_two.ImagecategoryViewHolder holder, final int position) {
        System.out.println("Entering onbind");

        final PersonalPost_List_Data show = arrappliedjob.get(position);


        holder.TVWrite.setText(String.format("%s, %s (%s)", show.getCategory(), show.getSubCat(), show.getLanguage()));
        holder.TVTitle.setText(show.getTitle());

        if ( !AppUtils.isNull( show.getViewCount() ) )
            holder.TVViewCount.setText(String.valueOf(show.getViewCount()));
        else
            holder.TVViewCount.setText(""+0);

        if ( !AppUtils.isNull( show.getCommentsCount() ) )
            holder.TVCommentCount.setText(String.valueOf(show.getCommentsCount()));
        else
            holder.TVCommentCount.setText(""+0);

        if ( !AppUtils.isNull( show.getRatingCount() ) )
            holder.TVRating.setText(String.valueOf(show.getRatingCount()));
        else
            holder.TVRating.setText(""+0);

        /*if(show.Us() != null){
            Picasso.get().load(show.getUser_image()).placeholder(R.drawable.usermale).into(holder.list_image2);
        }*/

        if(this.Title == "Bookmarked"){
            holder.IMOption.setVisibility(View.GONE);
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
                    //blogprofile.putExtra("BlogObject", arrappliedjob.get(getAdapterPosition()));
                    Bundle bundle = new Bundle();
                    bundle.putSerializable("BlogObject", arrappliedjob.get(getAdapterPosition()));
                    bundle.putString("BlogType", "cuuBlog");

                    blogprofile.putExtras(bundle);
                    //blogprofile.putExtra("boxTitle", Title);

                    blogprofile.putExtra("boxTitle", "PersonalPostList");
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
                            PersonalPost_List_Data blog =  arrappliedjob.get(getAdapterPosition());
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

