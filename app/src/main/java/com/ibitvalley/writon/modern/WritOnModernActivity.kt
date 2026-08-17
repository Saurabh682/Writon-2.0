package com.ibitvalley.writon.modern

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AddCircleOutline
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.PersonOutline
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.outlined.BookmarkBorder
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.Box
import com.ibitvalley.writon.modern.core.database.WritOnDatabase
import com.ibitvalley.writon.modern.core.preferences.UserPreferences
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnTheme
import com.ibitvalley.writon.modern.core.network.NetworkClient
import com.ibitvalley.writon.modern.data.repository.PostRepository
import com.ibitvalley.writon.modern.feature.editor.EditorViewModel
import com.ibitvalley.writon.modern.feature.editor.StoryEditorScreen
import com.ibitvalley.writon.modern.feature.feed.FeedScreen
import com.ibitvalley.writon.modern.feature.feed.FeedViewModel
import com.ibitvalley.writon.modern.feature.profile.ProfileScreen
import com.ibitvalley.writon.modern.feature.profile.ProfileViewModel
import com.ibitvalley.writon.modern.feature.reader.ReaderScreen
import com.ibitvalley.writon.modern.feature.reader.ReaderViewModel
import com.ibitvalley.writon.modern.feature.welcome.WelcomeScreen
import com.ibitvalley.writon.modern.feature.auth.LoginScreen
import com.ibitvalley.writon.modern.feature.auth.SignupScreen
import com.ibitvalley.writon.modern.feature.onboarding.InterestsScreen
import com.ibitvalley.writon.modern.feature.explore.ExploreScreen
import com.ibitvalley.writon.modern.feature.library.LibraryScreen
import com.ibitvalley.writon.modern.feature.notifications.NotificationsScreen
import com.ibitvalley.writon.modern.feature.settings.SettingsScreen
import com.ibitvalley.writon.modern.feature.profile.ApplaudsScreen

sealed class Screen {
    object Welcome : Screen()
    object Login : Screen()
    object Signup : Screen()
    data class Interests(val fromSettings: Boolean = false) : Screen()
    object Feed : Screen()
    object Explore : Screen()
    object Library : Screen()
    object Notifications : Screen()
    object Settings : Screen()
    object Applauds : Screen()
    data class Reader(val postId: String) : Screen()
    object Editor : Screen()
    data class Profile(val penName: String) : Screen()
}

class WritOnModernActivity : ComponentActivity() {

    private lateinit var database: WritOnDatabase
    private lateinit var repository: PostRepository
    private lateinit var userPreferences: UserPreferences

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        database = WritOnDatabase.getDatabase(this)
        userPreferences = UserPreferences(this)
        repository = PostRepository(
            apiService = NetworkClient.apiService,
            postDao = database.postDao(),
            commentDao = database.commentDao(),
            outboxDao = database.outboxDao()
        )

        setContent {
            WritOnTheme(darkTheme = false) { // Force light mode for "Editorial 2.0" look
                // SKIP LOGIN FOR TESTING: Changed initial screen from Screen.Welcome to Screen.Feed
                var currentScreen by remember { mutableStateOf<Screen>(Screen.Feed) }
                val feedViewModel = remember { FeedViewModel(repository) }

                Scaffold(
                    bottomBar = {
                        if (currentScreen is Screen.Feed || currentScreen is Screen.Explore ||
                            currentScreen is Screen.Library || currentScreen is Screen.Profile) {
                            NavigationBar(
                                containerColor = com.ibitvalley.writon.modern.core.designsystem.theme.BrandBeige,
                                contentColor = com.ibitvalley.writon.modern.core.designsystem.theme.BrandRed
                            ) {
                                NavigationBarItem(
                                    selected = currentScreen is Screen.Feed,
                                    onClick = { currentScreen = Screen.Feed },
                                    icon = { Icon(Icons.Default.Home, contentDescription = null) },
                                    label = { Text("Home") }
                                )
                                NavigationBarItem(
                                    selected = currentScreen is Screen.Explore,
                                    onClick = { currentScreen = Screen.Explore },
                                    icon = { Icon(Icons.Default.Search, contentDescription = null) },
                                    label = { Text("Explore") }
                                )
                                NavigationBarItem(
                                    selected = currentScreen is Screen.Editor,
                                    onClick = { currentScreen = Screen.Editor },
                                    icon = { Icon(Icons.Default.AddCircleOutline, contentDescription = null, tint = com.ibitvalley.writon.modern.core.designsystem.theme.BrandRed) }
                                )
                                NavigationBarItem(
                                    selected = currentScreen is Screen.Library,
                                    onClick = { currentScreen = Screen.Library },
                                    icon = { Icon(Icons.Outlined.BookmarkBorder, contentDescription = null) },
                                    label = { Text("Library") }
                                )
                                NavigationBarItem(
                                    selected = currentScreen is Screen.Profile,
                                    onClick = { currentScreen = Screen.Profile("maya") },
                                    icon = { Icon(Icons.Default.PersonOutline, contentDescription = null) },
                                    label = { Text("Profile") }
                                )
                            }
                        }
                    }
                ) { innerPadding ->
                    Box(modifier = Modifier.padding(innerPadding)) {
                        when (val screen = currentScreen) {
                            is Screen.Welcome -> {
                                WelcomeScreen(
                                    onGetStarted = { currentScreen = Screen.Signup },
                                    onLogin = { currentScreen = Screen.Login }
                                )
                            }
                            is Screen.Login -> {
                                LoginScreen(
                                    onBackClick = { currentScreen = Screen.Welcome },
                                    onSignInClick = { 
                                        if (userPreferences.isOnboardingComplete) {
                                            currentScreen = Screen.Feed
                                        } else {
                                            currentScreen = Screen.Interests() 
                                        }
                                    },
                                    onSignUpClick = { currentScreen = Screen.Signup }
                                )
                            }
                            is Screen.Signup -> {
                                SignupScreen(
                                    onBackClick = { currentScreen = Screen.Welcome },
                                    onSignInClick = { currentScreen = Screen.Login },
                                    onCreateAccountClick = { 
                                        if (userPreferences.isOnboardingComplete) {
                                            currentScreen = Screen.Feed
                                        } else {
                                            currentScreen = Screen.Interests() 
                                        }
                                    }
                                )
                            }
                            is Screen.Interests -> {
                                InterestsScreen(
                                    onBackClick = { 
                                        if (screen.fromSettings) {
                                            currentScreen = Screen.Settings
                                        } else {
                                            currentScreen = Screen.Signup 
                                        }
                                    },
                                    onContinueClick = { selected -> 
                                        userPreferences.isOnboardingComplete = true
                                        if (selected.isNotEmpty()) {
                                            feedViewModel.selectCategory(selected.first())
                                        }
                                        currentScreen = Screen.Feed 
                                    },
                                    onSkipClick = { 
                                        userPreferences.isOnboardingComplete = true
                                        currentScreen = Screen.Feed 
                                    }
                                )
                            }
                            is Screen.Feed -> {
                                FeedScreen(
                                    viewModel = feedViewModel,
                                    onStoryClick = { id -> currentScreen = Screen.Reader(id) },
                                    onWriteClick = { currentScreen = Screen.Editor }
                                )
                            }
                            is Screen.Explore -> {
                                ExploreScreen()
                            }
                            is Screen.Library -> {
                                LibraryScreen()
                            }
                            is Screen.Notifications -> {
                                NotificationsScreen()
                            }
                            is Screen.Settings -> {
                                SettingsScreen(
                                    onBackClick = { currentScreen = Screen.Feed },
                                    onInterestsClick = { currentScreen = Screen.Interests(fromSettings = true) }
                                )
                            }
                            is Screen.Applauds -> {
                                ApplaudsScreen(onBackClick = { currentScreen = Screen.Feed })
                            }
                            is Screen.Reader -> {
                                val readerViewModel = remember(screen.postId) {
                                    ReaderViewModel(screen.postId, repository)
                                }
                                ReaderScreen(
                                    viewModel = readerViewModel,
                                    onBackClick = { currentScreen = Screen.Feed }
                                )
                            }
                            is Screen.Editor -> {
                                val editorViewModel = remember { EditorViewModel(repository) }
                                StoryEditorScreen(
                                    viewModel = editorViewModel,
                                    onBackClick = { currentScreen = Screen.Feed },
                                    onPublished = { currentScreen = Screen.Feed }
                                )
                            }
                            is Screen.Profile -> {
                                val profileViewModel = remember(screen.penName) {
                                    ProfileViewModel(screen.penName, NetworkClient.apiService, database.userDao())
                                }
                                ProfileScreen(
                                    viewModel = profileViewModel,
                                    onBackClick = { currentScreen = Screen.Feed }
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
