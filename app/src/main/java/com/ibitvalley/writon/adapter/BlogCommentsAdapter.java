package com.ibitvalley.writon.adapter;

import android.app.Activity;
import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.recyclerview.widget.RecyclerView;

import com.ibitvalley.writon.R;
import com.ibitvalley.writon.model.BlogComment;

import java.util.ArrayList;


/**
 * Created by Sahil Bharti on 30-09-2016.
 */

public class BlogCommentsAdapter extends RecyclerView.Adapter<BlogCommentsAdapter.ImagecategoryViewHolder> {
    private Context curr_context;
    private Activity curr_activity;
    ArrayList<BlogComment> arrappliedjob;

    public BlogCommentsAdapter(Activity curr_activity, Context curr_context, ArrayList<BlogComment> arrappliedjob) {
        this.curr_activity = curr_activity;
        this.curr_context = curr_context;
        this.arrappliedjob = arrappliedjob;
        System.out.println("Array Size In Adapter : " + arrappliedjob.size());
    }

    @Override
    public ImagecategoryViewHolder onCreateViewHolder(ViewGroup parent, int viewType) {
        View itemView = LayoutInflater.from(parent.getContext()).inflate(R.layout.row_list_blog_comments, parent, false);
        return new ImagecategoryViewHolder(itemView);
    }

    @Override
    public void onBindViewHolder(final ImagecategoryViewHolder holder, final int position) {
        System.out.println("Entering onbind");
        final BlogComment show = arrappliedjob.get(position);
        holder.TVComment.setText("\" " + show.getComment() + " \"");
        holder.TVUsername.setText(show.getUserName());
        holder.TVTime.setText("" + show.getDateTime());
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
        TextView TVUsername, TVComment, TVTime, TVUpvote, TVReport, TVReply;

        public ImagecategoryViewHolder(View view) {
            super(view);
            this.TVUsername = (TextView) view.findViewById(R.id.TVUsername);
            this.TVComment = (TextView) view.findViewById(R.id.TVComment);
            this.TVTime = (TextView) view.findViewById(R.id.TVTime);
            this.TVUpvote = (TextView) view.findViewById(R.id.TVUpvote);
            this.TVReport = (TextView) view.findViewById(R.id.TVReport);
            this.TVReply = (TextView) view.findViewById(R.id.TVReply);
        }
    }
}

