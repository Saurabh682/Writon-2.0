package com.ibitvalley.writon.webapi.util;

import com.android.volley.VolleyError;

public interface OnResponseListener {
    public void onSuccess(Object result);

    public void onError(VolleyError error);
}
