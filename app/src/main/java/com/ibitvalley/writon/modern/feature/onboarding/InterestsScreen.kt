package com.ibitvalley.writon.modern.feature.onboarding

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ibitvalley.writon.R
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnTheme

private val BrandBeigeColor = Color(0xFFF8F4EE)
private val BrandRedColor = Color(0xFFE75A2A)

data class Topic(
    val id: String,
    val title: String,
    val description: String,
    val icon: Int,
    val iconBackground: Color
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun InterestsScreen(
    onBackClick: () -> Unit,
    onContinueClick: (List<String>) -> Unit,
    onSkipClick: () -> Unit
) {
    val topics = remember {
        listOf(
            Topic("poetry", "Poetry", "", R.drawable.ic_heart_orange, Color(0xFFF2ECE4)),
            Topic("essays", "Essays", "", R.drawable.ic_book_orange, Color(0xFFF2ECE4)),
            Topic("short_stories", "Short Stories", "", R.drawable.ic_category_orange, Color(0xFFF2ECE4)),
            Topic("shayari", "Shayari", "", R.drawable.ic_heart_orange, Color(0xFFF2ECE4)),
            Topic("philosophy", "Philosophy", "", R.drawable.ic_category_orange, Color(0xFFF2ECE4)),
            Topic("tech", "Tech", "", R.drawable.ic_write_quill_orange, Color(0xFFF2ECE4)),
            Topic("humour", "Humour", "", R.drawable.ic_category_orange, Color(0xFFF2ECE4)),
            Topic("journalism", "Journalism", "", R.drawable.ic_write_quill_orange, Color(0xFFF2ECE4)),
            Topic("reviews", "Reviews", "", R.drawable.ic_collection_orange, Color(0xFFF2ECE4)),
            Topic("culture", "Culture", "", R.drawable.ic_public_orange, Color(0xFFF2ECE4))
        )
    }

    var selectedTopics by remember { mutableStateOf(setOf<String>()) }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = BrandBeigeColor
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 20.dp)
        ) {
            Spacer(modifier = Modifier.height(16.dp))

            // Top Bar
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                IconButton(onClick = onBackClick) {
                    Image(painterResource(R.drawable.ic_back), contentDescription = "Back", modifier = Modifier.size(24.dp))
                }

                Column(horizontalAlignment = Alignment.End) {
                    Text(text = "Step 1 of 2", style = MaterialTheme.typography.labelMedium)
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(modifier = Modifier.width(60.dp).height(4.dp)) {
                        Box(modifier = Modifier.weight(0.5f).fillMaxHeight().background(BrandRedColor))
                        Box(modifier = Modifier.weight(0.5f).fillMaxHeight().background(Color(0xFFE9E1D7)))
                    }
                }
            }

            Spacer(modifier = Modifier.height(32.dp))

            // Header
            Text(
                text = "What do you love reading?",
                style = MaterialTheme.typography.headlineLarge.copy(
                    fontSize = 36.sp,
                    fontWeight = FontWeight.Bold
                )
            )

            Spacer(modifier = Modifier.height(12.dp))

            Text(
                text = "Choose a few topics that inspire you.\nWe’ll personalize your experience.",
                style = MaterialTheme.typography.bodyLarge,
                color = Color(0xFF6D6963)
            )

            Spacer(modifier = Modifier.height(32.dp))

            // Grid
            LazyVerticalGrid(
                columns = GridCells.Fixed(2),
                modifier = Modifier.weight(1f),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
                contentPadding = PaddingValues(bottom = 16.dp)
            ) {
                items(topics) { topic ->
                    TopicCard(
                        topic = topic,
                        isSelected = selectedTopics.contains(topic.id),
                        onClick = {
                            selectedTopics = if (selectedTopics.contains(topic.id)) {
                                selectedTopics - topic.id
                            } else {
                                selectedTopics + topic.id
                            }
                        }
                    )
                }
            }

            // Footer
            Row(
                modifier = Modifier.fillMaxWidth().padding(vertical = 16.dp),
                horizontalArrangement = Arrangement.Center,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Image(painterResource(R.drawable.ic_heart_orange), contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text(
                    text = "You can always change these later in Settings.",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color(0xFF6D6963)
                )
            }

            // Buttons
            Button(
                onClick = { onContinueClick(selectedTopics.map { id -> topics.find { it.id == id }?.title ?: "" }) },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp),
                colors = ButtonDefaults.buttonColors(containerColor = BrandRedColor),
                shape = RoundedCornerShape(12.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Spacer(modifier = Modifier.width(24.dp))
                    Text(text = "Continue", fontSize = 18.sp)
                    Image(painterResource(R.drawable.ic_forward_white), contentDescription = null, modifier = Modifier.size(24.dp))
                }
            }

            TextButton(
                onClick = onSkipClick,
                modifier = Modifier.align(Alignment.CenterHorizontally).padding(vertical = 8.dp)
            ) {
                Text(
                    text = "Skip for now",
                    color = Color(0xFF6D6963),
                    textDecoration = androidx.compose.ui.text.style.TextDecoration.Underline
                )
            }

            Spacer(modifier = Modifier.height(16.dp))
        }
    }
}

@Composable
fun TopicCard(
    topic: Topic,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .aspectRatio(0.8f)
            .clip(RoundedCornerShape(12.dp))
            .background(Color(0xFFFFFDF9))
            .border(
                width = 1.dp,
                color = if (isSelected) BrandRedColor else Color(0xFFE9E1D7),
                shape = RoundedCornerShape(12.dp)
            )
            .clickable { onClick() }
            .padding(8.dp)
    ) {
        Column(
            modifier = Modifier.fillMaxSize(),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Box(
                modifier = Modifier
                    .size(48.dp)
                    .clip(CircleShape)
                    .background(topic.iconBackground),
                contentAlignment = Alignment.Center
            ) {
                Image(painterResource(topic.icon), contentDescription = null, modifier = Modifier.size(24.dp))
            }

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = topic.title,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center
            )

            if (topic.description.isNotBlank()) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = topic.description,
                    style = MaterialTheme.typography.bodySmall.copy(fontSize = 10.sp),
                    color = Color(0xFF6D6963),
                    textAlign = TextAlign.Center,
                    lineHeight = 14.sp
                )
            }
        }

        if (isSelected) {
            Box(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(4.dp)
                    .size(16.dp)
                    .clip(CircleShape)
                    .background(BrandRedColor),
                contentAlignment = Alignment.Center
            ) {
                Image(painterResource(R.drawable.ic_check_white), contentDescription = null, modifier = Modifier.size(12.dp))
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
fun InterestsScreenPreview() {
    WritOnTheme {
        InterestsScreen(onBackClick = {}, onContinueClick = {}, onSkipClick = {})
    }
}
