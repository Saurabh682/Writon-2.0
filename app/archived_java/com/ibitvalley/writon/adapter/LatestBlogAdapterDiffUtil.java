package com.ibitvalley.writon.adapter;

import androidx.recyclerview.widget.DiffUtil;

import com.ibitvalley.writon.classes.roomdataclasses.Post_List_Data;

import java.util.ArrayList;
import java.util.List;

public class LatestBlogAdapterDiffUtil extends DiffUtil.Callback {

    List<Post_List_Data> oldList;
    List<Post_List_Data> newList;


    public LatestBlogAdapterDiffUtil(List<Post_List_Data> oldList , List<Post_List_Data> newList) {
        this.oldList = oldList;
        this.newList = newList;
    }

    @Override
    public int getOldListSize() {
        return oldList.size();
    }

    @Override
    public int getNewListSize() {
        return newList.size();
    }

    @Override
    public boolean areItemsTheSame(int oldItemPosition , int newItemPosition) {
        return oldList.get( oldItemPosition ).getBlogId().equals(
                newList.get( newItemPosition ).getBlogId() );
    }

    @Override
    public boolean areContentsTheSame(int oldItemPosition , int newItemPosition) {
        return oldList.get( oldItemPosition ).getTitle().equals(
                newList.get( newItemPosition ).getTitle() );
    }
}
