package com.ibitvalley.writon.modern.feature.welcome

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnTheme

private val BrandBeigeColor = Color(0xFFF9F7F2)
private val BrandRedColor = Color(0xFFB0301B)

@Composable
fun WelcomeScreen(
    onGetStarted: () -> Unit,
    onLogin: () -> Unit
) {
    Surface(
        modifier = Modifier.fillMaxSize(),
        color = BrandBeigeColor
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 32.dp),
            horizontalAlignment = Alignment.Start
        ) {
            Spacer(modifier = Modifier.height(64.dp))

            // Logo Header
            Text(
                text = "WritOn",
                style = MaterialTheme.typography.headlineLarge.copy(
                    fontSize = 48.sp,
                    fontWeight = FontWeight.Bold
                ),
                color = Color.Black
            )

            Text(
                text = "EDITORIAL 2.0",
                style = MaterialTheme.typography.labelSmall.copy(
                    letterSpacing = 4.sp,
                    fontSize = 14.sp
                ),
                color = BrandRedColor,
                modifier = Modifier.padding(top = 8.dp)
            )

            Spacer(modifier = Modifier.height(64.dp))

            // Main Tagline
            Text(
                text = buildAnnotatedString {
                    append("Words worth\n")
                    append("remembering")
                    withStyle(style = SpanStyle(color = BrandRedColor)) {
                        append(".")
                    }
                },
                style = MaterialTheme.typography.headlineLarge.copy(
                    fontSize = 42.sp,
                    lineHeight = 48.sp,
                    fontWeight = FontWeight.Bold
                ),
                color = Color.Black
            )

            Spacer(modifier = Modifier.height(32.dp))

            // Bullet Points
            BulletPoint("A home for writers.")
            BulletPoint("A space for readers.")
            BulletPoint(buildAnnotatedString {
                append("A community that ")
                withStyle(style = SpanStyle(color = BrandRedColor)) {
                    append("applauds")
                }
                append(".")
            })

            Spacer(modifier = Modifier.weight(1f))

            // Page Indicator
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.Center
            ) {
                PageIndicator(isSelected = true)
                Spacer(modifier = Modifier.width(8.dp))
                PageIndicator(isSelected = false)
                Spacer(modifier = Modifier.width(8.dp))
                PageIndicator(isSelected = false)
            }

            Spacer(modifier = Modifier.height(48.dp))

            // Buttons
            Button(
                onClick = onGetStarted,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                colors = ButtonDefaults.buttonColors(containerColor = BrandRedColor),
                shape = RoundedCornerShape(16.dp)
            ) {
                Text(
                    text = "Get Started",
                    style = MaterialTheme.typography.titleMedium,
                    color = Color.White
                )
            }

            Spacer(modifier = Modifier.height(16.dp))

            OutlinedButton(
                onClick = onLogin,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                border = BorderStroke(1.dp, BrandRedColor),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.outlinedButtonColors(contentColor = Color.Black)
            ) {
                Text(
                    text = "I already have an account",
                    style = MaterialTheme.typography.titleMedium
                )
            }

            Spacer(modifier = Modifier.height(32.dp))

            // Footer
            Text(
                text = buildAnnotatedString {
                    append("By continuing, you agree to WritOn's\n")
                    withStyle(style = SpanStyle(color = BrandRedColor)) {
                        append("Terms of Service")
                    }
                    append(" and ")
                    withStyle(style = SpanStyle(color = BrandRedColor)) {
                        append("Privacy Policy")
                    }
                },
                style = MaterialTheme.typography.bodySmall,
                color = Color.Gray,
                textAlign = TextAlign.Center,
                modifier = Modifier.fillMaxWidth()
            )

            Spacer(modifier = Modifier.height(32.dp))
        }
    }
}

@Composable
fun BulletPoint(text: Any) {
    val textToShow = when (text) {
        is String -> buildAnnotatedString { append(text) }
        is androidx.compose.ui.text.AnnotatedString -> text
        else -> buildAnnotatedString { append(text.toString()) }
    }
    Text(
        text = textToShow,
        style = MaterialTheme.typography.bodyLarge.copy(
            fontSize = 18.sp
        ),
        color = Color.DarkGray,
        modifier = Modifier.padding(vertical = 4.dp)
    )
}

@Composable
fun PageIndicator(isSelected: Boolean) {
    Box(
        modifier = Modifier
            .size(8.dp)
            .clip(CircleShape)
            .background(if (isSelected) BrandRedColor else Color.LightGray)
    )
}

@Preview(showBackground = true)
@Composable
fun WelcomeScreenPreview() {
    WritOnTheme {
        WelcomeScreen(onGetStarted = {}, onLogin = {})
    }
}
