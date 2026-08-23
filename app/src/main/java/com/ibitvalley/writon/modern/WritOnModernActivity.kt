package com.ibitvalley.writon.modern

import android.Manifest
import android.content.Context
import android.content.res.Configuration
import android.os.Build
import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.compose.rememberNavController
import com.ibitvalley.writon.R
import com.ibitvalley.writon.modern.core.auth.BiometricAuthManager
import com.ibitvalley.writon.modern.core.auth.FirebaseAuthManager
import com.ibitvalley.writon.modern.core.database.WritOnDatabase
import com.ibitvalley.writon.modern.core.designsystem.components.WritOnBrandMark
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandRed
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnTheme
import com.ibitvalley.writon.modern.core.locale.LocaleManager
import com.ibitvalley.writon.modern.core.network.NetworkClient
import com.ibitvalley.writon.modern.core.notification.WritOnNotificationManager
import com.ibitvalley.writon.modern.core.preferences.UserPreferences
import com.ibitvalley.writon.modern.data.repository.PostRepository
import com.ibitvalley.writon.modern.data.sync.OutboxSyncScheduler
import com.ibitvalley.writon.modern.ui.navigation.WritOnNavigation
import java.util.Locale

class WritOnModernActivity : AppCompatActivity() {

    private lateinit var database: WritOnDatabase
    private lateinit var repository: PostRepository
    private lateinit var userPreferences: UserPreferences

    private val requestNotificationPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { _ -> }

    override fun attachBaseContext(newBase: Context) {
        val wrapped = LocaleManager.wrapContext(newBase)
        super.attachBaseContext(wrapped)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        WritOnNotificationManager.createNotificationChannels(this)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            requestNotificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
        }

        database = WritOnDatabase.getDatabase(this)
        userPreferences = UserPreferences(this)
        val savedLang = userPreferences.appLanguage
        if (savedLang.isNotBlank() && savedLang != "system") {
            LocaleManager.applyLanguage(this, savedLang, recreateActivity = false)
        }
        FirebaseAuthManager.syncNetworkAuthToken()

        repository = PostRepository(
            apiService = NetworkClient.apiService,
            postDao = database.postDao(),
            commentDao = database.commentDao(),
            outboxDao = database.outboxDao()
        )
        OutboxSyncScheduler.schedule(applicationContext)

        setContent {
            val currentLanguage = userPreferences.appLanguage
            val locale = remember(currentLanguage) {
                if (currentLanguage.isBlank() || currentLanguage == "system") {
                    Locale.getDefault()
                } else {
                    Locale(currentLanguage)
                }
            }
            val configuration = remember(locale) {
                Configuration(resources.configuration).apply {
                    setLocale(locale)
                    setLayoutDirection(locale)
                }
            }
            val localizedContext = remember(locale) {
                createConfigurationContext(configuration)
            }

            CompositionLocalProvider(
                LocalConfiguration provides configuration,
                LocalContext provides localizedContext
            ) {
                var activeTheme by remember { mutableStateOf(userPreferences.themeMode) }
                var isAppUnlocked by remember {
                    mutableStateOf(!userPreferences.isBiometricEnabled || com.google.firebase.auth.FirebaseAuth.getInstance().currentUser == null)
                }

                LaunchedEffect(Unit) {
                    if (!isAppUnlocked && BiometricAuthManager.isBiometricAvailable(this@WritOnModernActivity)) {
                        BiometricAuthManager.promptBiometric(
                            activity = this@WritOnModernActivity,
                            title = "Unlock WritOn",
                            subtitle = "Confirm fingerprint or face ID to open",
                            onSuccess = { isAppUnlocked = true },
                            onError = { /* User can tap Unlock button on screen */ },
                            onCancel = { /* User cancelled, keep lock screen visible */ }
                        )
                    }
                }

                WritOnTheme(themeMode = activeTheme) {
                    if (!isAppUnlocked) {
                        BiometricLockScreen(
                            onUnlockClick = {
                                BiometricAuthManager.promptBiometric(
                                    activity = this@WritOnModernActivity,
                                    title = "Unlock WritOn",
                                    subtitle = "Confirm fingerprint or face ID to open",
                                    onSuccess = { isAppUnlocked = true },
                                    onError = { /* Error reported in prompt */ }
                                )
                            }
                        )
                    } else {
                        val navController = rememberNavController()

                        WritOnNavigation(
                            navController = navController,
                            repository = repository,
                            userPreferences = userPreferences,
                            database = database,
                            onThemeChanged = { activeTheme = it }
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun BiometricLockScreen(onUnlockClick: () -> Unit) {
    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            WritOnBrandMark(width = 120.dp)
            Spacer(Modifier.height(48.dp))

            Surface(
                shape = CircleShape,
                color = BrandRed.copy(alpha = 0.12f),
                modifier = Modifier.size(96.dp)
            ) {
                Box(contentAlignment = Alignment.Center) {
                    Image(
                        painter = painterResource(R.drawable.ic_shield_orange),
                        contentDescription = "Lock",
                        modifier = Modifier.size(48.dp)
                    )
                }
            }

            Spacer(Modifier.height(28.dp))

            Text(
                stringResource(R.string.settings_biometric_lock_title),
                style = MaterialTheme.typography.headlineMedium.copy(fontWeight = FontWeight.Bold),
                color = MaterialTheme.colorScheme.onBackground
            )

            Spacer(Modifier.height(10.dp))

            Text(
                stringResource(R.string.settings_biometric_lock_desc),
                style = MaterialTheme.typography.bodyMedium,
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(horizontal = 16.dp)
            )

            Spacer(Modifier.height(40.dp))

            Button(
                onClick = onUnlockClick,
                colors = ButtonDefaults.buttonColors(containerColor = BrandRed),
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier
                    .fillMaxWidth(0.85f)
                    .height(52.dp)
            ) {
                Text(
                    stringResource(R.string.auth_biometric_login),
                    style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                    color = Color.White
                )
            }
        }
    }
}
