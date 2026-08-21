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
import com.ibitvalley.writon.ShowBlogDetails;
import com.ibitvalley.writon.model.AvtarUtil;
import com.ibitvalley.writon.model.Blog;
import com.squareup.picasso.Picasso;

import java.util.ArrayList;

import de.hdodenhof.circleimageview.CircleImageView;

/**
 * Created by kushwaha on 26-Oct-16.
 */

public class RecentReadBlogAdapter extends RecyclerView.Adapter<RecentReadBlogAdapter.ImagecategoryViewHolder> {
    private Context curr_context;
    private Activity curr_activity;
    ArrayList<Blog> arrappliedjob;
    Typeface tf;
    public RecentReadBlogAdapter(Activity curr_activity, Context curr_context, ArrayList<Blog> arrappliedjob) {
        this.curr_activity = curr_activity;
        this.curr_context = curr_context;
        this.arrappliedjob = arrappliedjob;
        System.out.println("Array Size In Adapter : " + arrappliedjob.size());
        tf = Typeface.createFromAsset(curr_context.getAssets(),"Lato-Regular.ttf");
    }

    @Override
    public RecentReadBlogAdapter.ImagecategoryViewHolder onCreateViewHolder(ViewGroup parent, int viewType) {
        View itemView = LayoutInflater.from(parent.getContext()).inflate(R.layout.myrcentreadblogitem, parent, false);
        return new ImagecategoryViewHolder(itemView);
    }


    @Override
    public void onBindViewHolder(final RecentReadBlogAdapter.ImagecategoryViewHolder holder, final int position) {
        System.out.println("Entering onbind");

        final Blog show = arrappliedjob.get(position);
        //holder.category.setText(show.getCategory());
        holder.TVWrite.setText(String.format("%s (%s, %s (%s))",show.getUser_name() ,show.getCategory(), show.getSubCat(), show.getLanguage()));
        //holder.TVWrite.setText(String.format("%s (%s)", show.getCreateBy(), show.getCategory()));
        holder.TVTitle.setText(show.getTitle());
        holder.list_image2.setImageResource(AvtarUtil.getAvtarDrawableByType(show.getAvatorCode()));

        holder.TVbookmarkCount.setText(show.getView_count());
        holder.TVCommentCount.setText(show.getComments_count());
        holder.TVRating.setText(show.getVotes_count());

        if(show.getUser_image() != null) {
            Picasso.get().load(show.getUser_image()).placeholder(R.drawable.usermale).into(holder.list_image2);
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
        TextView TVTitle, TVWrite, TVbookmarkCount, TVCommentCount, TVRating;
        CircleImageView list_image2;
        public ImagecategoryViewHolder(View view) {
            super(view);
            this.TVWrite = (TextView) view.findViewById(R.id.TVWrite);
            this.TVWrite.setTypeface(tf);
            this.TVTitle = (TextView) view.findViewById(R.id.TVTitle);
            this.TVTitle.setTypeface(tf);
            this.TVbookmarkCount = (TextView) view.findViewById(R.id.TVbookmarkCount);
            this.TVCommentCount = (TextView) view.findViewById(R.id.TVCommentCount);
            this.TVRating = (TextView) view.findViewById(R.id.TVRating);
            this.list_image2 = (CircleImageView) view.findViewById(R.id.list_image2);
            view.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    Intent blogprofile = new Intent(curr_context, ShowBlogDetails.class);
                    blogprofile.putExtra("BlogObject", arrappliedjob.get(getPosition()));
                    blogprofile.putExtra("boxTitle", "Recent Read");
                    curr_context.startActivity(blogprofile);
                }
            });
        }
    }
}

