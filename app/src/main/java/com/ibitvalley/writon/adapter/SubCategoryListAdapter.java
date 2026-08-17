package com.ibitvalley.writon.adapter;

import android.content.Context;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.constraintlayout.widget.ConstraintLayout;
import androidx.recyclerview.widget.RecyclerView;

import com.ibitvalley.writon.Home_Activity;
import com.ibitvalley.writon.R;

import java.util.ArrayList;

import butterknife.BindView;
import butterknife.ButterKnife;

public class SubCategoryListAdapter extends RecyclerView.Adapter<SubCategoryListAdapter.SubCategoryListViewHolder>{

    ArrayList<String> subCategoryList;
    Home_Activity.SubCategoryClickListner subCategoryClickListner;
    public SubCategoryListAdapter(ArrayList<String> subCategoryList,Home_Activity.SubCategoryClickListner subCategoryClickListner)
    {
        this.subCategoryList=subCategoryList;
        this.subCategoryClickListner=subCategoryClickListner;
    }

    @NonNull
    @Override
    public SubCategoryListViewHolder onCreateViewHolder(@NonNull ViewGroup parent , int viewType) {
        View itemView = LayoutInflater.from(parent.getContext()).inflate( R.layout.sub_category_list_item, parent, false);
        return new SubCategoryListAdapter.SubCategoryListViewHolder(itemView);

    }

    @Override
    public void onBindViewHolder(@NonNull SubCategoryListViewHolder holder , int position) {
        holder.txt_sub_category.setText( subCategoryList.get( position ) );
        holder.contrainer.setOnClickListener( new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                subCategoryClickListner.onClick( position );
            }
        } );
    }

    @Override
    public int getItemCount() {
        return subCategoryList.size();
    }

    class SubCategoryListViewHolder extends RecyclerView.ViewHolder
    {

        @BindView( R.id.txt_sub_category )
        TextView txt_sub_category;

        @BindView( R.id.container )
        ConstraintLayout contrainer;
        public SubCategoryListViewHolder(@NonNull View itemView) {
            super( itemView );
            ButterKnife.bind( this,itemView );
        }
    }
}
