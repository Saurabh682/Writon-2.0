package com.ibitvalley.writon.adapter;

import android.app.Activity;
import android.content.Context;
import android.content.DialogInterface;
import android.graphics.Typeface;
import android.util.Log;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AlertDialog;
import androidx.recyclerview.widget.RecyclerView;

import com.android.volley.VolleyError;
import com.ibitvalley.writon.R;
import com.ibitvalley.writon.model.BlogComment;
import com.ibitvalley.writon.model.BlogCommentPersonal;
import com.ibitvalley.writon.model.User;
import com.ibitvalley.writon.utils.VolleySingleton;
import com.ibitvalley.writon.utils.WritOnPreference;
import com.ibitvalley.writon.webapi.WebConstants;
import com.ibitvalley.writon.webapi.util.OnResponseListener;
import com.ibitvalley.writon.webapi.util.SmartPostWebRequest;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashMap;

public class DiscussListPersonalAdapter extends RecyclerView.Adapter<DiscussListPersonalAdapter.ImagecategoryViewHolder> {
    private Context curr_context;
    private Activity curr_activity;
    private ArrayList<BlogCommentPersonal> arrappliedjob;
    private Typeface tf;
    private User userData;
    public DiscussListPersonalAdapter(Activity curr_activity, Context curr_context, ArrayList<BlogCommentPersonal> arrappliedjob) {
        this.curr_activity = curr_activity;
        this.curr_context = curr_context;
        this.arrappliedjob = arrappliedjob;
        System.out.println("Array Size In Adapter : " + arrappliedjob.size());
        tf = Typeface.createFromAsset(curr_context.getAssets(),"Lato-Regular.ttf");
    }

    @NonNull
    @Override
    public ImagecategoryViewHolder onCreateViewHolder(ViewGroup parent, int viewType) {
        View itemView = LayoutInflater.from(parent.getContext()).inflate(R.layout.discusitemitem, parent, false);
        userData = WritOnPreference.getInstance(curr_context).getUserDetails();
        return new ImagecategoryViewHolder(itemView);

    }



    @Override
    public int getItemCount() {
        if (arrappliedjob != null) {
            return arrappliedjob.size();
        } else {
            return 0;
        }
    }

    @Override
    public void onBindViewHolder(final ImagecategoryViewHolder holder, final int position) {
        System.out.println("Entering onbind 2");

        final BlogCommentPersonal show = arrappliedjob.get(position);

        /*System.out.println("CommentUsername"+show.getUserName());
        System.out.println("CommentUsername"+show.getName());
        System.out.println("CommentUsername"+show.getComment());
        System.out.println("LoginUsername"+userData.getUsername());*/
        holder.TVComment.setText(show.getComment());
        holder.TVUsername.setText(show.getTitle());
        holder.TVTime.setText(show.getCreationDate());
        System.out.println("Username: "+ show.getUserId()+"/n"+show.getTitle());
        if(userData.getId().equals(show.getUserId())){
            holder.IMOption.setVisibility(View.VISIBLE);
        }
    }



    public class ImagecategoryViewHolder extends RecyclerView.ViewHolder {
        TextView TVComment, TVTime, TVUsername;
        ImageView IMOption;

        public ImagecategoryViewHolder(View view) {
            super(view);
            this.TVUsername = (TextView) view.findViewById(R.id.TVUsername);
            this.TVComment = (TextView) view.findViewById(R.id.TVComment);
            this.TVComment.setTypeface(tf);
            this.TVTime = (TextView) view.findViewById(R.id.TVTime);
            this.TVTime.setTypeface(tf);
            this.IMOption = (ImageView) view.findViewById(R.id.IMOptionD);
            this.TVUsername = (TextView) view.findViewById(R.id.TVUsername);
            this.TVUsername.setTypeface(tf);


            this.IMOption.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    AlertDialog.Builder builder = new AlertDialog.Builder(curr_context);
                    builder.setTitle("Delete Comment");
                    builder.setMessage("Do you want to delete this Comment ?.");
                    builder.setPositiveButton("Delete Now", new DialogInterface.OnClickListener() {
                        @Override
                        public void onClick(DialogInterface dialog, int which) {
                            BlogCommentPersonal blog =  arrappliedjob.get(getAdapterPosition());
                            deleteCommentApi(blog.getUserId());
                            arrappliedjob.remove(getAdapterPosition());
                            notifyItemRemoved(getAdapterPosition());
                            notifyItemRangeChanged(getAdapterPosition(), arrappliedjob.size());
                        }
                    });
                    builder.setNegativeButton("Later", new DialogInterface.OnClickListener() {
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


            //this.TVUpvote = (TextView) view.findViewById(R.id.TVUpvote);
            //this.TVReport = (TextView) view.findViewById(R.id.TVReport);
            //this.TVReply = (TextView) view.findViewById(R.id.TVReply);
        }
    }



    private void  deleteCommentApi(String CommentId)  {
        HashMap<String, String> hmHomeParam = new HashMap <>();
        hmHomeParam.put("CommentId", CommentId);
        SmartPostWebRequest mainCategory = new SmartPostWebRequest(WebConstants.delete_comment_url, curr_activity, false, hmHomeParam, new OnResponseListener() {
            @Override
            public void onSuccess(Object result) {
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
            }
            @Override
            public void onError(VolleyError error) {
                Log.d("","");
            }
        });
        VolleySingleton.getInstance().addToRequestQueue(mainCategory);
    }


}
