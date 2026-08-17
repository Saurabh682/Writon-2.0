package com.ibitvalley.writon.classes.model;

import android.os.Parcel;
import android.os.Parcelable;

import com.google.gson.annotations.Expose;
import com.google.gson.annotations.SerializedName;
import com.ibitvalley.writon.classes.roomdataclasses.Post_List_Data;

import java.io.Serializable;
import java.util.ArrayList;


public class Posts_List_Response implements Serializable, Parcelable
{

    @SerializedName("success")
    @Expose
    private String success;
    @SerializedName("message")
    @Expose
    private String message;
    @SerializedName("data")
    @Expose
    private BlogDataResponse data;


    public final static Creator<Posts_List_Response> CREATOR = new Creator<Posts_List_Response>() {


        @SuppressWarnings({
                "unchecked"
        })
        public Posts_List_Response createFromParcel(Parcel in) {
            return new Posts_List_Response(in);
        }

        public Posts_List_Response[] newArray(int size) {
            return (new Posts_List_Response[size]);
        }

    }
            ;
    private final static long serialVersionUID = 5513152799355426227L;

    protected Posts_List_Response(Parcel in) {
        this.success = ((String) in.readValue((String.class.getClassLoader())));
        this.message = ((String) in.readValue((String.class.getClassLoader())));
//        in.rea(this.data, (BlogDataResponse.class.getClassLoader()));
    }

    /**
     * No args constructor for use in serialization
     *
     */
    public Posts_List_Response() {
    }

    /**
     *
     * @param data
     * @param success
     * @param message
     */
    public Posts_List_Response(String success, String message, ArrayList<Post_List_Data> data) {
        super();
        this.success = success;
        this.message = message;
//        this.data = data;
    }

    public String getSuccess() {
        return success;
    }

    public void setSuccess(String success) {
        this.success = success;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public BlogDataResponse getData() {
        return data;
    }

    public void setData(BlogDataResponse data) {
        this.data = data;
    }

    public void writeToParcel(Parcel dest, int flags) {
        dest.writeValue(success);
        dest.writeValue(message);
//        dest.writeList(data);
    }

    public int describeContents() {
        return 0;
    }

}