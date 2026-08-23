package com.ibitvalley.writon.modern.feature.explore

import androidx.compose.foundation.Image
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
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
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ibitvalley.writon.R
import com.ibitvalley.writon.modern.core.designsystem.components.WritOnBrandMark
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandRed
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
        item {
            DiscoveryHintCard(onRead = { discovery?.let { onStoryClick(it.id) } })
        }
        item {
            NextDiscoveryButton(onClick = { viewModel.next(); onNextDiscovery() })
        }
    }
}

@Composable
private fun ExploreHeader(onSearchClick: () -> Unit) {
    Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
        WritOnBrandMark(width = 108.dp)
        Spacer(Modifier.weight(1f))
        IconButton(onClick = onSearchClick) {
            Image(
                painterResource(R.drawable.ic_search),
                contentDescription = "Search",
                colorFilter = ColorFilter.tint(MaterialTheme.colorScheme.onBackground)
            )
        }
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
            color = MaterialTheme.colorScheme.surfaceVariant,
            tonalElevation = WritOnElevation.flat
        ) {
            Box(Modifier.fillMaxSize()) {
                Text("✦", color = MaterialTheme.colorScheme.outlineVariant, fontSize = 62.sp, modifier = Modifier.align(Alignment.CenterEnd).padding(end = 20.dp))
                Surface(
                    modifier = Modifier.align(Alignment.BottomEnd).padding(16.dp).size(48.dp).clip(CircleShape).clickable(onClick = onNextDiscovery),
                    shape = CircleShape,
                    color = MaterialTheme.colorScheme.background
                ) {
                    Box(contentAlignment = Alignment.Center) {
                        Image(
                            painterResource(R.drawable.ic_forward),
                            contentDescription = "Next discovery",
                            modifier = Modifier.size(24.dp),
                            colorFilter = ColorFilter.tint(MaterialTheme.colorScheme.onBackground)
                        )
                    }
                }
            }
        }
        Surface(
            modifier = Modifier
                .align(Alignment.TopStart)
                .width(288.dp)
                .fillMaxHeight(),
            shape = RoundedCornerShape(WritOnRadius.feature),
            color = MaterialTheme.colorScheme.surface,
            border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
            tonalElevation = WritOnElevation.flat,
            shadowElevation = WritOnElevation.raised,
            onClick = onRead
        ) {
            Column(modifier = Modifier.fillMaxSize().padding(WritOnSpacing.md)) {
                Surface(shape = RoundedCornerShape(WritOnRadius.pill), color = MaterialTheme.colorScheme.surfaceVariant) {
                    Text(
                        (story?.category ?: "DISCOVERY").uppercase(),
                        modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = BrandRed
                    )
                }
                Spacer(Modifier.height(14.dp))
                Text(
                    story?.title ?: "The Architecture of Quiet",
                    style = MaterialTheme.typography.titleLarge.copy(fontFamily = ExploreEditorialFamily, fontWeight = FontWeight.SemiBold, fontSize = 23.sp, lineHeight = 28.sp),
                    maxLines = 3,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(Modifier.height(10.dp))
                Text(
                    story?.summary ?: "An invitation to pause, read slower, and find depth in between words.",
                    style = MaterialTheme.typography.bodyMedium.copy(fontSize = 14.sp, lineHeight = 20.sp),
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 4,
                    overflow = TextOverflow.Ellipsis
                )
                Spacer(Modifier.weight(1f))
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(story?.author?.fullName ?: "Editorial Selection", style = MaterialTheme.typography.labelLarge)
                    Spacer(Modifier.weight(1f))
                    Text("${story?.readingTimeMin ?: 3} min", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }
}

@Composable
private fun DiscoveryHintCard(onRead: () -> Unit) {
    Surface(
        modifier = Modifier.fillMaxWidth().padding(top = WritOnSpacing.sm),
        shape = RoundedCornerShape(WritOnRadius.feature),
        color = MaterialTheme.colorScheme.surface,
        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
        tonalElevation = WritOnElevation.flat,
        shadowElevation = WritOnElevation.raised,
        onClick = onRead
    ) {
        Row(
            modifier = Modifier.fillMaxWidth().padding(WritOnSpacing.md),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(Modifier.weight(1f)) {
                Text(
                    "Discover another voice",
                    style = MaterialTheme.typography.titleMedium.copy(fontFamily = ExploreEditorialFamily, fontWeight = FontWeight.SemiBold)
                )
                Spacer(Modifier.height(2.dp))
                Text(
                    "Tap to load a fresh curated essay from our writers.",
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Image(
                painterResource(R.drawable.ic_forward_orange),
                contentDescription = "Read discovery",
                modifier = Modifier.size(24.dp)
            )
        }
    }
}

@Composable
private fun NextDiscoveryButton(onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = WritOnSpacing.md),
        contentAlignment = Alignment.Center
    ) {
        Surface(
            shape = CircleShape,
            color = MaterialTheme.colorScheme.surfaceVariant,
            modifier = Modifier.size(48.dp).clip(CircleShape).clickable(onClick = onClick)
        ) {
            Box(contentAlignment = Alignment.Center) {
                Image(
                    painterResource(R.drawable.ic_chevron_up),
                    contentDescription = "Next discovery",
                    modifier = Modifier.size(24.dp),
                    colorFilter = ColorFilter.tint(MaterialTheme.colorScheme.onSurfaceVariant)
                )
            }
        }
    }
}
