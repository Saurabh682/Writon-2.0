package com.ibitvalley.writon.webapi.util;

import com.android.volley.VolleyError;

public interface OnResponseListener2 {
  void onSuccess(Object result);

  void onError(VolleyError error);
}
