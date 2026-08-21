package com.ibitvalley.writon.modern.feature.auth

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
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnTheme

private val BrandBeigeColor = Color(0xFFF8F4EE)
private val BrandRedColor = Color(0xFFE75A2A)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LoginScreen(
    onBackClick: () -> Unit,
    onSignInClick: () -> Unit,
    onSignUpClick: () -> Unit
) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }
    var isSubmitting by remember { mutableStateOf(false) }
    var authError by remember { mutableStateOf<String?>(null) }

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
                    Image(painterResource(R.drawable.ic_back), contentDescription = "Back", modifier = Modifier.size(24.dp))
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
                style = MaterialTheme.typography.bodyMedium,
                textAlign = TextAlign.End,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 12.dp)
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

            // Social Buttons
            SocialButton(
                text = "Continue with Google",
                icon = R.drawable.googleicon,
                onClick = {}
            )

            Spacer(modifier = Modifier.height(16.dp))

            SocialButton(
                text = "Continue with Apple",
                icon = R.drawable.apple,
                onClick = {}
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
