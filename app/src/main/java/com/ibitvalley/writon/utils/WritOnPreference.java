package com.ibitvalley.writon.utils;

import android.content.Context;
import android.content.SharedPreferences;

import com.google.gson.Gson;
import com.ibitvalley.writon.constants.PrefrenceConstants;
import com.ibitvalley.writon.model.User;


public class WritOnPreference {

    private static WritOnPreference mInstance = null;
    private static SharedPreferences mPreferences;
    private static SharedPreferences.Editor mEditor;
    private Context context;
    private static String SharedPreferenceKey = "WriteOn";

    private WritOnPreference() {

    }

    public static WritOnPreference getInstance(Context context) {
        if (mInstance == null) {
            mInstance = new WritOnPreference();
        }
        if (mPreferences == null) {
            mPreferences = context.getApplicationContext().getSharedPreferences(PrefrenceConstants.KEY_USER_JSON_DETAILS, Context.MODE_PRIVATE);
            mEditor = mPreferences.edit();
        }
        return mInstance;
    }

    public void saveInPreference(String key, String value) {
        mEditor.putString(key, value);
        mEditor.commit();
    }

    public String getFromPreference(String key) {
        return mPreferences.getString(key, "");
    }

    public User getUserDetails() {
        String userJson = mPreferences.getString(PrefrenceConstants.KEY_USER_JSON_DETAILS, "");
        User user = null;
        if (userJson != null && !userJson.equals("")) {
            user = new Gson().fromJson(userJson, User.class);
        }
        return user;
    }

    public void saveUserDetails(User user) {
        mEditor.putString(PrefrenceConstants.KEY_USER_JSON_DETAILS, new Gson().toJson(user));
        mEditor.commit();
    }

    public boolean isAutoLogin() {
        String userJson = mPreferences.getString(PrefrenceConstants.KEY_USER_JSON_DETAILS, "");
        User user = null;
        if (userJson != null && !userJson.equals("")) {
            user = new Gson().fromJson(userJson, User.class);
            if (user != null) {
                return true;
            } else {
                return false;
            }
        } else {
            return false;
        }
    }
}
