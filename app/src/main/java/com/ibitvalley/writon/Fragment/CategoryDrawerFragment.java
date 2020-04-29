package com.ibitvalley.writon.Fragment;

import android.app.Activity;
import android.app.ProgressDialog;
import android.content.Context;
import android.content.Intent;
import android.graphics.Typeface;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
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
import com.ibitvalley.writon.AllBlogActivity;
import com.ibitvalley.writon.BlogSearch;
import com.ibitvalley.writon.Draft;
import com.ibitvalley.writon.Feedback;
import com.ibitvalley.writon.MyBlog;
import com.ibitvalley.writon.R;
import com.ibitvalley.writon.adapter.ExpandableListAdapter;
import com.ibitvalley.writon.discus;
import com.ibitvalley.writon.model.BlogComment;
import com.ibitvalley.writon.model.User;
import com.ibitvalley.writon.utils.Const;
import com.ibitvalley.writon.writeblogstepone;

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
    HashMap<String, List<String>> listDataChild;
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
        rootView = inflater.inflate(R.layout.viewpagerhome, container, false);
        assert container != null;
        thiscontext = container.getContext();
        ivSearch = rootView.findViewById(R.id.ivSearch);

        if (rootView != null) {
            ViewGroup parent = (ViewGroup) rootView.getParent();
            if (parent != null)
                parent.removeView(rootView);
        }

        /*try {
            //rootView = inflater.inflate(R.layout.viewpagerhome, container, false);
            ivSearch = rootView.findViewById(R.id.ivSearch);
            *//*TVfeedback = rootView.findViewById(R.id.TVfeedback);
            TVfeedback.setOnClickListener(new View.OnClickListener() {
                @Override
                public void onClick(View v) {
                    Intent intentFeedBack = new Intent(getContext(), Feedback.class);
                    startActivity(intentFeedBack);


                }
            });*//*
        } catch (InflateException e) {
        }*/
        tf = Typeface.createFromAsset(Objects.requireNonNull(getActivity()).getAssets(),"Lato-Regular.ttf");

        ivSearch.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                //Toast.makeText(getActivity(), "Coming soon", Toast.LENGTH_LONG).show();
                Intent intentSearch = new Intent(thiscontext, BlogSearch.class);
                startActivity(intentSearch);
            }
        });
        //initilize();
        isNetworkAvailable();
        return rootView;

    }

    private void initilize() {
        expListView = (ExpandableListView) rootView.findViewById(R.id.lvExp);
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

                Fragment  fragment2 = new categoryListBlog();
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
        listDataHeader = new ArrayList<String>();
        listDataChild = new HashMap<String, List<String>>();

        // Adding child data
        listDataHeader.add("Short Stories");
        //listDataHeader.add("Novels");
        listDataHeader.add("Poetry");
        listDataHeader.add("Shayari");
        listDataHeader.add("Songs/ Jingles");
        listDataHeader.add("Jokes");
        listDataHeader.add("Reviews");
        listDataHeader.add("Blog");
        listDataHeader.add("Journalism");

        // Adding child data
        List<String> Stories = new ArrayList<String>();
        Stories.add("Crime");
        Stories.add("Children");
        Stories.add("Dark Fantasy");
        Stories.add("Fan Fiction");
        Stories.add("Fantasy");
        Stories.add("General Literary");
        Stories.add("Ghost Stories");
        Stories.add("Historical Fiction");
        Stories.add("Horror");
        Stories.add("Humour and Comedy");
        Stories.add("Macabre");
        Stories.add("Mystery");
        Stories.add("Romance");
        Stories.add("Scifi");
        Stories.add("Spy stories");
        Stories.add("Supernatural");
        Stories.add("Thriller");
        Stories.add("Travel");
        Stories.add("True Stories");
        Stories.add("War Stories");
        Stories.add("Young Adults");
        Stories.add("Other");


        List<String> Poetry = new ArrayList<String>();
        Poetry.add("Dramatic");
        Poetry.add("Children Rhymes");
        Poetry.add("Elegy");
        Poetry.add("Epic");
        Poetry.add("Light");
        Poetry.add("Lyric");
        Poetry.add("Narrative");
        Poetry.add("Prose");
        Poetry.add("Satirical");
        Poetry.add("Speculative");
        Poetry.add("Verse fable");
        Poetry.add("Other");
//        Novel.add("Fanfiction");
//        Novel.add("Fantasy");
//        Novel.add("Fiction narrative");
//        Novel.add("Fiction in verse");
//        Novel.add("Folklore");
//        Novel.add("Historical fiction");
//        Novel.add("Horror");
//        Novel.add("Humour");
//        Novel.add("Legend");
//        Novel.add("Magical realism");
//        Novel.add("Metafiction");
//        Novel.add("Mystery");
//        Novel.add("Mythology");
//        Novel.add("Mythopoeia");
//        Novel.add("Realistic fiction");
//        Novel.add("Science fiction");
//        Novel.add("Suspense/Thriller");
//        Novel.add("Tall tale");
//        Novel.add("Western");




//        List<String> Poetry = new ArrayList<String>();
//        Poetry.add("Narrative poetry");
//        Poetry.add("Epic poetry");
//        Poetry.add("Dramatic poetry");
//        Poetry.add("Satirical poetry");
//        Poetry.add("Light poetry");
//        Poetry.add("Lyric poetry");
//        Poetry.add("Elegy");
//        Poetry.add("Verse fable");
//        Poetry.add("Prose poetry");
//        Poetry.add("Speculative poetry");





        List<String> Shayari = new ArrayList<String>();
        Shayari.add("2 Line Shayari");
        Shayari.add("Attitude");
        //Shayari.add("Bewafa");
        Shayari.add("Birthday");
//        Shayari.add("Dard Shayari");
//        Shayari.add("Dil Shayari");
//        Shayari.add("Dosti Shayari");
        Shayari.add("Festival");
        Shayari.add("Friendship");
        Shayari.add("Funny");
        Shayari.add("Greetings");
        Shayari.add("Heart Ache");
        Shayari.add("Life");
        Shayari.add("Miss You");
        Shayari.add("Rain");
        Shayari.add("Romantic");
        Shayari.add("Sad");
        Shayari.add("Valentines Day");
        Shayari.add("Other");
//        Shayari.add("Good Morning Shayari");
//        Shayari.add("Good Night Shayari");
//        Shayari.add("Heart Touching Shayari");
//        Shayari.add("Hindi Poems Poetry");
//        Shayari.add("Hindi Shayari");
//        Shayari.add("Life Shayari");
//        Shayari.add("Love Shayari");
//        Shayari.add("Miss You Shayari");
//        Shayari.add("Punjabi Shayari");
//        Shayari.add("Rain-Barish Shayari");
//        Shayari.add("Romantic Shayari");
//        Shayari.add("Sad Shayari");
//        Shayari.add("Sharabi Shayari");
//        Shayari.add("True Shayari");
//        Shayari.add("Valentines Day SMS");
//        Shayari.add("Yaad Shayari");

        List<String> SongsJingles = new ArrayList<String>();
        SongsJingles.add("Avant-Garde");
        SongsJingles.add("Blues");
        SongsJingles.add("Celebration");
        SongsJingles.add("Children");
        SongsJingles.add("Classical");
        SongsJingles.add("Comedy/ Spoken");
        SongsJingles.add("Country");
        SongsJingles.add("Folk");
        SongsJingles.add("Festival");
        SongsJingles.add("Holiday");
        SongsJingles.add("New Age");
        SongsJingles.add("Pop/ Rock");
        SongsJingles.add("R and B");
        SongsJingles.add("Rap");
        SongsJingles.add("Reggae");
        SongsJingles.add("Religious ");
        SongsJingles.add("Other");





        List<String> Jokes = new ArrayList<String>();
        Jokes.add("Blond");
        Jokes.add("Family");
        Jokes.add("Marriage");
        Jokes.add("One line");
        Jokes.add("Profession");
        Jokes.add("Religion");
        Jokes.add("School/ College");
        Jokes.add("Sarcastic");
        Jokes.add("Other");


        List<String> Review = new ArrayList<String>();
        Review.add("Movies");
        Review.add("Travel");
        Review.add("Cars");
        Review.add("Food");
        Review.add("Games");
        Review.add("Other");



        List<String> PersonalBlog = new ArrayList<String>();
        PersonalBlog.add("Personal");
        PersonalBlog.add("Other");


        List<String> GeneralLet = new ArrayList<String>();
        GeneralLet.add("Business");
        GeneralLet.add("Environmental");
        GeneralLet.add("Fashion");
        GeneralLet.add("News");
        GeneralLet.add("Science");
        GeneralLet.add("Sports");
        GeneralLet.add("Supernatural");
        GeneralLet.add("Technology");
        GeneralLet.add("Other");


        listDataChild.put(listDataHeader.get(0), Stories); // Header, Child data
        //listDataChild.put(listDataHeader.get(1), Novel);
        listDataChild.put(listDataHeader.get(1), Poetry);
        listDataChild.put(listDataHeader.get(2), Shayari);
        listDataChild.put(listDataHeader.get(3), SongsJingles);
        listDataChild.put(listDataHeader.get(4), Jokes);
        listDataChild.put(listDataHeader.get(5), Review);
        listDataChild.put(listDataHeader.get(6), PersonalBlog);
        listDataChild.put(listDataHeader.get(7), GeneralLet);


        fabFrame = rootView.findViewById(R.id.fabFrame);
        fabSettings = rootView.findViewById(R.id.fabSetting);

        layoutFabSave = rootView.findViewById(R.id.layoutFabSave);
        layoutFabEdit = rootView.findViewById(R.id.layoutFabEdit);
        layoutFabPhoto = rootView.findViewById(R.id.layoutFabPhoto);
        layoutMyBlog = rootView.findViewById(R.id.layoutMyBlog);


        fabSettings.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                if (fabExpanded){
                    closeSubMenusFab();
                    fabFrame.setClickable(false);
                } else {
                    openSubMenusFab();
                    fabFrame.setClickable(true);
                }
            }
        });

        //Only main FAB is visible in the beginning
        closeSubMenusFab();


        layoutFabSave.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Intent intent = new Intent(getContext(), Draft.class);
                startActivity(intent);
            }
        });

        layoutFabEdit.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Intent intent = new Intent(getContext(), writeblogstepone.class);
                startActivity(intent);
            }
        });


        layoutFabPhoto.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Intent intent = new Intent(getContext(), discus.class);
                startActivity(intent);
            }
        });

        layoutMyBlog.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Intent intent = new Intent(getContext(), MyBlog.class);
                startActivity(intent);
            }
        });

        //return rootView;

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








    private void callAllBlogActivity(String screenIndex){
        Intent intentBlogList = new Intent(thiscontext, AllBlogActivity.class);
        intentBlogList.putExtra("boxTitle", screenIndex);
        startActivity(intentBlogList);
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





    private boolean isNetworkAvailable() {
        ConnectivityManager connectivityManager
                = (ConnectivityManager) thiscontext.getSystemService(Context.CONNECTIVITY_SERVICE);
        NetworkInfo activeNetworkInfo = connectivityManager.getActiveNetworkInfo();
        return activeNetworkInfo != null && activeNetworkInfo.isConnected();
    }


}

