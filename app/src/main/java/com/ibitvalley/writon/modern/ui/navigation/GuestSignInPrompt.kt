package com.ibitvalley.writon.modern.ui.navigation

import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.res.stringResource
import com.ibitvalley.writon.R

/** Dismissal never executes the protected action or replaces the reader screen. */
@Composable
internal fun GuestSignInPrompt(onSignIn: () -> Unit, onDismiss: () -> Unit) {
    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text(stringResource(R.string.guest_sign_in_title)) },
        text = { Text(stringResource(R.string.guest_sign_in_message)) },
        confirmButton = {
            TextButton(onClick = onSignIn) { Text(stringResource(R.string.guest_sign_in_action)) }
        },
        dismissButton = {
            TextButton(onClick = onDismiss) { Text(stringResource(R.string.guest_keep_reading)) }
        }
    )
}
