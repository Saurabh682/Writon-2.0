package com.ibitvalley.writon.adapter;

import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.recyclerview.widget.RecyclerView;

import com.ibitvalley.writon.fragment.PagerM;
import com.ibitvalley.writon.R;

import java.util.List;

public class PagerAdapter extends RecyclerView.Adapter {
    private List<PagerM> pagerMList;

    class PagerViewHolder extends RecyclerView.ViewHolder {
        private TextView txtDescription;

        public PagerViewHolder(@NonNull View itemView) {
            super(itemView);
            txtDescription = itemView.findViewById(R.id.text1);
        }
    }

    public PagerAdapter(List<PagerM> pagerMList) {
        this.pagerMList = pagerMList;
    }

    @NonNull
    @Override
    public RecyclerView.ViewHolder onCreateViewHolder(@NonNull ViewGroup parent, int viewType) {
        View view = LayoutInflater.from(parent.getContext()).inflate(R.layout.fragment_collection_object, parent, false);
        return new PagerViewHolder(view);
    }

    @Override
    public void onBindViewHolder(@NonNull RecyclerView.ViewHolder holder, int position) {
        PagerViewHolder viewHolder = (PagerViewHolder) holder;
        PagerM pagerM = pagerMList.get(position);
        viewHolder.txtDescription.setText(pagerM.getPagerDescription());
    }

    @Override
    public int getItemCount() {
        return pagerMList.size();
    }
}
