package com.ibitvalley.writon.adapter;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Typeface;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.recyclerview.widget.RecyclerView;

import com.ibitvalley.writon.Constants;
import com.ibitvalley.writon.R;
import com.ibitvalley.writon.model.AvtarUtil;
import com.ibitvalley.writon.model.Blog;
import com.ibitvalley.writon.writeblogstepone;

import java.util.ArrayList;

import static android.content.Context.MODE_PRIVATE;

/**
 * Created by kushwaha on 26-Oct-16.
 */

public class DraftBlogAdapter extends RecyclerView.Adapter<DraftBlogAdapter.ImagecategoryViewHolder> {
    private Context curr_context;
    private Activity curr_activity;
    ArrayList<Blog> arrappliedjob;
    SharedPreferences preferences;
    Typeface tf;
    public DraftBlogAdapter(Activity curr_activity, Context curr_context, ArrayList<Blog> arrappliedjob) {
        this.curr_activity = curr_activity;
        this.curr_context = curr_context;
        this.arrappliedjob = arrappliedjob;
        System.out.println("Array Size In Adapter : " + arrappliedjob.size());
        tf = Typeface.createFromAsset(curr_context.getAssets(),"Lato-Regular.ttf");
    }

    @Override
    public DraftBlogAdapter.ImagecategoryViewHolder onCreateViewHolder(ViewGroup parent, int viewType) {
        View itemView = LayoutInflater.from(parent.getContext()).inflate(R.layout.draftlistitem, parent, false);
        return new ImagecategoryViewHolder(itemView);
    }



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

    public class ImagecategoryViewHolder extends RecyclerView.ViewHolder {
        TextView TVBlogTitle, TVWrite;
        ImageView list_image;
        public ImagecategoryViewHolder(View view) {
            super(view);
            this.TVWrite = (TextView) view.findViewById(R.id.TVWrite);
            this.TVWrite.setTypeface(tf);
            this.TVBlogTitle = (TextView) view.findViewById(R.id.TVBlogTitle);
            this.TVBlogTitle.setTypeface(tf);
            list_image = (ImageView) view.findViewById(R.id.list_image);
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

