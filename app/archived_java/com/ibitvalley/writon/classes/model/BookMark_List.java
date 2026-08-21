package com.ibitvalley.writon.classes.model;

import android.os.Parcel;
import android.os.Parcelable;

import com.google.gson.annotations.Expose;
import com.google.gson.annotations.SerializedName;
import com.ibitvalley.writon.classes.roomdataclasses.BookMark_List_Data;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;


public class BookMark_List implements Serializable, Parcelable
{

    @SerializedName("success")
    @Expose
    private String success;
    @SerializedName("message")
    @Expose
    private String message;
    @SerializedName("data")
    @Expose
    private List<BookMark_List_Data> data = new ArrayList<>();
    public final static Creator<BookMark_List> CREATOR = new Creator<BookMark_List>() {


        @SuppressWarnings({
                "unchecked"
        })
        public BookMark_List createFromParcel(Parcel in) {
            return new BookMark_List(in);
        }

        public BookMark_List[] newArray(int size) {
            return (new BookMark_List[size]);
        }

    }
            ;
    private final static long serialVersionUID = 5513152799355426227L;

    protected BookMark_List(Parcel in) {
        this.success = ((String) in.readValue((String.class.getClassLoader())));
        this.message = ((String) in.readValue((String.class.getClassLoader())));
        in.readList(this.data, (BookMark_List_Data.class.getClassLoader()));
    }

    /**
     * No args constructor for use in serialization
     *
     */
    public BookMark_List() {
    }

    /**
     *
     * @param data
     * @param success
     * @param message
     */
    public BookMark_List(String success, String message, List<BookMark_List_Data> data) {
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

    public List<BookMark_List_Data> getData() {
        return data;
    }

    public void setData(List<BookMark_List_Data> data) {
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