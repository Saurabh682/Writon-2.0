package com.ibitvalley.writon.adapter;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.ibitvalley.writon.R;
import com.ibitvalley.writon.ShowBlog;
import com.ibitvalley.writon.model.AvtarUtil;
import com.ibitvalley.writon.model.Blog;

import java.util.ArrayList;

/**
 * Created by kushwaha on 26-Oct-16.
 */

public class BlogSearchAdapter extends RecyclerView.Adapter<BlogSearchAdapter.ImagecategoryViewHolder> {
    private Context curr_context;
    private Activity curr_activity;
    ArrayList<Blog> arrappliedjob;

    public BlogSearchAdapter(Activity curr_activity, Context curr_context, ArrayList<Blog> arrappliedjob) {
        this.curr_activity = curr_activity;
        this.curr_context = curr_context;
        this.arrappliedjob = arrappliedjob;
        System.out.println("Array Size In Adapter : " + arrappliedjob.size());
    }

    @NonNull
    @Override
    public BlogSearchAdapter.ImagecategoryViewHolder onCreateViewHolder(ViewGroup parent, int viewType) {
        View itemView = LayoutInflater.from(parent.getContext()).inflate(R.layout.searchblogitem, parent, false);
        return new ImagecategoryViewHolder(itemView);
    }


    @Override
    public void onBindViewHolder(final BlogSearchAdapter.ImagecategoryViewHolder holder, final int position) {

        //System.out.println("Entering onbind");
        final Blog show = arrappliedjob.get(position);
        //holder.category.setText(show.getCategory());
        //holder.category.setText(String.format("%s, %s (%s)", show.getCategory(), show.getSubCat(), show.getLanguage()));
        holder.TVWrite.setText(String.format("%s (%s)", show.getCreateBy(), show.getCategory()));
        holder.TVTitle.setText(show.getTitle());
        holder.list_image2.setImageResource(AvtarUtil.getAvtarDrawableByType(show.getAvatorCode()));
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
        TextView TVTitle, TVWrite, category;
        ImageView list_image2;
        public ImagecategoryViewHolder(View view) {
            super(view);
            this.TVWrite = (TextView) view.findViewById(R.id.TVWrite);
            this.TVTitle = (TextView) view.findViewById(R.id.TVTitle);
            this.list_image2 = (ImageView) view.findViewById(R.id.list_image2);
            //this.category = (TextView) view.findViewById(R.id.category);
            view.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    Intent blogprofile = new Intent(curr_context, ShowBlog.class);
                    blogprofile.putExtra("BlogObject", arrappliedjob.get(getPosition()));
                    curr_activity.startActivity(blogprofile);
                }
            });
        }
    }
}

