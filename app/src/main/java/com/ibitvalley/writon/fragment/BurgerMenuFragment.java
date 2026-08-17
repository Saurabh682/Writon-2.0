package com.ibitvalley.writon.fragment;

import android.os.Bundle;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.cardview.widget.CardView;
import androidx.fragment.app.Fragment;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.google.android.material.bottomsheet.BottomSheetBehavior;
import com.ibitvalley.writon.Home_Activity;
import com.ibitvalley.writon.R;
import com.ibitvalley.writon.adapter.CategoryListAdapter;
import com.ibitvalley.writon.adapter.SubCategoryListAdapter;
import com.ibitvalley.writon.utils.AppUtils;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Objects;

import butterknife.BindView;
import butterknife.ButterKnife;

public class BurgerMenuFragment extends Fragment {

    @BindView( R.id.recyclerView_category )
    RecyclerView recyclerView_category;

    CategoryListAdapter categoryListAdapter;


    private HashMap<String, ArrayList<String>> categoriesMap;
    private ArrayList<String> categoriesList;

    private BottomSheetBehavior<CardView> bottomSheetBehavior;

    @BindView( R.id.sub_category_recyclerview )
    RecyclerView sub_category_recyclerview;

    ArrayList<String> subCategoryList=new ArrayList<>(  );
    SubCategoryListAdapter subCategoryListAdapter;
    int selectedSubCategoryPosition=-1;

    @BindView( R.id.bottom_sheet)
    CardView llBottomSheet;
    public BurgerMenuFragment() {
        // Required empty public constructor
    }



    @Nullable
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater , @Nullable ViewGroup container , @Nullable Bundle savedInstanceState) {
        View view = inflater.inflate( R.layout.fragment_burgermenu, container, false);
        ButterKnife.bind(this, view);

        LinearLayoutManager horizontalLayoutManagaer = new LinearLayoutManager(getContext(), LinearLayoutManager.HORIZONTAL, false);
        categoriesMap= AppUtils.getCategoriesMap();
        categoriesList=AppUtils.getCategoryList( categoriesMap );
        categoryListAdapter=new CategoryListAdapter( getContext() ,
                categoriesList ,
                new CollectionDemoFragment.CategoryListListener() {
                    @Override
                    public void onClick(int position) {

                        toggleBottomSheet(position,categoriesMap.get( categoriesList.get( position ) ));
                    }
                } );

        recyclerView_category.setLayoutManager(horizontalLayoutManagaer  );
        recyclerView_category.setAdapter( categoryListAdapter );

        bottomSheetBehavior = BottomSheetBehavior.from(llBottomSheet);
        bottomSheetBehavior.setState(BottomSheetBehavior.STATE_HIDDEN);



        LinearLayoutManager verticalLayoutManagaer = new LinearLayoutManager(getContext(), LinearLayoutManager.VERTICAL, false);

        subCategoryListAdapter=new SubCategoryListAdapter( subCategoryList ,
                new Home_Activity.SubCategoryClickListner() {
                    @Override
                    public void onClick(int position) {

                        bottomSheetBehavior.setState(BottomSheetBehavior.STATE_HIDDEN);
                        Fragment  fragment2 = new CategoryListBlogFragment();
                        Bundle args = new Bundle();
                        args.putString("cName", Objects.requireNonNull(subCategoryList.get( position )));
                        fragment2.setArguments(args);
                        ((Home_Activity)getActivity()).replaceFragment( fragment2 );

                    }
                });

        sub_category_recyclerview.setLayoutManager(verticalLayoutManagaer  );
        sub_category_recyclerview.setAdapter(subCategoryListAdapter  );

        return view;
    }

    @Override
    public void onResume() {
        super.onResume();

        if ( categoriesMap!=null && categoriesMap.size()>0 )
            toggleBottomSheet(0,categoriesMap.get( categoriesList.get( 0 ) )); //by default show first subCat
    }


    public void toggleBottomSheet(int position , ArrayList<String> subCategoryList) {

        this.subCategoryList.clear();
        this.subCategoryList.addAll( subCategoryList );
        subCategoryListAdapter.notifyDataSetChanged();

        if ( selectedSubCategoryPosition==position )
        {
            if (bottomSheetBehavior.getState() == BottomSheetBehavior.STATE_EXPANDED) {
                bottomSheetBehavior.setState(BottomSheetBehavior.STATE_HIDDEN);
            }
            selectedSubCategoryPosition=-1;
        }
        else  if (bottomSheetBehavior.getState() != BottomSheetBehavior.STATE_EXPANDED) {
            bottomSheetBehavior.setState(BottomSheetBehavior.STATE_EXPANDED);
            selectedSubCategoryPosition=position;
        }
        else
            selectedSubCategoryPosition=position;
    }

}
