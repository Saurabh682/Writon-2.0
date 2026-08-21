package com.ibitvalley.writon.adapter;

import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.cardview.widget.CardView;
import androidx.recyclerview.widget.RecyclerView;

import com.ibitvalley.writon.R;
import com.ibitvalley.writon.fragment.CollectionDemoFragment;

import java.util.ArrayList;
import java.util.HashMap;

import butterknife.BindView;
import butterknife.ButterKnife;

public class CategoryListAdapter extends RecyclerView.Adapter<CategoryListAdapter.CategoryListViewHolder> {


    ArrayList<String> categoryList;
    Context context;
    CollectionDemoFragment.CategoryListListener listListener;
    public CategoryListAdapter(Context context, ArrayList<String> categoryList, CollectionDemoFragment.CategoryListListener listListener)
    {
        this.categoryList=categoryList;
        this.context=context;
        this.listListener=listListener;
    }


    @NonNull
    @Override
    public CategoryListViewHolder onCreateViewHolder(@NonNull ViewGroup parent , int viewType) {
        View itemView = LayoutInflater.from(parent.getContext()).inflate( R.layout.category_list_item, parent, false);
        return new CategoryListAdapter.CategoryListViewHolder(context,itemView);
    }

    @Override
    public void onBindViewHolder(@NonNull CategoryListViewHolder holder , int position) {

        holder.txt_category.setText( categoryList.get( position ) );
        holder.linear_layout_root.setOnClickListener( new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                listListener.onClick( position );
            }
        } );
    }

    @Override
    public int getItemCount() {
        return categoryList.size();
    }

    class CategoryListViewHolder  extends RecyclerView.ViewHolder
    {
        @BindView( R.id.txt_category )
        TextView txt_category;

        @BindView( R.id.linear_layout_root )
        CardView linear_layout_root;
        public CategoryListViewHolder(Context context,@NonNull View itemView) {
            super( itemView );
            ButterKnife.bind( this,itemView );

        }

        @Override
        public String toString() {
            return super.toString();
        }
    }
}
