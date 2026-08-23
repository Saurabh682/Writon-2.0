package com.ibitvalley.writon.modern.core.auth

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.FirebaseUser
import com.ibitvalley.writon.modern.core.network.NetworkClient

object FirebaseAuthManager {
    private val auth: FirebaseAuth
        get() = FirebaseAuth.getInstance()

    fun signIn(
        email: String,
        password: String,
        onSuccess: (FirebaseUser) -> Unit,
        onError: (String) -> Unit
    ) {
        auth.signInWithEmailAndPassword(email.trim(), password)
            .addOnSuccessListener { result ->
                result.user?.let(onSuccess)
                    ?: onError("Could not retrieve the signed-in user.")
            }
            .addOnFailureListener { error ->
                onError(error.localizedMessage ?: "Sign-in failed.")
            }
    }

    fun createAccount(
        email: String,
        password: String,
        onSuccess: (FirebaseUser) -> Unit,
        onError: (String) -> Unit
    ) {
        auth.createUserWithEmailAndPassword(email.trim(), password)
            .addOnSuccessListener { result ->
                result.user?.let(onSuccess)
                    ?: onError("Could not retrieve the new user.")
            }
            .addOnFailureListener { error ->
                onError(error.localizedMessage ?: "Account creation failed.")
            }
    }

    fun sendPasswordReset(
        email: String,
        onSuccess: () -> Unit,
        onError: (String) -> Unit
    ) {
        if (email.isBlank()) {
            onError("Please enter your email address.")
            return
        }
        auth.sendPasswordResetEmail(email.trim())
            .addOnSuccessListener {
                onSuccess()
            }
            .addOnFailureListener { error ->
                onError(error.localizedMessage ?: "Failed to send password reset email.")
            }
    }

    fun getFreshTokenBlocking(): String? {
        val currentUser = auth.currentUser ?: return null
        return try {
            val task = currentUser.getIdToken(true)
            com.google.android.gms.tasks.Tasks.await(task, 10, java.util.concurrent.TimeUnit.SECONDS)?.token
        } catch (e: Exception) {
            null
        }
    }

    fun syncNetworkAuthToken(onComplete: (Boolean) -> Unit = {}) {
        val currentUser = auth.currentUser
        if (currentUser == null) {
            NetworkClient.setAuthToken(null)
            onComplete(false)
            return
        }

        currentUser.getIdToken(false)
            .addOnSuccessListener { tokenResult ->
                val token = tokenResult.token
                if (token == null) {
                    NetworkClient.setAuthToken(null)
                    onComplete(false)
                } else {
                    NetworkClient.setAuthToken(token)
                    onComplete(true)
                }
            }
            .addOnFailureListener {
                NetworkClient.setAuthToken(null)
                onComplete(false)
            }
    }
}
