package com.ibitvalley.writon.model;


import android.os.Parcel;
import android.os.Parcelable;

import com.google.gson.annotations.Expose;
import com.google.gson.annotations.SerializedName;

import java.io.Serializable;
import java.util.ArrayList;

public class LatestPost implements Serializable, Parcelable
{

    @SerializedName("success")
    @Expose
    private String success;
    @SerializedName("message")
    @Expose
    private String message;
    @SerializedName("data")
    @Expose
    private ArrayList<PostData> data = null;
    public final static Parcelable.Creator<LatestPost> CREATOR = new Creator<LatestPost>() {


        @SuppressWarnings({
                "unchecked"
        })
        public LatestPost createFromParcel(Parcel in) {
            return new LatestPost(in);
        }

        public LatestPost[] newArray(int size) {
            return (new LatestPost[size]);
        }

    }
            ;
    private final static long serialVersionUID = 6938226611433561870L;

    protected LatestPost(Parcel in) {
        this.success = ((String) in.readValue((String.class.getClassLoader())));
        this.message = ((String) in.readValue((String.class.getClassLoader())));
        in.readList(this.data, (com.ibitvalley.writon.model.PostData.class.getClassLoader()));
    }

    /**
     * No args constructor for use in serialization
     *
     */
    public LatestPost() {
    }

    /**
     *
     * @param data
     * @param success
     * @param message
     */
    public LatestPost(String success, String message, ArrayList<PostData> data) {
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

    public LatestPost withSuccess(String success) {
        this.success = success;
        return this;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }

    public LatestPost withMessage(String message) {
        this.message = message;
        return this;
    }

    public ArrayList<PostData> getData() {
        return data;
    }

    public void setData(ArrayList<PostData> data) {
        this.data = data;
    }

    public LatestPost withData(ArrayList<PostData> data) {
        this.data = data;
        return this;
    }

    public void writeToParcel(Parcel dest, int flags) {
        dest.writeValue(success);
        dest.writeValue(message);
        dest.writeList(data);
    }

    public int describeContents() {
        return 0;
    }

    public static ArrayList<PostData> LatestArrayList = new ArrayList<>();

}