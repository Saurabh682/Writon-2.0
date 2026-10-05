package com.ibitvalley.writon.modern.feature.auth

import android.app.Activity
import androidx.activity.compose.LocalActivityResultRegistryOwner
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.firebase.auth.EmailAuthProvider
import com.google.firebase.auth.FirebaseAuth
import com.ibitvalley.writon.R
import com.ibitvalley.writon.modern.core.auth.FirebaseAuthManager
import com.ibitvalley.writon.modern.core.auth.GoogleCredentialSignIn
import com.ibitvalley.writon.modern.core.auth.GoogleCredentialResult
import com.ibitvalley.writon.modern.core.auth.ProfileSyncManager
import com.ibitvalley.writon.modern.core.network.model.UpsertMyProfileRequestDto
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnTheme
import kotlinx.coroutines.launch

private val BrandBeigeColor = Color(0xFFF8F4EE)
private val BrandRedColor = Color(0xFFE75A2A)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SignupScreen(
    onBackClick: () -> Unit,
    onSignInClick: () -> Unit,
    onCreateAccountClick: () -> Unit
) {
    val context = LocalContext.current
    val activity = LocalActivityResultRegistryOwner.current as? Activity ?: context as? Activity
    var fullName by rememberSaveable { mutableStateOf("") }
    var email by rememberSaveable { mutableStateOf("") }
    var username by rememberSaveable { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }
    var confirmPasswordVisible by remember { mutableStateOf(false) }
    var agreeToTerms by rememberSaveable { mutableStateOf(false) }
    var isSubmitting by remember { mutableStateOf(false) }
    var googleStage by remember { mutableIntStateOf(0) }
    var authError by remember { mutableStateOf<String?>(null) }
    var pendingProfileKind by rememberSaveable {
        mutableStateOf(
            if (FirebaseAuth.getInstance().currentUser?.providerData?.any {
                    it.providerId == EmailAuthProvider.PROVIDER_ID
                } == true
            ) "email" else null
        )
    }
    val coroutineScope = rememberCoroutineScope()

    val googleUnavailable = stringResource(R.string.auth_google_unavailable)
    val sessionVerificationFailed = stringResource(R.string.auth_session_verification_failed)
    val googleProfileFailed = stringResource(R.string.auth_google_profile_failed)
    val alreadyHaveAccount = stringResource(R.string.auth_already_have_account)
    val signIn = stringResource(R.string.auth_sign_in)
    val termsPrefix = stringResource(R.string.auth_terms_prefix)
    val termsAnd = stringResource(R.string.auth_terms_and)
    val terms = stringResource(R.string.welcome_terms)
    val privacy = stringResource(R.string.welcome_privacy)
    val accountSessionPending = stringResource(R.string.auth_account_session_pending)
    val accountProfileFailed = stringResource(R.string.auth_account_profile_failed)

    fun finishEmailProfileSetup() {
        FirebaseAuthManager.syncNetworkAuthToken { hasToken ->
            if (!hasToken) {
                isSubmitting = false
                authError = accountSessionPending
                return@syncNetworkAuthToken
            }

            coroutineScope.launch {
                val profileError = ProfileSyncManager.syncProfile(
                    UpsertMyProfileRequestDto(
                        penName = username,
                        fullName = fullName
                    )
                )
                isSubmitting = false
                if (profileError == null) {
                    pendingProfileKind = null
                    onCreateAccountClick()
                } else {
                    authError = accountProfileFailed.format(profileError)
                }
            }
        }
    }

    val webClientId = stringResource(R.string.default_web_client_id)
    fun startGoogleSignIn() {
        if (isSubmitting) return
        if (activity == null) {
            authError = googleUnavailable
            return
        }
        isSubmitting = true
        googleStage = 1
        authError = null
        coroutineScope.launch {
            when (val result = GoogleCredentialSignIn.request(activity, webClientId)) {
                GoogleCredentialResult.Cancelled -> {
                    googleStage = 0
                    isSubmitting = false
                }
                is GoogleCredentialResult.Failure -> {
                    googleStage = 0
                    isSubmitting = false
                    authError = result.message
                }
                is GoogleCredentialResult.Success -> {
                    googleStage = 2
                    FirebaseAuthManager.signInWithGoogle(
                        idToken = result.idToken,
                        onSuccess = {
                            FirebaseAuthManager.syncNetworkAuthToken { hasToken ->
                                if (!hasToken) {
                                    googleStage = 0
                                    isSubmitting = false
                                    authError = sessionVerificationFailed
                                } else coroutineScope.launch {
                                    val profileError = ProfileSyncManager.syncGoogleProfile()
                                    googleStage = 0
                                    isSubmitting = false
                                    if (profileError == null) onCreateAccountClick()
                                    else authError = googleProfileFailed.format(profileError)
                                }
                            }
                        },
                        onError = {
                            googleStage = 0
                            isSubmitting = false
                            authError = it
                        }
                    )
                }
            }
        }
    }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = BrandBeigeColor
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 24.dp)
                .verticalScroll(rememberScrollState())
        ) {
            Spacer(modifier = Modifier.height(16.dp))

            // Top Bar
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onBackClick, enabled = !isSubmitting) {
                    Image(
                        painterResource(R.drawable.ic_back),
                        contentDescription = stringResource(R.string.common_back),
                        modifier = Modifier.size(24.dp),
                        colorFilter = ColorFilter.tint(MaterialTheme.colorScheme.onBackground)
                    )
                }

                Text(
                    text = buildAnnotatedString {
                        append(alreadyHaveAccount)
                        append(" ")
                        withStyle(style = SpanStyle(color = BrandRedColor, fontWeight = FontWeight.Bold)) {
                            append(signIn)
                        }
                    },
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.clickable { onSignInClick() }
                )
            }

            Spacer(modifier = Modifier.height(32.dp))

            // Header
            Text(
                text = stringResource(R.string.auth_signup_heading),
                style = MaterialTheme.typography.headlineLarge.copy(
                    fontSize = 36.sp,
                    lineHeight = 44.sp,
                    fontWeight = FontWeight.Normal
                ),
                color = Color(0xFF151718)
            )

            Text(
                text = stringResource(R.string.auth_signup_community),
                style = MaterialTheme.typography.bodyLarge,
                color = Color(0xFF6D6963),
                modifier = Modifier.padding(top = 12.dp)
            )

            Box(
                modifier = Modifier
                    .padding(top = 16.dp)
                    .width(40.dp)
                    .height(4.dp)
                    .background(BrandRedColor)
            )

            Spacer(modifier = Modifier.height(32.dp))

            // Form Fields
            SignupTextField(
                label = stringResource(R.string.auth_full_name_hint),
                value = fullName,
                onValueChange = { fullName = it },
                placeholder = stringResource(R.string.auth_full_name_placeholder),
                leadingIcon = R.drawable.ic_profile
            )

            SignupTextField(
                label = stringResource(R.string.auth_email_hint),
                value = email,
                onValueChange = { email = it },
                placeholder = stringResource(R.string.auth_email_or_user_hint),
                leadingIcon = R.drawable.ic_email
            )

            SignupTextField(
                label = stringResource(R.string.auth_username_hint),
                value = username,
                onValueChange = { username = it },
                placeholder = stringResource(R.string.auth_username_placeholder),
                leadingIcon = R.drawable.ic_mention,
                helperText = stringResource(R.string.auth_username_helper)
            )

            SignupPasswordField(
                label = stringResource(R.string.auth_password_hint),
                value = password,
                onValueChange = { password = it },
                placeholder = stringResource(R.string.auth_create_password_placeholder),
                visible = passwordVisible,
                onVisibilityToggle = { passwordVisible = !passwordVisible },
                visibilityDescription = stringResource(
                    if (passwordVisible) R.string.auth_hide_password else R.string.auth_show_password
                ),
                helperText = stringResource(R.string.auth_password_requirements)
            )

            SignupPasswordField(
                label = stringResource(R.string.auth_confirm_password_hint),
                value = confirmPassword,
                onValueChange = { confirmPassword = it },
                placeholder = stringResource(R.string.auth_confirm_password_placeholder),
                visible = confirmPasswordVisible,
                onVisibilityToggle = { confirmPasswordVisible = !confirmPasswordVisible },
                visibilityDescription = stringResource(
                    if (confirmPasswordVisible) R.string.auth_hide_password else R.string.auth_show_password
                )
            )

            Spacer(modifier = Modifier.height(16.dp))

            // Terms Agreement
            Row(
                verticalAlignment = Alignment.Top,
                modifier = Modifier.fillMaxWidth()
            ) {
                Checkbox(
                    checked = agreeToTerms,
                    onCheckedChange = { agreeToTerms = it },
                    colors = CheckboxDefaults.colors(checkedColor = BrandRedColor)
                )
                Text(
                    text = buildAnnotatedString {
                        append(termsPrefix)
                        append("\n")
                        withStyle(style = SpanStyle(color = BrandRedColor)) {
                            append(terms)
                        }
                        append(" $termsAnd ")
                        withStyle(style = SpanStyle(color = BrandRedColor)) {
                            append(privacy)
                        }
                        append(".")
                    },
                    style = MaterialTheme.typography.bodySmall,
                    color = Color(0xFF6D6963),
                    modifier = Modifier.padding(top = 12.dp)
                )
            }

            Spacer(modifier = Modifier.height(32.dp))

            // Create Account Button
            Button(
                onClick = {
                    authError = null
                    isSubmitting = true
                    if (shouldCreateFirebaseIdentity(pendingProfileKind)) {
                        FirebaseAuthManager.createAccount(
                            email = email,
                            password = password,
                            onSuccess = {
                                pendingProfileKind = "email"
                                finishEmailProfileSetup()
                            },
                            onError = { message ->
                                isSubmitting = false
                                authError = message
                            }
                        )
                    } else {
                        finishEmailProfileSetup()
                    }
                },
                enabled = canSubmitSignupForm(
                    pendingProfileKind = pendingProfileKind,
                    fullName = fullName,
                    email = email,
                    username = username,
                    password = password,
                    confirmPassword = confirmPassword,
                    agreedToTerms = agreeToTerms,
                ) && !isSubmitting,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                colors = ButtonDefaults.buttonColors(containerColor = BrandRedColor),
                shape = RoundedCornerShape(16.dp)
            ) {
                Text(
                    text = when {
                        isSubmitting -> stringResource(R.string.auth_creating_account)
                        pendingProfileKind != null -> stringResource(R.string.auth_finish_setup)
                        else -> stringResource(R.string.auth_create_account)
                    },
                    style = MaterialTheme.typography.titleMedium,
                    color = Color(0xFFFFFDF9)
                )
            }

            authError?.let { message ->
                Text(
                    text = message,
                    // Orange is for actions; a profile-sync status should not compete with one.
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.padding(top = 12.dp)
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Footer / Divider
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(vertical = 16.dp)
            ) {
                HorizontalDivider(modifier = Modifier.weight(1f), color = Color(0xFFE9E1D7))
                Text(
                    text = stringResource(R.string.auth_or_sign_up_with),
                    modifier = Modifier.padding(horizontal = 16.dp),
                    style = MaterialTheme.typography.bodySmall,
                    color = Color(0xFF6D6963)
                )
                HorizontalDivider(modifier = Modifier.weight(1f), color = Color(0xFFE9E1D7))
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Social Button
            SocialSignupButton(
                text = stringResource(when (googleStage) {
                    1 -> R.string.auth_google_opening
                    2 -> R.string.auth_signing_in
                    else -> R.string.auth_google_sign_in
                }),
                icon = R.drawable.googleicon,
                modifier = Modifier.fillMaxWidth(),
                enabled = !isSubmitting,
                isLoading = googleStage != 0,
                onClick = ::startGoogleSignIn
            )

            Spacer(modifier = Modifier.height(48.dp))
        }
    }
}

@Composable
fun SignupTextField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    leadingIcon: Int,
    helperText: String? = null
) {
    Column(modifier = Modifier.padding(vertical = 8.dp)) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelLarge,
            color = Color(0xFF151718),
            modifier = Modifier.padding(bottom = 8.dp)
        )
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text(placeholder) },
            leadingIcon = { Image(painterResource(leadingIcon), contentDescription = null, modifier = Modifier.size(22.dp)) },
            shape = RoundedCornerShape(12.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedTextColor = Color(0xFF151718),
                unfocusedTextColor = Color(0xFF151718),
                focusedContainerColor = Color.Transparent,
                unfocusedContainerColor = Color.Transparent,
                focusedBorderColor = BrandRedColor,
                unfocusedBorderColor = Color(0xFF6D6963),
                focusedLeadingIconColor = BrandRedColor,
                unfocusedLeadingIconColor = Color(0xFF6D6963)
            )
        )
        if (helperText != null) {
            Text(
                text = helperText,
                style = MaterialTheme.typography.bodySmall,
                color = Color(0xFF6D6963),
                modifier = Modifier.padding(top = 4.dp)
            )
        }
    }
}

@Composable
fun SignupPasswordField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    visible: Boolean,
    onVisibilityToggle: () -> Unit,
    visibilityDescription: String,
    helperText: String? = null
) {
    Column(modifier = Modifier.padding(vertical = 8.dp)) {
        Text(
            text = label,
            style = MaterialTheme.typography.labelLarge,
            color = Color(0xFF151718),
            modifier = Modifier.padding(bottom = 8.dp)
        )
        OutlinedTextField(
            value = value,
            onValueChange = onValueChange,
            modifier = Modifier.fillMaxWidth(),
            placeholder = { Text(placeholder) },
            leadingIcon = { Image(painterResource(R.drawable.ic_lock), contentDescription = null, modifier = Modifier.size(22.dp)) },
            trailingIcon = {
                val icon = if (visible) R.drawable.ic_eye else R.drawable.ic_eye_off
                IconButton(onClick = onVisibilityToggle) {
                    Image(
                        painterResource(icon),
                        contentDescription = visibilityDescription,
                        modifier = Modifier.size(22.dp)
                    )
                }
            },
            visualTransformation = if (visible) VisualTransformation.None else PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
            shape = RoundedCornerShape(12.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedTextColor = Color(0xFF151718),
                unfocusedTextColor = Color(0xFF151718),
                focusedContainerColor = Color.Transparent,
                unfocusedContainerColor = Color.Transparent,
                focusedBorderColor = BrandRedColor,
                unfocusedBorderColor = Color(0xFF6D6963),
                focusedLeadingIconColor = BrandRedColor,
                unfocusedLeadingIconColor = Color(0xFF6D6963),
                focusedTrailingIconColor = BrandRedColor,
                unfocusedTrailingIconColor = Color(0xFF6D6963)
            )
        )
        if (helperText != null) {
            Text(
                text = helperText,
                style = MaterialTheme.typography.bodySmall,
                color = Color(0xFF6D6963),
                modifier = Modifier.padding(top = 4.dp)
            )
        }
    }
}

@Composable
fun SocialSignupButton(
    text: String,
    icon: Int,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    isLoading: Boolean = false,
    onClick: () -> Unit
) {
    OutlinedButton(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier.height(56.dp),
        shape = RoundedCornerShape(12.dp),
        border = BorderStroke(1.dp, Color(0xFFE9E1D7)),
        colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFF151718))
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            if (isLoading) CircularProgressIndicator(modifier = Modifier.size(20.dp), color = BrandRedColor, strokeWidth = 2.dp)
            else Image(
                painter = painterResource(id = icon),
                contentDescription = null,
                modifier = Modifier.size(20.dp)
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(text = text, style = MaterialTheme.typography.bodyLarge)
        }
    }
}

@Preview(showBackground = true)
@Composable
fun SignupScreenPreview() {
    WritOnTheme {
        SignupScreen(onBackClick = {}, onSignInClick = {}, onCreateAccountClick = {})
    }
}

internal fun shouldCreateFirebaseIdentity(pendingProfileKind: String?): Boolean = pendingProfileKind == null

internal fun canSubmitSignupForm(
    pendingProfileKind: String?,
    fullName: String,
    email: String,
    username: String,
    password: String,
    confirmPassword: String,
    agreedToTerms: Boolean,
): Boolean = fullName.isNotBlank() && username.isNotBlank() && agreedToTerms && (
    pendingProfileKind != null || (
        email.isNotBlank() && password.length >= 8 && password == confirmPassword
    )
)
