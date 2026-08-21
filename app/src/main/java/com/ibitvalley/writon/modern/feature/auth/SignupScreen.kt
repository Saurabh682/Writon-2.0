package com.ibitvalley.writon.modern.feature.auth

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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
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
import com.ibitvalley.writon.R
import com.ibitvalley.writon.modern.core.auth.FirebaseAuthManager
import com.ibitvalley.writon.modern.core.network.NetworkClient
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
    var fullName by remember { mutableStateOf("") }
    var email by remember { mutableStateOf("") }
    var username by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var confirmPassword by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }
    var confirmPasswordVisible by remember { mutableStateOf(false) }
    var agreeToTerms by remember { mutableStateOf(false) }
    var isSubmitting by remember { mutableStateOf(false) }
    var authError by remember { mutableStateOf<String?>(null) }
    val coroutineScope = rememberCoroutineScope()

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
                IconButton(onClick = onBackClick) {
                    Image(painterResource(R.drawable.ic_back), contentDescription = "Back", modifier = Modifier.size(24.dp))
                }

                Text(
                    text = buildAnnotatedString {
                        append("Already have an account? ")
                        withStyle(style = SpanStyle(color = BrandRedColor, fontWeight = FontWeight.Bold)) {
                            append("Sign in")
                        }
                    },
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Modifier.clickable { onSignInClick() }
                )
            }

            Spacer(modifier = Modifier.height(32.dp))

            // Header
            Text(
                text = "Create your\nWritOn account",
                style = MaterialTheme.typography.headlineLarge.copy(
                    fontSize = 36.sp,
                    lineHeight = 44.sp,
                    fontWeight = FontWeight.Bold
                ),
                color = Color(0xFF151718)
            )

            Text(
                text = "Join a community of writers and readers.",
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
                label = "Full name",
                value = fullName,
                onValueChange = { fullName = it },
                placeholder = "Enter your full name",
                leadingIcon = R.drawable.ic_profile
            )

            SignupTextField(
                label = "Email address",
                value = email,
                onValueChange = { email = it },
                placeholder = "Enter your email address",
                leadingIcon = R.drawable.ic_email
            )

            SignupTextField(
                label = "Username",
                value = username,
                onValueChange = { username = it },
                placeholder = "Choose a username",
                leadingIcon = R.drawable.ic_mention,
                helperText = "This will be your unique identity on WritOn."
            )

            SignupPasswordField(
                label = "Password",
                value = password,
                onValueChange = { password = it },
                placeholder = "Create a password",
                visible = passwordVisible,
                onVisibilityToggle = { passwordVisible = !passwordVisible },
                helperText = "At least 8 characters with a mix of letters, numbers and symbols."
            )

            SignupPasswordField(
                label = "Confirm password",
                value = confirmPassword,
                onValueChange = { confirmPassword = it },
                placeholder = "Confirm your password",
                visible = confirmPasswordVisible,
                onVisibilityToggle = { confirmPasswordVisible = !confirmPasswordVisible }
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
                        append("By creating an account, I agree to WritOn’s\n")
                        withStyle(style = SpanStyle(color = BrandRedColor)) {
                            append("Terms of Service")
                        }
                        append(" and ")
                        withStyle(style = SpanStyle(color = BrandRedColor)) {
                            append("Privacy Policy")
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
                    FirebaseAuthManager.createAccount(
                        email = email,
                        password = password,
                        onSuccess = {
                            FirebaseAuthManager.syncNetworkAuthToken { hasToken ->
                                if (!hasToken) {
                                    isSubmitting = false
                                    authError = "Your account was created, but the session could not be verified."
                                    return@syncNetworkAuthToken
                                }

                                coroutineScope.launch {
                                    runCatching {
                                        NetworkClient.apiService.upsertMyProfile(
                                            UpsertMyProfileRequestDto(
                                                penName = username,
                                                fullName = fullName
                                            )
                                        )
                                    }.onSuccess { response ->
                                        isSubmitting = false
                                        if (response.isSuccessful) {
                                            onCreateAccountClick()
                                        } else {
                                            authError = "Your account was created, but the profile could not be saved."
                                        }
                                    }.onFailure {
                                        isSubmitting = false
                                        authError = "Your account was created, but the profile could not be saved."
                                    }
                                }
                            }
                        },
                        onError = { message ->
                            isSubmitting = false
                            authError = message
                        }
                    )
                },
                enabled = fullName.isNotBlank() && email.isNotBlank() && username.isNotBlank() &&
                    password.length >= 8 && password == confirmPassword && agreeToTerms && !isSubmitting,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                colors = ButtonDefaults.buttonColors(containerColor = BrandRedColor),
                shape = RoundedCornerShape(16.dp)
            ) {
                Text(
                    text = if (isSubmitting) "Creating account…" else "Create Account",
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

            Spacer(modifier = Modifier.height(24.dp))

            // Footer / Divider
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(vertical = 16.dp)
            ) {
                HorizontalDivider(modifier = Modifier.weight(1f), color = Color(0xFFE9E1D7))
                Text(
                    text = "or sign up with",
                    modifier = Modifier.padding(horizontal = 16.dp),
                    style = MaterialTheme.typography.bodySmall,
                    color = Color(0xFF6D6963)
                )
                HorizontalDivider(modifier = Modifier.weight(1f), color = Color(0xFFE9E1D7))
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Social Buttons Row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                SocialSignupButton(
                    text = "Google",
                    icon = R.drawable.googleicon,
                    modifier = Modifier.weight(1f),
                    onClick = {}
                )
                SocialSignupButton(
                    text = "Apple",
                    icon = R.drawable.apple,
                    modifier = Modifier.weight(1f),
                    onClick = {}
                )
            }

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
                    Image(painterResource(icon), contentDescription = null, modifier = Modifier.size(22.dp))
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
    onClick: () -> Unit
) {
    OutlinedButton(
        onClick = onClick,
        modifier = modifier.height(56.dp),
        shape = RoundedCornerShape(12.dp),
        border = BorderStroke(1.dp, Color(0xFFE9E1D7)),
        colors = ButtonDefaults.outlinedButtonColors(contentColor = Color(0xFF151718))
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Image(
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
