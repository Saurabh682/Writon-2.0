package com.ibitvalley.writon;

import com.ibitvalley.writon.classes.roomdataclasses.Post_List_Data;

public class AddNewEvent {

    int position;
    ActionType type;
    boolean value;

    public AddNewEvent(int position,ActionType actionType,boolean value) {
        this.position=position;
        this.type=actionType;
        this.value=value;
    }

    public int getPosition() {
        return position;
    }

    public void setPosition(int position) {
        this.position = position;
    }

    public ActionType getType() {
        return type;
    }

    public void setType(ActionType type) {
        this.type = type;
    }

    public boolean getValue() {
        return value;
    }

    public void setValue(boolean value) {
        this.value = value;
    }
}
