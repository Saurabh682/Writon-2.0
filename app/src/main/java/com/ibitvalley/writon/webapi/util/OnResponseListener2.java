package com.ibitvalley.writon.webapi.util;

import com.android.volley.VolleyError;
import com.ibitvalley.writon.model.Followers;

import java.util.ArrayList;

public interface OnResponseListener2 {
    ArrayList<Followers> onSuccess(Object result);
    void onError(VolleyError error);
}
