package com.ibitvalley.writon.modern.feature.onboarding

import androidx.annotation.StringRes
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.RadioButton
import androidx.compose.material3.RadioButtonDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.ibitvalley.writon.R

private val IntentBackground = Color(0xFFF8F4EE)
private val IntentPaper = Color(0xFFFFFDF9)
private val IntentAccent = Color(0xFFE75A2A)
private val IntentText = Color(0xFF151718)
private val IntentMuted = Color(0xFF6D6963)
private val IntentBorder = Color(0xFFE1D8CD)

private data class IntentOption(
    val id: String,
    @StringRes val title: Int,
    @StringRes val description: Int,
)

private val intentOptions = listOf(
    IntentOption("read", R.string.onboarding_intent_read, R.string.onboarding_intent_read_desc),
    IntentOption("write", R.string.onboarding_intent_write, R.string.onboarding_intent_write_desc),
    IntentOption("both", R.string.onboarding_intent_both, R.string.onboarding_intent_both_desc),
)

@Composable
fun IntentOnboardingScreen(
    initialIntent: String?,
    onBackClick: () -> Unit,
    onIntentSaved: (String?) -> Boolean,
    onContinue: () -> Unit,
) {
    var selectedIntent by rememberSaveable(initialIntent) { mutableStateOf(initialIntent) }

    Surface(color = IntentBackground, modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 24.dp, vertical = 20.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                TextButton(onClick = onBackClick) { Text(stringResource(R.string.common_back)) }
                Text(
                    text = stringResource(R.string.onboarding_step, 1, 2),
                    style = MaterialTheme.typography.labelLarge,
                    color = IntentMuted,
                )
            }

            Spacer(Modifier.height(28.dp))
            Text(
                text = stringResource(R.string.onboarding_intent_title),
                style = MaterialTheme.typography.headlineLarge,
                color = IntentText,
            )
            Spacer(Modifier.height(10.dp))
            Text(
                text = stringResource(R.string.onboarding_intent_subtitle),
                style = MaterialTheme.typography.bodyLarge,
                color = IntentMuted,
            )
            Spacer(Modifier.height(28.dp))

            intentOptions.forEach { option ->
                val isSelected = selectedIntent == option.id
                Surface(
                    color = if (isSelected) IntentAccent.copy(alpha = 0.08f) else IntentPaper,
                    shape = RoundedCornerShape(18.dp),
                    border = BorderStroke(if (isSelected) 2.dp else 1.dp, if (isSelected) IntentAccent else IntentBorder),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 12.dp)
                        .semantics { selected = isSelected }
                        .clickable(role = Role.RadioButton) { selectedIntent = option.id },
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth().padding(18.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        RadioButton(
                            selected = isSelected,
                            onClick = { selectedIntent = option.id },
                            colors = RadioButtonDefaults.colors(selectedColor = IntentAccent),
                            modifier = Modifier.size(48.dp),
                        )
                        Column(Modifier.padding(start = 12.dp)) {
                            Text(
                                text = stringResource(option.title),
                                style = MaterialTheme.typography.titleLarge.copy(fontWeight = FontWeight.SemiBold),
                                color = IntentText,
                            )
                            Text(
                                text = stringResource(option.description),
                                style = MaterialTheme.typography.bodyMedium,
                                color = IntentMuted,
                            )
                        }
                    }
                }
            }

            Spacer(Modifier.height(16.dp))
            Button(
                onClick = {
                    if (onIntentSaved(selectedIntent)) onContinue()
                },
                enabled = selectedIntent != null,
                modifier = Modifier.fillMaxWidth().height(56.dp),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(containerColor = IntentAccent),
            ) {
                Text(stringResource(R.string.common_continue))
            }
            TextButton(
                onClick = {
                    if (onIntentSaved(null)) onContinue()
                },
                modifier = Modifier.align(Alignment.CenterHorizontally),
            ) {
                Text(stringResource(R.string.common_skip), color = IntentMuted)
            }
        }
    }
}
