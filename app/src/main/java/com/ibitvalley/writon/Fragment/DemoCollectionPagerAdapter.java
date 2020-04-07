package com.ibitvalley.writon.Fragment;

import android.os.Bundle;

import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentManager;
import androidx.fragment.app.FragmentStatePagerAdapter;

// Since this is an object collection, use a FragmentStatePagerAdapter,
// and NOT a FragmentPagerAdapter.
public class DemoCollectionPagerAdapter extends FragmentStatePagerAdapter {
    private String tabTitles[] = new String[] { "Latest", "Trending", "Most Followed", "Most Rated" };


    public DemoCollectionPagerAdapter(FragmentManager fm) {

        super(fm);
    }

    @Override
    public Fragment getItem(int i) {


        switch (i) {
            case 0:
                return LatestFragment.newInstance();
            case 1:
                return TrendingFrag.newInstance();
            case 2:
                return FollowedFragment.newInstance();
            case 3:
                return RatedFragment.newInstance();
            default:
                return null;
        }


        //Bundle args = new Bundle();
        // Our object is just an integer :-P
        //args.putInt(LatestFragment.ARG_OBJECT, i + 1);
        //fragment.setArguments(args);

    }

    @Override
    public int getCount() {
        return 4;
    }

    @Override
    public CharSequence getPageTitle(int position) {

        return tabTitles[position];
    }
}
