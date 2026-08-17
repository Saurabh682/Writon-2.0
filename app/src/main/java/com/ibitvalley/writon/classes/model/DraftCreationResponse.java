package com.ibitvalley.writon.classes.model;

import com.google.gson.annotations.Expose;
import com.google.gson.annotations.SerializedName;
import com.ibitvalley.writon.classes.roomdataclasses.Post_List_Data;

import java.util.List;

public class DraftCreationResponse {

    @SerializedName( "message" )
    @Expose
    String message;

    @SerializedName( "success" )
    @Expose
    int success;

    @SerializedName("data")
    @Expose
    List<Post_List_Data> data;

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

    public List<Post_List_Data> getData() {
        return data;
    }

    public void setData(List<Post_List_Data> data) {
        this.data = data;
    }
}
