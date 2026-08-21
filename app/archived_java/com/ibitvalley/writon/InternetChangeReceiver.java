package com.ibitvalley.writon;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.widget.Toast;

import com.ibitvalley.writon.utils.AppUtils;

import org.greenrobot.eventbus.EventBus;


public class InternetChangeReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(final Context context, final Intent intent) {

        boolean isConnected = AppUtils.isInternetAvailable(context);

        EventBus.getDefault().post(new InternetConnectionEvent(isConnected));
    }

}