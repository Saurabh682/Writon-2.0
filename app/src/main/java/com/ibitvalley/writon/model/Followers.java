package com.ibitvalley.writon.model;

import android.os.Parcel;
import android.os.Parcelable;

import com.google.gson.annotations.Expose;
import com.google.gson.annotations.SerializedName;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

public class Followers implements Serializable, Parcelable
{

    @SerializedName("success")
    @Expose
    private String success;
    @SerializedName("message")
    @Expose
    private String message;
    @SerializedName("data")
    @Expose
    private List<followData> data = new ArrayList<followData>();
    public final static Parcelable.Creator<Followers> CREATOR = new Creator<Followers>() {


        @SuppressWarnings({
                "unchecked"
        })
        public Followers createFromParcel(Parcel in) {
            return new Followers(in);
        }

        public Followers[] newArray(int size) {
            return (new Followers[size]);
        }

    }
            ;
    private final static long serialVersionUID = 3491706475413850047L;

    protected Followers(Parcel in) {
        this.success = ((String) in.readValue((String.class.getClassLoader())));
        this.message = ((String) in.readValue((String.class.getClassLoader())));
        in.readList(this.data, (com.ibitvalley.writon.model.followData.class.getClassLoader()));
    }

    public Followers() {
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

    public List<followData> getData() {
        return data;
    }

    public void setData(List<followData> data) {
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
