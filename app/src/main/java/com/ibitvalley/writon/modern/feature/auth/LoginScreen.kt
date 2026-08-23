package com.ibitvalley.writon.modern.feature.auth

import android.app.Activity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import com.google.android.gms.auth.api.signin.GoogleSignIn
import com.google.android.gms.auth.api.signin.GoogleSignInOptions
import com.google.android.gms.common.api.ApiException
import com.ibitvalley.writon.R
import com.ibitvalley.writon.modern.core.auth.FirebaseAuthManager
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnTheme
import com.ibitvalley.writon.modern.core.network.NetworkClient
import com.ibitvalley.writon.modern.core.network.model.UpsertMyProfileRequestDto
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
    val coroutineScope = rememberCoroutineScope()
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }
    var isSubmitting by remember { mutableStateOf(false) }
    var authError by remember { mutableStateOf<String?>(null) }
    var showResetDialog by remember { mutableStateOf(false) }
    var resetEmail by remember { mutableStateOf("") }
    var isSendingReset by remember { mutableStateOf(false) }
    var resetSuccessMessage by remember { mutableStateOf<String?>(null) }
    var resetErrorMessage by remember { mutableStateOf<String?>(null) }

    val webClientId = "802112841589-nuiftft451onasf3ou6ueput9in1vei2.apps.googleusercontent.com"
    val googleSignInClient = remember {
        val gso = GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
            .requestIdToken(webClientId)
            .requestEmail()
            .build()
        GoogleSignIn.getClient(context, gso)
    }

    val googleLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val task = GoogleSignIn.getSignedInAccountFromIntent(result.data)
            try {
                val account = task.getResult(ApiException::class.java)
                val idToken = account?.idToken
                if (idToken != null) {
                    isSubmitting = true
                    authError = null
                    FirebaseAuthManager.signInWithGoogle(
                        idToken = idToken,
                        onSuccess = { user ->
                            FirebaseAuthManager.syncNetworkAuthToken { hasToken ->
                                if (!hasToken) {
                                    isSubmitting = false
                                    authError = "Session verification failed."
                                    return@syncNetworkAuthToken
                                }
                                val rawName = user.displayName?.trim().orEmpty()
                                val penName = rawName.lowercase().replace(Regex("[^a-z0-9_]"), "_").take(24).ifBlank { "writer_${user.uid.take(6)}" }
                                val fullName = rawName.ifBlank { "WritOn Member" }
                                coroutineScope.launch {
                                    runCatching {
                                        NetworkClient.apiService.upsertMyProfile(
                                            UpsertMyProfileRequestDto(
                                                penName = penName,
                                                fullName = fullName,
                                                avatarUrl = user.photoUrl?.toString()
                                            )
                                        )
                                    }
                                    isSubmitting = false
                                    onSignInClick()
                                }
                            }
                        },
                        onError = { msg ->
                            isSubmitting = false
                            authError = msg
                        }
                    )
                } else {
                    authError = "Google Sign-In token could not be retrieved."
                }
            } catch (e: Exception) {
                authError = e.localizedMessage ?: "Google Sign-In failed."
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
                    "Reset Password",
                    style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.Bold),
                    color = Color(0xFF151718)
                )
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Text(
                        "Enter your registered email address and we'll send you a link to reset your password.",
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
                        placeholder = { Text("Enter your email") },
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
                                resetErrorMessage = "Please enter a valid email address."
                                return@Button
                            }
                            isSendingReset = true
                            resetErrorMessage = null
                            FirebaseAuthManager.sendPasswordReset(
                                email = resetEmail,
                                onSuccess = {
                                    isSendingReset = false
                                    resetSuccessMessage = "Password reset email sent! Check your inbox (and spam folder)."
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
                        Text(if (isSendingReset) "Sending…" else "Send Reset Link")
                    }
                } else {
                    Button(
                        onClick = { showResetDialog = false },
                        colors = ButtonDefaults.buttonColors(containerColor = BrandRedColor),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Text("Done")
                    }
                }
            },
            dismissButton = {
                if (resetSuccessMessage == null) {
                    TextButton(
                        onClick = { showResetDialog = false },
                        enabled = !isSendingReset
                    ) {
                        Text("Cancel", color = Color(0xFF6D6963))
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
                .padding(horizontal = 24.dp)
        ) {
            Spacer(modifier = Modifier.height(16.dp))

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onBackClick) {
                    Image(
                        painterResource(R.drawable.ic_back),
                        contentDescription = "Back",
                        modifier = Modifier.size(24.dp),
                        colorFilter = ColorFilter.tint(MaterialTheme.colorScheme.onBackground)
                    )
                }
                TextButton(onClick = onBackClick) {
                    Text("Skip", color = BrandRedColor, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                }
            }

            Spacer(modifier = Modifier.height(32.dp))

            // Header
            Text(
                text = "Welcome back",
                style = MaterialTheme.typography.headlineLarge.copy(
                    fontSize = 40.sp,
                    fontWeight = FontWeight.Bold
                ),
                color = Color(0xFF151718)
            )

            Text(
                text = "Glad to see you again.",
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
                text = "Email or Username",
                style = MaterialTheme.typography.labelLarge,
                color = Color(0xFF151718),
                modifier = Modifier.padding(bottom = 8.dp)
            )
            OutlinedTextField(
                value = email,
                onValueChange = { email = it },
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("Enter your email or username") },
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
                text = "Password",
                style = MaterialTheme.typography.labelLarge,
                color = Color(0xFF151718),
                modifier = Modifier.padding(bottom = 8.dp)
            )
            OutlinedTextField(
                value = password,
                onValueChange = { password = it },
                modifier = Modifier.fillMaxWidth(),
                placeholder = { Text("Enter your password") },
                leadingIcon = { Image(painterResource(R.drawable.ic_lock), contentDescription = null, modifier = Modifier.size(22.dp)) },
                trailingIcon = {
                    val image = if (passwordVisible) R.drawable.ic_eye else R.drawable.ic_eye_off
                    IconButton(onClick = { passwordVisible = !passwordVisible }) {
                        Image(painterResource(image), contentDescription = null, modifier = Modifier.size(22.dp))
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
                text = "Forgot password?",
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
                    text = if (isSubmitting) "Signing in…" else "Sign In",
                    style = MaterialTheme.typography.titleMedium,
                    color = Color(0xFFFFFDF9)
                )
            }

            authError?.let { message ->
                Text(
                    text = message,
                    color = MaterialTheme.colorScheme.error,
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
                    text = "or continue with",
                    modifier = Modifier.padding(horizontal = 16.dp),
                    style = MaterialTheme.typography.bodySmall,
                    color = Color(0xFF6D6963)
                )
                HorizontalDivider(modifier = Modifier.weight(1f), color = Color(0xFFE9E1D7))
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Social Button
            SocialButton(
                text = "Continue with Google",
                icon = R.drawable.googleicon,
                onClick = {
                    googleSignInClient.signOut().addOnCompleteListener {
                        googleLauncher.launch(googleSignInClient.signInIntent)
                    }
                }
            )

            Spacer(modifier = Modifier.weight(1f))

            // Footer
            Text(
                text = buildAnnotatedString {
                    append("Don't have an account? ")
                    withStyle(style = SpanStyle(color = BrandRedColor, fontWeight = FontWeight.Bold)) {
                        append("Sign up")
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
    onClick: () -> Unit
) {
    OutlinedButton(
        onClick = onClick,
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
            Image(
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
