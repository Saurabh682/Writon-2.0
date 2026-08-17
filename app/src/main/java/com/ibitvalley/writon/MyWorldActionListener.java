package com.ibitvalley.writon;

import com.ibitvalley.writon.model.MyWorldModel;

public interface MyWorldActionListener {
    void onClick(int position,String action,String blogId,boolean value,String userId,String username,String title);
    void onClickBookmark(int position,MyWorldModel myWorldModel,boolean value);
}
