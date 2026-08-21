package com.ibitvalley.writon.fragment;

import android.content.Context;
import android.content.Intent;
import android.graphics.Typeface;
import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewTreeObserver;
import android.view.animation.DecelerateInterpolator;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TableLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.content.res.ResourcesCompat;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;
import androidx.viewpager2.adapter.FragmentStateAdapter;
import androidx.viewpager2.widget.ViewPager2;

import com.google.android.material.floatingactionbutton.FloatingActionButton;
import com.google.android.material.tabs.TabLayout;
import com.google.android.material.tabs.TabLayoutMediator;
import com.ibitvalley.writon.BlogSearch;
import com.ibitvalley.writon.Draft;
import com.ibitvalley.writon.Home_Activity;
import com.ibitvalley.writon.MyBlog;
import com.ibitvalley.writon.MyPostedItemsList;
import com.ibitvalley.writon.R;
import com.ibitvalley.writon.TinyDB;
import com.ibitvalley.writon.adapter.CategoryListAdapter;
import com.ibitvalley.writon.classes.roomdataclasses.Post_List_Data;
import com.ibitvalley.writon.classes.view_model.OUD_Viewmodel;
import com.ibitvalley.writon.discus;
import com.ibitvalley.writon.utils.AppUtils;
import com.ibitvalley.writon.writeblogstepone;
import com.skydoves.expandablelayout.ExpandableLayout;
import com.takusemba.spotlight.OnSpotlightListener;
import com.takusemba.spotlight.Spotlight;
import com.takusemba.spotlight.Target;
import com.takusemba.spotlight.shape.Circle;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.concurrent.TimeUnit;

import butterknife.BindView;
import butterknife.ButterKnife;
import butterknife.OnClick;
import io.reactivex.disposables.Disposable;
import smartdevelop.ir.eram.showcaseviewlib.GuideView;
import smartdevelop.ir.eram.showcaseviewlib.config.DismissType;
import smartdevelop.ir.eram.showcaseviewlib.config.Gravity;
import smartdevelop.ir.eram.showcaseviewlib.listener.GuideListener;

public class CollectionDemoFragment extends Fragment  {


    View rootView;
    private static final int NUM_PAGES = 4;
    private ViewPager2 viewPager;
    private int[] layouts;
    TableLayout tabLayout;
    @BindView(R.id.ivSearch) ImageView searchButton;
    Context thiscontext;
    private FrameLayout fabFrame;
    private boolean fabExpanded = false;
    private FloatingActionButton fabSettings;
    private LinearLayout layoutFabSave;
    private LinearLayout layoutFabEdit;
    private LinearLayout layoutFabPhoto,layoutMyPost;
    private LinearLayout layoutMyBlog;
    private FrameLayout container;
    private FragmentStateAdapter pagerAdapter;
    private String[] titles = new String[]{"Latest", "Trending", "Most Followed", "Most Rated"};
    @BindView(R.id.SingleSwipe) SwipeRefreshLayout SwipeRefresh;
    private Disposable disposable,d;
    private List<Post_List_Data> post_list_data;
    Post_List_Data post;
    private Spotlight spotlight;
    private TinyDB tinydb;


    @BindView( R.id.burger_menu )
    ImageView burger_menu;

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        rootView = inflater.inflate(R.layout.viewpagerhome, container, false);
        ButterKnife.bind(this, rootView);
        return rootView;
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {


        TabLayout tabLayout = view.findViewById(R.id.tab_layout);
        viewPager = view.findViewById(R.id.pager);
        pagerAdapter = new ScreenSlidePagerAdapter(this);
        viewPager.setPageTransformer(new ZoomOutPageTransformer());
        viewPager.setAdapter(pagerAdapter);
        new TabLayoutMediator(tabLayout, viewPager,
                (tab, position) -> tab.setText(titles[position])
        ).attach();




//        oud_Viewmodel.loadAllPostRx();
        fabFrame = rootView.findViewById(R.id.fabFrame);
        fabSettings = rootView.findViewById(R.id.fabSetting);
        layoutMyPost = rootView.findViewById(R.id.layoutFabPostList);

        layoutFabSave = rootView.findViewById(R.id.layoutFabSave);
        layoutFabEdit = rootView.findViewById(R.id.layoutFabEdit);
        layoutFabPhoto = rootView.findViewById(R.id.layoutFabPhoto);
        layoutMyBlog = rootView.findViewById(R.id.layoutMyBlog);
        container= rootView.findViewById(R.id.container);
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

        layoutMyPost.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                Intent intent = new Intent(getContext(), MyPostedItemsList.class);
                startActivity(intent);
            }
        });

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


        SwipeRefresh.setOnRefreshListener(new SwipeRefreshLayout.OnRefreshListener() {
            @Override
            public void onRefresh() {

                //progressBar.setVisibility(View.GONE);
                SwipeRefresh.setRefreshing(false);
            }
        });

        searchButton.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View view) {
                Intent intent = new Intent(getContext(), BlogSearch.class);
                startActivity(intent);
            }
        });
        tinydb = new TinyDB(getActivity().getApplicationContext());

        container.getViewTreeObserver().addOnGlobalLayoutListener(new ViewTreeObserver.OnGlobalLayoutListener() {
            @Override public void onGlobalLayout() {
                container.getViewTreeObserver().removeOnGlobalLayoutListener(this);

                if ( !tinydb.getBoolean( "finished_tutorial" ) )
                {
                    prepareTutorial();
                }

            }
        });





    }


    public void prepareTutorial()
    {

        final Typeface typeface = ResourcesCompat.getFont(getContext(), R.font.lato);


        GuideView burgerMenuTutorial= new GuideView.Builder(getContext())
                .setContentText(getResources().getString( R.string.tutorial_list ))
                .setGravity( Gravity.auto) //optional
                .setDismissType( DismissType.anywhere) //optional - default DismissType.targetView
                .setTargetView(burger_menu)
                .setGuideListener( new GuideListener() {
                    @Override
                    public void onDismiss(View view) {
                        tinydb.putBoolean( "finished_tutorial",true );
                        try {
                            ((Home_Activity) getContext()).prepareTutorial();
                        }catch (Exception e)
                        {

                        }

                    }
                } )
                .setContentTypeFace( typeface )

                .setContentTextSize(14)//optional
                .build()
                ;
         new GuideView.Builder(getContext())
                .setContentText(getResources().getString( R.string.tutorial_write ))
                .setGravity( Gravity.auto) //optional
                .setDismissType( DismissType.anywhere) //optional - default DismissType.targetView
                .setTargetView(fabSettings)
                .setGuideListener( new GuideListener() {
                    @Override
                    public void onDismiss(View view) {
                        tinydb.putBoolean( "finished_tutorial",true );
                        burgerMenuTutorial.show();
                    }
                } )
                .setContentTypeFace( typeface )
                .setContentTextSize(14)//optional
                .build()
                .show();


    }
    @Override
    public void onDestroyView() {
        super.onDestroyView();
        if(disposable!=null) {
            disposable.dispose();
        }
        //d.dispose();
    }


    void UpdateRefreshView(){
        SwipeRefresh.setRefreshing(false);
    }


    //closes FAB submenus
    private void closeSubMenusFab(){
        layoutFabSave.setVisibility(View.INVISIBLE);
        layoutFabEdit.setVisibility(View.INVISIBLE);
        layoutFabPhoto.setVisibility(View.INVISIBLE);
        layoutMyBlog.setVisibility(View.INVISIBLE);
        layoutMyPost.setVisibility(View.INVISIBLE);
        //fabSettings.setImageResource(R.drawable.ic_autorenew_black_24dp);
        fabExpanded = false;

    }

    //Opens FAB submenus
    private void openSubMenusFab(){
        layoutFabSave.setVisibility(View.VISIBLE);
        layoutFabEdit.setVisibility(View.VISIBLE);
        layoutMyPost.setVisibility(View.VISIBLE);
        layoutFabPhoto.setVisibility(View.INVISIBLE);
        layoutMyBlog.setVisibility(View.INVISIBLE);
        fabExpanded = true;
    }



    /**
     * A simple pager adapter that represents 5 ScreenSlidePageFragment objects, in
     * sequence.
     */
    private static class ScreenSlidePagerAdapter extends FragmentStateAdapter {

       /* public ScreenSlidePagerAdapter(FragmentActivity fa) {
            super(fa);
        }*/

        public ScreenSlidePagerAdapter(Fragment f) {
            super(f);
        }

        @NonNull
        @Override
        public Fragment createFragment(int position) {

            switch (position) {
                case 0:
                    //args.putInt(String.valueOf(LatestFragment), position + 1);
                    return LatestFragment.newInstance();
                case 1:
                    return TrendingFrag.newInstance();
                case 2:
                    return FollowedFragment.newInstance();
                case 3:
                    return RatedFragment.newInstance();
                default:
                    return new ScreenSlidePageFragment();

            }

        }



        @Override
        public int getItemCount() {
            return NUM_PAGES;
        }

    }




    public interface CategoryListListener
    {

        void onClick(int position);
    }

    @OnClick(R.id.burger_menu)
    public void onBurgerMenuClick()
    {
        Fragment  fragment2 = new BurgerMenuFragment();
        ((Home_Activity)getActivity()).replaceFragment( fragment2 );
        ((Home_Activity)getActivity()).pageAction( 5 );
    }
}
  class DemoObjectFragment2 extends Fragment {
    public static final String ARG_OBJECT = "object";

    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container,
                             @Nullable Bundle savedInstanceState) {
        return inflater.inflate(R.layout.fragment_collection_object, container, false);
    }

    @Override
    public void onViewCreated(@NonNull View view, @Nullable Bundle savedInstanceState) {
        Bundle args = getArguments();

    }


}


