package com.ibitvalley.writon.model;

import com.ibitvalley.writon.R;

import java.util.ArrayList;

/**
 * Created by on 20-11-2016.
 */

public class AvtarUtil {

    private static int defaultDrawable = R.drawable.avtar6;
    private static ArrayList<Integer> drawables = new ArrayList<>();


    public static int getAvtarDrawableByType(int type) {
        int avtarType = defaultDrawable;
        getAvtarData();
        if (drawables != null && !drawables.isEmpty()) {
            avtarType = drawables.get(type);
        }
        return avtarType;
    }

    public static int getDeafultAvtarDrawable() {
        return defaultDrawable;
    }

    public static ArrayList getAvtarData() {
        drawables.clear();
        drawables.add(R.drawable.defaulta);
        drawables.add(R.drawable.avtar1);
        drawables.add(R.drawable.avtar2);
        drawables.add(R.drawable.avtar3);
        drawables.add(R.drawable.avtar4);
        drawables.add(R.drawable.avtar5);
        drawables.add(R.drawable.avtar6);
        drawables.add(R.drawable.avtar7);
        drawables.add(R.drawable.avtar8);
        drawables.add(R.drawable.avtar9);
        drawables.add(R.drawable.avtar10);
        drawables.add(R.drawable.avtar11);
        drawables.add(R.drawable.avtar12);
        drawables.add(R.drawable.avtar13);
        drawables.add(R.drawable.avtar14);
        drawables.add(R.drawable.avtar15);
        drawables.add(R.drawable.avtar16);
        drawables.add(R.drawable.avtar17);
        drawables.add(R.drawable.avtar18);
        drawables.add(R.drawable.avtar19);
        drawables.add(R.drawable.avtar20);
        drawables.add(R.drawable.avtar21);
        drawables.add(R.drawable.avtar22);
        drawables.add(R.drawable.avtar23);
        drawables.add(R.drawable.avtar24);
        drawables.add(R.drawable.avtar25);
        drawables.add(R.drawable.avtar26);
        drawables.add(R.drawable.avtar27);
        drawables.add(R.drawable.avtar28);
        drawables.add(R.drawable.avtar29);
        drawables.add(R.drawable.avtar30);
        drawables.add(R.drawable.avtar31);
        drawables.add(R.drawable.avtar32);
        drawables.add(R.drawable.avtar33);
        drawables.add(R.drawable.avtar34);
        drawables.add(R.drawable.avtar35);
        drawables.add(R.drawable.avtar36);
        drawables.add(R.drawable.avtar37);
        drawables.add(R.drawable.avtar38);
        drawables.add(R.drawable.avtar39);
        drawables.add(R.drawable.avtar40);
        drawables.add(R.drawable.avtar41);
        drawables.add(R.drawable.avtar42);
        drawables.add(R.drawable.avtar43);
        drawables.add(R.drawable.avtar44);
        drawables.add(R.drawable.avtar45);
        return drawables;
    }


}
