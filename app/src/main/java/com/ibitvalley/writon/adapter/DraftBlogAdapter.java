package com.ibitvalley.writon.adapter;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Typeface;
import android.os.Build;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.RequiresApi;
import androidx.recyclerview.widget.RecyclerView;

import com.android.volley.toolbox.ImageLoader;
import com.android.volley.toolbox.NetworkImageView;
import com.ibitvalley.writon.Constants;
import com.ibitvalley.writon.R;
import com.ibitvalley.writon.model.AvtarUtil;
import com.ibitvalley.writon.model.Blog;
import com.ibitvalley.writon.model.User;
import com.ibitvalley.writon.utils.WritOnPreference;
import com.ibitvalley.writon.writeblogstepone;

import java.util.ArrayList;
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
    public DraftBlogAdapter(Activity curr_activity, Context curr_context, ArrayList<Blog> arrappliedjob) {
        this.curr_activity = curr_activity;
        this.curr_context = curr_context;
        this.arrappliedjob = arrappliedjob;
        System.out.println("Array Size In Adapter : " + arrappliedjob.size());
        tf = Typeface.createFromAsset(curr_context.getAssets(),"Lato-Regular.ttf");
    }

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

        final Blog show = arrappliedjob.get(position);
        //holder.category.setText(show.getCategory());
        holder.TVWrite.setText(String.format("%s (%s)", show.getCreateBy(), show.getCategory()));
        holder.TVBlogTitle.setText(show.getTitle());
        preferences = curr_context.getSharedPreferences(Constants.PREFREFRENCE, MODE_PRIVATE);
        final int ACode = Integer.parseInt(preferences.getString(Constants.KEY_PREF_U_AVATOR_CODE, "0"));
        holder.list_image.setImageResource(AvtarUtil.getAvtarDrawableByType(ACode));
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
        private final ImageLoader mImageLoader;
        TextView TVBlogTitle, TVWrite;
        NetworkImageView list_image;
        User userData2 = WritOnPreference.getInstance(Objects.requireNonNull(curr_context).getApplicationContext()).getUserDetails();
        public ImagecategoryViewHolder(View view) {
            super(view);
            this.TVWrite = view.findViewById(R.id.TVWrite);
            this.TVWrite.setTypeface(tf);
            this.TVBlogTitle = view.findViewById(R.id.TVBlogTitle);
            this.TVBlogTitle.setTypeface(tf);
            list_image = view.findViewById(R.id.list_image);
            mImageLoader = CustomVolleyRequestQueue.getInstance(curr_context)
                    .getImageLoader();
            mImageLoader.get(userData2.getImage(), ImageLoader.getImageListener(list_image,
                    R.drawable.image_placeholder, android.R.drawable
                            .ic_dialog_alert));
            list_image.setImageUrl(userData2.getImage(),mImageLoader);
            view.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    Intent blogprofile = new Intent(curr_context, writeblogstepone.class);
                    blogprofile.putExtra("BlogObject", arrappliedjob.get(getPosition()));
                    curr_context.startActivity(blogprofile);
                }
            });
        }
    }
}

