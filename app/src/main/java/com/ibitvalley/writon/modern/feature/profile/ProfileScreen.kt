package com.ibitvalley.writon.modern.feature.profile

import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ibitvalley.writon.R
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandBeige
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandRed
import com.ibitvalley.writon.modern.core.designsystem.theme.SurfacePaper
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnElevation
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnRadius
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnSpacing

private val ProfileEditorialFamily = FontFamily(
    Font(R.font.source_serif_4_regular, weight = FontWeight.Normal),
    Font(R.font.source_serif_4_semibold, weight = FontWeight.SemiBold),
    Font(R.font.source_serif_4_semibold, weight = FontWeight.Bold)
)

private data class ProfileStory(val title: String, val readingTime: Int, val applauds: Int)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ProfileScreen(
    viewModel: ProfileViewModel,
    onBackClick: () -> Unit,
    onApplaudsClick: () -> Unit = {},
    onSettingsClick: () -> Unit = {},
) {
    val user by viewModel.userProfile.collectAsState()
    var selectedTab by remember { mutableIntStateOf(0) }
    var overflowExpanded by remember { mutableStateOf(false) }
    val name = user?.fullName ?: "Arjun Kapoor"
    val penName = user?.penName ?: "arjunkapoor"
    val bio = user?.bio ?: "Writer. Observer. Believer in the power of thoughtful words."
    val initials = initialsOf(name)

    Scaffold(
        topBar = {
            CenterAlignedTopAppBar(
                title = { Text("Writer Profile", style = MaterialTheme.typography.headlineSmall.copy(fontFamily = ProfileEditorialFamily)) },
                navigationIcon = { IconButton(onClick = onBackClick) { Image(painterResource(R.drawable.ic_back), contentDescription = "Back", modifier = Modifier.size(24.dp)) } },
                actions = {
                    IconButton(onClick = { }) { Image(painterResource(R.drawable.ic_share), contentDescription = "Share profile", modifier = Modifier.size(24.dp)) }
                    Box {
                        IconButton(onClick = { overflowExpanded = true }) { Image(painterResource(R.drawable.ic_more_vertical), contentDescription = "Profile options", modifier = Modifier.size(24.dp)) }
                        DropdownMenu(expanded = overflowExpanded, onDismissRequest = { overflowExpanded = false }) {
                            DropdownMenuItem(text = { Text("Settings") }, onClick = { overflowExpanded = false; onSettingsClick() })
                        }
                    }
                },
                colors = TopAppBarDefaults.centerAlignedTopAppBarColors(containerColor = BrandBeige)
            )
        },
        containerColor = BrandBeige
    ) { innerPadding ->
        LazyColumn(
            modifier = Modifier.fillMaxSize().padding(innerPadding),
            contentPadding = PaddingValues(horizontal = WritOnSpacing.lg, vertical = WritOnSpacing.md),
            verticalArrangement = Arrangement.spacedBy(WritOnSpacing.lg)
        ) {
            item { ProfileIdentity(name, penName, bio, initials) }
            item { ProfileStats(user?.followersCnt ?: 860, onApplaudsClick) }
            item { ProfileAbout(name) }
            item { ProfileTabs(selectedTab) { selectedTab = it } }
            item { ProfileTopStories() }
        }
    }
}

@Composable
private fun ProfileIdentity(name: String, penName: String, bio: String, initials: String) {
    Row(verticalAlignment = Alignment.Top) {
        Box {
            Surface(shape = CircleShape, color = Color(0xFFF2ECE4), modifier = Modifier.size(88.dp)) {
                Box(contentAlignment = Alignment.Center) {
                    Text(initials, style = MaterialTheme.typography.displayMedium.copy(fontSize = 31.sp, fontFamily = ProfileEditorialFamily))
                }
            }
            Surface(
                color = BrandRed,
                shape = CircleShape,
                modifier = Modifier.align(Alignment.BottomEnd).size(32.dp),
                border = androidx.compose.foundation.BorderStroke(2.dp, MaterialTheme.colorScheme.background)
            ) {
                Box(contentAlignment = Alignment.Center) { Text("★", color = Color(0xFFFFFDF9), fontSize = 15.sp) }
            }
        }
        Spacer(Modifier.width(WritOnSpacing.md))
        Column(Modifier.weight(1f)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(name, style = MaterialTheme.typography.headlineLarge.copy(fontFamily = ProfileEditorialFamily, fontSize = 25.sp, lineHeight = 30.sp), maxLines = 1, overflow = TextOverflow.Ellipsis)
                Spacer(Modifier.width(WritOnSpacing.xxs))
                Surface(color = BrandRed, shape = CircleShape, modifier = Modifier.size(20.dp)) {
                    Box(contentAlignment = Alignment.Center) { Text("✓", color = Color(0xFFFFFDF9), style = MaterialTheme.typography.labelMedium) }
                }
            }
            Text("@$penName", style = MaterialTheme.typography.bodyMedium.copy(fontSize = 15.sp), color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(Modifier.height(WritOnSpacing.xxs))
            Text(bio, style = MaterialTheme.typography.bodyMedium.copy(fontSize = 14.sp, lineHeight = 19.sp), maxLines = 3, overflow = TextOverflow.Ellipsis)
            Spacer(Modifier.height(WritOnSpacing.sm))
            Column(verticalArrangement = Arrangement.spacedBy(WritOnSpacing.xxs)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Image(painterResource(R.drawable.ic_location), contentDescription = null, modifier = Modifier.size(15.dp))
                    Spacer(Modifier.width(WritOnSpacing.xxs))
                    Text("New Delhi, India", style = MaterialTheme.typography.bodySmall)
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Image(painterResource(R.drawable.ic_calendar), contentDescription = null, modifier = Modifier.size(15.dp))
                    Spacer(Modifier.width(WritOnSpacing.xxs))
                    Text("Joined Jan 2023", style = MaterialTheme.typography.bodySmall)
                }
            }
        }
    }
}

@Composable
private fun ProfileStats(followers: Int, onApplaudsClick: () -> Unit) {
    Surface(
        shape = RoundedCornerShape(WritOnRadius.card),
        color = SurfacePaper,
        tonalElevation = WritOnElevation.flat,
        shadowElevation = WritOnElevation.raised,
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(modifier = Modifier.fillMaxWidth().padding(vertical = WritOnSpacing.lg), horizontalArrangement = Arrangement.SpaceEvenly) {
            ProfileStat("48", "Stories\npublished")
            VerticalDivider(Modifier.height(54.dp), color = MaterialTheme.colorScheme.outlineVariant)
            ProfileStat("12.4K", "Applauds\nreceived", accent = true, modifier = Modifier.clickable(onClick = onApplaudsClick))
            VerticalDivider(Modifier.height(54.dp), color = MaterialTheme.colorScheme.outlineVariant)
            ProfileStat(followers.toString(), "Followers")
            VerticalDivider(Modifier.height(54.dp), color = MaterialTheme.colorScheme.outlineVariant)
            ProfileStat("312", "Following")
        }
    }
}

@Composable
private fun ProfileStat(value: String, label: String, accent: Boolean = true, modifier: Modifier = Modifier) {
    Column(modifier = modifier.widthIn(min = 54.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Text(value, style = MaterialTheme.typography.titleLarge.copy(fontSize = 20.sp), color = if (accent) BrandRed else MaterialTheme.colorScheme.onSurface)
        Spacer(Modifier.height(WritOnSpacing.xxs))
        Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurface, textAlign = androidx.compose.ui.text.style.TextAlign.Center)
    }
}

@Composable
private fun ProfileAbout(name: String) {
    val firstName = name.substringBefore(' ')
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(WritOnRadius.card),
        color = SurfacePaper,
        tonalElevation = WritOnElevation.flat,
        shadowElevation = WritOnElevation.raised
    ) {
        Column(Modifier.padding(WritOnSpacing.md)) {
            Text("About $firstName", style = MaterialTheme.typography.headlineSmall.copy(fontFamily = ProfileEditorialFamily))
            Spacer(Modifier.height(WritOnSpacing.sm))
            Text("I write to understand, to connect, and to leave behind something that stays. Words are my way of making sense of the world.", style = MaterialTheme.typography.bodyMedium.copy(fontSize = 14.sp, lineHeight = 20.sp), color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(Modifier.height(WritOnSpacing.md))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Image(painterResource(R.drawable.ic_bookmark_orange), contentDescription = null, modifier = Modifier.size(24.dp))
                Spacer(Modifier.width(WritOnSpacing.sm))
                Text("Writing since 2018", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
    }
}

@Composable
private fun ProfileTabs(selectedTab: Int, onSelected: (Int) -> Unit) {
    val tabs = listOf("About", "Stories", "Series", "Highlights")
    Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        tabs.forEachIndexed { index, title ->
            Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.clip(RoundedCornerShape(WritOnRadius.field)).clickable { onSelected(index) }.padding(vertical = WritOnSpacing.xs)) {
                Text(title, style = MaterialTheme.typography.titleMedium, color = if (index == selectedTab) BrandRed else MaterialTheme.colorScheme.onSurface)
                Spacer(Modifier.height(WritOnSpacing.xs))
                Surface(color = if (index == selectedTab) BrandRed else Color.Transparent, modifier = Modifier.width(64.dp).height(3.dp), shape = CircleShape) { }
            }
        }
    }
}

@Composable
private fun ProfileTopStories() {
    val stories = listOf(
        ProfileStory("The Architecture of Solitude", 6, 324),
        ProfileStory("Letters to the Things I Left Behind", 4, 187),
        ProfileStory("The Last Train Home", 7, 256),
        ProfileStory("What We Owe Ourselves", 5, 412)
    )
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(WritOnRadius.card),
        color = SurfacePaper,
        tonalElevation = WritOnElevation.flat,
        shadowElevation = WritOnElevation.raised
    ) {
        Column(Modifier.padding(WritOnSpacing.md)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Top Stories", style = MaterialTheme.typography.headlineSmall.copy(fontFamily = ProfileEditorialFamily))
                Spacer(Modifier.weight(1f))
                Text("See all", style = MaterialTheme.typography.titleMedium, color = BrandRed)
                Image(painterResource(R.drawable.ic_forward_muted), contentDescription = "See all stories", modifier = Modifier.size(20.dp))
            }
            Spacer(Modifier.height(WritOnSpacing.xs))
            stories.forEachIndexed { index, story ->
                ProfileStoryRow(story)
                if (index != stories.lastIndex) HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant)
            }
        }
    }
}

@Composable
private fun ProfileStoryRow(story: ProfileStory) {
    Row(modifier = Modifier.fillMaxWidth().padding(vertical = WritOnSpacing.md), verticalAlignment = Alignment.CenterVertically) {
        Column(Modifier.weight(1f)) {
            Text(story.title, style = MaterialTheme.typography.headlineSmall.copy(fontFamily = ProfileEditorialFamily, fontSize = 20.sp, lineHeight = 25.sp), maxLines = 1, overflow = TextOverflow.Ellipsis)
            Spacer(Modifier.height(WritOnSpacing.xxs))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("${story.readingTime} min read", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Text("  •  ", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Image(painterResource(R.drawable.ic_applaud), contentDescription = "Applauds", modifier = Modifier.size(20.dp))
                Spacer(Modifier.width(WritOnSpacing.xxs))
                Text(story.applauds.toString(), style = MaterialTheme.typography.bodySmall, color = BrandRed)
            }
        }
        Image(painterResource(R.drawable.ic_bookmark_muted), contentDescription = "Save story", modifier = Modifier.size(25.dp))
        Spacer(Modifier.width(WritOnSpacing.sm))
        Image(painterResource(R.drawable.ic_more_vertical_muted), contentDescription = "Story options", modifier = Modifier.size(25.dp))
    }
}

private fun initialsOf(name: String): String = name.split(" ").mapNotNull { it.firstOrNull()?.uppercaseChar()?.toString() }.take(2).joinToString("")
