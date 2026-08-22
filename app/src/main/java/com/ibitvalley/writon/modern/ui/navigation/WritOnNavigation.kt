package com.ibitvalley.writon.modern.ui.navigation

import android.util.Log
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import com.google.firebase.auth.FirebaseAuth
import com.ibitvalley.writon.R
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandBeige
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandRed
import com.ibitvalley.writon.modern.core.database.WritOnDatabase
import com.ibitvalley.writon.modern.core.auth.FirebaseAuthManager
import com.ibitvalley.writon.modern.core.preferences.UserPreferences
import com.ibitvalley.writon.modern.core.network.NetworkClient
import com.ibitvalley.writon.modern.data.repository.PostRepository
import com.ibitvalley.writon.modern.feature.auth.LoginScreen
import com.ibitvalley.writon.modern.feature.auth.SignupScreen
import com.ibitvalley.writon.modern.feature.editor.EditorViewModel
import com.ibitvalley.writon.modern.feature.editor.PublishStoryScreen
import com.ibitvalley.writon.modern.feature.editor.StoryEditorScreen
import com.ibitvalley.writon.modern.feature.collections.CollectionsViewModel
import com.ibitvalley.writon.modern.feature.explore.ExploreScreen
import com.ibitvalley.writon.modern.feature.explore.ExploreViewModel
import com.ibitvalley.writon.modern.feature.feed.FeedScreen
import com.ibitvalley.writon.modern.feature.feed.FeedViewModel
import com.ibitvalley.writon.modern.feature.library.LibraryScreen
import com.ibitvalley.writon.modern.feature.library.ReadingHistoryScreen
import com.ibitvalley.writon.modern.feature.notifications.NotificationsScreen
import com.ibitvalley.writon.modern.feature.onboarding.InterestsScreen
import com.ibitvalley.writon.modern.feature.profile.ApplaudsScreen
import com.ibitvalley.writon.modern.feature.profile.ProfileScreen
import com.ibitvalley.writon.modern.feature.profile.ProfileViewModel
import com.ibitvalley.writon.modern.feature.reader.ReaderScreen
import com.ibitvalley.writon.modern.feature.reader.ReaderViewModel
import com.ibitvalley.writon.modern.feature.search.SearchScreen
import com.ibitvalley.writon.modern.feature.search.SearchViewModel
import com.ibitvalley.writon.modern.feature.settings.SettingsScreen
import com.ibitvalley.writon.modern.feature.welcome.WelcomeScreen
import kotlinx.coroutines.launch

sealed class WritOnRoute(val route: String) {
    object Welcome : WritOnRoute("welcome")
    object Login : WritOnRoute("login")
    object Signup : WritOnRoute("signup")
    object Interests : WritOnRoute("interests?fromSettings={fromSettings}") {
        fun createRoute(fromSettings: Boolean = false) = "interests?fromSettings=$fromSettings"
    }
    object Home : WritOnRoute("home")
    object Explore : WritOnRoute("explore")
    object Search : WritOnRoute("search")
    object Write : WritOnRoute("write")
    object Publish : WritOnRoute("publish")
    object Library : WritOnRoute("library")
    object ReadingHistory : WritOnRoute("reading-history")
    object Notifications : WritOnRoute("notifications")
    object Settings : WritOnRoute("settings")
    object Applauds : WritOnRoute("applauds")
    object Profile : WritOnRoute("profile")
    object Reader : WritOnRoute("reader/{storyId}") {
        fun createRoute(storyId: String) = "reader/$storyId"
    }
}

private data class BottomNavItem(
    val route: String,
    val label: String,
    val unselectedIcon: Int,
    val selectedIcon: Int
)

private val bottomNavItems = listOf(
    BottomNavItem(WritOnRoute.Home.route, "Home", R.drawable.ic_home_muted, R.drawable.ic_home_orange),
    BottomNavItem(WritOnRoute.Explore.route, "Explore", R.drawable.ic_explore_muted, R.drawable.ic_explore_orange),
    BottomNavItem(WritOnRoute.Library.route, "Library", R.drawable.ic_library_muted, R.drawable.ic_library_orange),
    BottomNavItem(WritOnRoute.Profile.route, "Profile", R.drawable.ic_profile_muted, R.drawable.ic_profile_orange)
)

@Composable
fun WritOnNavigation(
    navController: NavHostController,
    repository: PostRepository,
    userPreferences: UserPreferences,
    database: WritOnDatabase
) {
    val feedViewModel = remember { FeedViewModel(repository) }
    val editorViewModel = remember { EditorViewModel(repository) }
    val collectionsViewModel = remember { CollectionsViewModel(NetworkClient.apiService) }
    val exploreViewModel = remember { ExploreViewModel(NetworkClient.apiService) }
    val searchViewModel = remember { SearchViewModel(NetworkClient.apiService, database.postDao(), database.userDao()) }
    val coroutineScope = rememberCoroutineScope()
    var firebaseUser by remember { mutableStateOf(FirebaseAuth.getInstance().currentUser) }
    DisposableEffect(Unit) {
        val auth = FirebaseAuth.getInstance()
        val listener = FirebaseAuth.AuthStateListener { firebaseUser = it.currentUser }
        auth.addAuthStateListener(listener)
        onDispose { auth.removeAuthStateListener(listener) }
    }
    val signedIn = firebaseUser != null
    val openLogin = {
        navController.navigate(WritOnRoute.Login.route) { launchSingleTop = true }
    }
    val continueAfterAuthentication = {
        FirebaseAuthManager.syncNetworkAuthToken { hasToken ->
            if (!hasToken) {
                Log.w("WritOnAuth", "Authentication succeeded but no Firebase token was available.")
            } else if (userPreferences.isOnboardingComplete) {
                userPreferences.isVisitorMode = false
                navController.navigate(WritOnRoute.Home.route) {
                    popUpTo(WritOnRoute.Welcome.route) { inclusive = true }
                }
            } else {
                navController.navigate(WritOnRoute.Interests.createRoute())
            }
        }
    }
    val startDestination = remember {
        if (FirebaseAuth.getInstance().currentUser != null ||
            (userPreferences.isVisitorMode && userPreferences.isOnboardingComplete)) {
            WritOnRoute.Home.route
        } else {
            WritOnRoute.Welcome.route
        }
    }

    LaunchedEffect(Unit) {
        FirebaseAuthManager.syncNetworkAuthToken { hasToken ->
            if (!hasToken) return@syncNetworkAuthToken

            coroutineScope.launch {
                runCatching {
                    NetworkClient.apiService.getMyProfile()
                }.onSuccess { response ->
                    if (response.isSuccessful) {
                        Log.i("WritOnAuth", "Server session and Supabase profile are ready.")
                    } else {
                        Log.w("WritOnAuth", "Server rejected the profile request: ${response.code()}")
                    }
                }.onFailure { error ->
                    Log.w("WritOnAuth", "Could not verify the server session.", error)
                }
            }
        }
    }

    Scaffold(
        containerColor = BrandBeige,
        bottomBar = {
            WritOnBottomNavigation(navController = navController, isSignedIn = signedIn, onLoginRequired = openLogin)
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = startDestination,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable(WritOnRoute.Welcome.route) {
                WelcomeScreen(
                    onGetStarted = { navController.navigate(WritOnRoute.Signup.route) },
                    onLogin = { navController.navigate(WritOnRoute.Login.route) },
                    onContinueAsVisitor = {
                        userPreferences.isVisitorMode = true
                        navController.navigate(WritOnRoute.Interests.createRoute())
                    }
                )
            }
            composable(WritOnRoute.Login.route) {
                LoginScreen(
                    onBackClick = { navController.popBackStack() },
                    onSignInClick = continueAfterAuthentication,
                    onSignUpClick = { navController.navigate(WritOnRoute.Signup.route) }
                )
            }
            composable(WritOnRoute.Signup.route) {
                SignupScreen(
                    onBackClick = { navController.popBackStack() },
                    onSignInClick = { navController.navigate(WritOnRoute.Login.route) },
                    onCreateAccountClick = continueAfterAuthentication
                )
            }
            composable(
                route = WritOnRoute.Interests.route,
                arguments = listOf(
                    androidx.navigation.navArgument("fromSettings") {
                        type = androidx.navigation.NavType.BoolType
                        defaultValue = false
                    }
                )
            ) { backStackEntry ->
                val fromSettings = backStackEntry.arguments?.getBoolean("fromSettings") ?: false
                InterestsScreen(
                    onBackClick = { navController.popBackStack() },
                    onContinueClick = { selected ->
                        userPreferences.isOnboardingComplete = true
                        userPreferences.favouriteCategories = selected.toSet()
                        if (selected.isNotEmpty()) {
                            feedViewModel.selectCategory(selected.first())
                        }
                        if (fromSettings) {
                            navController.popBackStack()
                        } else {
                            navController.navigate(WritOnRoute.Home.route) {
                                popUpTo(WritOnRoute.Welcome.route) { inclusive = true }
                            }
                        }
                    },
                    onSkipClick = {
                        userPreferences.isOnboardingComplete = true
                        userPreferences.favouriteCategories = emptySet()
                        if (fromSettings) {
                            navController.popBackStack()
                        } else {
                            navController.navigate(WritOnRoute.Home.route) {
                                popUpTo(WritOnRoute.Welcome.route) { inclusive = true }
                            }
                        }
                    }
                )
            }
            composable(WritOnRoute.Home.route) {
                FeedScreen(
                    viewModel = feedViewModel,
                    onStoryClick = { id -> navController.navigate(WritOnRoute.Reader.createRoute(id)) },
                    onWriteClick = { if (signedIn) navController.navigate(WritOnRoute.Write.route) else openLogin() },
                    onLibraryClick = { if (signedIn) navController.navigate(WritOnRoute.Library.route) else openLogin() },
                    onNotificationsClick = { if (signedIn) navController.navigate(WritOnRoute.Notifications.route) else openLogin() },
                    onProfileClick = { if (signedIn) navController.navigate(WritOnRoute.Profile.route) else openLogin() },
                    isAuthenticated = signedIn,
                    onLoginRequired = openLogin
                )
            }
            composable(WritOnRoute.Explore.route) {
                ExploreScreen(
                    viewModel = exploreViewModel,
                    onStoryClick = { id -> navController.navigate(WritOnRoute.Reader.createRoute(id)) },
                    onSearchClick = { navController.navigate(WritOnRoute.Search.route) }
                )
            }
            composable(WritOnRoute.Search.route) {
                SearchScreen(
                    viewModel = searchViewModel,
                    onStoryClick = { id -> navController.navigate(WritOnRoute.Reader.createRoute(id)) },
                    onExploreClick = { navController.navigate(WritOnRoute.Explore.route) }
                )
            }
            composable(WritOnRoute.Write.route) {
                if (signedIn) {
                    StoryEditorScreen(
                        viewModel = editorViewModel,
                        onBackClick = { navController.popBackStack() },
                        onPublishClick = { navController.navigate(WritOnRoute.Publish.route) }
                    )
                } else LaunchedEffect(Unit) { openLogin() }
            }
            composable(WritOnRoute.Publish.route) {
                if (signedIn) {
                    PublishStoryScreen(
                        viewModel = editorViewModel,
                        onBackClick = { navController.popBackStack() },
                        onPublished = {
                            navController.navigate(WritOnRoute.Home.route) {
                                popUpTo(WritOnRoute.Home.route) { inclusive = false }
                            }
                        }
                    )
                } else LaunchedEffect(Unit) { openLogin() }
            }
            composable(WritOnRoute.Library.route) {
                if (signedIn) {
                    LibraryScreen(
                        viewModel = collectionsViewModel,
                        onStoryClick = { id -> navController.navigate(WritOnRoute.Reader.createRoute(id)) },
                        onSearchClick = { navController.navigate(WritOnRoute.Search.route) },
                        onHistoryClick = { navController.navigate(WritOnRoute.ReadingHistory.route) }
                    )
                } else LaunchedEffect(Unit) { openLogin() }
            }
            composable(WritOnRoute.ReadingHistory.route) {
                if (signedIn) {
                    ReadingHistoryScreen(
                        viewModel = collectionsViewModel,
                        onStoryClick = { id -> navController.navigate(WritOnRoute.Reader.createRoute(id)) },
                        onSearchClick = { navController.navigate(WritOnRoute.Search.route) },
                        onSettingsClick = { navController.navigate(WritOnRoute.Settings.route) }
                    )
                } else LaunchedEffect(Unit) { openLogin() }
            }
            composable(WritOnRoute.Notifications.route) {
                if (signedIn) {
                    NotificationsScreen(
                        viewModel = collectionsViewModel,
                        onSearchClick = { navController.navigate(WritOnRoute.Search.route) },
                        onSettingsClick = { navController.navigate(WritOnRoute.Settings.route) }
                    )
                } else LaunchedEffect(Unit) { openLogin() }
            }
            composable(WritOnRoute.Settings.route) {
                if (signedIn) SettingsScreen(
                    onBackClick = { navController.popBackStack() },
                    onInterestsClick = { navController.navigate(WritOnRoute.Interests.createRoute(true)) },
                    onSearchClick = { navController.navigate(WritOnRoute.Search.route) },
                    onNotificationsClick = { navController.navigate(WritOnRoute.Notifications.route) },
                    onSavedStoriesClick = { navController.navigate(WritOnRoute.Library.route) },
                    onLogOut = {
                        FirebaseAuth.getInstance().signOut()
                        NetworkClient.setAuthToken(null)
                        userPreferences.clear()
                        navController.navigate(WritOnRoute.Welcome.route) {
                            popUpTo(navController.graph.id) { inclusive = true }
                            launchSingleTop = true
                        }
                    }
                ) else LaunchedEffect(Unit) { openLogin() }
            }
            composable(WritOnRoute.Applauds.route) {
                if (signedIn) ApplaudsScreen(
                    viewModel = collectionsViewModel,
                    onBackClick = { navController.popBackStack() },
                    onStoryClick = { id -> navController.navigate(WritOnRoute.Reader.createRoute(id)) },
                    onSearchClick = { navController.navigate(WritOnRoute.Search.route) },
                    onSettingsClick = { navController.navigate(WritOnRoute.Settings.route) }
                ) else LaunchedEffect(Unit) { openLogin() }
            }
            composable(WritOnRoute.Profile.route) {
                if (signedIn) {
                    val profileViewModel = remember {
                        ProfileViewModel(NetworkClient.apiService, database.userDao())
                    }
                    ProfileScreen(
                        viewModel = profileViewModel,
                        onBackClick = { navController.popBackStack() },
                        onStoryClick = { id -> navController.navigate(WritOnRoute.Reader.createRoute(id)) },
                        onWriteClick = { navController.navigate(WritOnRoute.Write.route) },
                        onApplaudsClick = { navController.navigate(WritOnRoute.Applauds.route) },
                        onSettingsClick = { navController.navigate(WritOnRoute.Settings.route) }
                    )

                } else {
                    LaunchedEffect(Unit) { openLogin() }
                }
            }
            composable(WritOnRoute.Reader.route) { backStackEntry ->
                val storyId = backStackEntry.arguments?.getString("storyId") ?: ""
                val readerViewModel = remember(storyId) {
                    ReaderViewModel(storyId, repository)
                }
                ReaderScreen(
                    viewModel = readerViewModel,
                    onBackClick = { navController.popBackStack() },
                    onLoginRequired = openLogin
                )
            }
        }
    }
}

@Composable
private fun WritOnBottomNavigation(
    navController: NavHostController,
    isSignedIn: Boolean,
    onLoginRequired: () -> Unit
) {
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    // Define routes that should hide the bottom bar
    val hideBottomBarRoutes = listOf(
        WritOnRoute.Reader.route,
        WritOnRoute.Publish.route,
        WritOnRoute.Welcome.route,
        WritOnRoute.Login.route,
        WritOnRoute.Signup.route,
        WritOnRoute.Interests.route
    )

    if (currentRoute in hideBottomBarRoutes || currentRoute == null) {
        return
    }

    WritOnBottomBar(
        currentRoute = currentRoute,
        onNavigate = { route ->
            val requiresLogin = route == WritOnRoute.Library.route ||
                route == WritOnRoute.Profile.route ||
                route == WritOnRoute.Write.route
            if (requiresLogin && !isSignedIn) {
                onLoginRequired()
                return@WritOnBottomBar
            }
            navController.navigate(route) {
                popUpTo(navController.graph.findStartDestination().id) {
                    saveState = true
                }
                launchSingleTop = true
                restoreState = true
            }
        }
    )
}

@Composable
fun WritOnBottomBar(
    currentRoute: String,
    onNavigate: (String) -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(94.dp),
        contentAlignment = Alignment.BottomCenter
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .height(76.dp),
            color = BrandBeige,
            shadowElevation = 3.dp
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                HorizontalDivider(color = Color(0xFFE9E1D7), thickness = 1.dp)
                Row(
                    modifier = Modifier.fillMaxSize().padding(bottom = 4.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    bottomNavItems.forEachIndexed { index, item ->
                        if (index == 2) Spacer(modifier = Modifier.width(62.dp))
                        val selected = currentRoute == item.route ||
                            (currentRoute == WritOnRoute.Search.route && item.label == "Explore") ||
                            (currentRoute == WritOnRoute.ReadingHistory.route && item.label == "Library") ||
                            (currentRoute == WritOnRoute.Settings.route && item.label == "Profile")
                        NavigationItem(
                            selected = selected,
                            onClick = { onNavigate(item.route) },
                            icon = if (selected) item.selectedIcon else item.unselectedIcon,
                            label = item.label
                        )
                    }
                }
            }
        }

        Surface(
            modifier = Modifier
                .padding(bottom = 30.dp)
                .size(60.dp)
                .align(Alignment.BottomCenter),
            shape = CircleShape,
            color = BrandRed,
            shadowElevation = 8.dp,
            onClick = { onNavigate(WritOnRoute.Write.route) }
        ) {
            Box(contentAlignment = Alignment.Center) {
                Image(painterResource(R.drawable.ic_write_quill_white), contentDescription = "Write", modifier = Modifier.size(30.dp))
            }
        }
    }
}

@Composable
fun NavigationItem(
    selected: Boolean,
    onClick: () -> Unit,
    icon: Int,
    label: String
) {
    Column(
        modifier = Modifier
            .clickable(
                onClick = onClick,
                interactionSource = remember { MutableInteractionSource() },
                indication = null
            )
            .padding(horizontal = 8.dp, vertical = 5.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Image(painterResource(icon), contentDescription = label, modifier = Modifier.size(27.dp))
        Spacer(modifier = Modifier.height(3.dp))
        Text(
            text = label,
            fontSize = 12.sp,
            fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
            color = if (selected) BrandRed else Color(0xFF6D6963)
        )
    }
}
