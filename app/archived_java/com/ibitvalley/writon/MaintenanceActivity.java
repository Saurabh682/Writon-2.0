package com.ibitvalley.writon;

import android.app.Activity;
import android.os.Bundle;

import com.ibitvalley.writon.remoteConfig.FirebaseConfig;

public class MaintenanceActivity extends Activity {



    @Override
    protected void onPause() {
        super.onPause();
        finish();
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_maintenance);
    }

    @Override
    public void onBackPressed() {
        //  super.onBackPressed();
        FirebaseConfig firebaseConfig = new FirebaseConfig();
        firebaseConfig.isShowMaintenaceToast(MaintenanceActivity.this);
    }
}
