# Google Play Services broker investigation

- Symptom: `GoogleApiManager` logs `SecurityException: Unknown calling package name 'com.google.android.gms'` during app startup on emulator-5554. The GC line is informational.
- Reproduction: cleared logcat, force-stopped and launched `com.ibitvalley.writon`, then collected startup logs.
- Decisive evidence: Firebase initializes, `FIAM.Display: Binding to activity` appears, and then the provider-installer flag registration and broker failure occur in the next ~300 ms.
- Code evidence: the app includes `firebase-inappmessaging-display` but no Kotlin source references Firebase In-App Messaging.
- Hypothesis: unused Firebase In-App Messaging auto-initialization is requesting the failing Play Services broker path. Prediction: disabling FIAM automatic initialization removes FIAM binding and the broker failure while normal UI launch remains successful.
- Experiment result: falsified on the current emulator. The manifest opt-out did not stop `FIAM.Display` from binding, consistent with Firebase's persisted runtime setting taking precedence. The broker failure remained.
- Next minimal change: remove the unused `firebase-inappmessaging-display` dependency. This removes the FIAM startup client entirely; the app has no source usage of that SDK.
- Verification: rebuilt and installed the app, cleared logcat, force-stopped, and launched it. Firebase initialized normally; there were no `FIAM.Display`, `providerinstaller`, `GoogleApiManager`, `SecurityException`, or fatal-exception entries in the seven-second startup window. The causal hypothesis is supported.
