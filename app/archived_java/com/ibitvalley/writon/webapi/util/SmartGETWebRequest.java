package com.ibitvalley.writon.webapi.util;

import android.content.Context;
import android.util.Log;

import com.android.volley.AuthFailureError;
import com.android.volley.Response;
import com.android.volley.VolleyError;
import com.android.volley.toolbox.StringRequest;
import com.ibitvalley.writon.custom_ui.WritOnProgressDialog;

import java.util.HashMap;
import java.util.Map;



public class SmartGETWebRequest extends StringRequest {
    String URL;
    HashMap<String, String> hm_params;
    Context context;
    boolean showLoading;
    String HeaderValue;
    public final String TAG = "WritOn API ";

    public SmartGETWebRequest(String URL, HashMap<String, String> hm_params, final OnResponseListener nmlistener) {
        super(Method.GET, URL, new Response.Listener<String>() {
            @Override
            public void onResponse(String response) {
                Log.d("WritOn API", "GET RESPONSE IS :" + response);
                nmlistener.onSuccess(response);
            }
        }, new Response.ErrorListener() {
            @Override
            public void onErrorResponse(VolleyError error) {
                Log.e("WritOn API", "GET RESPONSE ERROR :" + error.getMessage());
                error.printStackTrace();
                nmlistener.onError(error);
            }
        });

        this.URL = URL;
        this.hm_params = hm_params;
        Log.d(TAG, "GET URL IS :" + URL);

    }

    public SmartGETWebRequest(String URL, Context context, boolean showLoading, HashMap<String, String> hm_params, final OnResponseListener nmlistener) {
        super(Method.GET, URL, new Response.Listener<String>() {

            @Override
            public void onResponse(String response) {
                WritOnProgressDialog.getInstance().hideProgress();
                Log.d("WritOn API", "GET RESPONSE IS :" + response);
                nmlistener.onSuccess(response);
            }
        }, new Response.ErrorListener() {
            @Override
            public void onErrorResponse(VolleyError error) {
                WritOnProgressDialog.getInstance().hideProgress();
                Log.e("WritOn API", "GET RESPONSE ERROR :" + error.getMessage());
                error.printStackTrace();
                nmlistener.onError(error);

            }
        });
        this.URL = URL;
        this.hm_params = hm_params;

        this.context = context;
        this.showLoading = showLoading;
        if (showLoading) {
            WritOnProgressDialog.getInstance().showProgress(context, "Loading please wait..");
        }
        Log.d(TAG, "GET URL IS :" + URL);
    }

    public SmartGETWebRequest(String URL, Context context, boolean showLoading, final OnResponseListener nmlistener) {
        super(Method.GET, URL, new Response.Listener<String>() {

            @Override
            public void onResponse(String response) {
                WritOnProgressDialog.getInstance().hideProgress();
                Log.d("WritOn API", "GET RESPONSE IS :" + response);
                nmlistener.onSuccess(response);
            }
        }, new Response.ErrorListener() {
            @Override
            public void onErrorResponse(VolleyError error) {
                WritOnProgressDialog.getInstance().hideProgress();
                Log.e("WritOn API", "GET RESPONSE ERROR :" + error.getMessage());
                error.printStackTrace();
                nmlistener.onError(error);

            }
        });
        this.URL = URL;
        this.context = context;
        this.showLoading = showLoading;
        if (showLoading) {
            WritOnProgressDialog.getInstance().showProgress(context, "Loading please wait..");
        }
        Log.d(TAG, "GET URL IS :" + URL);
    }

    public SmartGETWebRequest(String URL, final OnResponseListener nmlistener) {
        super(Method.GET, URL, new Response.Listener<String>() {

            @Override
            public void onResponse(String response) {
                Log.d("WritOn API", "GET RESPONSE IS :" + response);
                nmlistener.onSuccess(response);
            }
        }, new Response.ErrorListener() {
            @Override
            public void onErrorResponse(VolleyError error) {
               Log.e("WritOn API", "GET RESPONSE ERROR :" + error.getMessage());
                error.printStackTrace();
                nmlistener.onError(error);

            }
        });
        this.URL = URL;
        Log.d(TAG, "GET URL IS :" + URL);
    }


    @Override
    protected Map<String, String> getParams() throws AuthFailureError {
//        hm_params.put("token", "lQsaicA7iTo7b1rj");
        Log.d(TAG, "GET REQUEST PARAMETERS ARE  :" + hm_params.toString());
        return hm_params;
    }

    @Override
    public Map<String, String> getHeaders() throws AuthFailureError {
        HashMap<String, String> headers = new HashMap<>();
        if (HeaderValue != null) {
            headers.put("token", HeaderValue);
            Log.d("Arrowed API", "POST HEADER  IS :" + headers.toString());
        }
        return headers;
    }
}
