package com.ibitvalley.writon.fragment;


import android.content.Intent;
import android.os.Bundle;
import android.view.ContextMenu;
import android.view.LayoutInflater;
import android.view.MenuItem;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;
import android.widget.RelativeLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.fragment.app.Fragment;

import com.ibitvalley.writon.Blog_Profile;
import com.ibitvalley.writon.R;
//import com.squareup.picasso.Picasso;

/**
 * A simple {@link Fragment} subclass.
 */
public class FragmentA extends Fragment {

    int i = 0;
    ImageView drawer;

    public View onCreateView(LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        return inflater.inflate(R.layout.viewpager_fragment1, container, false);

    }

    public static Fragment newInstance(String images) {

        FragmentA f = new FragmentA();
        Bundle b = new Bundle();
        b.putString("images", images);
        f.setArguments(b);
        return f;

    }
    RelativeLayout RLParent;
    @Override
    public void onActivityCreated(Bundle savedInstanceState) {
        super.onActivityCreated(savedInstanceState);
        Bundle bundle = this.getArguments();
        String img = bundle.getString("images", null);
        TextView name = (TextView) getView().findViewById(R.id.name);
        ImageView pager_image = (ImageView) getView().findViewById(R.id.image);
        ImageView right_arrow = (ImageView) getView().findViewById(R.id.right_arrow);

        drawer = (ImageView) getView().findViewById(R.id.drawer);
        registerForContextMenu(getView().findViewById(R.id.drawer));
        drawer.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {

                getActivity().openContextMenu(v);
            }
        });

        //Picasso.with(getActivity()).load(img).into(pager_image);

        name.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Intent blogprofile = new Intent(getActivity(), Blog_Profile.class);
                startActivity(blogprofile);
            }
        });
        pager_image.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Intent blogprofile = new Intent(getActivity(), Blog_Profile.class);
                startActivity(blogprofile);
            }
        });
        /*right_arrow.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {

                if (i < PagerAdapter.imagesList.size()) {
                    i = i + 1;
                   // Home_Fragment.viewPager.setCurrentItem(i);
                }

                //  Toast.makeText(getActivity(),"clicked",Toast.LENGTH_SHORT).show();

            }
        });*/

        // Show Blog
        RLParent = (RelativeLayout) getView().findViewById(R.id.RLParent);
        RLParent.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
               // Intent blogprofile = new Intent(getActivity(), ShowBlog.class);
                //startActivity(blogprofile);
            }
        });
    }

    @Override
    public void onCreateContextMenu(ContextMenu menu, View v, ContextMenu.ContextMenuInfo menuInfo) {
        super.onCreateContextMenu(menu, v, menuInfo);
        menu.setHeaderTitle("Select The Action");
        menu.add(0, v.getId(), 0, "Report as Inappropriate");
        menu.add(0, v.getId(), 0, "Block");

    }

    @Override
    public boolean onContextItemSelected(MenuItem item) {

        if (item.getTitle() == "Report as Inappropriate") {
            Toast.makeText(getActivity(), "Reported Successfully", Toast.LENGTH_SHORT).show();
        } else if (item.getTitle() == "Block") {
            Toast.makeText(getActivity(), "Block successfully", Toast.LENGTH_SHORT).show();
        } else {
            return false;
        }
        return super.onContextItemSelected(item);
    }


}
