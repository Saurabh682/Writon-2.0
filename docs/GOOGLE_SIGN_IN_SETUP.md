# Google Sign-In setup for WritOn Android

Google Sign-In needs both a **Web OAuth client** and an **Android OAuth client** in the Firebase project. The Android OAuth client must match the package name and certificate of the APK installed on the phone.

## Current verification result

- Package name: `com.ibitvalley.writon`
- Debug signing SHA-1: `E7:A8:4F:E1:84:6B:64:2C:FE:D8:59:99:D1:C7:78:93:49:CC:10:78`
- Upload/release signing SHA-1: `66:3C:91:71:D7:57:47:5F:8F:94:AB:1C:08:26:AD:38:F1:45:C6:0F`
- Upload/release signing SHA-256: `2F:C5:3D:AE:26:8C:D2:BE:11:20:00:C1:9E:9A:08:BD:EA:18:A0:D1:6F:0D:CC:CE:F1:C6:0F:86:F8:84:45:7D`
- Firebase lists both SHA-1 fingerprints on the Android app, but its freshly downloaded `google-services.json` contains only the debug Android OAuth client. Release installs therefore fail with Google Play services error 10 (`DEVELOPER_ERROR`).
- Release builds now fail early when the release Android OAuth client is absent, preventing another broken AAB from being uploaded.

## Fix in Firebase Console

1. Open Firebase Console → **Project settings** → **Your apps** → the Android app.
2. Confirm the package name is `com.ibitvalley.writon`.
3. Confirm both SHA-1 fingerprints above appear under **SHA certificate fingerprints**.
4. Open Google Cloud Console → **APIs & Services** → **Credentials** and confirm an Android OAuth client exists for the package and release SHA-1. Adding a Firebase fingerprint does not always create this client automatically.
5. If it is missing, create an **Android** OAuth client for `com.ibitvalley.writon` and the release SHA-1 above.
6. Open Firebase **Authentication** → **Sign-in method** and ensure **Google** is enabled.
7. Download the refreshed `google-services.json` and replace `app/google-services.json`.
8. Run `gradlew verifyReleaseGoogleSignInConfig` before building the signed APK/AAB.

For a future Play Store build, repeat step 3 with the Play App Signing certificate SHA-1 shown in Play Console. Do not manually edit OAuth client IDs in Android source; the app reads the Firebase-generated `default_web_client_id` resource.
