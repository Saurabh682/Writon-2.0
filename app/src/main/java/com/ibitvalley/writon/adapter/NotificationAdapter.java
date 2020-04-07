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
import com.ibitvalley.writon.classes.ShowBlogIngo;
import com.ibitvalley.writon.model.AvtarUtil;
import com.ibitvalley.writon.model.NotifyClass;

import java.util.ArrayList;

import de.hdodenhof.circleimageview.CircleImageView;

/**
 * Created by kushwaha on 26-Oct-16.
 */

public class NotificationAdapter extends RecyclerView.Adapter<NotificationAdapter.ImagecategoryViewHolder> {
    private Context curr_context;
    private Activity curr_activity;
    ArrayList<NotifyClass> arrappliedjob;
    Typeface tf;
    public NotificationAdapter(Activity curr_activity, Context curr_context, ArrayList<NotifyClass> arrappliedjob) {
        this.curr_activity = curr_activity;
        this.curr_context = curr_context;
        this.arrappliedjob = arrappliedjob;
        System.out.println("Array Size In Adapter : " + arrappliedjob.size());
        tf = Typeface.createFromAsset(curr_context.getAssets(),"Lato-Regular.ttf");
    }

    @Override
    public NotificationAdapter.ImagecategoryViewHolder onCreateViewHolder(ViewGroup parent, int viewType) {
        View itemView = LayoutInflater.from(parent.getContext()).inflate(R.layout.notificationitem, parent, false);
        return new ImagecategoryViewHolder(itemView);
    }


    @Override
    public void onBindViewHolder(final NotificationAdapter.ImagecategoryViewHolder holder, final int position) {
        System.out.println("Entering onbind");

        final NotifyClass show = arrappliedjob.get(position);
        //holder.category.setText(show.getCategory());
        holder.TVMessage.setText(show.getMessage());
        //holder.TVCreatedDate.setText(show.getCreatedDate());
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
        TextView TVMessage, TVCreatedDate;
        CircleImageView list_image2;
        public ImagecategoryViewHolder(View view) {
            super(view);
            this.TVMessage = (TextView) view.findViewById(R.id.TVMessage);
            this.TVMessage.setTypeface(tf);
            this.TVCreatedDate = (TextView) view.findViewById(R.id.TVCreatedDate);
            this.TVCreatedDate.setTypeface(tf);
            this.list_image2 = (CircleImageView) view.findViewById(R.id.list_image2);
            view.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {

                    // ShowBlogIngo.blogArrayList
                    NotifyClass nClass = arrappliedjob.get(getPosition());
                    //int index =  ShowBlogIngo.blogArrayList.indexOf(nClass.getBlogID());

                    for (int s=0; s< ShowBlogIngo.blogArrayList.size(); s++){

                            if (ShowBlogIngo.blogArrayList.get(s).getBlogId().toString().equals(nClass.getBlogID().toString())) {

                                Intent blogprofile = new Intent(curr_context, ShowBlog.class);
                                blogprofile.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                                blogprofile.putExtra("BlogObject", ShowBlogIngo.blogArrayList.get(s));
                                curr_context.startActivity(blogprofile);
                                break;
                            }

                    }



                }
            });
        }
    }
}

