package com.ibitvalley.writon;

import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.widget.ImageView;
import android.widget.RelativeLayout;

import androidx.annotation.NonNull;
import androidx.annotation.RequiresApi;
import androidx.fragment.app.Fragment;
import androidx.fragment.app.FragmentActivity;
import androidx.fragment.app.FragmentManager;
import androidx.fragment.app.FragmentTransaction;

import com.android.volley.Request;
import com.android.volley.RequestQueue;
import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.StringRequest;
import com.android.volley.toolbox.Volley;
import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.Task;
import com.google.firebase.iid.FirebaseInstanceId;
import com.google.firebase.iid.InstanceIdResult;
import com.google.firebase.messaging.FirebaseMessaging;
import com.ibitvalley.writon.Fragment.CategoryDrawerFragment;
import com.ibitvalley.writon.Fragment.CollectionDemoFragment;
import com.ibitvalley.writon.Fragment.Home_Fragment2;
import com.ibitvalley.writon.Fragment.Home_Fragment3;
import com.ibitvalley.writon.Fragment.MyMenuFragment;
import com.ibitvalley.writon.GoogleAnalytics.MyApplication;
import com.ibitvalley.writon.model.User;
import com.ibitvalley.writon.utils.WritOnPreference;

import java.util.Objects;

public class Home_Activity extends FragmentActivity implements View.OnClickListener {


    private static FragmentManager manager;
    private Fragment fragment;
    private static String backStateName;
    private RelativeLayout layout_home, layout_home1, layout_home2, layout_home3, layout_home4;
    ImageView ivSearch, img_category, img_explorer, img_myworld, img_bookmark, img_profile, notify;
    private int pageActionValue = 1;
    private static final String TAG = "Home_Activity";
    private PrefManager prefManager;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_home);
        notify =  findViewById(R.id.notifyCircle);

        prefManager = new PrefManager(this);
        System.out.println("RECEIVED NOTIFICATION (2)====="+prefManager.isNotification());
        //notify.setVisibility(View.VISIBLE);
        if (prefManager.isNotification()) {

                notify.setVisibility(View.VISIBLE);
        }else notify.setVisibility(View.INVISIBLE);

        FirebaseInstanceId.getInstance().getInstanceId()
                .addOnCompleteListener(new OnCompleteListener<InstanceIdResult>() {

                    @RequiresApi(api = Build.VERSION_CODES.KITKAT)
                    @Override
                    public void onComplete(@NonNull Task<InstanceIdResult> task) {
                        if (!task.isSuccessful()) {
//To do//

                            return;
                        }

                        // Get the Instance ID token//
                        String token = Objects.requireNonNull(task.getResult()).getToken();
                        String msg = getString(R.string.fcm_token, token);
                        registerFcm(token);
                        Log.d(TAG, msg);

                    }
                });

        Bundle extras = getIntent().getExtras();
        if (extras != null) {
            pageActionValue = extras.getInt("pageActionValue");
        }

        initilize(pageActionValue);
        MyApplication.getInstance().trackEvent("Home Screen", "HomeScreen Active", "Home screen load successfully.");
        MyApplication.getInstance().trackScreenView("HomeScreen");
        replaceFragment(new CollectionDemoFragment());
    }

    public void runtimeEnableAutoInit() {
        // [START fcm_runtime_enable_auto_init]
        FirebaseMessaging.getInstance().setAutoInitEnabled(true);
        // [END fcm_runtime_enable_auto_init]
    }


    public void registerFcm(String token){
        // ...
        User userData = WritOnPreference.getInstance(getApplicationContext()).getUserDetails();

                // Instantiate the RequestQueue.
                    RequestQueue queue = Volley.newRequestQueue(this);
                    String url ="https://www.writon.co/Mine/addFCMid.php?id="+userData.getId()+"&fcmid="+token;

                 // Request a string response from the provided URL.
                    StringRequest stringRequest = new StringRequest(Request.Method.GET, url,
                            new Response.Listener<String>() {
                                @Override
                                public void onResponse(String response) {
                                    // Display the first 500 characters of the response string.
                                    System.out.println("Response is: "+ response);
                                }
                            }, new Response.ErrorListener() {
                        @Override
                        public void onErrorResponse(VolleyError error) {
                            System.out.println("That didn't work!");
                        }
                    });

                // Add the request to the RequestQueue.
                    queue.add(stringRequest);
    }


    private void initilize(int pageActionValue) {
        layout_home = findViewById(R.id.layout_home);
        layout_home1 = findViewById(R.id.layout_home1);
        layout_home2 = findViewById(R.id.layout_home2);
        layout_home3 = findViewById(R.id.layout_home3);
        layout_home4 = findViewById(R.id.layout_home4);


        img_category = findViewById(R.id.img_category);
        img_explorer = findViewById(R.id.img_explorer);
        img_myworld = findViewById(R.id.img_myworld);
        img_bookmark = findViewById(R.id.img_bookmark);
        img_profile = findViewById(R.id.img_profile);

        layout_home.setOnClickListener(this);
        layout_home1.setOnClickListener(this);
        layout_home2.setOnClickListener(this);
        layout_home3.setOnClickListener(this);
        layout_home4.setOnClickListener(this);

        manager = getSupportFragmentManager();
        pageAction(pageActionValue);
        if(pageActionValue == 1) {
            fragment = new CategoryDrawerFragment();
            replaceFragment(fragment);
        }else if(pageActionValue == 2){
            fragment = new CollectionDemoFragment();
            replaceFragment(fragment);
        }
    }

    @Override
    public void onClick(View view) {
        switch (view.getId()) {
            case R.id.layout_home:
                fragment = new CategoryDrawerFragment();
                replaceFragment(fragment);
                pageAction(0);
                break;
            case R.id.layout_home1:
                fragment = new CollectionDemoFragment();
                replaceFragment(fragment);
                pageAction(1);
                break;
            case R.id.layout_home2:
                fragment = new MyMenuFragment();
                replaceFragment(fragment);
                pageAction(2);
                break;

            case R.id.layout_home3:
                fragment = new Home_Fragment3();
                replaceFragment(fragment);
                pageAction(3);
                break;

            case R.id.layout_home4:
                fragment = new Home_Fragment2();
                replaceFragment(fragment);
                pageAction(4);
                break;



        }
    }

    private void pageAction(int position) {
        switch (position) {
            case 0:
                img_category.setImageResource(R.drawable.burgermenu);
                img_explorer.setImageResource(R.drawable.explore_linemdpi);
                img_myworld.setImageResource(R.drawable.home_linemdpi);
                img_bookmark.setImageResource(R.drawable.bookmark_linemdpi);
                img_profile.setImageResource(R.drawable.profile_linemdpi);
                break;
            case 1:
                img_explorer.setImageResource(R.drawable.exploremdpi);
                img_category.setImageResource(R.drawable.categoryselected);
                img_myworld.setImageResource(R.drawable.home_linemdpi);
                img_bookmark.setImageResource(R.drawable.bookmark_linemdpi);
                img_profile.setImageResource(R.drawable.profile_linemdpi);
                break;
            case 2:
                img_myworld.setImageResource(R.drawable.homemdpi);
                img_explorer.setImageResource(R.drawable.explore_linemdpi);
                img_category.setImageResource(R.drawable.categoryselected);
                img_bookmark.setImageResource(R.drawable.bookmark_linemdpi);
                img_profile.setImageResource(R.drawable.profile_linemdpi);
                notify.setVisibility(View.INVISIBLE);
                prefManager.setIsNotification(false);

                break;
            case 3:
                img_bookmark.setImageResource(R.drawable.bookmarkmdpifill);
                img_myworld.setImageResource(R.drawable.home_linemdpi);
                img_explorer.setImageResource(R.drawable.explore_linemdpi);
                img_category.setImageResource(R.drawable.categoryselected);
                img_profile.setImageResource(R.drawable.profile_linemdpi);
                break;
            case 4:
                img_profile.setImageResource(R.drawable.profilemdpi);
                img_bookmark.setImageResource(R.drawable.bookmark_linemdpi);
                img_myworld.setImageResource(R.drawable.home_linemdpi);
                img_explorer.setImageResource(R.drawable.explore_linemdpi);
                img_category.setImageResource(R.drawable.categoryselected);
                break;
        }
    }

    public void replaceFragment(Fragment fragment) {
        backStateName = fragment.getClass().getName();
        //boolean fragmentPopped = manager.popBackStackImmediate(backStateName, 0);
        FragmentTransaction fragmentTransaction = manager.beginTransaction();
        fragmentTransaction.replace(R.id.fragment_container, fragment);
        fragmentTransaction.addToBackStack(null);
        fragmentTransaction.commit();

        //  if (!fragmentPopped) {
        /*fragmentTransaction.replace(R.id.fragment_container, fragment);
        if (!(fragment instanceof Home_Fragment)) {
            fragmentTransaction.addToBackStack(backStateName);
        }*/

      /*  if (backStateName.trim().equals("com.soberglobe.soberglobe.Fragment.Home_Fragment"))
        {
            fragmentTransaction.addToBackStack(backStateName);
        }*/
        //fragmentTransaction.commit();
        /* fragmentTransaction.commitAllowingStateLoss();*/
        // }
     /*
        for(int i = 0; i < manager.getBackStackEntryCount(); ++i) {
            if (backStateName.trim().equals("ccom.soberglobe.soberglobe.Fragment.Home_Fragment"))
                manager.popBackStack();
        }*/
    }
}
