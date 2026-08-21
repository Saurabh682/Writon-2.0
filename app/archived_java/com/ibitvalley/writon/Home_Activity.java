package com.ibitvalley.writon;

import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.graphics.Typeface;
import android.os.Build;
import android.os.Bundle;
import android.util.Base64;
import android.util.Log;
import android.view.View;
import android.view.ViewTreeObserver;
import android.view.animation.DecelerateInterpolator;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.RelativeLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.RequiresApi;
import androidx.core.content.res.ResourcesCompat;
import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentManager;
import androidx.fragment.app.FragmentTransaction;
import androidx.lifecycle.Observer;
import androidx.lifecycle.ViewModelProvider;

import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.Task;
import com.google.firebase.messaging.FirebaseMessaging;
import com.ibitvalley.writon.databinding.ActivityHomeBinding;
import com.ibitvalley.writon.classes.view_model.OUD_Viewmodel;
import com.ibitvalley.writon.fragment.CollectionDemoFragment;
import com.ibitvalley.writon.fragment.ContestFragment;
import com.ibitvalley.writon.fragment.Home_Fragment2;
import com.ibitvalley.writon.fragment.Home_Fragment3;
import com.ibitvalley.writon.fragment.MyWorldFragment;
import com.ibitvalley.writon.googleAnalytics.MyApplication;
import com.ibitvalley.writon.classes.model.LoginBody;
import com.ibitvalley.writon.model.LoginUserDetails;
import com.ibitvalley.writon.model.MyWorldModel;
import com.ibitvalley.writon.remoteConfig.FirebaseConfig;
import com.ibitvalley.writon.retroFit.RetroFitClient;
import com.ibitvalley.writon.retroFit.ServiceGenerator;
import com.ibitvalley.writon.utils.AppUtils;
import com.ibitvalley.writon.utils.WritOnPreference;
import com.takusemba.spotlight.Spotlight;
import com.takusemba.spotlight.Target;
import com.takusemba.spotlight.shape.Circle;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.TimeUnit;

import butterknife.ButterKnife;
import io.reactivex.Single;
import io.reactivex.android.schedulers.AndroidSchedulers;
import io.reactivex.functions.Consumer;
import io.reactivex.schedulers.Schedulers;
import smartdevelop.ir.eram.showcaseviewlib.GuideView;
import smartdevelop.ir.eram.showcaseviewlib.config.DismissType;
import smartdevelop.ir.eram.showcaseviewlib.config.Gravity;
import smartdevelop.ir.eram.showcaseviewlib.listener.GuideListener;

public class Home_Activity extends BaseActivity implements View.OnClickListener {


    private ActivityHomeBinding binding;
    private static FragmentManager manager;
    private Fragment fragment;
    private int pageActionValue = 1;

    private static final String TAG = "Home_Activity";
    private PrefManager prefManager;
    private boolean loginTest=false;
    private Spotlight spotlight;
    private TinyDB tinydb;
    LinearLayout container;
    private OUD_Viewmodel oud_Viewmodel;
    boolean showingTutorial=false;
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        binding = ActivityHomeBinding.inflate(getLayoutInflater());
        setContentView(binding.getRoot());
        super.onCreate(savedInstanceState);
        
        prefManager = new PrefManager(this);
        if (prefManager.isNotification()) {

                binding.content.notifyCircle.setVisibility(View.VISIBLE);
        }else binding.content.notifyCircle.setVisibility(View.INVISIBLE);

        FirebaseMessaging.getInstance().getToken()
                .addOnCompleteListener(new OnCompleteListener<String>() {

                    @RequiresApi(api = Build.VERSION_CODES.KITKAT)
                    @Override
                    public void onComplete(@NonNull Task<String> task) {
                        if (!task.isSuccessful()) {
                            return;
                        }

                        // Get the Instance ID token//
                        String token = task.getResult();
                        String msg = getString(R.string.fcm_token, token);
                        AppUtils.registerFcm( getApplicationContext(),token );
                        Log.d(TAG, msg);

                    }
                });
        tinydb = new TinyDB(getApplicationContext());

        Bundle extras = getIntent().getExtras();
        if (extras != null) {
            pageActionValue = extras.getInt("pageActionValue");
        }
        if(!loginTest){
            validateUser();
        }

        initilize(pageActionValue);
        MyApplication.getInstance().trackEvent("Home Screen", "HomeScreen Active", "Home screen load successfully.");
        MyApplication.getInstance().trackScreenView("HomeScreen");
        initializeFireBaseConfig();
        oud_Viewmodel= new ViewModelProvider(this).get( OUD_Viewmodel.class );
        oud_Viewmodel.getMyWorldData();

        oud_Viewmodel.getMyWorldLiveData().observe( this , new Observer<List<MyWorldModel>>() {
            @Override
            public void onChanged(List<MyWorldModel> myWorldModels) {
                if ( !AppUtils.isNull( myWorldModels ) && myWorldModels.size()>0 )
                {
                    binding.content.notifyCircle.setVisibility(View.VISIBLE);
                }
            }
        } );

    }

    public interface SubCategoryClickListner
    {
        void onClick(int position);
    }

    // FirebaseConfig
    private FirebaseConfig firebaseConfig;

    private void initializeFireBaseConfig() {
        firebaseConfig = new FirebaseConfig();
        firebaseConfig.fetchNewVersion(Home_Activity.this);
    }

    private void validateUser() {

        SharedPreferences preferences = getApplicationContext().getSharedPreferences("mPrefs", MODE_PRIVATE);
        SharedPreferences.Editor editor = preferences.edit();
        String password = tinydb.getString("pass");
        String email = tinydb.getString("userEmail");

        RetroFitClient PostList = ServiceGenerator.getRetrofit().create(RetroFitClient.class);
        LoginBody loginBody = new LoginBody(email, password);

        Single<LoginUserDetails> call = PostList.login(loginBody);


        call.subscribeOn( Schedulers.io() )
                .observeOn( AndroidSchedulers.mainThread() )
                .subscribe( new Consumer<LoginUserDetails>() {
                    @Override
                    public void accept(LoginUserDetails loginUserDetails) throws Exception {
                        assert loginUserDetails != null;
                        //Log.d("Success1", response.body().getData().get(0).getUserName());
                        if ( loginUserDetails.getUser()!=null )
                            WritOnPreference.getInstance(getApplicationContext()).saveUserDetails(loginUserDetails.getUser());
                        loginTest = true;
                    }
                } , new Consumer<Throwable>() {
                    @Override
                    public void accept(Throwable throwable) throws Exception {
                        Log.d(TAG,"UnSuccessful >>"+ throwable.getMessage());
                    }
                } );


    }







    private void initilize(int pageActionValue) {
        binding.content.layoutHome.setOnClickListener(this);
        binding.content.layoutHome1.setOnClickListener(this);
        binding.content.layoutHome2.setOnClickListener(this);
        binding.content.layoutHome3.setOnClickListener(this);
        binding.content.layoutHome4.setOnClickListener(this);

        manager = getSupportFragmentManager();
        pageAction(pageActionValue);
//        if(pageActionValue == 0) {
//            fragment = new CategoryDrawerFragment();
//            replaceFragment(fragment);
//        }else if(pageActionValue == 1){
            fragment = new CollectionDemoFragment();
            replaceFragment(fragment);
//        }


    }

    @Override
    public void onClick(View view) {
        if (!showingTutorial) {
            int id = view.getId();
            if (id == R.id.layout_home) {
                //contest
                fragment = new ContestFragment();
                replaceFragment(fragment);
                pageAction(0);
            } else if (id == R.id.layout_home1) {
                fragment = new CollectionDemoFragment();
                replaceFragment(fragment);
                pageAction(1);
            } else if (id == R.id.layout_home2) {
                fragment = new MyWorldFragment();
                replaceFragment(fragment);
                pageAction(2);
            } else if (id == R.id.layout_home3) {
                fragment = new Home_Fragment3();
                replaceFragment(fragment);
                pageAction(3);
            } else if (id == R.id.layout_home4) {
                fragment = new Home_Fragment2();
                replaceFragment(fragment);
                pageAction(4);
            }
        }
    }

    public void pageAction(int position) {
        switch (position) {
            case 0:
                binding.content.imgContest.setImageResource(R.drawable.contest_selected);
                binding.content.imgExplorer.setImageResource(R.drawable.explore_linemdpi);
                binding.content.imgMyworld.setImageResource(R.drawable.home_linemdpi);
                binding.content.imgBookmark.setImageResource(R.drawable.bookmark_linemdpi);
                binding.content.imgProfile.setImageResource(R.drawable.profile_linemdpi);
                break;
            case 1:
                binding.content.imgExplorer.setImageResource(R.drawable.exploremdpi);
                binding.content.imgContest.setImageResource(R.drawable.contest_default);
                binding.content.imgMyworld.setImageResource(R.drawable.home_linemdpi);
                binding.content.imgBookmark.setImageResource(R.drawable.bookmark_linemdpi);
                binding.content.imgProfile.setImageResource(R.drawable.profile_linemdpi);
                break;
            case 2:
                binding.content.imgMyworld.setImageResource(R.drawable.homemdpi);
                binding.content.imgExplorer.setImageResource(R.drawable.explore_linemdpi);
                binding.content.imgContest.setImageResource(R.drawable.contest_default);
                binding.content.imgBookmark.setImageResource(R.drawable.bookmark_linemdpi);
                binding.content.imgProfile.setImageResource(R.drawable.profile_linemdpi);
                binding.content.notifyCircle.setVisibility(View.INVISIBLE);
                prefManager.setIsNotification(false);

                break;
            case 3:
                binding.content.imgBookmark.setImageResource(R.drawable.bookmarkmdpifill);
                binding.content.imgMyworld.setImageResource(R.drawable.home_linemdpi);
                binding.content.imgExplorer.setImageResource(R.drawable.explore_linemdpi);
                binding.content.imgContest.setImageResource(R.drawable.contest_default);
                binding.content.imgProfile.setImageResource(R.drawable.profile_linemdpi);
                break;
            case 4:
                binding.content.imgProfile.setImageResource(R.drawable.profilemdpi);
                binding.content.imgBookmark.setImageResource(R.drawable.bookmark_linemdpi);
                binding.content.imgMyworld.setImageResource(R.drawable.home_linemdpi);
                binding.content.imgExplorer.setImageResource(R.drawable.explore_linemdpi);
                binding.content.imgContest.setImageResource(R.drawable.contest_default);
                break;
            case 5:
                binding.content.imgContest.setImageResource(R.drawable.contest_default);
                binding.content.imgExplorer.setImageResource(R.drawable.explore_linemdpi);
                binding.content.imgMyworld.setImageResource(R.drawable.home_linemdpi);
                binding.content.imgBookmark.setImageResource(R.drawable.bookmark_linemdpi);
                binding.content.imgProfile.setImageResource(R.drawable.profile_linemdpi);
                break;
        }
    }

    public void replaceFragment(Fragment fragment) {
        //backStateName = fragment.getClass().getName();
        //boolean fragmentPopped = manager.popBackStackImmediate(backStateName, 0);
        FragmentTransaction fragmentTransaction = manager.beginTransaction();
        fragmentTransaction.replace(R.id.fragment_container, fragment);
        fragmentTransaction.addToBackStack(null);
        fragmentTransaction.commit();

    }

    public void printHashKey(Context pContext) {
        try {
            PackageInfo info = getPackageManager().getPackageInfo(
                    "com.facebook.samples.hellofacebook",
                    PackageManager.GET_SIGNATURES);
            for (Signature signature : info.signatures) {
                MessageDigest md = MessageDigest.getInstance("SHA");
                md.update(signature.toByteArray());
                Log.d("KeyHash:", Base64.encodeToString(md.digest(), Base64.DEFAULT));
            }
        } catch (PackageManager.NameNotFoundException | NoSuchAlgorithmException ignored) {

        }
    }

//    //basel 3-9-2020
    public void prepareTutorial()
    {
        final Typeface typeface = ResourcesCompat.getFont(this, R.font.lato);
        showingTutorial=true;


        GuideView layout_home3View=new GuideView.Builder(this)
                .setContentText(getResources().getString( R.string.tutorial_bookmark ))
                .setGravity( Gravity.auto) //optional
                .setDismissType( DismissType.anywhere) //optional - default DismissType.targetView
                .setTargetView(binding.content.layoutHome3)
                .setGuideListener( new GuideListener() {
                    @Override
                    public void onDismiss(View view) {
                        tinydb.putBoolean( "finished_tutorial",true );
                        showingTutorial=false;
                    }
                } )
                .setContentTypeFace( typeface )
                .setContentTextSize(14)//optional
                .build();


        GuideView layout_home2View=new GuideView.Builder(this)
                .setContentText(getResources().getString( R.string.tutorial_myworld ))
                .setGravity( Gravity.auto) //optional
                .setDismissType( DismissType.anywhere) //optional - default DismissType.targetView
                .setTargetView(binding.content.layoutHome2)
                .setGuideListener( new GuideListener() {
                    @Override
                    public void onDismiss(View view) {
                        tinydb.putBoolean( "finished_tutorial",true );
                        layout_home3View.show();
                    }
                } )
                .setContentTypeFace( typeface )

                .setContentTextSize(14)//optional
                .build();

         new GuideView.Builder(this)
                .setContentText(getResources().getString( R.string.tutorial_explore ))
                .setGravity( Gravity.auto) //optional
                .setDismissType( DismissType.anywhere) //optional - default DismissType.targetView
                .setTargetView(binding.content.layoutHome1)
                .setGuideListener( new GuideListener() {
                    @Override
                    public void onDismiss(View view) {
                        tinydb.putBoolean( "finished_tutorial",true );
                        layout_home2View.show();
                    }
                } )
                .setContentTypeFace( typeface )

                .setContentTextSize(14)//optional
                .build()
                .show();









    }

    public LinearLayout getContainer()
    {
        return binding.container;
    }


    @Override
    public void onBackPressed() {

        super.onBackPressed();

    }
}
