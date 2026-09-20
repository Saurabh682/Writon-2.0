package com.ibitvalley.writon.modern.feature.welcome

import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import com.ibitvalley.writon.R
import com.ibitvalley.writon.modern.core.designsystem.components.WritOnBrandMark
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandRed
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnTheme

private const val TERMS_URL = "https://writon.cc/terms.html"
private const val PRIVACY_URL = "https://writon.cc/privacy-policy.html"

@Composable
fun WelcomeScreen(
    onStartWriting: () -> Unit,
    onLogin: () -> Unit,
    onStartReading: () -> Unit
) {
    val uriHandler = LocalUriHandler.current

    Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .navigationBarsPadding()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp, vertical = 12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            WritOnBrandMark(width = 112.dp)
            Spacer(Modifier.height(18.dp))

            Surface(shape = CircleShape, color = BrandRed.copy(alpha = 0.12f), modifier = Modifier.size(56.dp)) {
                Box(contentAlignment = Alignment.Center) {
                    Image(
                        painter = painterResource(R.drawable.welcome_feather),
                        contentDescription = null,
                        modifier = Modifier.size(30.dp)
                    )
                }
            }
            Spacer(Modifier.height(14.dp))

            Text(
                text = stringResource(R.string.welcome_title),
                style = MaterialTheme.typography.headlineLarge.copy(fontWeight = FontWeight.Bold),
                color = MaterialTheme.colorScheme.onBackground,
                textAlign = TextAlign.Center
            )
            Spacer(Modifier.height(8.dp))
            Text(
                text = stringResource(R.string.welcome_description),
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center
            )
            Spacer(Modifier.height(14.dp))

            WelcomeBenefit(R.string.welcome_benefit_read)
            WelcomeBenefit(R.string.welcome_benefit_write)
            WelcomeBenefit(R.string.welcome_benefit_language)
            Spacer(Modifier.height(18.dp))

            Button(
                onClick = onStartReading,
                modifier = Modifier.fillMaxWidth().height(52.dp),
                colors = ButtonDefaults.buttonColors(containerColor = BrandRed),
                shape = RoundedCornerShape(14.dp)
            ) {
                Text(stringResource(R.string.welcome_start_reading), fontWeight = FontWeight.SemiBold, color = Color.White)
            }
            Spacer(Modifier.height(10.dp))
            OutlinedButton(
                onClick = onStartWriting,
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(14.dp)
            ) {
                Text(stringResource(R.string.welcome_start_writing), fontWeight = FontWeight.SemiBold)
            }
            TextButton(onClick = onLogin, modifier = Modifier.fillMaxWidth()) {
                Text(stringResource(R.string.welcome_sign_in))
            }
            Spacer(Modifier.height(4.dp))

            Text(
                text = stringResource(R.string.welcome_legal_prefix),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center
            )
            Row(horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
                TextButton(onClick = { uriHandler.openUri(TERMS_URL) }) {
                    Text(stringResource(R.string.welcome_terms))
                }
                Text("•", color = MaterialTheme.colorScheme.onSurfaceVariant)
                TextButton(onClick = { uriHandler.openUri(PRIVACY_URL) }) {
                    Text(stringResource(R.string.welcome_privacy))
                }
            }
        }
    }
}

@Composable
private fun WelcomeBenefit(textRes: Int) {
    Row(modifier = Modifier.fillMaxWidth().padding(vertical = 4.dp), verticalAlignment = Alignment.Top) {
        Surface(shape = CircleShape, color = BrandRed, modifier = Modifier.padding(top = 7.dp).size(7.dp)) {}
        Spacer(Modifier.size(12.dp))
        Text(
            text = stringResource(textRes),
            modifier = Modifier.weight(1f),
            style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.Medium),
            color = MaterialTheme.colorScheme.onBackground
        )
    }
}

@Preview(showBackground = true)
@Composable
fun WelcomeScreenPreview() {
    WritOnTheme { WelcomeScreen({}, {}, {}) }
}
