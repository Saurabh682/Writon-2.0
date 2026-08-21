package com.ibitvalley.writon.fragment;

import android.content.Context;
import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import android.view.InflateException;
import android.view.LayoutInflater;
import android.view.View;
import android.view.ViewGroup;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.fragment.app.Fragment;
import androidx.lifecycle.Observer;
import androidx.lifecycle.ViewModelProvider;
import androidx.lifecycle.ViewModelProvider;
import androidx.recyclerview.widget.DefaultItemAnimator;
import androidx.recyclerview.widget.LinearLayoutManager;
import androidx.recyclerview.widget.RecyclerView;

import com.android.volley.VolleyError;
import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;
import com.ibitvalley.writon.Draft;
import com.ibitvalley.writon.MyWorldActionListener;
import com.ibitvalley.writon.classes.roomdataclasses.BookMark_List_Data;
import com.ibitvalley.writon.classes.view_model.OUD_Viewmodel;
import com.ibitvalley.writon.googleAnalytics.MyApplication;
import com.ibitvalley.writon.MyBlog;
import com.ibitvalley.writon.R;
import com.ibitvalley.writon.adapter.MyWorldAdapter;
import com.ibitvalley.writon.adapter.TrendingUsersAdapter;
import com.ibitvalley.writon.discus;
import com.ibitvalley.writon.model.Blog;
import com.ibitvalley.writon.model.DefaultResponse;
import com.ibitvalley.writon.model.LoginUserDetails;
import com.ibitvalley.writon.model.MyWorldModel;
import com.ibitvalley.writon.model.MyWorldResponse;
import com.ibitvalley.writon.model.TrendingUserResponse;
import com.ibitvalley.writon.model.UserInfo;
import com.ibitvalley.writon.model.UserModel;
import com.ibitvalley.writon.model.User;
import com.ibitvalley.writon.retroFit.RetroFitClient;
import com.ibitvalley.writon.retroFit.ServiceGenerator;
import com.ibitvalley.writon.utils.AppUtils;
import com.ibitvalley.writon.utils.VolleySingleton;
import com.ibitvalley.writon.utils.WritOnPreference;
import com.ibitvalley.writon.webapi.WebApiParams;
import com.ibitvalley.writon.webapi.WebConstants;
import com.ibitvalley.writon.webapi.util.OnResponseListener;
import com.ibitvalley.writon.webapi.util.SmartPostWebRequest;
import com.ibitvalley.writon.writeblogstepone;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;

import io.reactivex.android.schedulers.AndroidSchedulers;
import io.reactivex.functions.Consumer;
import io.reactivex.schedulers.Schedulers;

/**
 * Created by Android_PC on 10-08-2016.
 */
public class MyWorldFragment extends Fragment implements MyWorldActionListener {


    private View rootView;
    Context thiscontext;

    User userData;
    RecyclerView rvmyWorld;
    MyWorldAdapter myWorldAdapter;
    ProgressBar progressBar;
    TextView txt_no_records;
    TextView txt_mark_read;
    TrendingUsersAdapter trendingUsersAdapter;
    private OUD_Viewmodel oud_Viewmodel;
    ArrayList<MyWorldModel> myWorldModels=new ArrayList<>(  );
    @Override
    public View onCreateView(@NonNull LayoutInflater inflater, @Nullable ViewGroup container, @Nullable Bundle savedInstanceState) {
        if (rootView != null) {
            ViewGroup parent = (ViewGroup) rootView.getParent();
            if (parent != null)
                parent.removeView(rootView);
        }
        thiscontext = container.getContext();
        userData = WritOnPreference.getInstance(getActivity()).getUserDetails();
        rootView = inflater.inflate(R.layout.home_fragment4, container, false);

        initilize();
        oud_Viewmodel= new ViewModelProvider(getActivity()).get( OUD_Viewmodel.class );
        AppUtils.ShowView( progressBar,true );
//        oud_Viewmodel.getMyWorldData();
        oud_Viewmodel.getMyWorldLiveData().observe( this , new Observer<List<MyWorldModel>>() {
            @Override
            public void onChanged(List<MyWorldModel> myWorldModels) {
                if ( !AppUtils.isNull( myWorldModels ) )
                {
                    AppUtils.ShowView( progressBar,false );
                    displayLMyWorldPost( myWorldModels );
                }
                else
                {
                    AppUtils.ShowView( txt_mark_read,false );
                    AppUtils.ShowView( txt_no_records,false );
                    AppUtils.ShowView( progressBar,false );
                }

            }
        } );

        MyApplication.getInstance().trackEvent("Notification", "Read Notification", "My World");
        MyApplication.getInstance().trackScreenView("My World");
        return rootView;
    }

    private void initilize() {
        rvmyWorld = rootView.findViewById(R.id.rvmyWorld);
        progressBar=rootView.findViewById( R.id.progress_bar );
        txt_no_records=rootView.findViewById( R.id.txt_no_records );
        txt_mark_read=rootView.findViewById( R.id.txt_mark_read );

        txt_mark_read.setOnClickListener( new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                markAsRed();
            }
        } );

    }


    private void markAsRed()
    {
        RetroFitClient markAsRead = ServiceGenerator.getRetrofit().create(RetroFitClient.class);
        markAsRead.markAsRead( userData.getAccess_token(),userData.getId() )
                .subscribeOn( Schedulers.io() )
                .observeOn( AndroidSchedulers.mainThread() )
                .subscribe( new Consumer<DefaultResponse>() {
                    @Override
                    public void accept(DefaultResponse defaultResponse) throws Exception {
                    if ( defaultResponse.getSuccess()==1 )
                    {
                        AppUtils.ShowView( txt_mark_read,
                                true );
                        Toast.makeText( getActivity(),"Marked all read!",Toast.LENGTH_LONG ).show();
                        oud_Viewmodel.removeMyWorldNotifications();
                        myWorldModels.clear();
                        myWorldAdapter.notifyDataSetChanged();
                    }

                    }
                } , new Consumer<Throwable>() {
                    @Override
                    public void accept(Throwable throwable) throws Exception {
                        Toast.makeText( getActivity(),throwable.getMessage(),Toast.LENGTH_LONG ).show();
                    }
                } );
    }


    private void displayLMyWorldPost(List<MyWorldModel> list){
        myWorldModels.addAll( list );
        Collections.sort( myWorldModels );
        myWorldAdapter = new MyWorldAdapter(getActivity(),getContext(),myWorldModels,this);
        RecyclerView.LayoutManager mLayoutManager = new LinearLayoutManager(thiscontext);
        rvmyWorld.setLayoutManager(mLayoutManager);
        rvmyWorld.setAdapter(myWorldAdapter);
        myWorldAdapter.notifyDataSetChanged();
        if ( myWorldModels.size()==0 ){
            AppUtils.ShowView( txt_no_records,true );
        }else
            AppUtils.ShowView( txt_mark_read,true );

    }

    private void getTrendingUsers() {
        showProgressBar(true);
        RetroFitClient getTrendingUsers = ServiceGenerator.getRetrofitOld().create(RetroFitClient.class);

        getTrendingUsers.getTrendingUsers( userData.getAccess_token()).subscribeOn( Schedulers.io() )
                .observeOn( AndroidSchedulers.mainThread() )
                .subscribe( new Consumer<TrendingUserResponse>() {
                    @Override
                    public void accept(TrendingUserResponse userModel) throws Exception {
                        showProgressBar(false);
                        displayLTrendingUser(userModel.getData());
                    }
                } , new Consumer<Throwable>() {
                    @Override
                    public void accept(Throwable throwable) throws Exception {
                        showProgressBar(false);
                        Log.d( "Retroift",throwable.getMessage() );
                    }
                } );


    }


    private void displayLTrendingUser(ArrayList<UserModel> trendingBlog){
        trendingUsersAdapter = new TrendingUsersAdapter(getActivity(), getContext(), trendingBlog);
        RecyclerView.LayoutManager mLayoutManager = new LinearLayoutManager(thiscontext);
        rvmyWorld.setLayoutManager(mLayoutManager);
        rvmyWorld.setItemAnimator(new DefaultItemAnimator());
        rvmyWorld.setAdapter(trendingUsersAdapter);
        rvmyWorld.setNestedScrollingEnabled(false);
        trendingUsersAdapter.notifyDataSetChanged();
    }

    private void showProgressBar(boolean showProgress)
    {
        progressBar.setVisibility( showProgress? View.VISIBLE : View.GONE );
    }

    @Override
    public void onClick(int position,String action , String blogId , boolean value , String userId , String username , String title) {

        if (action.equalsIgnoreCase( "followed" )  )
        {

            oud_Viewmodel.updateFollowRoom( blogId, value,value ? 1 : 0,userId,username,title);
            myWorldModels.get( position ).setFollowed( value ); //change value to be be followed isToFollow=true
        }
        else if ( action.equalsIgnoreCase( "rated" ) )
        {

            oud_Viewmodel.updateRateRoom( blogId, value,value ? 1 : 0,userId,username,title);
            myWorldModels.get( position ).setRated( value );
        }

        myWorldAdapter.notifyDataSetChanged();


    }

    @Override
    public void onClickBookmark(int position,MyWorldModel myWorldModel,boolean value) {

        BookMark_List_Data bookMark_list_data=new BookMark_List_Data( myWorldModel );
        oud_Viewmodel.updateBookmark( bookMark_list_data,value);
        myWorldModels.get( position ).setBookmarked( value );
        myWorldAdapter.notifyDataSetChanged();
    }
}


