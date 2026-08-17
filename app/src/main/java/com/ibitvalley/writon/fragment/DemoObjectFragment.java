package com.ibitvalley.writon.fragment;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;

import com.ibitvalley.writon.R;

// Instances of this class are fragments representing a single
// object in our collection.
public class DemoObjectFragment extends Fragment {
    public static final String ARG_OBJECT = "object";

    @Override
    public View onCreateView(LayoutInflater inflater,
                             ViewGroup container, Bundle savedInstanceState) {
        LatestFragment.newInstance();
        return inflater.inflate(R.layout.latest_frag, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        Bundle args = getArguments();
        assert args != null;
        switch (args.getInt("object")) {
            case 0:
                 LatestFragment.newInstance();
            case 1:
                 TrendingFrag.newInstance();
            case 2:
                 FollowedFragment.newInstance();
            case 3:
                 RatedFragment.newInstance();
            default:
        }

    }
}
