package com.ibitvalley.writon.adapter;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.graphics.Typeface;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.recyclerview.widget.RecyclerView;

import com.ibitvalley.writon.R;
import com.ibitvalley.writon.ShowBlog;
import com.ibitvalley.writon.model.Blog;

import java.util.ArrayList;

/**
 * Created by kushwaha on 26-Oct-16.
 */

public class BookmarkBlogAdapter extends RecyclerView.Adapter<BookmarkBlogAdapter.ImagecategoryViewHolder> {
    private Context curr_context;
    private Activity curr_activity;
    ArrayList<Blog> arrappliedjob;
    Typeface tf;
    public BookmarkBlogAdapter(Activity curr_activity, Context curr_context, ArrayList<Blog> arrappliedjob) {
        this.curr_activity = curr_activity;
        this.curr_context = curr_context;
        this.arrappliedjob = arrappliedjob;
        System.out.println("Array Size In Adapter : " + arrappliedjob.size());
        tf = Typeface.createFromAsset(curr_context.getAssets(),"Lato-Regular.ttf");
    }

    @Override
    public BookmarkBlogAdapter.ImagecategoryViewHolder onCreateViewHolder(ViewGroup parent, int viewType) {
        View itemView = LayoutInflater.from(parent.getContext()).inflate(R.layout.bookmarkitem, parent, false);
        return new ImagecategoryViewHolder(itemView);
    }


    @Override
    public void onBindViewHolder(final BookmarkBlogAdapter.ImagecategoryViewHolder holder, final int position) {
        System.out.println("Entering onbind");

        final Blog show = arrappliedjob.get(position);
        //holder.category.setText(show.getCategory());
        holder.TVWrite.setText(String.format("%s (%s)", show.getCreateBy(), show.getCategory()));
        holder.TVTitle.setText(show.getTitle());
        //holder.duration.setText(show.getMarkDate());
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
        TextView TVTitle, TVWrite, duration;

        public ImagecategoryViewHolder(View view) {
            super(view);
            this.TVWrite = (TextView) view.findViewById(R.id.TVWrite);
            this.TVTitle = (TextView) view.findViewById(R.id.TVTitle);
            this.duration = (TextView) view.findViewById(R.id.duration);
            view.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    Intent blogprofile = new Intent(curr_context, ShowBlog.class);
                    blogprofile.putExtra("BlogObject", arrappliedjob.get(getPosition()));
                    blogprofile.putExtra("boxTitle", "Bookmarks");
                    curr_context.startActivity(blogprofile);
                }
            });
        }
    }
}

