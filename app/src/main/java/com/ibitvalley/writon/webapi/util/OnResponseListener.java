package com.ibitvalley.writon.webapi.util;

import com.android.volley.VolleyError;
import com.ibitvalley.writon.model.Blog;

import java.util.ArrayList;

public interface OnResponseListener {
    ArrayList<Blog> onSuccess(Object result);
    void onError(VolleyError error);
}
