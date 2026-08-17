package com.ibitvalley.writon.classes.model;

import android.os.Parcel;
import android.os.Parcelable;

import com.google.gson.annotations.Expose;
import com.google.gson.annotations.SerializedName;
import com.ibitvalley.writon.classes.roomdataclasses.Post_List_Data;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;


public class Posts_List implements Serializable, Parcelable
{

    @SerializedName("success")
    @Expose
    private String success;
    @SerializedName("message")
    @Expose
    private String message;
    @SerializedName("data")
    @Expose
    private List<Post_List_Data> data = new ArrayList<>();


    public final static Parcelable.Creator<Posts_List> CREATOR = new Creator<Posts_List>() {


        @SuppressWarnings({
                "unchecked"
        })
        public Posts_List createFromParcel(Parcel in) {
            return new Posts_List(in);
        }

        public Posts_List[] newArray(int size) {
            return (new Posts_List[size]);
        }

    }
            ;
    private final static long serialVersionUID = 5513152799355426227L;

    protected Posts_List(Parcel in) {
        this.success = ((String) in.readValue((String.class.getClassLoader())));
        this.message = ((String) in.readValue((String.class.getClassLoader())));
        in.readList(this.data, (com.ibitvalley.writon.classes.roomdataclasses.Post_List_Data.class.getClassLoader()));
    }

    /**
     * No args constructor for use in serialization
     *
     */
    public Posts_List() {
    }

    /**
     *
     * @param data
     * @param success
     * @param message
     */
    public Posts_List(String success, String message, List<Post_List_Data> data) {
        super();
        this.success = success;
        this.message = message;
        this.data = data;
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

    public List<Post_List_Data> getData() {
        return data;
    }

    public void setData(List<Post_List_Data> data) {
        this.data = data;
    }

    public void writeToParcel(Parcel dest, int flags) {
        dest.writeValue(success);
        dest.writeValue(message);
        dest.writeList(data);
    }

    public int describeContents() {
        return 0;
    }

}