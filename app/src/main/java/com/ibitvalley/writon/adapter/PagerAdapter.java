package com.ibitvalley.writon.adapter;



import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentManager;
import androidx.fragment.app.FragmentPagerAdapter;

import com.ibitvalley.writon.Fragment.FragmentA;

import java.util.ArrayList;

/**
 * Created by Android_PC on 18-07-2016.
 */
public class PagerAdapter extends FragmentPagerAdapter {

    public static ArrayList<String> imagesList;
    public PagerAdapter(FragmentManager fm, ArrayList<String> images) {
        super(fm);
        this.imagesList=images;
    }

    @Override
    public Fragment getItem(int i) {
        switch(i) {
            //fragment A
            //case 0: return FragmentA.newInstance("");

            default: return FragmentA.newInstance(imagesList.get(i));
        }
    }

    //no of pager wants ..
    @Override
    public int getCount() {
        return imagesList.size();
    }
}