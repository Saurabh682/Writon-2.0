package com.ibitvalley.writon.classes.model;

import android.os.Parcel;
import android.os.Parcelable;

import com.google.gson.annotations.Expose;
import com.google.gson.annotations.SerializedName;
import com.ibitvalley.writon.classes.roomdataclasses.PersonalPost_List_Data;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

public class PersonalPost_List  implements Serializable, Parcelable
{

    @SerializedName("success")
    @Expose
    private String success;
    @SerializedName("message")
    @Expose
    private String message;
    @SerializedName("data")
    @Expose
    private List<PersonalPost_List_Data> data = new ArrayList<>();
    public final static Parcelable.Creator<PersonalPost_List> CREATOR = new Creator<PersonalPost_List>() {


        @SuppressWarnings({
                "unchecked"
        })
        public PersonalPost_List createFromParcel(Parcel in) {
            return new PersonalPost_List(in);
        }

        public PersonalPost_List[] newArray(int size) {
            return (new PersonalPost_List[size]);
        }

    }
            ;
    private final static long serialVersionUID = -6059232908781582477L;

    protected PersonalPost_List(Parcel in) {
        this.success = ((String) in.readValue((String.class.getClassLoader())));
        this.message = ((String) in.readValue((String.class.getClassLoader())));
        in.readList(this.data, (com.ibitvalley.writon.classes.roomdataclasses.PersonalPost_List_Data.class.getClassLoader()));
    }

    public PersonalPost_List() {
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

    public List<PersonalPost_List_Data> getData() {
        return data;
    }

    public void setData(List<PersonalPost_List_Data> data) {
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
