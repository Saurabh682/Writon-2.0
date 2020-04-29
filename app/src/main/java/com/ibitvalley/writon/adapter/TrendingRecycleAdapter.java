package com.ibitvalley.writon.adapter;

import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.bumptech.glide.Glide;
import com.ibitvalley.writon.R;
import com.ibitvalley.writon.model.Blog;

import java.util.List;

public class TrendingRecycleAdapter extends RecyclerView.Adapter<TrendingRecycleAdapter.ViewHolder> {
    List<Blog> myDataLists;
    Context context;

    public TrendingRecycleAdapter(List<Blog> myDataLists, Context context) {
        this.myDataLists = myDataLists;
        this.context = context;
    }

    @NonNull
    @Override
    public ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view= LayoutInflater.from(parent.getContext()).inflate(R.layout.blog_card,parent,false);
        return new ViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull ViewHolder holder, int position) {
        Blog myDataList=myDataLists.get(position);
        /*Glide.with(context)
                .load(myDataList.getImageUrl())
                .into(holder.imageView);*/
    }

    @Override
    public int getItemCount() {
        return myDataLists.size();
    }

    public static class ViewHolder extends RecyclerView.ViewHolder{
        private ImageView imageView;
        public ViewHolder(@NonNull View itemView) {
            super(itemView);
            imageView=(ImageView)itemView.findViewById(R.id.image_view);
        }
    }
}