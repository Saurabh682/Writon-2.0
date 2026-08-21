package com.ibitvalley.writon.classes.model;

import android.os.Parcel;
import android.os.Parcelable;

import androidx.room.Ignore;

import com.google.gson.annotations.Expose;
import com.google.gson.annotations.SerializedName;
import com.ibitvalley.writon.classes.roomdataclasses.User_List_Data;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;


public class UserList implements Serializable, Parcelable
{

    @SerializedName("success")
    @Expose
    private String success;
    @SerializedName("message")
    @Expose
    private String message;
    @SerializedName("data")
    @Expose
    private List<User_List_Data> data = new ArrayList<>();
    public final static Parcelable.Creator<UserList> CREATOR = new Creator<UserList>() {


        @SuppressWarnings({
                "unchecked"
        })
        public UserList createFromParcel(Parcel in) {
            return new UserList(in);
        }

        public UserList[] newArray(int size) {
            return (new UserList[size]);
        }

    }
            ;
    private final static long serialVersionUID = 5972392425056590335L;

    protected UserList(Parcel in) {
        this.success = ((String) in.readValue((String.class.getClassLoader())));
        this.message = ((String) in.readValue((String.class.getClassLoader())));
        in.readList(this.data, ( com.ibitvalley.writon.classes.roomdataclasses.User_List_Data.class.getClassLoader()));
    }
    @Ignore
    public UserList() {
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

    public List<User_List_Data> getData() {
        return data;
    }

    public void setData(List<User_List_Data> data) {
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
