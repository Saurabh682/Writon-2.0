package com.ibitvalley.writon.googleAnalytics;

import android.app.Application;
import android.content.Context;
import android.content.IntentFilter;
import android.os.Bundle;

import com.google.firebase.analytics.FirebaseAnalytics;
import com.ibitvalley.writon.InternetChangeReceiver;

/**

 */

public class MyApplication extends Application {
    public static final String TAG = MyApplication.class
            .getSimpleName();

    private static MyApplication mInstance;
    private static Context mAppContext;
    private InternetChangeReceiver myReceiver;
    private FirebaseAnalytics mFirebaseAnalytics;

    @Override
    public void onCreate() {
        super.onCreate();
        mInstance = this;
        mAppContext = this;
        mFirebaseAnalytics = FirebaseAnalytics.getInstance(this);
        registerInternetReciever();
    }

    public void registerInternetReciever()
    {
        IntentFilter filter = new IntentFilter();
        filter.addAction("android.net.conn.CONNECTIVITY_CHANGE");
        myReceiver = new InternetChangeReceiver();
        registerReceiver(myReceiver, filter);
    }

    public static synchronized MyApplication getInstance() {
        return mInstance;
    }


    public static Context getAppContext() {
        return mAppContext;
    }


    /***
     * Tracking screen view
     *
     * @param screenName screen name to be displayed on GA dashboard
     */
    public void trackScreenView(String screenName) {
        Bundle bundle = new Bundle();
        bundle.putString(FirebaseAnalytics.Param.SCREEN_NAME, screenName);
        bundle.putString(FirebaseAnalytics.Param.SCREEN_CLASS, screenName);
        mFirebaseAnalytics.logEvent(FirebaseAnalytics.Event.SCREEN_VIEW, bundle);
    }

    /***
     * Tracking exception
     *
     * @param e exception to be tracked
     */
    public void trackException(Exception e) {
        if (e != null) {
            // Firebase Crashlytics should be used for exceptions
            // For now, logging as a simple event
            Bundle bundle = new Bundle();
            bundle.putString("exception_message", e.getMessage());
            mFirebaseAnalytics.logEvent("app_exception", bundle);
        }
    }

    /***
     * Tracking event
     *
     * @param category event category
     * @param action   action of the event
     * @param label    label
     */
    public void trackEvent(String category, String action, String label) {
        Bundle bundle = new Bundle();
        bundle.putString("category", category);
        bundle.putString("action", action);
        bundle.putString("label", label);
        mFirebaseAnalytics.logEvent("custom_event", bundle);
    }


    @Override
    public void onTerminate() {
        super.onTerminate();
    }
}
