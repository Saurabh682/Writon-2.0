package  com.ibitvalley.writon;
import android.content.Context;
import android.content.SharedPreferences;

public class PrefManager {
    private static final String IS_NOTIFICATION = "isNotification";
    SharedPreferences pref;
    SharedPreferences.Editor editor;
    Context _context;

    // shared pref mode
    int PRIVATE_MODE = 0;

    // Shared preferences file name
    private static final String PREF_NAME = "androidhive-welcome";

    private static final String IS_FIRST_TIME_LAUNCH = "IsFirstTimeLaunch";

    public PrefManager(Context context) {
        this._context = context;
        pref = _context.getSharedPreferences(PREF_NAME, PRIVATE_MODE);
        editor = pref.edit();
        //pref.edit().remove("IsFirstTimeLaunch").apply();
    }

    public void setFirstTimeLaunch(boolean isFirstTime) {
        editor.putBoolean(IS_FIRST_TIME_LAUNCH, isFirstTime);
        editor.commit();
    }

    public boolean isFirstTimeLaunch() {
        return pref.getBoolean(IS_FIRST_TIME_LAUNCH, true);
    }

    public void setIsNotification(boolean isOn) {
        editor.putBoolean(IS_NOTIFICATION, isOn);
        editor.commit();
    }

    public boolean isNotification() {
        return pref.getBoolean(IS_NOTIFICATION, false);
    }


}
