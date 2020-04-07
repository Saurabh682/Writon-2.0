package com.ibitvalley.writon.webapi.util;

import android.content.Context;
import android.util.Log;
import com.android.volley.AuthFailureError;
import com.android.volley.DefaultRetryPolicy;
import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.StringRequest;
import com.ibitvalley.writon.custom_ui.WritOnProgressDialog;
import com.ibitvalley.writon.model.User;
import com.ibitvalley.writon.utils.WritOnPreference;

import java.util.HashMap;
import java.util.Map;


public class SmartPostWebRequest extends StringRequest {
    String URL;
    HashMap<String, String> hm_params;
    Context context;
    boolean showLoading;
    String HeaderValue;
    public final String TAG = "WritOn API ";
    User user;


    public SmartPostWebRequest(String URL, HashMap<String, String> hm_params, final OnResponseListener nmlistener) {
        super(Method.POST, URL, new Response.Listener<String>() {

            @Override
            public void onResponse(String response) {
                Log.d("WritOn API", "POST RESPONSE IS :" + response);
                nmlistener.onSuccess(response);
            }
        }, new Response.ErrorListener() {
            @Override
            public void onErrorResponse(VolleyError error) {
                Log.e("WritOn API", "POST RESPONSE ERROR :" + error.getMessage());
                error.printStackTrace();
                nmlistener.onError(error);
            }
        });
        user = WritOnPreference.getInstance(context).getUserDetails();
        if (user != null)
            HeaderValue = user.getAccess_token();
        this.URL = URL;
        Log.d(TAG, "POST URL IS :" + URL);
        this.hm_params = hm_params;
        setRetryPolicy(new DefaultRetryPolicy(60000,0,0.0f));
        Log.d("WritOn API", "POST URL IS :" + URL);

    }
    public SmartPostWebRequest(String URL, Context context, boolean showLoading, HashMap<String, String> hm_params,
                               final OnResponseListener nmlistener) {
        super(Method.POST, URL, new Response.Listener<String>() {

            @Override
            public void onResponse(String response) {
                WritOnProgressDialog.getInstance().hideProgress();
                Log.d("WritOn API", "POST RESPONSE IS :" + response);
                nmlistener.onSuccess(response);
            }
        }, new Response.ErrorListener() {
            @Override
            public void onErrorResponse(VolleyError error) {
                WritOnProgressDialog.getInstance().hideProgress();
                Log.e("WritOn API", "POST RESPONSE ERROR :" + error.getMessage());
                error.printStackTrace();
                nmlistener.onError(error);
            }
        });

        this.URL = URL;
        this.hm_params = hm_params;
        user = WritOnPreference.getInstance(context).getUserDetails();
        if (user != null)
            HeaderValue = user.getAccess_token();
        this.context = context;
        this.showLoading = showLoading;

        if (showLoading) {
            WritOnProgressDialog.getInstance().showProgress(context, "Please wait..");
        }
        //VedashrayaProgressDialog.getInstance().showProgress(context, "Please wait..");
        setRetryPolicy(new DefaultRetryPolicy(60000,0,0.0f));
    }

    @Override
    public Map<String, String> getHeaders() throws AuthFailureError {
        HashMap<String, String> headers = new HashMap<>();
        if (HeaderValue != null) {
            headers.put("access-token", HeaderValue);
            Log.d("WritOn API", "POST HEADER  IS :" + headers.toString());
        }
        return headers;
    }

    @Override
    protected Map<String, String> getParams() throws AuthFailureError {
        Log.d("WritOn API", "POST Parameter  IS :" + hm_params.toString());
        return hm_params;
    }


}
