package com.ibitvalley.writon.Fragment;

import android.os.Build;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.Nullable;
import androidx.annotation.RequiresApi;
import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentTabHost;

import com.ibitvalley.writon.R;

import java.util.Objects;


/**
 * Created by Android_PC on 10-08-2016.
 */
public class Home_Fragment3 extends Fragment {

    private FragmentTabHost mTabHost;
    @RequiresApi(api = Build.VERSION_CODES.KITKAT)
    @Override
    public View onCreateView(LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {

        View rootView = inflater.inflate(R.layout.home_fragment3, container, false);
        mTabHost = rootView.findViewById(android.R.id.tabhost);
        mTabHost.setup(Objects.requireNonNull(getActivity()), getChildFragmentManager(), R.id.realtabcontent);

        mTabHost.addTab(mTabHost.newTabSpec("fragmentb").setIndicator("BookMarks"),
                BookmarkFragment.class, null);
        mTabHost.addTab(mTabHost.newTabSpec("fragmentc").setIndicator("Recent"),RecentFragment.class, null);

        return rootView;
    }
}

