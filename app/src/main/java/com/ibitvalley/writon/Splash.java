package com.ibitvalley.writon;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.os.Handler;
import android.util.Base64;
import android.util.Log;
import android.view.Window;
import android.view.WindowManager;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.android.volley.DefaultRetryPolicy;
import com.android.volley.Request;
import com.android.volley.RequestQueue;
import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.JsonObjectRequest;
import com.android.volley.toolbox.Volley;
import com.google.firebase.FirebaseApp;
import com.ibitvalley.writon.classes.model.Posts_List;
import com.ibitvalley.writon.classes.view_model.OUD_Viewmodel;
import com.ibitvalley.writon.model.User;
import com.ibitvalley.writon.remoteConfig.FirebaseConfig;
import com.ibitvalley.writon.retroFit.RetroFitClient;
import com.ibitvalley.writon.retroFit.ServiceGenerator;
import com.ibitvalley.writon.utils.WritOnPreference;

import org.json.JSONObject;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

import io.reactivex.Observable;
import io.reactivex.android.schedulers.AndroidSchedulers;
import io.reactivex.disposables.Disposable;
import io.reactivex.observers.DisposableObserver;
import io.reactivex.schedulers.Schedulers;

//import com.ibitvalley.writon.utils.MyFirebaseInstanceIDService;

public class Splash extends BaseActivity {

    private static final String TAG = "SPLASH" ;
    User userData;
    Context curr_context;
    private OUD_Viewmodel oud_Viewmodel;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        super.onCreate(savedInstanceState);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN, WindowManager.LayoutParams.FLAG_FULLSCREEN);
        setContentView(R.layout.activity_splash);
        //oud_Viewmodel = new ViewModelProvider(this).get(OUD_Viewmodel.class);

        curr_context = this;
        // getSupportActionBar().hide();
        printKeyHash(this);
        Handler handler = new Handler();
        TinyDB tinydb = new TinyDB(getApplicationContext());
        String email = tinydb.getString("userEmail");
        handler.postDelayed(new Runnable() {
            @Override
            public void run() {
                SharedPreferences preferences = getApplicationContext().getSharedPreferences("mPrefs", MODE_PRIVATE);

                userData = WritOnPreference.getInstance(curr_context).getUserDetails();

                FirebaseApp.initializeApp(Splash.this);

                if (email == null || email.isEmpty()) {
                    Intent home = new Intent(Splash.this, LoginActivity.class);
                    startActivity(home);
                    finish();
                } else {
                    Intent home = new Intent(Splash.this, Home_Activity.class);
                    startActivity(home);
                    finish();
                }
            }
        }, 1500);

        initializeFireBaseConfig();
    }

    private FirebaseConfig firebaseConfig;

    private void initializeFireBaseConfig() {
        firebaseConfig = new FirebaseConfig();
        firebaseConfig.fetchNewVersion(Splash.this);
    }


    void UpdateRecyclerView() {
        RetroFitClient PostList = ServiceGenerator.getRetrofit().create(RetroFitClient.class);
        Observable<Posts_List> observable = PostList.getPostDataRx("73",100);
        Disposable d = observable.subscribeOn(Schedulers.io())
                .observeOn(AndroidSchedulers.mainThread())
                .subscribeWith(new DisposableObserver<Posts_List>()
                {
                    @Override
                    public void onNext(Posts_List posts_list) {
                        //insertAllPost(posts_list.getData());
                        //LoadBookmarkRx();
                        oud_Viewmodel.insertAllPost(posts_list.getData());
                        Log.d(TAG, "onLoadLatest: "+ posts_list.getMessage());

                    }

                    @Override
                    public void onError(Throwable e) {

                        Toast.makeText(getApplicationContext(),
                                e.getMessage(),
                                Toast.LENGTH_SHORT)
                                .show();
                        Log.d(TAG, "onError: "+e.getLocalizedMessage());
                    }

                    @Override
                    public void onComplete() {
                        Toast.makeText(getApplicationContext(),
                                "Creations Updated",
                                Toast.LENGTH_SHORT)
                                .show();
                        //d.dispose();
                    }


                });
    }

    public static String printKeyHash(Activity context) {
        PackageInfo packageInfo;
        String key = null;
        try {
            //getting application package name, as defined in manifest
            String packageName = context.getApplicationContext().getPackageName();

            //Retriving package info
            packageInfo = context.getPackageManager().getPackageInfo(packageName,
                    PackageManager.GET_SIGNATURES);

            Log.e("Package Name=", context.getApplicationContext().getPackageName());

            for (android.content.pm.Signature signature : packageInfo.signatures) {
                MessageDigest md = MessageDigest.getInstance("SHA");
                md.update(signature.toByteArray());
                key = new String(Base64.encode(md.digest(), 0));

                // String key = new String(Base64.encodeBytes(md.digest()));
                Log.e("Key Hash=", key);
            }
        } catch (PackageManager.NameNotFoundException e1) {
            Log.e("Name not found", e1.toString());
        } catch (NoSuchAlgorithmException e) {
            Log.e("No such an algorithm", e.toString());
        } catch (Exception e) {
            Log.e("Exception", e.toString());
            e.printStackTrace();
        }

        return key;
    }



    @Override
    protected void onResume() {
        super.onResume();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
    }
}
