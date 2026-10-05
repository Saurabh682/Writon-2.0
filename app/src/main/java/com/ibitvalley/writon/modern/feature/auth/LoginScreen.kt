package com.ibitvalley.writon.modern.feature.auth

import android.app.Activity
import androidx.activity.compose.LocalActivityResultRegistryOwner
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.runtime.*
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
import com.ibitvalley.writon.R
import com.ibitvalley.writon.modern.core.auth.FirebaseAuthManager
import com.ibitvalley.writon.modern.core.auth.GoogleCredentialSignIn
import com.ibitvalley.writon.modern.core.auth.GoogleCredentialResult
import com.ibitvalley.writon.modern.core.auth.ProfileSyncManager
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnTheme
import kotlinx.coroutines.launch

private val BrandBeigeColor = Color(0xFFF8F4EE)
private val BrandRedColor = Color(0xFFE75A2A)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(
    onBackClick: () -> Unit,
    onSignInClick: () -> Unit,
    onSignUpClick: () -> Unit
) {
    val context = LocalContext.current
    val activity = LocalActivityResultRegistryOwner.current as? Activity ?: context as? Activity
    val coroutineScope = rememberCoroutineScope()
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }
    var isSubmitting by remember { mutableStateOf(false) }
    var googleStage by remember { mutableIntStateOf(0) }
    var authError by remember { mutableStateOf<String?>(null) }
    var showResetDialog by remember { mutableStateOf(false) }
    var resetEmail by remember { mutableStateOf("") }
    var isSendingReset by remember { mutableStateOf(false) }
    var resetSuccessMessage by remember { mutableStateOf<String?>(null) }
    var resetErrorMessage by remember { mutableStateOf<String?>(null) }

    val googleUnavailable = stringResource(R.string.auth_google_unavailable)
    val sessionVerificationFailed = stringResource(R.string.auth_session_verification_failed)
    val googleProfileFailed = stringResource(R.string.auth_google_profile_failed)
    val resetInvalidEmail = stringResource(R.string.auth_invalid_email)
    val resetSent = stringResource(R.string.auth_reset_sent)
    val noAccount = stringResource(R.string.auth_no_account)
    val signUp = stringResource(R.string.auth_create_account)

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
                                    if (profileError == null) onSignInClick()
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

    if (showResetDialog) {
        AlertDialog(
            onDismissRequest = {
                if (!isSendingReset) showResetDialog = false
            },
            title = {
                Text(
                    stringResource(R.string.auth_reset_title),
                    style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold),
                    color = Color(0xFF151718)
                )
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(
                        stringResource(R.string.auth_reset_description),
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color(0xFF6D6963)
                    )

                    OutlinedTextField(
                        value = resetEmail,
                        onValueChange = {
                            resetEmail = it
                            resetErrorMessage = null
                            resetSuccessMessage = null
                        },
                        placeholder = { Text(stringResource(R.string.auth_email_hint)) },
                        singleLine = true,
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(12.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedTextColor = Color(0xFF151718),
                            unfocusedTextColor = Color(0xFF151718),
                            focusedContainerColor = Color.Transparent,
                            unfocusedContainerColor = Color.Transparent,
                            focusedBorderColor = BrandRedColor,
                            unfocusedBorderColor = Color(0xFF6D6963)
                        )
                    )

                    resetSuccessMessage?.let { success ->
                        Text(
                            success,
                            color = Color(0xFF2E7D32),
                            style = MaterialTheme.typography.bodySmall,
                            fontWeight = FontWeight.Medium
                        )
                    }

                    resetErrorMessage?.let { error ->
                        Text(
                            error,
                            color = MaterialTheme.colorScheme.error,
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                }
            },
            confirmButton = {
                if (resetSuccessMessage == null) {
                    Button(
                        onClick = {
                            if (resetEmail.isBlank() || !resetEmail.contains("@")) {
                                resetErrorMessage = resetInvalidEmail
                                return@Button
                            }
                            isSendingReset = true
                            resetErrorMessage = null
                            FirebaseAuthManager.sendPasswordReset(
                                email = resetEmail,
                                onSuccess = {
                                    isSendingReset = false
                                    resetSuccessMessage = resetSent
                                },
                                onError = { msg ->
                                    isSendingReset = false
                                    resetErrorMessage = msg
                                }
                            )
                        },
                        enabled = !isSendingReset && resetEmail.isNotBlank(),
                        colors = ButtonDefaults.buttonColors(containerColor = BrandRedColor),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        if (isSendingReset) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(16.dp),
                                color = Color.White,
                                strokeWidth = 2.dp
                            )
                            Spacer(Modifier.width(8.dp))
                        }
                        Text(
                            if (isSendingReset) stringResource(R.string.auth_sending)
                            else stringResource(R.string.auth_send_reset_link)
                        )
                    }
                } else {
                    Button(
                        onClick = { showResetDialog = false },
                        colors = ButtonDefaults.buttonColors(containerColor = BrandRedColor),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text(stringResource(R.string.common_done))
                    }
                }
            },
            dismissButton = {
                if (resetSuccessMessage == null) {
                    TextButton(
                        onClick = { showResetDialog = false },
                        enabled = !isSendingReset
                    ) {
                        Text(stringResource(R.string.common_cancel), color = Color(0xFF6D6963))
                    }
                }
            },
            containerColor = Color(0xFFFFFDF9),
            shape = RoundedCornerShape(20.dp)
        )
    }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = BrandBeigeColor
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .imePadding()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp)
        ) {
            Spacer(modifier = Modifier.height(16.dp))

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
                TextButton(onClick = onBackClick) {
                    Text(stringResource(R.string.common_skip), color = BrandRedColor, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }

            Spacer(modifier = Modifier.height(32.dp))

            // Header
            Text(
                text = stringResource(R.string.auth_welcome_back),
                style = MaterialTheme.typography.headlineLarge.copy(
                    fontSize = 40.sp,
                    fontWeight = FontWeight.Normal
                ),
                color = Color(0xFF151718)
            )

            Text(
                text = stringResource(R.string.auth_login_greeting),
                style = MaterialTheme.typography.bodyLarge,
                color = Color(0xFF6D6963),
                modifier = Modifier.padding(top = 8.dp)
            )

            Box(
                modifier = Modifier
                    .padding(top = 16.dp)
                    .width(40.dp)
                    .height(4.dp)
                    .background(BrandRedColor)
            )

            Spacer(modifier = Modifier.height(48.dp))

            // Form
            Text(
                text = stringResource(R.string.auth_email_or_username),
                style = MaterialTheme.typography.labelLarge,
                color = Color(0xFF151718),
                modifier = Modifier.padding(bottom = 8.dp)
            )
            OutlinedTextField(
                value = email,
                onValueChange = { email = it },
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text(stringResource(R.string.auth_email_or_user_hint)) },
                leadingIcon = { Image(painterResource(R.drawable.ic_email), contentDescription = null, modifier = Modifier.size(22.dp)) },
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

            Spacer(modifier = Modifier.height(24.dp))

            Text(
                text = stringResource(R.string.auth_password_hint),
                style = MaterialTheme.typography.labelLarge,
                color = Color(0xFF151718),
                modifier = Modifier.padding(bottom = 8.dp)
            )
            OutlinedTextField(
                value = password,
                onValueChange = { password = it },
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text(stringResource(R.string.auth_password_placeholder)) },
                leadingIcon = { Image(painterResource(R.drawable.ic_lock), contentDescription = null, modifier = Modifier.size(22.dp)) },
                trailingIcon = {
                    val image = if (passwordVisible) R.drawable.ic_eye else R.drawable.ic_eye_off
                    IconButton(onClick = { passwordVisible = !passwordVisible }) {
                        Image(
                            painterResource(image),
                            contentDescription = stringResource(
                                if (passwordVisible) R.string.auth_hide_password else R.string.auth_show_password
                            ),
                            modifier = Modifier.size(22.dp)
                        )
                    }
                },
                visualTransformation = if (passwordVisible) VisualTransformation.None else PasswordVisualTransformation(),
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
                    unfocusedLeadingIconColor = Color(0xFF6D6963)
                )
            )

            Text(
                text = stringResource(R.string.auth_forgot_password),
                color = BrandRedColor,
                style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Medium),
                textAlign = TextAlign.End,
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable {
                        resetEmail = email
                        resetSuccessMessage = null
                        resetErrorMessage = null
                        showResetDialog = true
                    }
                    .padding(top = 12.dp, bottom = 4.dp)
            )

            Spacer(modifier = Modifier.height(40.dp))

            // Sign In Button
            Button(
                onClick = {
                    authError = null
                    isSubmitting = true
                    FirebaseAuthManager.signIn(
                        email = email,
                        password = password,
                        onSuccess = {
                            isSubmitting = false
                            onSignInClick()
                        },
                        onError = { message ->
                            isSubmitting = false
                            authError = message
                        }
                    )
                },
                enabled = email.isNotBlank() && password.isNotBlank() && !isSubmitting,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                colors = ButtonDefaults.buttonColors(containerColor = BrandRedColor),
                shape = RoundedCornerShape(16.dp)
            ) {
                Text(
                    text = if (isSubmitting) stringResource(R.string.auth_signing_in) else stringResource(R.string.auth_sign_in),
                    style = MaterialTheme.typography.titleMedium,
                    color = Color(0xFFFFFDF9)
                )
            }

            authError?.let { message ->
                Text(
                    text = message,
                    // Network/profile-sync status is explanatory copy, not a primary action.
                    // Keep orange reserved for actions and use the readable secondary ink.
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall,
                    modifier = Modifier.padding(top = 12.dp)
                )
            }

            Spacer(modifier = Modifier.height(32.dp))

            // Divider
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(vertical = 16.dp)
            ) {
                HorizontalDivider(modifier = Modifier.weight(1f), color = Color(0xFFE9E1D7))
                Text(
                    text = stringResource(R.string.auth_or_continue_with),
                    modifier = Modifier.padding(horizontal = 16.dp),
                    style = MaterialTheme.typography.bodySmall,
                    color = Color(0xFF6D6963)
                )
                HorizontalDivider(modifier = Modifier.weight(1f), color = Color(0xFFE9E1D7))
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Social Button
            SocialButton(
                text = stringResource(when (googleStage) {
                    1 -> R.string.auth_google_opening
                    2 -> R.string.auth_signing_in
                    else -> R.string.auth_google_sign_in
                }),
                icon = R.drawable.googleicon,
                enabled = !isSubmitting,
                isLoading = googleStage != 0,
                onClick = ::startGoogleSignIn
            )

            Spacer(modifier = Modifier.height(32.dp))

            // Footer
            Text(
                text = buildAnnotatedString {
                    append(noAccount)
                    append(" ")
                    withStyle(style = SpanStyle(color = BrandRedColor, fontWeight = FontWeight.Bold)) {
                        append(signUp)
                    }
                },
                style = MaterialTheme.typography.bodyLarge,
                textAlign = TextAlign.Center,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 32.dp)
                    .clickable { onSignUpClick() }
            )
        }
    }
}

@Composable
fun SocialButton(
    text: String,
    icon: Int,
    enabled: Boolean = true,
    isLoading: Boolean = false,
    onClick: () -> Unit
) {
    OutlinedButton(
        onClick = onClick,
        enabled = enabled,
        modifier = Modifier
            .fillMaxWidth()
            .height(56.dp),
        shape = RoundedCornerShape(12.dp),
        border = BorderStroke(1.dp, Color(0xFFE9E1D7)),
        colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFF151718))
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.Center
        ) {
            if (isLoading) CircularProgressIndicator(modifier = Modifier.size(24.dp), color = BrandRedColor, strokeWidth = 2.dp)
            else Image(
                painter = painterResource(id = icon),
                contentDescription = null,
                modifier = Modifier.size(24.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
            Text(text = text, style = MaterialTheme.typography.bodyLarge)
        }
    }
}

@Preview(showBackground = true)
@Composable
fun LoginScreenPreview() {
    WritOnTheme {
        LoginScreen(onBackClick = {}, onSignInClick = {}, onSignUpClick = {})
    }
}
