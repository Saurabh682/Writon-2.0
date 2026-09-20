package com.ibitvalley.writon.modern.feature.onboarding

import androidx.annotation.StringRes
import androidx.compose.ui.res.pluralStringResource
import androidx.compose.ui.res.stringResource
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ibitvalley.writon.R
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnTheme

private val ScreenBackground = Color(0xFFF8F4EE)
private val SurfacePaper = Color(0xFFFFFDF9)
private val PrimaryText = Color(0xFF151718)
private val SecondaryText = Color(0xFF6D6963)
private val Accent = Color(0xFFE75A2A)
private val Border = Color(0xFFE9E1D7)

private val ExpressionTopicIds = setOf(
    "poetry", "short_stories", "fiction", "shayari", "essays", "journal", "humour", "satire", "reviews",
)
private val WorldTopicIds = setOf(
    "tech", "culture", "journalism", "science_health", "business_finance", "sports", "entertainment", "philosophy",
)

private val InterestsEditorialFamily = FontFamily(
    Font(R.font.source_serif_4_regular, FontWeight.Normal),
    Font(R.font.source_serif_4_semibold, FontWeight.SemiBold),
    Font(R.font.source_serif_4_semibold, FontWeight.Bold)
)

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun InterestsScreen(
    initialSelectedTopicIds: Set<String>,
    availableTopics: List<InterestTopicOption> = InterestTopicCatalog.fallbackTopics,
    isSaving: Boolean,
    errorMessage: String?,
    onBackClick: () -> Unit,
    onContinueClick: (Set<String>) -> Unit,
    onContinueWithSavedChoices: () -> Unit,
    onSelectionEdited: () -> Unit = {},
    onSkipClick: () -> Unit
) {
    var selectedTopicsCsv by rememberSaveable { mutableStateOf(initialSelectedTopicIds.sorted().joinToString(",")) }
    var hasEdited by rememberSaveable { mutableStateOf(false) }
    val selectedTopics = selectedTopicsCsv
        .split(',')
        .filter(String::isNotBlank)
        .toSet()

    LaunchedEffect(initialSelectedTopicIds) {
        if (!hasEdited) selectedTopicsCsv = initialSelectedTopicIds.sorted().joinToString(",")
    }

    Surface(modifier = Modifier.fillMaxSize(), color = ScreenBackground) {
        Column(
            modifier = Modifier.fillMaxSize().navigationBarsPadding().padding(horizontal = 24.dp),
        ) {
            InterestsHeader(onBackClick = onBackClick, onSkipClick = onSkipClick, isSaving = isSaving)

            Column(
                modifier = Modifier.weight(1f).verticalScroll(rememberScrollState()),
            ) {
                InterestGroup(
                    title = stringResource(R.string.interests_group_expression),
                    hint = stringResource(R.string.interests_group_expression_hint),
                    topics = availableTopics.filter { it.id in ExpressionTopicIds },
                    selectedTopics = selectedTopics,
                ) { topic ->
                    if (!isSaving) {
                        hasEdited = true
                        onSelectionEdited()
                        selectedTopicsCsv = toggleTopic(selectedTopics, topic.id)
                    }
                }
                InterestGroup(
                    title = stringResource(R.string.interests_group_world),
                    hint = stringResource(R.string.interests_group_world_hint),
                    topics = availableTopics.filter { it.id in WorldTopicIds },
                    selectedTopics = selectedTopics,
                ) { topic ->
                    if (!isSaving) {
                        hasEdited = true
                        onSelectionEdited()
                        selectedTopicsCsv = toggleTopic(selectedTopics, topic.id)
                    }
                }
                val uncategorized = availableTopics.filter { it.id !in ExpressionTopicIds && it.id !in WorldTopicIds }
                if (uncategorized.isNotEmpty()) {
                    InterestGroup(
                        title = stringResource(R.string.interests_group_more),
                        hint = null,
                        topics = uncategorized,
                        selectedTopics = selectedTopics,
                    ) { topic ->
                        if (!isSaving) {
                            hasEdited = true
                            onSelectionEdited()
                            selectedTopicsCsv = toggleTopic(selectedTopics, topic.id)
                        }
                    }
                }
            }

            Column(modifier = Modifier.fillMaxWidth().padding(top = 10.dp)) {
                Text(
                    text = if (selectedTopics.isEmpty()) {
                        stringResource(R.string.interests_empty_hint)
                    } else {
                        pluralStringResource(R.plurals.interests_selected_count, selectedTopics.size, selectedTopics.size)
                    },
                    style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.SemiBold),
                    color = if (selectedTopics.isEmpty()) SecondaryText else Accent,
                )
                Text(
                    stringResource(R.string.interests_change_anytime_hint),
                    style = MaterialTheme.typography.bodySmall.copy(fontSize = 13.sp),
                    color = SecondaryText,
                    modifier = Modifier.padding(top = 2.dp),
                )

                errorMessage?.let { message ->
                    Text(message, style = MaterialTheme.typography.bodySmall, color = Accent, modifier = Modifier.padding(top = 6.dp))
                }

                Button(
                    onClick = { onContinueClick(selectedTopics) },
                    enabled = !isSaving,
                    modifier = Modifier.fillMaxWidth().padding(top = 12.dp).height(56.dp),
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = Accent, contentColor = SurfacePaper),
                ) {
                    Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                        Text(
                            when {
                                isSaving -> stringResource(R.string.interests_saving)
                                selectedTopics.isEmpty() -> stringResource(R.string.interests_explore_all)
                                else -> stringResource(R.string.interests_find_reads)
                            },
                            style = MaterialTheme.typography.titleMedium.copy(fontSize = 18.sp),
                        )
                        Image(
                            painter = painterResource(R.drawable.ic_forward_white),
                            contentDescription = null,
                            modifier = Modifier.align(Alignment.CenterEnd).size(27.dp),
                        )
                    }
                }

                if (errorMessage != null) {
                    TextButton(
                        onClick = onContinueWithSavedChoices,
                        enabled = !isSaving,
                        modifier = Modifier.align(Alignment.CenterHorizontally),
                    ) {
                        Text(stringResource(R.string.interests_continue_saved), color = Accent)
                    }
                }
                Spacer(Modifier.height(10.dp))
            }
        }
    }
}

private fun toggleTopic(selectedTopics: Set<String>, topicId: String): String =
    (if (topicId in selectedTopics) selectedTopics - topicId else selectedTopics + topicId)
        .sorted()
        .joinToString(",")

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun InterestGroup(
    title: String,
    hint: String?,
    topics: List<InterestTopicOption>,
    selectedTopics: Set<String>,
    onTopicClick: (InterestTopicOption) -> Unit,
) {
    if (topics.isEmpty()) return
    Row(
        modifier = Modifier.fillMaxWidth().padding(top = 22.dp, bottom = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            title,
            style = MaterialTheme.typography.headlineSmall.copy(fontFamily = InterestsEditorialFamily, fontWeight = FontWeight.SemiBold),
            color = PrimaryText,
        )
        hint?.let {
            Spacer(Modifier.weight(1f))
            Text(it, style = MaterialTheme.typography.bodySmall, color = SecondaryText, textAlign = TextAlign.End)
        }
    }
    FlowRow(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        topics.forEach { topic ->
            TopicChip(
                        topic = topic,
                        isSelected = topic.id in selectedTopics,
                onClick = { onTopicClick(topic) },
                    )
                }
            }
}

@Composable
private fun InterestsHeader(onBackClick: () -> Unit, onSkipClick: () -> Unit, isSaving: Boolean) {
    Box(modifier = Modifier.fillMaxWidth().padding(top = 14.dp)) {
        Image(
            painter = painterResource(R.drawable.ic_back),
            contentDescription = stringResource(R.string.common_back),
            modifier = Modifier.align(Alignment.TopStart).padding(top = 8.dp).size(30.dp).clip(CircleShape).clickable(onClick = onBackClick)
        )
        TextButton(
            onClick = onSkipClick,
            enabled = !isSaving,
            modifier = Modifier.align(Alignment.TopEnd),
        ) {
            Text(
                stringResource(R.string.common_skip),
                style = MaterialTheme.typography.titleMedium.copy(fontFamily = InterestsEditorialFamily),
                color = PrimaryText,
                textDecoration = TextDecoration.Underline,
            )
        }
        Image(
            painter = painterResource(R.drawable.welcome_feather),
            contentDescription = null,
            modifier = Modifier.align(Alignment.TopEnd).padding(top = 38.dp).size(120.dp),
            contentScale = ContentScale.Fit
        )
        Column(modifier = Modifier.padding(top = 58.dp, end = 72.dp)) {
            Text(
                stringResource(R.string.interests_eyebrow),
                style = MaterialTheme.typography.labelLarge.copy(fontWeight = FontWeight.Bold, letterSpacing = 3.sp),
                color = Accent,
            )
            Spacer(Modifier.height(14.dp))
            Text(
                stringResource(R.string.interests_title),
                style = MaterialTheme.typography.displayLarge.copy(
                    fontFamily = InterestsEditorialFamily,
                    fontSize = 38.sp,
                    lineHeight = 42.sp,
                    fontWeight = FontWeight.Normal
                ),
                color = PrimaryText
            )
            Spacer(Modifier.height(12.dp))
            Text(
                stringResource(R.string.interests_subtitle),
                style = MaterialTheme.typography.bodyLarge.copy(fontSize = 16.sp, lineHeight = 23.sp),
                color = SecondaryText
            )
        }
    }
}

@Composable
private fun TopicChip(topic: InterestTopicOption, isSelected: Boolean, onClick: () -> Unit) {
    val title = topicTitle(topic)
    val selectionState = stringResource(
        if (isSelected) R.string.common_selected else R.string.common_not_selected,
    )
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(28.dp))
            .background(if (isSelected) Accent else SurfacePaper)
            .border(1.dp, if (isSelected) Accent else Border, RoundedCornerShape(28.dp))
            .clickable(onClick = onClick)
            .semantics {
                role = Role.Checkbox
                contentDescription = "$title, $selectionState"
            }
            .padding(horizontal = 18.dp, vertical = 13.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(if (isSelected) "✓" else "+", fontSize = 24.sp, color = if (isSelected) SurfacePaper else SecondaryText)
        Spacer(Modifier.width(12.dp))
        Text(
            title,
            style = MaterialTheme.typography.titleMedium.copy(fontFamily = InterestsEditorialFamily, fontWeight = FontWeight.SemiBold),
            color = if (isSelected) SurfacePaper else PrimaryText,
        )
    }
}

@Composable
private fun topicTitle(topic: InterestTopicOption): String {
    @StringRes val titleRes = when (topic.id) {
        "reviews" -> R.string.topic_reviews
        "tech" -> R.string.topic_tech
        "culture" -> R.string.topic_culture
        "essays" -> R.string.topic_essays
        "humour" -> R.string.topic_humour
        "poetry" -> R.string.topic_poetry
        "short_stories" -> R.string.topic_short_stories
        "journal" -> R.string.topic_journal
        "journalism" -> R.string.topic_journalism
        "science_health" -> R.string.topic_science_health
        "business_finance" -> R.string.topic_business_finance
        "sports" -> R.string.topic_sports
        "entertainment" -> R.string.topic_entertainment
        "shayari" -> R.string.topic_shayari
        "philosophy" -> R.string.topic_philosophy
        "satire" -> R.string.topic_satire
        "fiction" -> R.string.topic_fiction
        else -> return topic.canonicalName
    }
    return stringResource(titleRes)
}

@Preview(showBackground = true)
@Composable
private fun InterestsScreenPreview() {
    WritOnTheme {
        InterestsScreen(
            initialSelectedTopicIds = emptySet(),
            isSaving = false,
            errorMessage = null,
            onBackClick = {},
            onContinueClick = {},
            onContinueWithSavedChoices = {},
            onSkipClick = {},
        )
    }
}
