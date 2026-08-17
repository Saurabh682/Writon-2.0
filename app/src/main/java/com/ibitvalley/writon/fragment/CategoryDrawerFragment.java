package com.ibitvalley.writon.fragment;

import android.app.ProgressDialog;
import android.content.Context;
import android.graphics.Typeface;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.InflateException;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.ExpandableListView;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.annotation.RequiresApi;
import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentManager;
import androidx.fragment.app.FragmentTransaction;

import com.android.volley.DefaultRetryPolicy;
import com.android.volley.Request;
import com.android.volley.RequestQueue;
import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.StringRequest;
import com.android.volley.toolbox.Volley;
import com.google.android.material.floatingactionbutton.FloatingActionButton;
import com.ibitvalley.writon.googleAnalytics.MyApplication;
import com.ibitvalley.writon.R;
import com.ibitvalley.writon.adapter.ExpandableListAdapter;
import com.ibitvalley.writon.model.BlogComment;
import com.ibitvalley.writon.model.User;
import com.ibitvalley.writon.utils.AppUtils;
import com.ibitvalley.writon.utils.Const;

import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Objects;

/**
 * Created by Android_PC on 10-08-2016.
 */
public class CategoryDrawerFragment extends Fragment implements View.OnClickListener {
    private View rootView;
    private ExpandableListView expListView;
    ExpandableListAdapter listAdapter;
    List<String> listDataHeader;
    HashMap<String, ArrayList<String>> listDataChild;
    TextView TVfeedback;
    ImageView ivSearch, ivSearch1, IVSync;

    FrameLayout fabFrame;
    private boolean fabExpanded = false;
    private FloatingActionButton fabSettings;
    private LinearLayout layoutFabSave;
    private LinearLayout layoutFabEdit;
    private LinearLayout layoutFabPhoto;
    private LinearLayout layoutMyBlog;

    private ArrayList<BlogComment> arrappliedjob;
    private Typeface tf;
    private User userData;

    


    private Context thiscontext;

    @RequiresApi(api = Build.VERSION_CODES.KITKAT)
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        rootView = inflater.inflate(R.layout.home_fragment5, container, false);
        thiscontext = container.getContext();
        ivSearch = rootView.findViewById(R.id.ivSearch);

        if (rootView != null) {
            ViewGroup parent = (ViewGroup) rootView.getParent();
            if (parent != null)
                parent.removeView(rootView);
        }

         try {
            rootView = inflater.inflate(R.layout.home_fragment5, container, false);
            //ivSearch = rootView.findViewById(R.id.ivSearch);
            //TVfeedback = rootView.findViewById(R.id.TVfeedback);
            /*TVfeedback.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    Intent intentFeedBack = new Intent(getContext(), Feedback.class);
                    startActivity(intentFeedBack);


                }
            });*/
        } catch (InflateException e) {
        }
        tf = Typeface.createFromAsset(Objects.requireNonNull(getActivity()).getAssets(),"Lato-Regular.ttf");

        /*ivSearch.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                //Toast.makeText(getActivity(), "Coming soon", Toast.LENGTH_LONG).show();
                Intent intentSearch = new Intent(thiscontext, BlogSearch.class);
                startActivity(intentSearch);
            }
        });*/
        initilize();
        MyApplication.getInstance().trackEvent("Category", "See Category", "Categories");
        MyApplication.getInstance().trackScreenView("Category Screen");
        return rootView;

    }

    private void initilize() {
        expListView = rootView.findViewById(R.id.lvExp);
        prepareListData();
        listAdapter = new ExpandableListAdapter(getActivity(), listDataHeader, listDataChild);
        expListView.setAdapter(listAdapter);
        expListView.setOnChildClickListener(new ExpandableListView.OnChildClickListener() {
            @RequiresApi(api = Build.VERSION_CODES.KITKAT)
            @Override
            public boolean onChildClick(ExpandableListView parent, View v, int groupPosition, int childPosition, long id) {
                // Intent in = new Intent(getActivity(), "");
                // startActivity(in);
                if (childPosition == 1) {
                  /*  Intent next = new Intent(getActivity(), "");
                    startActivity(next);*/
                }
                //categoryRequest(listDataChild.get(listDataHeader.get(groupPosition)).get(childPosition));

                Fragment  fragment2 = new CategoryListBlogFragment();
                Bundle args = new Bundle();
                args.putString("cName", Objects.requireNonNull(listDataChild.get(listDataHeader.get(groupPosition))).get(childPosition));
                fragment2.setArguments(args);
                FragmentManager fragmentManager = getFragmentManager();
                assert fragmentManager != null;
                FragmentTransaction fragmentTransaction = fragmentManager.beginTransaction();
                fragmentTransaction.replace(R.id.fragment_container, fragment2);
                fragmentTransaction.addToBackStack(null);
                fragmentTransaction.commit();
                // Intent intent = new Intent(getActivity(), ActivityCategoryBlogs.class);
                //intent.putExtra("Category", listDataChild.get(listDataHeader.get(groupPosition)).get(childPosition));
                //startActivity(intent);
                return false;
            }
        });
    }

    private void prepareListData() {

        listDataChild = AppUtils.getCategoriesMap();
        listDataHeader = AppUtils.getCategoryList( listDataChild );
    }

    @Override
    public void onClick(View v) {
    }


    private void categoryRequest(final String Category) {
        RequestQueue requestQueue;
        final ProgressDialog dialog = new ProgressDialog(getContext());
        dialog.setMessage("Please wait...");
        dialog.show();
        String url = String.format("%s%s?Category=%s", Const.BASE_URL, "/GetBlogsByCategory", Category);
        requestQueue = Volley.newRequestQueue(getContext());
        StringRequest jor = new StringRequest(Request.Method.GET, url, new Response.Listener<String>() {
            @Override
            public void onResponse(String response) {
                dialog.dismiss();
                Log.d("True", "");
                try {
                    JSONObject jsonObject = new JSONObject(response);
                    if (jsonObject.get("success").toString() == "true") {
                        Toast.makeText(getContext(), "" + jsonObject.get("message"), Toast.LENGTH_LONG).show();
                    } else {
                        Toast.makeText(getContext(), "" + jsonObject.get("message"), Toast.LENGTH_LONG).show();
                    }
                } catch (JSONException ex) {
                    //progress.dismiss();
                    Log.d("JSON Exception", ex.getMessage());
                }
            }
        },
                new Response.ErrorListener() {
                    @Override
                    public void onErrorResponse(VolleyError error) {
                        dialog.dismiss();
                        Log.e("Volley", "Error");
                    }
                }
        );
        jor.setRetryPolicy(new DefaultRetryPolicy(20000, 0, 0.0f));
        requestQueue.add(jor);
    }




    //closes FAB submenus
    private void closeSubMenusFab(){
        layoutFabSave.setVisibility(View.INVISIBLE);
        layoutFabEdit.setVisibility(View.INVISIBLE);
        layoutFabPhoto.setVisibility(View.INVISIBLE);
        layoutMyBlog.setVisibility(View.INVISIBLE);
        //fabSettings.setImageResource(R.drawable.ic_autorenew_black_24dp);
        fabExpanded = false;

    }

    //Opens FAB submenus
    private void openSubMenusFab(){
        layoutFabSave.setVisibility(View.VISIBLE);
        layoutFabEdit.setVisibility(View.VISIBLE);
        layoutFabPhoto.setVisibility(View.INVISIBLE);
        layoutMyBlog.setVisibility(View.INVISIBLE);
        //Change settings icon to 'X' icon
        //fabSettings.setImageResource(R.drawable.ic_check_black_24dp);
        fabExpanded = true;

    }




}

