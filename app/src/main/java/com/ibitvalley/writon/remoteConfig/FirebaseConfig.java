package com.ibitvalley.writon.remoteConfig;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

import androidx.annotation.NonNull;

import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.Task;
import com.google.firebase.BuildConfig;
import com.google.firebase.remoteconfig.FirebaseRemoteConfig;
import com.google.firebase.remoteconfig.FirebaseRemoteConfigSettings;
import com.ibitvalley.writon.MaintenanceActivity;
import com.ibitvalley.writon.R;


public class FirebaseConfig {

    FirebaseRemoteConfig mFirebaseRemoteConfig;
    FirebaseRemoteConfigSettings configSettings;
    long cacheExpiration = 2700;
    String isShowPopUp = "";
    String newVersion = "";
    String isShowMaintenance = "";

    public FirebaseConfig() {
        mFirebaseRemoteConfig = FirebaseRemoteConfig.getInstance();
        FirebaseRemoteConfigSettings.Builder configSettingsBuilder = new FirebaseRemoteConfigSettings.Builder();
        if (com.ibitvalley.writon.BuildConfig.DEBUG) {
            configSettingsBuilder.setMinimumFetchIntervalInSeconds(0);
        }
        configSettings = configSettingsBuilder.build();
        mFirebaseRemoteConfig.setConfigSettingsAsync(configSettings);
        mFirebaseRemoteConfig.setDefaultsAsync(R.xml.remote_config_defaults);
    }

    public void fetchNewVersion(Context context) {

        mFirebaseRemoteConfig.fetch(getCacheExpiration())
                .addOnCompleteListener((Activity) context, new OnCompleteListener<Void>() {
                    @Override
                    public void onComplete(@NonNull Task<Void> task) {
                        // If is successful, activated fetched
                        if (task.isSuccessful()) {
                            mFirebaseRemoteConfig.activate();
                        } else {
                            Log.d("++FirebaseConfig", "new version FetchError");
                        }



                        isShowMaintenance = mFirebaseRemoteConfig.getString("is_show_maintenance");
                        if (isShowMaintenance.equalsIgnoreCase("true")) {
                            //if(BuildConfig.FLAVOR == "PROD") {
                                showMaintenanceActivity((Activity) context);
                            //}
                        }
                    }
                });


    }




    private void showMaintenanceActivity(Context context) {
        Intent intent = new Intent(context, MaintenanceActivity.class);
        context.startActivity(intent);
    }

    /*private void showVersionCheckPopUp(String version, Context context) {
        AlertDialog.Builder builder = new AlertDialog.Builder(context);
        builder.setTitle(R.string.title_upgrade)
                .setMessage(context.getResources().getString(R.string.title_upgrade) + version)
                .setCancelable(false)
                .setPositiveButton(R.string.upgrade, new DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(DialogInterface dialog, int which) {
                        String tempUrl = String.format(Constants.URL_PLAY_STORE, BuildConfig.APPLICATION_ID);
                        context.startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(tempUrl)));
                        dialog.dismiss();
                    }
                });

        AlertDialog alert = builder.create();
        alert.show();
    }*/


    public String isShowMaintenaceToast(Context context) {
        mFirebaseRemoteConfig.fetch(getCacheExpiration())
                .addOnCompleteListener((Activity) context, new OnCompleteListener<Void>() {
                    @Override
                    public void onComplete(@NonNull Task<Void> task) {
                        // If is successful, activated fetched
                        if (task.isSuccessful()) {
                            mFirebaseRemoteConfig.activate();
                        } else {
                            Log.d("++FirebaseConfig", "isShowPopUp FetchError");
                        }

                        isShowMaintenance = mFirebaseRemoteConfig.getString("is_show_maintenance");
                        Log.d("++FirebaseConfig", "is_show_maintenance backpress " + isShowMaintenance);
                        if (isShowMaintenance.equalsIgnoreCase("false")) {
                            ((Activity) context).finish();
                        }

                    }
                });
        return newVersion;
    }

    public long getCacheExpiration() {
        // If is developer mode, cache expiration set to 0, in order to test
//        if (mFirebaseRemoteConfig.getInfo().getConfigSettings().isDeveloperModeEnabled()) {
//            cacheExpiration = 0;
//        }
        return cacheExpiration;
    }
}
