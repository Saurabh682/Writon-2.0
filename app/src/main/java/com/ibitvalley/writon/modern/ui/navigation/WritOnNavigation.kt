package com.ibitvalley.writon.modern.ui.navigation

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.os.Build
import android.util.Log
import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavController
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.navArgument
import com.ibitvalley.writon.modern.core.telemetry.WritOnTelemetry
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import com.google.firebase.auth.FirebaseAuth
import androidx.compose.ui.res.stringResource
import com.ibitvalley.writon.R
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandBeige
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandRed
import com.ibitvalley.writon.modern.core.database.WritOnDatabase
import com.ibitvalley.writon.modern.core.auth.FirebaseAuthManager
import com.ibitvalley.writon.modern.core.preferences.UserPreferences
import com.ibitvalley.writon.modern.core.network.WritOnApiService
import com.ibitvalley.writon.modern.core.network.model.UpdateInterestsRequestDto
import com.ibitvalley.writon.modern.core.notification.PushNotificationRegistration
import com.ibitvalley.writon.modern.core.preferences.EngagementPreferencesSync
import com.ibitvalley.writon.modern.data.repository.PostRepository
import com.ibitvalley.writon.modern.data.repository.DraftRepository
import com.ibitvalley.writon.modern.data.repository.MediaRepository
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
import com.ibitvalley.writon.modern.feature.notifications.NotificationSettingsScreen
import com.ibitvalley.writon.modern.feature.onboarding.InterestsScreen
import com.ibitvalley.writon.modern.feature.onboarding.InterestTopicCatalog
import com.ibitvalley.writon.modern.feature.onboarding.InterestsViewModel
import com.ibitvalley.writon.modern.feature.onboarding.IntentOnboardingScreen
import com.ibitvalley.writon.modern.feature.profile.ApplaudsScreen
import com.ibitvalley.writon.modern.feature.profile.AuthorProfileScreen
import com.ibitvalley.writon.modern.feature.profile.ProfileScreen
import com.ibitvalley.writon.modern.feature.profile.ProfileViewModel
import com.ibitvalley.writon.modern.feature.profile.ProfileStatsDestination
import com.ibitvalley.writon.modern.feature.profile.ProfileStatsDetailScreen
import com.ibitvalley.writon.modern.feature.profile.ProfileStatsDetailViewModel
import com.ibitvalley.writon.modern.feature.reader.ReaderScreen
import com.ibitvalley.writon.modern.feature.reader.ReaderViewModel
import com.ibitvalley.writon.modern.feature.search.SearchScreen
import com.ibitvalley.writon.modern.feature.search.SearchViewModel
import com.ibitvalley.writon.modern.feature.settings.SettingsScreen
import com.ibitvalley.writon.modern.feature.welcome.WelcomeScreen
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

sealed class WritOnRoute(val route: String) {
    object Welcome : WritOnRoute("welcome")
    object Login : WritOnRoute("login")
    object Signup : WritOnRoute("signup")
    object IntentOnboarding : WritOnRoute("onboarding-intent?fromSettings={fromSettings}") {
        fun createRoute(fromSettings: Boolean = false) = "onboarding-intent?fromSettings=$fromSettings"
    }
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
    object NotificationSettings : WritOnRoute("notification-settings")
    object Settings : WritOnRoute("settings")
    object Appearance : WritOnRoute("appearance")
    object Applauds : WritOnRoute("applauds")
    object Profile : WritOnRoute("profile")
    object ProfileStats : WritOnRoute("profile-stats/{type}") {
        fun createRoute(destination: ProfileStatsDestination) = "profile-stats/${destination.routeValue}"
    }
    object AuthorProfile : WritOnRoute("author/{authorId}?followingHint={followingHint}") {
        fun createRoute(authorId: String, followingHint: Boolean = false) =
            "author/${java.net.URLEncoder.encode(authorId, Charsets.UTF_8.name()).replace("+", "%20")}?followingHint=$followingHint"
    }
    object Reader : WritOnRoute("reader/{storyId}") {
        fun createRoute(storyId: String) = "reader/$storyId"
    }
    object Comments : WritOnRoute("comments/{storyId}") {
        fun createRoute(storyId: String) = "comments/$storyId"
    }
}

private data class BottomNavItem(
    val route: String,
    @androidx.annotation.StringRes val labelRes: Int,
    @androidx.annotation.DrawableRes val unselectedIcon: Int,
    @androidx.annotation.DrawableRes val selectedIcon: Int
)

private val bottomNavItems = listOf(
    BottomNavItem(WritOnRoute.Home.route, R.string.nav_home, R.drawable.ic_home_muted, R.drawable.ic_home_orange),
    BottomNavItem(WritOnRoute.Explore.route, R.string.nav_explore, R.drawable.ic_explore_muted, R.drawable.ic_explore_orange),
    BottomNavItem(WritOnRoute.Library.route, R.string.nav_library, R.drawable.ic_library_muted, R.drawable.ic_library_orange),
    BottomNavItem(WritOnRoute.Profile.route, R.string.nav_profile, R.drawable.ic_profile_muted, R.drawable.ic_profile_orange)
)

@Composable
fun WritOnNavigation(
    navController: NavHostController,
    repository: PostRepository,
    draftRepository: DraftRepository,
    mediaRepository: MediaRepository,
    userPreferences: UserPreferences,
    database: WritOnDatabase,
    apiService: WritOnApiService,
    activity: android.app.Activity? = null,
    initialNotificationRoute: String? = null,
    onNotificationRouteConsumed: () -> Unit = {},
    onRequestNotificationPermission: () -> Unit = {},
    inAppUpdateUiState: com.ibitvalley.writon.modern.core.update.InAppUpdateUiState = com.ibitvalley.writon.modern.core.update.InAppUpdateUiState.Hidden,
    showExploreCuratedBanner: Boolean = true,
    exploreTrendingStoriesLimit: Int = 10,
    showExistingUserPreferencesCard: Boolean = false,
    personalizedHomeFeedEnabled: Boolean = false,
    onStartInAppUpdate: () -> Unit = {},
    onCompleteInAppUpdate: () -> Unit = {},
    onThemeChanged: (String) -> Unit = {}
) {
    val feedViewModel = remember { FeedViewModel(repository) }
    LaunchedEffect(personalizedHomeFeedEnabled) {
        feedViewModel.setPersonalizedFeedEnabled(personalizedHomeFeedEnabled)
    }
    val collectionsViewModel = remember { CollectionsViewModel(apiService) }
    val exploreViewModel = remember { ExploreViewModel(apiService) }
    val searchViewModel = remember { SearchViewModel(apiService, database.postDao(), database.userDao()) }
    val coroutineScope = rememberCoroutineScope()
    val context = LocalContext.current
    val snackbarHostState = remember { SnackbarHostState() }
    var firebaseUser by remember { mutableStateOf(FirebaseAuth.getInstance().currentUser) }
    var preferencesPendingSync by remember(firebaseUser?.uid) {
        mutableStateOf(firebaseUser?.uid?.let { uid ->
            userPreferences.hasPendingInterestSync(uid) || userPreferences.hasPendingEngagementSync(uid)
        } == true)
    }
    var preferencesRevision by remember(firebaseUser?.uid) { mutableIntStateOf(0) }
    val preferencesSyncMutex = remember(firebaseUser?.uid) { Mutex() }
    val editorViewModel = remember(firebaseUser?.uid) {
        EditorViewModel(repository, draftRepository, mediaRepository)
    }
        DisposableEffect(Unit) {
        val auth = FirebaseAuth.getInstance()
        val listener = FirebaseAuth.AuthStateListener {
            firebaseUser = it.currentUser
            WritOnTelemetry.setUserId(context, it.currentUser?.uid)
        }
        auth.addAuthStateListener(listener)
        onDispose { auth.removeAuthStateListener(listener) }
    }

    DisposableEffect(navController) {
        val destinationListener = NavController.OnDestinationChangedListener { _, destination, _ ->
            val route = destination.route.orEmpty()
            val screenName = when {
                route == WritOnRoute.Home.route -> "HomeFeed"
                route.startsWith("reader/") -> "StoryReader"
                route == WritOnRoute.Write.route -> "StoryEditor"
                route == WritOnRoute.Publish.route -> "PublishStory"
                route == WritOnRoute.Explore.route -> "Explore"
                route == WritOnRoute.Search.route -> "Search"
                route == WritOnRoute.Library.route -> "Library"
                route == WritOnRoute.Notifications.route -> "Notifications"
                route == WritOnRoute.NotificationSettings.route -> "NotificationSettings"
                route == WritOnRoute.Settings.route -> "Settings"
                route == WritOnRoute.Profile.route -> "Profile"
                route == WritOnRoute.Login.route -> "Login"
                route == WritOnRoute.Signup.route -> "Signup"
                route == WritOnRoute.Welcome.route -> "Welcome"
                route.startsWith("interests") -> "Interests"
                route.startsWith("author/") -> "AuthorProfile"
                route.startsWith("comments/") -> "StoryComments"
                route.startsWith("profile/stats") -> "ProfileStats"
                route.isNotBlank() -> route
                else -> "ComposeUnknown"
            }
            WritOnTelemetry.screenView(context, screenName, destination.route ?: "ComposeDestination")
        }
        navController.addOnDestinationChangedListener(destinationListener)
        onDispose { navController.removeOnDestinationChangedListener(destinationListener) }
    }
    val signedIn = firebaseUser != null
    var showSignInPrompt by remember { mutableStateOf(false) }
    var pendingAuthRoute by rememberSaveable { mutableStateOf<String?>(null) }
    var hasPendingAuthAction by rememberSaveable { mutableStateOf(false) }
    var onboardingIntentHint by rememberSaveable { mutableStateOf<String?>(null) }
    LaunchedEffect(signedIn) {
        if (signedIn) showSignInPrompt = false
    }
    val requestAuthentication: (String, Boolean) -> Unit = { route, actionNeedsRetry ->
        pendingAuthRoute = route
        hasPendingAuthAction = actionNeedsRetry
        showSignInPrompt = true
    }
    if (showSignInPrompt && !signedIn) {
        GuestSignInPrompt(
            onSignIn = {
                showSignInPrompt = false
                navController.navigate(WritOnRoute.Login.route) { launchSingleTop = true }
            },
            onDismiss = {
                showSignInPrompt = false
                // Protected deep links may not have a readable screen behind the prompt.
                val route = navController.currentDestination?.route.orEmpty()
                pendingAuthRoute = null
                hasPendingAuthAction = false
                if (route in setOf(WritOnRoute.Write.route, WritOnRoute.Publish.route,
                        WritOnRoute.Library.route, WritOnRoute.ReadingHistory.route,
                        WritOnRoute.Notifications.route, WritOnRoute.Settings.route,
                        WritOnRoute.Profile.route, WritOnRoute.Applauds.route)) {
                    navController.navigate(WritOnRoute.Home.route) {
                        popUpTo(navController.graph.id) { inclusive = true }
                        launchSingleTop = true
                    }
                }
            }
        )
    }
    fun continueToPendingDestination() {
        val destination = postAuthenticationDestination(pendingAuthRoute)
        val showCompletionHint = hasPendingAuthAction
        pendingAuthRoute = null
        hasPendingAuthAction = false
        navController.navigate(destination) {
            popUpTo(navController.graph.id) { inclusive = true }
            launchSingleTop = true
        }
        if (showCompletionHint) {
            coroutineScope.launch {
                snackbarHostState.showSnackbar(context.getString(R.string.auth_action_ready))
            }
        }
    }
    val continueAfterAuthentication: (Boolean) -> Unit = { requirePersonalizedOnboarding ->
        FirebaseAuthManager.syncNetworkAuthToken { hasToken ->
            if (!hasToken) {
                Log.w("WritOnAuth", "Authentication succeeded but no Firebase token was available.")
            } else {
                val authenticatedUid = FirebaseAuth.getInstance().currentUser?.uid
                coroutineScope.launch {
                    val hydrated = authenticatedUid?.let { uid ->
                        EngagementPreferencesSync(apiService, userPreferences).hydrate(uid)
                            .onFailure { error ->
                                Log.w("WritOnPreferences", "Using local onboarding state until account sync retries.", error)
                            }
                            .getOrNull()
                    }
                    val localVersion = authenticatedUid
                        ?.let(userPreferences::engagementPreferences)
                        ?.onboardingVersion
                        ?: 0
                    userPreferences.isVisitorMode = false
                    if (!shouldOpenPersonalizedOnboarding(
                            requirePersonalizedOnboarding,
                            userPreferences.isOnboardingComplete,
                            hydrated?.onboardingVersion ?: localVersion,
                        )) {
                        userPreferences.isOnboardingComplete = true
                        continueToPendingDestination()
                    } else {
                        navController.navigate(WritOnRoute.IntentOnboarding.createRoute()) {
                            launchSingleTop = true
                        }
                    }
                }
            }
        }
    }
    val startDestination = remember(initialNotificationRoute) {
        initialNavigationDestination(
            incomingRoute = resolveNotificationRoute(initialNotificationRoute),
            signedIn = FirebaseAuth.getInstance().currentUser != null,
            visitorOnboardingComplete = userPreferences.isVisitorMode && userPreferences.isOnboardingComplete,
        )
    }
    val currentBackStackEntry by navController.currentBackStackEntryAsState()
    val isWritingFlow = currentBackStackEntry?.destination?.route in setOf(
        WritOnRoute.Write.route,
        WritOnRoute.Publish.route
    )

    LaunchedEffect(Unit) {
        FirebaseAuthManager.syncNetworkAuthToken { hasToken ->
            if (!hasToken) return@syncNetworkAuthToken

            coroutineScope.launch {
                runCatching {
                    apiService.getMyProfile()
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

    LaunchedEffect(firebaseUser?.uid) {
        if (firebaseUser != null) {
            EngagementPreferencesSync(apiService, userPreferences).hydrate(firebaseUser!!.uid)
                .onSuccess { preferencesRevision += 1 }
                .onFailure { error -> Log.w("WritOnPreferences", "Engagement preferences will retry later.", error) }
        }
    }

    DisposableEffect(firebaseUser?.uid) {
        val accountId = firebaseUser?.uid
        if (accountId == null) return@DisposableEffect onDispose { }
        val connectivity = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val callback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                coroutineScope.launch {
                    preferencesSyncMutex.withLock {
                        preferencesPendingSync = userPreferences.hasPendingInterestSync(accountId) ||
                            userPreferences.hasPendingEngagementSync(accountId)
                        if (!preferencesPendingSync) return@withLock
                        retryPendingAccountPreferences(apiService, userPreferences, accountId)
                        preferencesRevision += 1
                        preferencesPendingSync = userPreferences.hasPendingInterestSync(accountId) ||
                            userPreferences.hasPendingEngagementSync(accountId)
                    }
                }
            }
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            connectivity.registerDefaultNetworkCallback(callback)
        } else {
            connectivity.registerNetworkCallback(
                NetworkRequest.Builder()
                    .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                    .build(),
                callback
            )
        }
        onDispose { runCatching { connectivity.unregisterNetworkCallback(callback) } }
    }

    LaunchedEffect(initialNotificationRoute) {
        val safeRoute = resolveNotificationRoute(initialNotificationRoute) ?: return@LaunchedEffect
        if (safeRoute.startsWith("reader/") && firebaseUser == null) {
            userPreferences.isVisitorMode = true
            userPreferences.isOnboardingComplete = true
        }
        navController.navigate(safeRoute) { launchSingleTop = true }
        onNotificationRouteConsumed()
    }

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        snackbarHost = { SnackbarHost(snackbarHostState) },
        bottomBar = {
            if (!isWritingFlow) {
                WritOnBottomNavigation(
                    navController = navController,
                    isSignedIn = signedIn,
                    onLoginRequired = { route -> requestAuthentication(route, false) }
                )
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = startDestination,
            modifier = Modifier.padding(innerPadding)
        ) {
            composable(WritOnRoute.Welcome.route) {
                WelcomeScreen(
                    onStartWriting = {
                        WritOnTelemetry.onboardingEntrySelected(context, "write")
                        pendingAuthRoute = WritOnRoute.Write.route
                        hasPendingAuthAction = false
                        onboardingIntentHint = "write"
                        navController.navigate(WritOnRoute.Signup.route)
                    },
                    onLogin = {
                        WritOnTelemetry.onboardingEntrySelected(context, "sign_in")
                        pendingAuthRoute = null
                        hasPendingAuthAction = false
                        navController.navigate(WritOnRoute.Login.route)
                    },
                    onStartReading = {
                        WritOnTelemetry.onboardingEntrySelected(context, "read")
                        userPreferences.isVisitorMode = true
                        userPreferences.isOnboardingComplete = true
                        navController.navigate(WritOnRoute.Home.route) {
                            popUpTo(WritOnRoute.Welcome.route) { inclusive = true }
                            launchSingleTop = true
                        }
                    }
                )
            }
            composable(WritOnRoute.Login.route) {
                LoginScreen(
                    onBackClick = { navController.popBackStack() },
                    onSignInClick = { continueAfterAuthentication(false) },
                    onSignUpClick = { navController.navigate(WritOnRoute.Signup.route) }
                )
            }
            composable(WritOnRoute.Signup.route) {
                SignupScreen(
                    onBackClick = { navController.popBackStack() },
                    onSignInClick = { navController.navigate(WritOnRoute.Login.route) },
                    onCreateAccountClick = { continueAfterAuthentication(true) }
                )
            }
            composable(
                route = WritOnRoute.IntentOnboarding.route,
                arguments = listOf(
                    androidx.navigation.navArgument("fromSettings") {
                        type = androidx.navigation.NavType.BoolType
                        defaultValue = false
                    }
                )
            ) { backStackEntry ->
                val fromSettings = backStackEntry.arguments?.getBoolean("fromSettings") ?: false
                val intentAccountId = firebaseUser?.uid
                IntentOnboardingScreen(
                    initialIntent = userPreferences.engagementPreferences(intentAccountId).primaryIntent
                        ?: onboardingIntentHint,
                    onBackClick = { navController.popBackStack() },
                    onIntentSaved = { intent ->
                        pendingAuthRoute = destinationAfterIntentChoice(pendingAuthRoute, intent)
                        onboardingIntentHint = intent
                        val current = userPreferences.engagementPreferences(intentAccountId)
                        val saved = userPreferences.saveEngagementPreferences(
                            intentAccountId,
                            current.copy(primaryIntent = intent),
                            pendingSync = intentAccountId != null,
                        )
                        if (saved && intentAccountId != null) {
                            coroutineScope.launch {
                                EngagementPreferencesSync(apiService, userPreferences).hydrate(intentAccountId)
                                    .onFailure { error ->
                                        Log.w("WritOnPreferences", "Primary intent will retry later.", error)
                                    }
                            }
                        }
                        saved
                    },
                    onContinue = {
                        navController.navigate(WritOnRoute.Interests.createRoute(fromSettings))
                    },
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
                val interestsAccountId = firebaseUser?.uid
                val interestsViewModel = remember(fromSettings, interestsAccountId) {
                    InterestsViewModel(apiService, userPreferences, interestsAccountId) {
                        FirebaseAuth.getInstance().currentUser?.uid == interestsAccountId
                    }
                }
                DisposableEffect(interestsViewModel) {
                    onDispose { interestsViewModel.close() }
                }
                val interestsUiState by interestsViewModel.uiState.collectAsState()
                var completionHandled by rememberSaveable(fromSettings) { mutableStateOf(false) }
                val continueFromInterests: () -> Unit = {
                    if (!completionHandled) {
                        completionHandled = true
                        feedViewModel.selectCategory("All")
                        feedViewModel.refreshFeed()
                        preferencesPendingSync = interestsAccountId?.let { uid ->
                            userPreferences.hasPendingInterestSync(uid) ||
                                userPreferences.hasPendingEngagementSync(uid)
                        } == true
                        if (interestsAccountId != null && preferencesPendingSync) {
                            coroutineScope.launch {
                                preferencesSyncMutex.withLock {
                                    retryPendingAccountPreferences(apiService, userPreferences, interestsAccountId)
                                    preferencesPendingSync = userPreferences.hasPendingInterestSync(interestsAccountId) ||
                                        userPreferences.hasPendingEngagementSync(interestsAccountId)
                                }
                            }
                        }
                        val destination = onboardingCompletionDestination(fromSettings, pendingAuthRoute)
                        if (fromSettings) {
                            if (!navController.popBackStack(WritOnRoute.Settings.route, inclusive = false)) {
                                navController.navigate(destination) {
                                    popUpTo(WritOnRoute.IntentOnboarding.route) { inclusive = true }
                                    launchSingleTop = true
                                }
                            }
                        } else if (navController.previousBackStackEntry?.destination?.route == WritOnRoute.Explore.route) {
                            navController.popBackStack()
                        } else {
                            continueToPendingDestination()
                        }
                    }
                }
                key(interestsAccountId) {
                InterestsScreen(
                    initialSelectedTopicIds = interestsUiState.selectedTopicIds,
                    availableTopics = interestsUiState.availableTopics,
                    isSaving = interestsUiState.isSaving,
                    errorMessage = when {
                        interestsUiState.exceedsSyncLimit -> stringResource(R.string.interests_sync_limit)
                        interestsUiState.hasSyncError -> stringResource(R.string.interests_sync_failed)
                        else -> null
                    },
                    onSelectionEdited = interestsViewModel::markEdited,
                    onBackClick = { navController.popBackStack() },
                    onContinueClick = { selected ->
                        interestsViewModel.save(selected, continueFromInterests)
                    },
                    onContinueWithSavedChoices = {
                        interestsViewModel.continueWithSavedChoices(continueFromInterests)
                    },
                    onSkipClick = {
                        interestsViewModel.continueWithSavedChoices(continueFromInterests)
                    }
                )
                }
            }
            composable(WritOnRoute.Home.route) {
                val continuationOwner = firebaseUser?.uid
                var homePreferences by remember(continuationOwner) {
                    mutableStateOf(userPreferences.engagementPreferences(continuationOwner))
                }
                var homeInterestCount by remember(continuationOwner) {
                    mutableIntStateOf(userPreferences.interestChoices(continuationOwner).size)
                }
                LaunchedEffect(continuationOwner, preferencesRevision) {
                    homePreferences = userPreferences.engagementPreferences(continuationOwner)
                    homeInterestCount = userPreferences.interestChoices(continuationOwner).size
                }
                var continuation by remember(continuationOwner) { mutableStateOf(userPreferences.readingContinuation(continuationOwner)) }
                LaunchedEffect(continuationOwner) {
                    collectionsViewModel.loadFollowedWriterReturnEntry(continuationOwner)
                }
                val homeLifecycle = androidx.lifecycle.compose.LocalLifecycleOwner.current.lifecycle
                DisposableEffect(homeLifecycle, continuationOwner) {
                    val observer = androidx.lifecycle.LifecycleEventObserver { _, event ->
                        if (event == androidx.lifecycle.Lifecycle.Event.ON_RESUME) {
                            continuation = userPreferences.readingContinuation(continuationOwner)
                            homePreferences = userPreferences.engagementPreferences(continuationOwner)
                            homeInterestCount = userPreferences.interestChoices(continuationOwner).size
                            collectionsViewModel.loadFollowedWriterReturnEntry(continuationOwner)
                            preferencesPendingSync = continuationOwner?.let { uid ->
                                userPreferences.hasPendingInterestSync(uid) || userPreferences.hasPendingEngagementSync(uid)
                            } == true
                        }
                    }
                    homeLifecycle.addObserver(observer)
                    onDispose { homeLifecycle.removeObserver(observer) }
                }
                val continuationPost by remember(continuation?.storyId) {
                    continuation?.let { repository.getPostDetailFlow(it.storyId) }
                        ?: kotlinx.coroutines.flow.flowOf(null)
                }.collectAsState(initial = null)
                val latestDraft by remember(continuationOwner) {
                    draftRepository.observeLatestDraft()
                }.collectAsState(initial = null)
                val followedWriterReturnEntry = collectionsViewModel.followedWriterReturnEntry
                FeedScreen(
                    continuationTitle = continuationPost?.title,
                    onContinueReading = { continuation?.let { navController.navigate(WritOnRoute.Reader.createRoute(it.storyId)) } },
                    onDismissContinuation = {
                        continuation?.let { userPreferences.clearReadingContinuation(continuationOwner, it.storyId) }
                        continuation = null
                    },
                    draftTitle = latestDraft?.title,
                    onContinueWriting = { navController.navigate(WritOnRoute.Write.route) },
                    followedWriterStoryTitle = followedWriterReturnEntry?.storyTitle,
                    followedWriterName = followedWriterReturnEntry?.writerName,
                    onFollowedWriterStoryClick = {
                        followedWriterReturnEntry?.let { entry ->
                            collectionsViewModel.consumeFollowedWriterReturnEntry()
                            navController.navigate(WritOnRoute.Reader.createRoute(entry.storyId))
                        }
                    },
                    viewModel = feedViewModel,
                    onStoryClick = { id -> navController.navigate(WritOnRoute.Reader.createRoute(id)) },
                    onWriteClick = {
                        if (signedIn) {
                            navController.navigate(WritOnRoute.Write.route) {
                                popUpTo(WritOnRoute.Home.route) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        } else requestAuthentication(WritOnRoute.Write.route, false)
                    },
                    onLibraryClick = {
                        if (signedIn) {
                            navController.navigate(WritOnRoute.Library.route) {
                                popUpTo(WritOnRoute.Home.route) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        } else requestAuthentication(WritOnRoute.Library.route, false)
                    },
                    onSearchClick = { navController.navigate(WritOnRoute.Search.route) },
                    onNotificationsClick = {
                        navController.navigate(
                            if (signedIn) WritOnRoute.Notifications.route else WritOnRoute.NotificationSettings.route
                        )
                    },
                    onProfileClick = {
                        if (signedIn) {
                            navController.navigate(WritOnRoute.Profile.route) {
                                popUpTo(WritOnRoute.Home.route) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        } else requestAuthentication(WritOnRoute.Profile.route, false)
                    },
                    onAuthorClick = { authorId -> navController.navigate(WritOnRoute.AuthorProfile.createRoute(authorId)) },
                    isAuthenticated = signedIn,
                    onLoginRequired = { requestAuthentication(WritOnRoute.Home.route, true) },
                    showExistingUserPreferencesCard = shouldShowExistingUserPreferencesCard(
                        enabled = showExistingUserPreferencesCard,
                        interestCount = homeInterestCount,
                        preferences = homePreferences,
                    ),
                    onChoosePreferences = {
                        navController.navigate(WritOnRoute.Interests.createRoute())
                    },
                    onDismissPreferences = {
                        val dismissed = homePreferences.copy(preferenceCardState = "dismissed")
                        homePreferences = dismissed
                        preferencesPendingSync = continuationOwner != null
                        coroutineScope.launch {
                            EngagementPreferencesSync(apiService, userPreferences).save(continuationOwner, dismissed)
                                .onSuccess { preferencesPendingSync = false }
                                .onFailure { error -> Log.w("WritOnPreferences", "Preference-card dismissal will retry later.", error) }
                        }
                    }
                )
            }
            composable(WritOnRoute.Explore.route) {
                ExploreScreen(
                    viewModel = exploreViewModel,
                    onStoryClick = { id -> navController.navigate(WritOnRoute.Reader.createRoute(id)) },
                    onSearchClick = { navController.navigate(WritOnRoute.Search.route) },
                    onReadingPreferencesClick = {
                        navController.navigate(WritOnRoute.Interests.createRoute())
                    },
                    showCuratedBanner = showExploreCuratedBanner,
                    trendingStoriesLimit = exploreTrendingStoriesLimit
                )
            }
            composable(WritOnRoute.Search.route) {
                SearchScreen(
                    viewModel = searchViewModel,
                    onStoryClick = { id -> navController.navigate(WritOnRoute.Reader.createRoute(id)) },
                    onExploreClick = { navController.navigate(WritOnRoute.Explore.route) },
                    onNotificationsClick = {
                        if (signedIn) navController.navigate(WritOnRoute.Notifications.route)
                        else requestAuthentication(WritOnRoute.Notifications.route, false)
                    },
                    onAuthorClick = { authorId -> navController.navigate(WritOnRoute.AuthorProfile.createRoute(authorId)) },
                )
            }
            composable(WritOnRoute.Write.route) {
                if (signedIn) {
                    StoryEditorScreen(
                        viewModel = editorViewModel,
                        onBackClick = { navController.popBackStack() },
                        onPublishClick = { navController.navigate(WritOnRoute.Publish.route) }
                    )
                } else LaunchedEffect(Unit) { requestAuthentication(WritOnRoute.Write.route, false) }
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
                            onRequestNotificationPermission()
                        }
                    )
                } else LaunchedEffect(Unit) { requestAuthentication(WritOnRoute.Publish.route, false) }
            }
            composable(WritOnRoute.Library.route) {
                if (signedIn) {
                    LibraryScreen(
                        viewModel = collectionsViewModel,
                        onStoryClick = { id -> navController.navigate(WritOnRoute.Reader.createRoute(id)) },
                        onSearchClick = { navController.navigate(WritOnRoute.Search.route) },
                        onHistoryClick = { navController.navigate(WritOnRoute.ReadingHistory.route) },
                        onExploreClick = { navController.navigate(WritOnRoute.Explore.route) }
                    )
                } else LaunchedEffect(Unit) { requestAuthentication(WritOnRoute.Library.route, false) }
            }
            composable(WritOnRoute.ReadingHistory.route) {
                if (signedIn) {
                    ReadingHistoryScreen(
                        viewModel = collectionsViewModel,
                        onStoryClick = { id -> navController.navigate(WritOnRoute.Reader.createRoute(id)) },
                        onSearchClick = { navController.navigate(WritOnRoute.Search.route) },
                        onSettingsClick = { navController.navigate(WritOnRoute.Settings.route) }
                    )
                } else LaunchedEffect(Unit) { requestAuthentication(WritOnRoute.ReadingHistory.route, false) }
            }
            composable(WritOnRoute.Notifications.route) {
                if (signedIn) {
                    NotificationsScreen(
                        viewModel = collectionsViewModel,
                        onSearchClick = { navController.navigate(WritOnRoute.Search.route) },
                        onSettingsClick = { navController.navigate(WritOnRoute.NotificationSettings.route) },
                        onStoryClick = { id -> navController.navigate(WritOnRoute.Reader.createRoute(id)) },
                        onAuthorClick = { id -> navController.navigate(WritOnRoute.AuthorProfile.createRoute(id)) },
                    )
                } else LaunchedEffect(Unit) { requestAuthentication(WritOnRoute.Notifications.route, false) }
            }
            composable(WritOnRoute.NotificationSettings.route) {
                NotificationSettingsScreen(
                    apiService = apiService,
                    userPreferences = userPreferences,
                    isSignedIn = signedIn,
                    onBackClick = { navController.popBackStack() },
                )
            }
            composable(WritOnRoute.Settings.route) {
                if (signedIn) SettingsScreen(
                    userPreferences = userPreferences,
                    deleteAccount = { apiService.deleteMyAccount() },
                    onBackClick = { navController.popBackStack() },
                    onAppearanceClick = { navController.navigate(WritOnRoute.Appearance.route) },
                    onInterestsClick = { navController.navigate(WritOnRoute.IntentOnboarding.createRoute(true)) },
                    onSearchClick = { navController.navigate(WritOnRoute.Search.route) },
                    onNotificationsClick = { navController.navigate(WritOnRoute.NotificationSettings.route) },
                    onSavedStoriesClick = { navController.navigate(WritOnRoute.Library.route) },
                    onLogOut = {
                        coroutineScope.launch {
                            PushNotificationRegistration.unregisterCurrentDevice(context)
                            FirebaseAuthManager.signOut()
                            userPreferences.clear()
                            navController.navigate(WritOnRoute.Welcome.route) {
                                popUpTo(navController.graph.id) { inclusive = true }
                                launchSingleTop = true
                            }
                        }
                    }
                ) else LaunchedEffect(Unit) { requestAuthentication(WritOnRoute.Settings.route, false) }
            }
            composable(WritOnRoute.Appearance.route) {
                com.ibitvalley.writon.modern.feature.appearance.AppearanceScreen(
                    userPreferences = userPreferences,
                    onBackClick = { navController.popBackStack() },
                    onThemeChanged = onThemeChanged
                )
            }
            composable(WritOnRoute.Applauds.route) {
                if (signedIn) ApplaudsScreen(
                    viewModel = collectionsViewModel,
                    onBackClick = { navController.popBackStack() },
                    onStoryClick = { id -> navController.navigate(WritOnRoute.Reader.createRoute(id)) },
                    onSearchClick = { navController.navigate(WritOnRoute.Search.route) },
                    onSettingsClick = { navController.navigate(WritOnRoute.Settings.route) }
                ) else LaunchedEffect(Unit) { requestAuthentication(WritOnRoute.Applauds.route, false) }
            }
            composable(WritOnRoute.Profile.route) {
                if (signedIn) {
                    val profileViewModel = remember {
                        ProfileViewModel(apiService, database.userDao(), mediaRepository, repository)
                    }
                    ProfileScreen(
                        viewModel = profileViewModel,
                        onBackClick = {
                            if (!navController.popBackStack()) {
                                navController.navigate(WritOnRoute.Home.route) {
                                    popUpTo(WritOnRoute.Home.route) { inclusive = false }
                                    launchSingleTop = true
                                }
                            }
                        },
                        onStoryClick = { id -> navController.navigate(WritOnRoute.Reader.createRoute(id)) },
                        onEditStory = { story ->
                            editorViewModel.beginEditingPublishedStory(story)
                            navController.navigate(WritOnRoute.Write.route)
                        },
                        onWriteClick = { navController.navigate(WritOnRoute.Write.route) },
                        onStoriesClick = { navController.navigate(WritOnRoute.ProfileStats.createRoute(ProfileStatsDestination.Stories)) },
                        onApplaudsClick = { navController.navigate(WritOnRoute.ProfileStats.createRoute(ProfileStatsDestination.Applauds)) },
                        onFollowersClick = { navController.navigate(WritOnRoute.ProfileStats.createRoute(ProfileStatsDestination.Followers)) },
                        onFollowingClick = { navController.navigate(WritOnRoute.ProfileStats.createRoute(ProfileStatsDestination.Following)) },
                        onSettingsClick = { navController.navigate(WritOnRoute.Settings.route) }
                    )

                } else {
                    LaunchedEffect(Unit) { requestAuthentication(WritOnRoute.Profile.route, false) }
                }
            }
            composable(WritOnRoute.ProfileStats.route) { backStackEntry ->
                val destination = ProfileStatsDestination.fromRoute(backStackEntry.arguments?.getString("type"))
                    ?: return@composable
                val viewModel = remember(destination) {
                    ProfileStatsDetailViewModel(destination, apiService)
                }
                ProfileStatsDetailScreen(
                    destination = destination,
                    viewModel = viewModel,
                    onBackClick = { navController.popBackStack() },
                    onStoryClick = { id -> navController.navigate(WritOnRoute.Reader.createRoute(id)) },
                    onAuthorClick = { id ->
                        navController.navigate(
                            WritOnRoute.AuthorProfile.createRoute(
                                id,
                                followingHint = destination == ProfileStatsDestination.Following,
                            )
                        )
                    },
                )
            }
            composable(
                route = WritOnRoute.AuthorProfile.route,
                arguments = listOf(navArgument("followingHint") {
                    type = NavType.BoolType
                    defaultValue = false
                }),
            ) { backStackEntry ->
                val authorId = backStackEntry.arguments?.getString("authorId") ?: return@composable
                AuthorProfileScreen(
                    authorId = authorId,
                    initialFollowingHint = backStackEntry.arguments?.getBoolean("followingHint") == true,
                    apiService = apiService,
                    isAuthenticated = signedIn,
                    viewerId = firebaseUser?.uid,
                    onBackClick = { navController.popBackStack() },
                    onStoryClick = { id -> navController.navigate(WritOnRoute.Reader.createRoute(id)) },
                    onLoginRequired = {
                        requestAuthentication(WritOnRoute.AuthorProfile.createRoute(authorId), true)
                    }
                )
            }
            composable(WritOnRoute.Reader.route) { backStackEntry ->
                val storyId = backStackEntry.arguments?.getString("storyId") ?: ""
                val readerViewModel = remember(storyId) {
                    ReaderViewModel(storyId, repository)
                }
                ReaderScreen(
                    viewModel = readerViewModel,
                    userPreferences = userPreferences,
                    onBackClick = {
                        val popped = navController.popBackStack()
                        if (!popped || navController.currentBackStackEntry?.destination?.route == WritOnRoute.Welcome.route) {
                            userPreferences.isVisitorMode = true
                            userPreferences.isOnboardingComplete = true
                            navController.navigate(WritOnRoute.Home.route) {
                                popUpTo(WritOnRoute.Welcome.route) { inclusive = true }
                                launchSingleTop = true
                            }
                        }
                    },
                    onAuthorClick = { authorId -> navController.navigate(WritOnRoute.AuthorProfile.createRoute(authorId)) },
                    onDiscoverMore = {
                        userPreferences.isVisitorMode = true
                        userPreferences.isOnboardingComplete = true
                        if (!navController.popBackStack(WritOnRoute.Home.route, false)) {
                            navController.navigate(WritOnRoute.Home.route) {
                                popUpTo(WritOnRoute.Welcome.route) { inclusive = true }
                                launchSingleTop = true
                            }
                        }
                    },
                    onNextStoryClick = { nextStoryId ->
                        WritOnTelemetry.nextStoryTapped(context, storyId, nextStoryId)
                        navController.navigate(WritOnRoute.Reader.createRoute(nextStoryId))
                    },
                    continuationAccountId = firebaseUser?.uid,
                    onReadingValueMoment = onRequestNotificationPermission,
                    onBookmarkValueMoment = onRequestNotificationPermission,
                    onCommentsClick = { navController.navigate(WritOnRoute.Comments.createRoute(storyId)) },
                    onLoginRequired = {
                        requestAuthentication(WritOnRoute.Reader.createRoute(storyId), true)
                    }
                )
            }
            composable(WritOnRoute.Comments.route) { backStackEntry ->
                val storyId = backStackEntry.arguments?.getString("storyId") ?: ""
                val readerViewModel = remember(storyId) {
                    ReaderViewModel(storyId, repository)
                }
                val comments by readerViewModel.comments.collectAsState()
                val post by readerViewModel.post.collectAsState()
                val commentMutationError by readerViewModel.commentMutationError.collectAsState()
                val user = FirebaseAuth.getInstance().currentUser
                val authorName = user?.displayName ?: user?.email?.substringBefore("@") ?: "You"

                com.ibitvalley.writon.modern.feature.comments.CommentsScreen(
                    comments = comments,
                    currentUserInitials = authorName,
                    totalCount = comments.size.coerceAtLeast(post?.commentsCnt ?: 0),
                    onBackClick = { navController.popBackStack() },
                    onSubmitComment = { content, parentId ->
                        if (user == null) {
                            requestAuthentication(WritOnRoute.Comments.createRoute(storyId), true)
                        } else {
                            readerViewModel.submitComment(content, authorName, parentId)
                        }
                    },
                    onEditComment = readerViewModel::updateComment,
                    onDeleteComment = readerViewModel::deleteComment,
                    mutationError = commentMutationError,
                    onMutationErrorShown = readerViewModel::clearCommentMutationError,
                )
            }
        }
    }
}

internal fun resolveNotificationRoute(route: String?): String? = when {
    route == null -> null
    route == WritOnRoute.Home.route -> route
    route == WritOnRoute.Notifications.route -> route
    route.startsWith("reader/") && route.removePrefix("reader/").isNotBlank() -> route
    else -> WritOnRoute.Notifications.route
}

internal fun initialNavigationDestination(
    incomingRoute: String?,
    signedIn: Boolean,
    visitorOnboardingComplete: Boolean,
): String = incomingRoute ?: if (signedIn || visitorOnboardingComplete) {
    WritOnRoute.Home.route
} else {
    WritOnRoute.Welcome.route
}

internal fun shouldOpenPersonalizedOnboarding(
    newlyCreatedAccount: Boolean,
    localOnboardingComplete: Boolean,
    accountOnboardingVersion: Int,
): Boolean = newlyCreatedAccount || (!localOnboardingComplete && accountOnboardingVersion < 1)

internal fun postAuthenticationDestination(pendingRoute: String?): String =
    pendingRoute ?: WritOnRoute.Home.route

internal fun onboardingCompletionDestination(fromSettings: Boolean, pendingRoute: String? = null): String =
    if (fromSettings) WritOnRoute.Settings.route else postAuthenticationDestination(pendingRoute)

internal fun destinationAfterIntentChoice(pendingRoute: String?, intent: String?): String? =
    if (pendingRoute == WritOnRoute.Write.route && intent == "read") WritOnRoute.Home.route else pendingRoute

internal fun shouldShowExistingUserPreferencesCard(
    enabled: Boolean,
    interestCount: Int,
    preferences: com.ibitvalley.writon.modern.core.preferences.EngagementPreferences,
): Boolean = enabled && interestCount < 3 && preferences.onboardingVersion < 2 &&
    preferences.preferenceCardState == "unseen"

internal suspend fun retryPendingAccountPreferences(
    apiService: WritOnApiService,
    userPreferences: UserPreferences,
    accountId: String,
): Result<Unit> = runCatching {
    if (userPreferences.hasPendingInterestSync(accountId)) {
        val localIds = userPreferences.interestChoices(accountId)
        val payloadIds = InterestTopicCatalog.serverCompatibleIds(localIds)
        require(payloadIds.size <= 32) { "Too many interests to synchronize." }
        val response = apiService.updateMyInterests(UpdateInterestsRequestDto(payloadIds))
        check(response.isSuccessful) { "Interests could not be synchronized (${response.code()})." }
        val remoteIds = requireNotNull(response.body()).topicIds
        val savedIds = InterestTopicCatalog.preserveSavedIds(remoteIds) +
            localIds.filter { InterestTopicCatalog.normalizeTopicId(it) == null }
        userPreferences.saveInterestChoices(accountId, savedIds, pendingSync = false)
    }
    if (userPreferences.hasPendingEngagementSync(accountId)) {
        EngagementPreferencesSync(apiService, userPreferences).hydrate(accountId).getOrThrow()
    }
}

@Composable
private fun WritOnBottomNavigation(
    navController: NavHostController,
    isSignedIn: Boolean,
    onLoginRequired: (String) -> Unit
) {
    val navBackStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = navBackStackEntry?.destination?.route

    // Define routes that should hide the bottom bar
    val hideBottomBarRoutes = listOf(
        WritOnRoute.Reader.route,
        WritOnRoute.Comments.route,
        WritOnRoute.AuthorProfile.route,
        WritOnRoute.ProfileStats.route,
        WritOnRoute.Publish.route,
        WritOnRoute.Welcome.route,
        WritOnRoute.Login.route,
        WritOnRoute.Signup.route,
        WritOnRoute.IntentOnboarding.route,
        WritOnRoute.Interests.route,
        WritOnRoute.Appearance.route
    )

    if (currentRoute in hideBottomBarRoutes || currentRoute == null) {
        return
    }

    WritOnBottomBar(
        currentRoute = currentRoute,
        onNavigate = { targetRoute ->
            val requiresLogin = targetRoute == WritOnRoute.Library.route ||
                targetRoute == WritOnRoute.Profile.route ||
                targetRoute == WritOnRoute.Write.route
            if (requiresLogin && !isSignedIn) {
                onLoginRequired(targetRoute)
                return@WritOnBottomBar
            }

            if (currentRoute != targetRoute) {
                navController.navigate(targetRoute) {
                    popUpTo(WritOnRoute.Home.route) {
                        saveState = true
                    }
                    launchSingleTop = true
                    restoreState = true
                }
            }
        }
    )
}

@Composable
fun WritOnBottomBar(
    currentRoute: String,
    onNavigate: (String) -> Unit
) {
    val showLabels = shouldShowBottomNavLabels(LocalDensity.current.fontScale)
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .navigationBarsPadding()
            .height(86.dp),
        contentAlignment = Alignment.BottomCenter
    ) {
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .height(70.dp),
            color = MaterialTheme.colorScheme.surface,
            shadowElevation = 4.dp
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f), thickness = 1.dp)
                Row(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(horizontal = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    bottomNavItems.forEachIndexed { index, item ->
                        if (index == 2) {
                            Spacer(modifier = Modifier.width(68.dp))
                        }
                        val selected = currentRoute == item.route ||
                            (currentRoute == WritOnRoute.Search.route && item.route == WritOnRoute.Explore.route) ||
                            (currentRoute == WritOnRoute.ReadingHistory.route && item.route == WritOnRoute.Library.route) ||
                            (currentRoute == WritOnRoute.Settings.route && item.route == WritOnRoute.Profile.route) ||
                            (currentRoute == WritOnRoute.Applauds.route && item.route == WritOnRoute.Profile.route)
                        NavigationItem(
                            modifier = Modifier
                                .weight(1f)
                                .fillMaxHeight(),
                            selected = selected,
                            onClick = { onNavigate(item.route) },
                            icon = if (selected) item.selectedIcon else item.unselectedIcon,
                            label = androidx.compose.ui.res.stringResource(item.labelRes),
                            showLabel = showLabels,
                        )
                    }
                }
            }
        }

        // Center Floating Action Button for Write
        Surface(
            modifier = Modifier
                .padding(bottom = 20.dp)
                .size(56.dp)
                .align(Alignment.BottomCenter),
            shape = CircleShape,
            color = BrandRed,
            shadowElevation = 8.dp,
            onClick = { onNavigate(WritOnRoute.Write.route) }
        ) {
            Box(contentAlignment = Alignment.Center) {
                Image(
                    painter = painterResource(R.drawable.ic_write_quill_white),
                    contentDescription = androidx.compose.ui.res.stringResource(R.string.nav_write),
                    modifier = Modifier.size(28.dp)
                )
            }
        }
    }
}

@Composable
fun NavigationItem(
    modifier: Modifier = Modifier,
    selected: Boolean,
    onClick: () -> Unit,
    icon: Int,
    label: String,
    showLabel: Boolean = true,
) {
    Box(
        modifier = modifier
            .clickable(
                onClick = onClick,
                interactionSource = remember { MutableInteractionSource() },
                indication = null
            ),
        contentAlignment = Alignment.Center
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Image(
                painter = painterResource(icon),
                contentDescription = label,
                modifier = Modifier.size(26.dp),
                colorFilter = if (selected) null else ColorFilter.tint(MaterialTheme.colorScheme.onSurfaceVariant)
            )
            if (showLabel) {
                Spacer(modifier = Modifier.height(3.dp))
                Text(
                    text = label,
                    fontSize = 11.sp,
                    fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
                    color = if (selected) BrandRed else MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 1
                )
            }
        }
    }
}

internal fun shouldShowBottomNavLabels(fontScale: Float): Boolean = fontScale < 1.3f
