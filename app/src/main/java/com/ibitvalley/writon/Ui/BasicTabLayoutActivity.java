package com.ibitvalley.writon.Ui;

import android.os.Bundle;

import androidx.appcompat.app.AppCompatActivity;
import androidx.viewpager.widget.ViewPager;

import com.google.android.material.tabs.TabLayout;
import com.ibitvalley.writon.Fragment.Tab1Fragment;
import com.ibitvalley.writon.Fragment.Tab2Fragment;
import com.ibitvalley.writon.R;
import com.ibitvalley.writon.adapter.TabAdapter;

public class BasicTabLayoutActivity extends AppCompatActivity {

    private TabAdapter adapter;
    private TabLayout tabLayout;
    private ViewPager viewPager;
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_basic_tab_layout);
        viewPager = findViewById(R.id.viewPager);

        tabLayout = findViewById(R.id.tabLayout);

        adapter = new TabAdapter(getSupportFragmentManager());

        adapter.addFragment(new Tab1Fragment(), "Followed By");
        adapter.addFragment(new Tab2Fragment(), "Following");
        viewPager.setAdapter(adapter);
        tabLayout.setupWithViewPager(viewPager);
        setTitle("Followed By");
        tabLayout.addOnTabSelectedListener(new TabLayout.OnTabSelectedListener(){
            @Override
            public void onTabSelected(TabLayout.Tab tab){
                int position = tab.getPosition();
                setTitle(adapter.getPageTitle(position));
            }

            @Override
            public void onTabUnselected(TabLayout.Tab tab) {

            }

            @Override
            public void onTabReselected(TabLayout.Tab tab) {

            }
        });
    }
}
