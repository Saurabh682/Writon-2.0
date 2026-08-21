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

import androidx.annotation.NonNull;
import androidx.annotation.RequiresApi;
import androidx.appcompat.app.AlertDialog;
import androidx.recyclerview.widget.RecyclerView;

import com.android.volley.VolleyError;
import com.ibitvalley.writon.Constants;
import com.ibitvalley.writon.Draft;
import com.ibitvalley.writon.R;
import com.ibitvalley.writon.model.Blog;
import com.ibitvalley.writon.model.User;
import com.ibitvalley.writon.utils.VolleySingleton;
import com.ibitvalley.writon.utils.WritOnPreference;
import com.ibitvalley.writon.webapi.WebConstants;
import com.ibitvalley.writon.webapi.util.OnResponseListener;
import com.ibitvalley.writon.webapi.util.SmartPostWebRequest;
import com.ibitvalley.writon.writeblogstepone;
import com.squareup.picasso.Picasso;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Objects;

import static android.content.Context.MODE_PRIVATE;

/**
 * Created by kushwaha on 26-Oct-16.
 */

public class DraftBlogAdapter extends RecyclerView.Adapter<DraftBlogAdapter.ImagecategoryViewHolder> {
    private Context curr_context;
    private Activity curr_activity;
    private ArrayList<Blog> arrappliedjob;
    private SharedPreferences preferences;
    private Typeface tf;
    Draft.onDeleteClick onDeleteClick;
    public DraftBlogAdapter(Activity curr_activity, Context curr_context, ArrayList<Blog> arrappliedjob,Draft.onDeleteClick onDeleteClick) {
        this.curr_activity = curr_activity;
        this.curr_context = curr_context;
        this.arrappliedjob = arrappliedjob;
        this.onDeleteClick=onDeleteClick;
        System.out.println("Array Size In Adapter : " + arrappliedjob.size());
        tf = Typeface.createFromAsset(curr_context.getAssets(),"Lato-Regular.ttf");
    }

    @RequiresApi(api = Build.VERSION_CODES.KITKAT)
    @NonNull
    @Override
    public DraftBlogAdapter.ImagecategoryViewHolder onCreateViewHolder(ViewGroup parent, int viewType) {
        View itemView = LayoutInflater.from(parent.getContext()).inflate(R.layout.draftlistitem, parent, false);
        return new ImagecategoryViewHolder(itemView);
    }



    @RequiresApi(api = Build.VERSION_CODES.KITKAT)
    @Override
    public void onBindViewHolder(final DraftBlogAdapter.ImagecategoryViewHolder holder, final int position) {
        System.out.println("Entering onbind");
        User userData2 = WritOnPreference.getInstance(Objects.requireNonNull(curr_context).getApplicationContext()).getUserDetails();
        final Blog show = arrappliedjob.get(position);
        //holder.category.setText(show.getCategory());
        //holder.TVWrite.setText(String.format("%s (%s)", show.getCreateBy(), show.getCategory()));
        holder.TVBlogTitle.setText(show.getTitle());
        System.out.println(" >>>>>>>>"+show.getUser_image());
        Picasso.get().load(userData2.getImage()).placeholder(R.drawable.generic_male).into(holder.list_image);
        preferences = curr_context.getSharedPreferences(Constants.PREFREFRENCE, MODE_PRIVATE);
        final int ACode = Integer.parseInt(preferences.getString(Constants.KEY_PREF_U_AVATOR_CODE, "0"));
        //holder.list_image.setImageResource(AvtarUtil.getAvtarDrawableByType(ACode));
        //holder.ShortDesc.setText(Html.fromHtml(String.valueOf(show.getShortDescription())));
    }


    @Override
    public int getItemCount() {
        if (arrappliedjob != null) {
            return arrappliedjob.size();
        } else {
            return 0;
        }
    }

    @RequiresApi(api = Build.VERSION_CODES.KITKAT)
    public class ImagecategoryViewHolder extends RecyclerView.ViewHolder {
        //private final ImageLoader mImageLoader;
        TextView TVBlogTitle;
        ImageView list_image, deleteDraft;
        User userData2 = WritOnPreference.getInstance(Objects.requireNonNull(curr_context).getApplicationContext()).getUserDetails();
        public ImagecategoryViewHolder(View view) {
            super(view);
            //this.TVWrite = view.findViewById(R.id.TVWrite);
            //this.TVWrite.setTypeface(tf);
            this.TVBlogTitle = view.findViewById(R.id.TVBlogTitle);
            this.TVBlogTitle.setTypeface(tf);
            list_image = view.findViewById(R.id.list_image);
            this.deleteDraft = view.findViewById(R.id.TV_deleteDraft);
            deleteDraft.setOnClickListener(new View.OnClickListener() {
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
                            onDeleteClick.onDelete( getAdapterPosition() );
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
            view.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    Intent blogprofile = new Intent(curr_context, writeblogstepone.class);
                    blogprofile.putExtra("BlogObject", arrappliedjob.get(getAdapterPosition()));
                    curr_context.startActivity(blogprofile);
                }
            });



        }
    }

    public ArrayList<Blog> getArrappliedjob()
    {
        return  arrappliedjob;
    }

    private void  deleteBlogApi(String BlogID)  {
        HashMap<String, String> hmHomeParam = new HashMap <>();
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

