# Fix UnsatisfiedLinkError (gmscore) related to 16KB Page Size

The error `java.lang.UnsatisfiedLinkError: Failed to load native library: gmscore` with the tag `GmsCorePageSize` is a known issue when running apps targeting Android 15 (API 35) on devices or emulators that use a 16KB page size. This occurs because older versions of Google Play Services libraries contain native code that is not aligned to 16KB boundaries.

## Proposed Changes

### [Build Configuration]

We will update the Google Play Services and Firebase dependencies to their latest stable versions, which include the necessary 16KB alignment for Android 15 compatibility.

#### [MODIFY] [app/build.gradle](file:///D:/VibeCode/WritOn-PowerUp/app/build.gradle)

- Update `com.google.android.gms:play-services-analytics` from `18.1.0` to `18.1.1`.
- Update `com.google.android.gms:play-services-auth` from `21.2.0` to `21.3.0` (or latest stable compatible with BoM).
- Update `com.google.firebase:firebase-bom` from `33.3.0` to `33.10.0` (Latest stable in 33.x series or higher as per `version_lookup`).

> [!NOTE]
> I will use `33.10.0` for Firebase BoM as a safe upgrade, or the version suggested by `version_lookup` if it's confirmed stable. `version_lookup` returned `34.17.0`, which I will verify.

## Verification Plan

### Automated Tests
- Run `./gradlew assembleDebug` to ensure the project builds correctly with the new dependency versions.

### Manual Verification
- Deploy the app to an Android 15 emulator or device (especially one with 16KB page size enabled if available) and verify that the `UnsatisfiedLinkError` no longer occurs during startup or when using GMS-related features (like Analytics or Auth).
