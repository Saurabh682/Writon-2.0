package com.ibitvalley.writon.Fragment;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.TextView;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.viewpager.widget.ViewPager;

import com.google.android.material.tabs.TabLayout;
import com.ibitvalley.writon.BlogSearch;
import com.ibitvalley.writon.Home_Activity;
import com.ibitvalley.writon.R;

public class CollectionDemoFragment extends Fragment {
    // When requested, this adapter returns a DemoObjectFragment,
    // representing an object in the collection.
    DemoCollectionPagerAdapter demoCollectionPagerAdapter;
    ViewPager viewPager;
    ImageView ivSearch, ivSearch1;
    Context thiscontext;
    private View rootView;



    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater,
                             @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        rootView = inflater.inflate(R.layout.viewpagerhome, container, false);
        ivSearch = (ImageView) rootView.findViewById(R.id.ivSearch);
        ivSearch1 = (ImageView) rootView.findViewById(R.id.ivSearch1);
        assert container != null;
        thiscontext = container.getContext();
        return rootView;


    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        demoCollectionPagerAdapter = new DemoCollectionPagerAdapter(getChildFragmentManager());
        viewPager = view.findViewById(R.id.pager);
        viewPager.setAdapter(demoCollectionPagerAdapter);

        TabLayout tabLayout = view.findViewById(R.id.tab_layout);
        tabLayout.setupWithViewPager(viewPager);

        int limit = (demoCollectionPagerAdapter.getCount() > 1 ? demoCollectionPagerAdapter.getCount() - 1 : 1);
        viewPager.setOffscreenPageLimit(limit);

        ivSearch.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                //Toast.makeText(getActivity(), "Coming soon", Toast.LENGTH_LONG).show();
                Intent intentSearch = new Intent(thiscontext, BlogSearch.class);
                startActivity(intentSearch);
            }
        });
        ivSearch1.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Intent homeActivity = new Intent(thiscontext, Home_Activity.class);
                homeActivity.putExtra("pageActionValue", 2);
                startActivity(homeActivity);

            }
        });

    }



}

