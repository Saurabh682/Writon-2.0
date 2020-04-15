package com.ibitvalley.writon.adapter;

import android.app.Activity;
import android.content.Context;
import android.graphics.Typeface;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.recyclerview.widget.RecyclerView;

import com.ibitvalley.writon.R;
//import com.ibitvalley.writon.model.BlogComment;
import com.ibitvalley.writon.model.BlogCommentPersonal;

import java.util.ArrayList;


/**
 * Created by Sahil Bharti on 30-09-2016.
 */

public class BlogCommentsAdapter extends RecyclerView.Adapter<BlogCommentsAdapter.ImagecategoryViewHolder> {
    private Context curr_context;
    private Activity curr_activity;
    ArrayList<BlogCommentPersonal> arrappliedjob;
    Typeface tf;

    public BlogCommentsAdapter(Activity curr_activity, Context curr_context, ArrayList<BlogCommentPersonal> arrappliedjob) {
        this.curr_activity = curr_activity;
        this.curr_context = curr_context;
        this.arrappliedjob = arrappliedjob;
        System.out.println("Array Size In Adapter : " + arrappliedjob.size());
        tf = Typeface.createFromAsset(curr_context.getAssets(),"Lato-Regular.ttf");
    }

    @Override
    public ImagecategoryViewHolder onCreateViewHolder(ViewGroup parent, int viewType) {
        View itemView = LayoutInflater.from(parent.getContext()).inflate(R.layout.row_list_blog_comments, parent, false);
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
        //System.out.println("Entering onbind");
        //final BlogComment show = arrappliedjob.get(position);
        final BlogCommentPersonal show = arrappliedjob.get(position);
        holder.TVComment.setText("\" " + show.getComment() + " \"");
        holder.TVUsername.setText(show.getTitle());
        System.out.println("Need This: "+show.getComment());
        holder.TVTime.setText("" + show.getCreationDate());
    }




    public class ImagecategoryViewHolder extends RecyclerView.ViewHolder {
        TextView TVUsername, TVComment, TVTime, TVUpvote, TVReport, TVReply;

        public ImagecategoryViewHolder(View view) {
            super(view);
            this.TVUsername = view.findViewById(R.id.TVUsername);
            this.TVComment = view.findViewById(R.id.TVComment);
            this.TVTime = view.findViewById(R.id.TVTime);
            this.TVUpvote = view.findViewById(R.id.TVUpvote);
            this.TVReport = view.findViewById(R.id.TVReport);
            this.TVReply = view.findViewById(R.id.TVReply);
        }
    }
}

