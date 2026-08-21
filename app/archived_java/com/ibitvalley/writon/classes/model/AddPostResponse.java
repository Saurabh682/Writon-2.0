package com.ibitvalley.writon.classes.model;

import com.google.gson.annotations.Expose;
import com.google.gson.annotations.SerializedName;
import com.ibitvalley.writon.classes.roomdataclasses.Post_List_Data;
import com.ibitvalley.writon.model.PostData;
import com.ibitvalley.writon.model.User;

public class AddPostResponse {

    @SerializedName( "message" )
    @Expose
    String message;

    @SerializedName( "success" )
    @Expose
    int success;

    @SerializedName("data")
    @Expose
    Post_List_Data data;

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public int getSuccess() {
        return success;
    }

    public void setSuccess(int success) {
        this.success = success;
    }

    public Post_List_Data getData() {
        return data;
    }

    public void setData(Post_List_Data data) {
        this.data = data;
    }
}
