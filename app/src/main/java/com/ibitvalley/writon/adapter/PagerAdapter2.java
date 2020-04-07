package com.ibitvalley.writon.adapter;



import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentManager;
import androidx.fragment.app.FragmentPagerAdapter;

import com.ibitvalley.writon.Fragment.FragmentB;

import java.util.ArrayList;

/**
 * Created by Android_PC on 09-08-2016.
 */
public class PagerAdapter2 extends FragmentPagerAdapter {

    ArrayList<String> imagesList;
    public PagerAdapter2(FragmentManager fm, ArrayList<String> images) {
        super(fm);
        this.imagesList=images;
    }

    @Override
    public Fragment getItem(int i) {
        switch(i) {
            //fragment A
            //case 0: return FragmentA.newInstance("");

            default: return FragmentB.newInstance(imagesList.get(i));
        }
    }

    //no of pager wants ..
    @Override
    public int getCount() {
        return imagesList.size();
    }
}