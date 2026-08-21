package com.ibitvalley.writon.fragment;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentTabHost;

import com.ibitvalley.writon.R;


/**
 * Created by Android_PC on 10-08-2016.
 */
public class NewHomeFragment extends Fragment {

    private FragmentTabHost mTabHost;
    @Override
    public View onCreateView(LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {

        View rootView = inflater.inflate(R.layout.home_fragment3, container, false);
        mTabHost = (FragmentTabHost)rootView.findViewById(android.R.id.tabhost);
        mTabHost.setup(getActivity(), getChildFragmentManager(), R.id.realtabcontent);

        mTabHost.addTab(mTabHost.newTabSpec("fragmentb").setIndicator("Latest"),LatestFragment.class, null);
        mTabHost.addTab(mTabHost.newTabSpec("fragmentc").setIndicator("Trending"),RecentFragment.class, null);
        mTabHost.addTab(mTabHost.newTabSpec("fragmentd").setIndicator("Most Followed"),RecentFragment.class, null);
        mTabHost.addTab(mTabHost.newTabSpec("fragmente").setIndicator("Most Rated"),RecentFragment.class, null);

        return rootView;
    }
}

