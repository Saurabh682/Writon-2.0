package com.ibitvalley.writon.pagination;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.recyclerview.widget.DiffUtil;

import com.ibitvalley.writon.classes.roomdataclasses.Post_List_Data;

public class BlogDiffUtil extends DiffUtil.ItemCallback<Post_List_Data> {

    @Override
    public boolean areItemsTheSame(@NonNull Post_List_Data oldItem , @NonNull Post_List_Data newItem) {
        return oldItem.getBlogId()==newItem.getBlogId();
    }

    @Override
    public boolean areContentsTheSame(@NonNull Post_List_Data oldItem , @NonNull Post_List_Data newItem) {
        return oldItem.getTitle().equalsIgnoreCase(  newItem.getTitle());
    }


    @Nullable
    @Override
    public Object getChangePayload(@NonNull Post_List_Data oldItem , @NonNull Post_List_Data newItem) {
        return super.getChangePayload( oldItem , newItem );
    }
}
