package com.ibitvalley.writon.Fragment;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ImageView;

import androidx.fragment.app.Fragment;

import com.ibitvalley.writon.R;
//import com.squareup.picasso.Picasso;

/**
 * Created by Android_PC on 09-08-2016.
 */
public class FragmentB extends Fragment {


    public View onCreateView(LayoutInflater inflater, ViewGroup container, Bundle savedInstanceState) {
        return inflater.inflate(R.layout.viewpager_fragment2,container,false);
    }

    public static Fragment newInstance(String images ) {

        FragmentB f = new FragmentB();
        Bundle b = new Bundle();
        b.putString("images", images);
        f.setArguments(b);
        return f;

    }

    @Override
    public void onActivityCreated(Bundle savedInstanceState) {
        super.onActivityCreated(savedInstanceState);
        Bundle bundle = this.getArguments();
        String img=bundle.getString("images", null);
        ImageView pager_image=(ImageView)getView().findViewById(R.id.image2);
       // Picasso.with(getActivity()).load(img).into(pager_image);
    }
}
