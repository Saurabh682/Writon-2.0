# Fix Signup Flow Mismatch between Android App and New Backend

The user reported that "Signup is not working" and "nothing happens when I press the Sign Up". My investigation revealed a complete mismatch between the Android app's authentication logic and the new Node.js backend. The app is still trying to call legacy `.php` endpoints with form-encoded data, while the new backend expects JSON endpoints at different paths. Additionally, the app lacks proper progress feedback and has flawed validation logic.

## Proposed Changes

### [Component] Android App - API Layer

#### [MODIFY] [RetroFitClient.java](file:///D:/VibeCode/WritOn-PowerUp/app/src/main/java/com/ibitvalley/writon/retroFit/RetroFitClient.java)
- Update `@POST("registerUser.php")` to `@POST("register")`.
- Change `register` method to accept `@Body SignupBody` instead of individual `@Field`s.
- Update `@POST("login.php")` to `@POST("login")`.
- Change `login` method to accept `@Body LoginBody` for JSON consistency (or use a Map).
- Ensure return types match the new server response structure.

#### [MODIFY] [SignupBody.java](file:///D:/VibeCode/WritOn-PowerUp/app/src/main/java/com/ibitvalley/writon/classes/model/SignupBody.java)
- Align field names with the server's `registerSchema`: `penName`, `fullName`, `email`, `password`.
- Add `@SerializedName` annotations to ensure correct JSON mapping.

#### [MODIFY] [SignupResponse.java](file:///D:/VibeCode/WritOn-PowerUp/app/src/main/java/com/ibitvalley/writon/classes/model/SignupResponse.java)
- Update fields to match the server's response: `message`, `token`, `user`.
- Since the server uses HTTP status codes instead of a `success` field in the JSON, I will add a helper method to check success based on whether the `token` or `user` is present, or handle it via HTTP status in the activity.

---

### [Component] Android App - UI Layer

#### [MODIFY] [Signup.java](file:///D:/VibeCode/WritOn-PowerUp/app/src/main/java/com/ibitvalley/writon/Signup.java)
- Fix `checkValidation()`: Combine the validation logic into a single `if-else if` chain to ensure it returns early on errors and only submits if ALL fields are valid.
- Add `showProgressDialog(true)` at the start of `createUserAccount()`.
- Disable the "Sign up" button when the request is in flight.
- Update `createUserAccount()` to populate the new `SignupBody` and call the updated Retrofit method.
- Add better error handling for `HttpException` (e.g., 409 Conflict for existing email/penName).

#### [MODIFY] [LoginActivity.java](file:///D:/VibeCode/WritOn-PowerUp/app/src/main/java/com/ibitvalley/writon/LoginActivity.java)
- Update `validateUser()` to call the new login endpoint.
- Fix the `email.length() > 10` check to allow shorter valid emails.

---

### [Component] Backend (Optional/Verification)
- Verify that the server's `register` and `login` endpoints are working as expected.

## Verification Plan

### Automated Tests
- I cannot run automated tests in this environment, but I will perform a build to ensure no syntax errors were introduced.

### Manual Verification
- Deploy the app to an emulator.
- Attempt to sign up with valid details.
- Verify that the progress bar shows and the app navigates to the login screen (or home screen) on success.
- Attempt to sign up with an existing email and verify that the "Conflict" error is shown as a Toast.
