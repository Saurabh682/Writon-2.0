package com.ibitvalley.writon;

import android.app.Dialog;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.IntentFilter;
import android.graphics.Color;
import android.os.Bundle;
import android.util.DisplayMetrics;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.Toast;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AlertDialog;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;

import com.google.android.material.snackbar.Snackbar;
import com.ibitvalley.writon.utils.AppUtils;

import org.greenrobot.eventbus.EventBus;
import org.greenrobot.eventbus.Subscribe;
import org.greenrobot.eventbus.ThreadMode;

public class BaseActivity extends FragmentActivity {


    private TinyDB tinydb;
    private Dialog dialog;
    private InternetChangeReceiver myReceiver;
    public Snackbar snackbar;
    View view;
    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate( savedInstanceState );
        view = getWindow().getDecorView().findViewById(android.R.id.content);


    }


    @Subscribe(threadMode = ThreadMode.MAIN,sticky = true)
    public void isInternetAvailable(InternetConnectionEvent internetConnectionEvent) {

        String message="";
        boolean keepShowing=false;
        if ( !internetConnectionEvent.isConnected ){
            keepShowing=true;
            message="Internet connection not Available";
            getWindow().clearFlags(WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE);

        }
        else {
            keepShowing=false;
            message="Connected";

        }

        snackbar = Snackbar.make(view, message, keepShowing ? Snackbar.LENGTH_INDEFINITE : Snackbar.LENGTH_SHORT);

        if ( !internetConnectionEvent.isConnected ){
            snackbar.getView().setBackgroundColor( ContextCompat.getColor(this,R.color.dot_dark_screen1));
            snackbar.setActionTextColor( Color.WHITE);
        }
        else {
            snackbar.getView().setBackgroundColor( ContextCompat.getColor(this,R.color.green));
        }

        if ( this instanceof WelcomeActivity )
        {
            //do nothing
        }
        else {
            snackbar.show();
        }



    }


    @Override
    protected void onResumeFragments() {
        if (!EventBus.getDefault().isRegistered(this)) {
            EventBus.getDefault().register(this);
        }

        super.onResumeFragments();

    }

    @Override
    protected void onPause() {
        if (!EventBus.getDefault().isRegistered(this)) {
            EventBus.getDefault().unregister(this);
        }
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        tinydb = new TinyDB(getApplicationContext());
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();

        if (tinydb!=null && !tinydb.getBoolean( "rememberMe" ) )
        {
            tinydb.clear();
        }

    }
}
