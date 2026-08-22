package com.ibitvalley.writon.modern.feature.explore

import androidx.compose.foundation.clickable
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ibitvalley.writon.R
import com.ibitvalley.writon.modern.core.designsystem.components.WritOnBrandMark
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandBeige
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandRed
import com.ibitvalley.writon.modern.core.designsystem.theme.SurfacePaper
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnElevation
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnRadius
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnSpacing
import com.ibitvalley.writon.modern.core.network.model.PostDto

private val ExploreEditorialFamily = FontFamily(
    Font(R.font.source_serif_4_regular, weight = FontWeight.Normal),
    Font(R.font.source_serif_4_semibold, weight = FontWeight.SemiBold),
    Font(R.font.source_serif_4_semibold, weight = FontWeight.Bold)
)

@Composable
fun ExploreScreen(
    viewModel: ExploreViewModel,
    onStoryClick: (String) -> Unit,
    onNextDiscovery: () -> Unit = {},
    onSearchClick: () -> Unit = {}
) {
    LaunchedEffect(Unit) { viewModel.load() }
    val discovery = viewModel.discoveries.getOrNull(viewModel.currentIndex)
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(start = WritOnSpacing.lg, end = WritOnSpacing.lg, top = WritOnSpacing.md, bottom = WritOnSpacing.xl),
        verticalArrangement = Arrangement.spacedBy(WritOnSpacing.md)
    ) {
        item { ExploreHeader(onSearchClick) }
        item { ExploreHero() }
        item {
            DiscoveryCard(
                story = discovery,
                onRead = { discovery?.let { onStoryClick(it.id) } },
                onNextDiscovery = { viewModel.next(); onNextDiscovery() }
            )
        }
        item { ExploreHint { viewModel.next(); onNextDiscovery() } }
    }
}

@Composable
private fun ExploreHeader(onSearchClick: () -> Unit) {
    Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        WritOnBrandMark(width = 108.dp)
        Spacer(Modifier.weight(1f))
        IconButton(onClick = onSearchClick) { Image(painterResource(R.drawable.ic_search), contentDescription = "Search") }
    }
}

@Composable
private fun ExploreHero() {
    Column(modifier = Modifier.padding(top = WritOnSpacing.lg)) {
        Text(
            "Explore\nsomething",
            style = MaterialTheme.typography.displayLarge.copy(fontFamily = ExploreEditorialFamily, fontSize = 42.sp, lineHeight = 48.sp, fontWeight = FontWeight.Normal)
        )
        Text(
            "different.",
            style = MaterialTheme.typography.displayLarge.copy(fontFamily = ExploreEditorialFamily, fontSize = 42.sp, lineHeight = 48.sp, fontWeight = FontWeight.Normal),
            color = BrandRed
        )
        Spacer(Modifier.height(WritOnSpacing.lg))
        Text(
            "Step out of your comfort zone.\nFind a new kind of writing to love.",
            style = MaterialTheme.typography.bodyLarge.copy(fontSize = 17.sp, lineHeight = 25.sp),
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}

@Composable
private fun DiscoveryCard(story: PostDto?, onRead: () -> Unit, onNextDiscovery: () -> Unit) {
    Box(modifier = Modifier.fillMaxWidth().height(420.dp).padding(top = WritOnSpacing.sm)) {
        Surface(
            modifier = Modifier.align(Alignment.CenterEnd).fillMaxWidth().padding(start = 54.dp, top = 22.dp, bottom = 12.dp),
            shape = RoundedCornerShape(WritOnRadius.feature),
            color = Color(0xFFF2ECE4),
            tonalElevation = WritOnElevation.flat
        ) {
            Box(Modifier.fillMaxSize()) {
                Text("✦", color = Color(0xFFE9E1D7), fontSize = 62.sp, modifier = Modifier.align(Alignment.CenterEnd).padding(end = 20.dp))
                Surface(
                    modifier = Modifier.align(Alignment.BottomEnd).padding(16.dp).size(48.dp).clip(CircleShape).clickable(onClick = onNextDiscovery),
                    shape = CircleShape,
                    color = BrandBeige
                ) {
                    Box(contentAlignment = Alignment.Center) { Image(painterResource(R.drawable.ic_forward), contentDescription = "Next discovery", modifier = Modifier.size(24.dp)) }
                }
            }
        }
        Surface(
            modifier = Modifier
                .align(Alignment.TopStart)
                .width(288.dp)
                .fillMaxHeight(),
            shape = RoundedCornerShape(WritOnRadius.feature),
            color = SurfacePaper,
            tonalElevation = WritOnElevation.flat,
            shadowElevation = WritOnElevation.raised,
            onClick = onRead
        ) {
            Column(modifier = Modifier.fillMaxSize().padding(WritOnSpacing.md)) {
                Text("FOR YOU", style = MaterialTheme.typography.labelLarge.copy(letterSpacing = 1.4.sp), color = BrandRed)
                Spacer(Modifier.height(WritOnSpacing.xs))
                Text("A live recommendation from WritOn.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(Modifier.height(WritOnSpacing.md))
                Surface(color = MaterialTheme.colorScheme.outlineVariant, modifier = Modifier.width(92.dp).height(1.dp)) { }
                Spacer(Modifier.height(WritOnSpacing.md))
                Text(story?.category?.let { "Explore $it" } ?: "Loading discoveries…", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(Modifier.height(WritOnSpacing.xs))
                Text(
                    story?.title ?: "No discovery available",
                    style = MaterialTheme.typography.headlineLarge.copy(fontFamily = ExploreEditorialFamily, fontSize = 26.sp, lineHeight = 30.sp),
                    maxLines = 3,
                    overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                )
                Spacer(Modifier.height(WritOnSpacing.xs))
                Text(
                    story?.summary ?: "Published stories will appear here as soon as the feed is available.",
                    style = MaterialTheme.typography.bodyMedium.copy(fontSize = 14.sp, lineHeight = 19.sp),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 3,
                    overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                )
                Spacer(Modifier.weight(1f))
                Surface(color = MaterialTheme.colorScheme.outlineVariant, modifier = Modifier.width(36.dp).height(1.dp)) { }
                Spacer(Modifier.height(WritOnSpacing.sm))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Surface(shape = CircleShape, color = BrandBeige, modifier = Modifier.size(42.dp)) {
                        Box(contentAlignment = Alignment.Center) { Text(story?.author?.fullName?.take(2)?.uppercase() ?: "W", style = MaterialTheme.typography.labelLarge) }
                    }
                    Spacer(Modifier.width(WritOnSpacing.sm))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(story?.author?.fullName ?: "WritOn", style = MaterialTheme.typography.titleMedium, maxLines = 1)
                        Text(story?.let { "${it.readingTimeMin} min read" } ?: "", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                    if (story != null && story.likesCnt > 0) {
                        Text("${story.likesCnt} 👏", style = MaterialTheme.typography.bodySmall, color = BrandRed)
                    }
                }
                Spacer(Modifier.height(WritOnSpacing.xs))
                Row(
                    modifier = Modifier.align(Alignment.CenterHorizontally).clip(RoundedCornerShape(WritOnRadius.field)).clickable(onClick = onRead).padding(horizontal = WritOnSpacing.sm, vertical = WritOnSpacing.xs),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(if (story == null) "Refresh" else "Read story", style = MaterialTheme.typography.titleMedium, color = BrandRed)
                    Spacer(Modifier.width(WritOnSpacing.sm))
                    Image(painterResource(R.drawable.ic_forward_orange), contentDescription = "Read discovery", modifier = Modifier.size(24.dp))
                }
            }
        }
    }
}

@Composable
private fun ExploreHint(onNextDiscovery: () -> Unit) {
    Column(modifier = Modifier.fillMaxWidth().clickable(onClick = onNextDiscovery).padding(vertical = WritOnSpacing.sm), horizontalAlignment = Alignment.CenterHorizontally) {
        Surface(shape = CircleShape, color = BrandBeige, modifier = Modifier.size(46.dp)) {
            Box(contentAlignment = Alignment.Center) { Image(painterResource(R.drawable.ic_chevron_up), contentDescription = "Next discovery", modifier = Modifier.size(24.dp)) }
        }
        Spacer(Modifier.height(WritOnSpacing.sm))
        Text("Something completely different?", style = MaterialTheme.typography.titleMedium)
        Text("Tap for another discovery.", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
    }
}
