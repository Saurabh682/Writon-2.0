package com.ibitvalley.writon.custom_ui;

import android.app.Activity;
import android.app.Dialog;
import android.content.Context;
import android.os.Bundle;
import android.util.DisplayMetrics;
import android.view.WindowManager;

import com.ibitvalley.writon.R;


public class RoundCornerDialog extends Dialog {

    private Context context;

    public RoundCornerDialog(Context context) {
        super(context);
        this.context = context;
        if (this.getWindow() != null) {
            getWindow().setBackgroundDrawable(context.getResources().getDrawable( R.drawable.white_corner_bg));
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        customizeDialog(this);
    }

    public void customizeDialog(Dialog dialog) {
        DisplayMetrics displayMetrics = new DisplayMetrics();
        ((Activity) context).getWindowManager().getDefaultDisplay().getMetrics(displayMetrics);

        int displayWidth = displayMetrics.widthPixels;
        int displayHeight = displayMetrics.heightPixels;

        WindowManager.LayoutParams layoutParams = new WindowManager.LayoutParams();

        layoutParams.copyFrom(dialog.getWindow().getAttributes());

        // Set the alert dialog window width and height
        // Set alert dialog width equal to screen width 90%
        int dialogWindowWidth = (int) (displayWidth * 0.8f);
        // Set alert dialog height equal to screen height 90%
        // int dialogWindowHeight = (int) (displayHeight * 0.9f);

        // Set alert dialog width equal to screen width 70%
        // int dialogWindowWidth = (int) (displayWidth * 06f);
        // Set alert dialog height equal to screen height 70%
        int dialogWindowHeight = (int) (displayHeight * 0.4f);

        // Set the width and height for the layout parameters
        // This will bet the width and height of alert dialog
        layoutParams.width = dialogWindowWidth;
//        layoutParams.height = dialogWindowHeight;


        // Apply the newly created layout parameters to the alert dialog window


        dialog.getWindow().setAttributes(layoutParams);
    }

}
