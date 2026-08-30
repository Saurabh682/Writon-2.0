package com.ibitvalley.writon.modern.feature.editor

import androidx.compose.ui.res.stringResource
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.IconButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.material3.VerticalDivider
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.text.TextRange
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import com.ibitvalley.writon.R
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandBeige
import com.ibitvalley.writon.modern.core.designsystem.theme.BrandRed
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnElevation
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnRadius
import com.ibitvalley.writon.modern.core.designsystem.theme.WritOnSpacing

private val EditorEditorialFamily = FontFamily(
    Font(R.font.source_serif_4_regular, FontWeight.Normal),
    Font(R.font.source_serif_4_semibold, FontWeight.SemiBold),
    Font(R.font.source_serif_4_semibold, FontWeight.Bold)
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StoryEditorScreen(
    viewModel: EditorViewModel,
    onBackClick: () -> Unit,
    onPublishClick: () -> Unit
) {
    val title by viewModel.title.collectAsStateWithLifecycle()
    val content by viewModel.content.collectAsStateWithLifecycle()
    val draftStatus by viewModel.draftStatus.collectAsStateWithLifecycle()
    var bodyValue by rememberSaveable(stateSaver = TextFieldValue.Saver) {
        mutableStateOf(TextFieldValue(content))
    }
    val context = LocalContext.current
    val coverPicker = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        uri?.let { viewModel.uploadCover(context, it) }
    }

    LaunchedEffect(content) {
        if (content != bodyValue.text) {
            bodyValue = TextFieldValue(content, selection = TextRange(content.length))
        }
    }

    val wordCount = content.trim().split(Regex("\\s+")).filter { it.isNotBlank() }.size
    val readTime = if (wordCount == 0) 0 else maxOf(1, (wordCount + 199) / 200)

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        bottomBar = {
            EditorWritingFooter(
                wordCount = wordCount,
                readTime = readTime,
                savedStatus = draftStatus.label(),
                onFormat = { action ->
                    bodyValue = bodyValue.apply(action)
                    viewModel.updateContent(bodyValue.text)
                },
                onPickImage = {
                    coverPicker.launch(
                        PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                    )
                }
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(horizontal = 28.dp)
        ) {
            EditorWritingTopBar(
                onBackClick = onBackClick,
                onSaveClick = viewModel::saveDraft,
                onPublishClick = onPublishClick,
                canPublish = title.isNotBlank() && content.isNotBlank()
            )

            TextField(
                value = title,
                onValueChange = viewModel::updateTitle,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 30.dp)
                    .heightIn(min = 96.dp),
                placeholder = {
                    Text(
                        "Add a title…",
                        style = editorTitleStyle(),
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                },
                textStyle = editorTitleStyle(),
                colors = editorTextFieldColors(),
                singleLine = false
            )

            EditorBodyField(
                value = bodyValue,
                onValueChange = {
                    bodyValue = it
                    viewModel.updateContent(it.text)
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .padding(top = 6.dp)
            )
            if (draftStatus is EditorDraftStatus.Failed) {
                Text(
                    text = (draftStatus as EditorDraftStatus.Failed).message,
                    color = BrandRed,
                    style = MaterialTheme.typography.labelMedium,
                    modifier = Modifier.padding(bottom = 8.dp)
                )
            }
        }
    }
}

private fun EditorDraftStatus.label(): String = when (this) {
    EditorDraftStatus.Unsaved -> "Unsaved changes"
    EditorDraftStatus.Saving -> "Saving…"
    EditorDraftStatus.Saved -> "Saved"
    EditorDraftStatus.Offline -> "Saved on this device"
    is EditorDraftStatus.Failed -> "Save needs attention"
}

@Composable
private fun EditorWritingTopBar(
    onBackClick: () -> Unit,
    onSaveClick: () -> Unit,
    onPublishClick: () -> Unit,
    canPublish: Boolean
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = 10.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        IconButton(onClick = onBackClick) {
                    Image(
                        painterResource(R.drawable.ic_back),
                        contentDescription = stringResource(R.string.common_back),
                        modifier = Modifier.size(24.dp),
                        colorFilter = ColorFilter.tint(MaterialTheme.colorScheme.onBackground)
                    )
        }
        Spacer(Modifier.weight(1f))
        TextButton(onClick = onSaveClick) {
            Text("Save", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onBackground)
        }
        Spacer(Modifier.width(6.dp))
        Button(
            onClick = onPublishClick,
            enabled = canPublish,
            modifier = Modifier.height(44.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = BrandRed,
                contentColor = MaterialTheme.colorScheme.surface,
                disabledContainerColor = BrandRed.copy(alpha = 0.35f),
                disabledContentColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.8f)
            ),
            shape = RoundedCornerShape(WritOnRadius.pill),
            contentPadding = PaddingValues(horizontal = 19.dp, vertical = 0.dp)
        ) {
            Text(stringResource(R.string.editor_publish), style = MaterialTheme.typography.labelLarge)
        }
    }
}

@Composable
private fun editorTitleStyle() = MaterialTheme.typography.displayMedium.copy(
    fontFamily = EditorEditorialFamily,
    fontSize = 40.sp,
    lineHeight = 46.sp,
    fontWeight = FontWeight.Normal,
    color = MaterialTheme.colorScheme.onBackground
)

@Composable
private fun EditorBodyField(
    value: TextFieldValue,
    onValueChange: (TextFieldValue) -> Unit,
    modifier: Modifier = Modifier
) {
    val bodyStyle = MaterialTheme.typography.bodyLarge.copy(
        fontFamily = EditorEditorialFamily,
        fontSize = 18.sp,
        lineHeight = 31.sp,
        color = MaterialTheme.colorScheme.onBackground
    )

    BasicTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier.semantics { contentDescription = "Story content" },
        textStyle = bodyStyle,
        cursorBrush = SolidColor(BrandRed),
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Text),
        decorationBox = { innerTextField ->
            Box(modifier = Modifier.fillMaxSize()) {
                if (value.text.isBlank()) {
                    Column(modifier = Modifier.fillMaxWidth()) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            VerticalDivider(
                                modifier = Modifier.height(27.dp).width(2.dp),
                                color = BrandRed
                            )
                            Spacer(Modifier.width(10.dp))
                            Text(
                                "Start writing your story…",
                                style = bodyStyle.copy(fontStyle = FontStyle.Italic, fontSize = 17.sp),
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        HorizontalDivider(
                            modifier = Modifier.padding(top = 25.dp, end = 36.dp),
                            color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.55f)
                        )
                        Text(
                            "Every story starts somewhere.\nBegin with the moment you can see most clearly.",
                            modifier = Modifier.padding(top = 22.dp),
                            style = MaterialTheme.typography.bodyMedium.copy(
                                fontFamily = EditorEditorialFamily,
                                lineHeight = 23.sp
                            ),
                            color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.78f)
                        )
                    }
                }
                innerTextField()
            }
        }
    )
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun editorTextFieldColors() = TextFieldDefaults.colors(
    focusedContainerColor = Color.Transparent,
    unfocusedContainerColor = Color.Transparent,
    disabledContainerColor = Color.Transparent,
    focusedIndicatorColor = Color.Transparent,
    unfocusedIndicatorColor = Color.Transparent,
    disabledIndicatorColor = Color.Transparent,
    cursorColor = BrandRed
)

private enum class EditorFormatAction { Bold, Italic, Underline, Bullet, Quote }

private fun TextFieldValue.apply(action: EditorFormatAction): TextFieldValue = when (action) {
    EditorFormatAction.Bold -> wrapSelection("**")
    EditorFormatAction.Italic -> wrapSelection("_")
    EditorFormatAction.Underline -> wrapSelection("__")
    EditorFormatAction.Bullet -> prefixCurrentLine("• ")
    EditorFormatAction.Quote -> prefixCurrentLine("> ")
}

private fun TextFieldValue.wrapSelection(marker: String): TextFieldValue {
    val start = selection.min.coerceIn(0, text.length)
    val end = selection.max.coerceIn(start, text.length)
    val selected = text.substring(start, end)
    val replacement = "$marker$selected$marker"
    val updated = text.replaceRange(start, end, replacement)
    val cursor = if (selected.isEmpty()) start + marker.length else start + replacement.length
    return TextFieldValue(updated, TextRange(cursor))
}

private fun TextFieldValue.prefixCurrentLine(prefix: String): TextFieldValue {
    val cursor = selection.start.coerceIn(0, text.length)
    val lineStart = text.lastIndexOf('\n', (cursor - 1).coerceAtLeast(0)).let { if (it < 0) 0 else it + 1 }
    val lineEnd = text.indexOf('\n', cursor).let { if (it < 0) text.length else it }
    val line = text.substring(lineStart, lineEnd)
    val replacement = if (line.startsWith(prefix)) line.removePrefix(prefix) else prefix + line
    val delta = replacement.length - line.length
    return TextFieldValue(
        text.replaceRange(lineStart, lineEnd, replacement),
        TextRange((cursor + delta).coerceAtLeast(lineStart + if (replacement.startsWith(prefix)) prefix.length else 0))
    )
}

@Composable
private fun EditorToolbar(
    onFormat: (EditorFormatAction) -> Unit,
    onPickImage: () -> Unit,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
            .padding(vertical = 2.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        ToolbarLabel("B", "Bold", FontWeight.Bold, onClick = { onFormat(EditorFormatAction.Bold) })
        ToolbarLabel("I", "Italic", FontWeight.Normal, FontStyle.Italic, onClick = { onFormat(EditorFormatAction.Italic) })
        ToolbarLabel("U", "Underline", onClick = { onFormat(EditorFormatAction.Underline) })
        VerticalDivider(modifier = Modifier.height(24.dp), color = MaterialTheme.colorScheme.outlineVariant)
        ToolbarIcon(R.drawable.ic_bullet_list, "Bulleted list", onClick = { onFormat(EditorFormatAction.Bullet) })
        ToolbarIcon(R.drawable.ic_quote, "Block quote", onClick = { onFormat(EditorFormatAction.Quote) })
        ToolbarIcon(R.drawable.ic_image, "Add cover image", onClick = onPickImage)
    }
}

@Composable
private fun ToolbarLabel(
    text: String,
    description: String,
    weight: FontWeight = FontWeight.Medium,
    style: FontStyle = FontStyle.Normal,
    onClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .size(48.dp)
            .semantics { contentDescription = description }
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Text(text, color = MaterialTheme.colorScheme.onSurface, fontWeight = weight, fontStyle = style, fontSize = 16.sp)
    }
}

@Composable
private fun ToolbarIcon(icon: Int, description: String, enabled: Boolean = true, onClick: () -> Unit = {}) {
    Box(
        modifier = Modifier
            .size(48.dp)
            .clickable(enabled = enabled, onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Image(
            painterResource(icon),
            contentDescription = description,
            modifier = Modifier.size(20.dp),
            colorFilter = ColorFilter.tint(MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = if (enabled) 1f else 0.35f))
        )
    }
}

@Composable
private fun EditorWritingFooter(
    wordCount: Int,
    readTime: Int,
    savedStatus: String,
    onFormat: (EditorFormatAction) -> Unit,
    onPickImage: () -> Unit
) {
    var formattingExpanded by rememberSaveable { mutableStateOf(true) }
    Surface(
        modifier = Modifier
            .fillMaxWidth()
            .imePadding()
            .padding(horizontal = 20.dp, vertical = 10.dp),
        color = MaterialTheme.colorScheme.surface,
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.65f)),
        shape = RoundedCornerShape(WritOnRadius.card),
        shadowElevation = WritOnElevation.raised
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 10.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("$wordCount words", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(Modifier.width(14.dp))
                Image(
                    painter = painterResource(R.drawable.ic_clock_muted),
                    contentDescription = null,
                    modifier = Modifier.size(15.dp),
                    colorFilter = ColorFilter.tint(MaterialTheme.colorScheme.onSurfaceVariant)
                )
                Spacer(Modifier.width(5.dp))
                Text("$readTime min read", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(Modifier.weight(1f))
                Image(
                    painter = painterResource(R.drawable.ic_check_muted),
                    contentDescription = null,
                    modifier = Modifier.size(15.dp),
                    colorFilter = ColorFilter.tint(BrandRed)
                )
                Spacer(Modifier.width(5.dp))
                Text(savedStatus, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                IconButton(
                    onClick = { formattingExpanded = !formattingExpanded },
                    modifier = Modifier.size(48.dp)
                ) {
                    Image(
                        painterResource(if (formattingExpanded) R.drawable.ic_chevron_up else R.drawable.ic_chevron_down),
                        contentDescription = if (formattingExpanded) "Hide formatting tools" else "Show formatting tools",
                        modifier = Modifier.size(18.dp),
                        colorFilter = ColorFilter.tint(MaterialTheme.colorScheme.onSurfaceVariant)
                    )
                }
            }
            if (formattingExpanded) {
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.55f))
                Spacer(Modifier.height(5.dp))
                EditorToolbar(onFormat = onFormat, onPickImage = onPickImage)
            }
        }
    }
}

@Composable
fun PublishStoryScreen(
    viewModel: EditorViewModel,
    onBackClick: () -> Unit,
    onPublished: () -> Unit
) {
    val title by viewModel.title.collectAsStateWithLifecycle()
    val summary by viewModel.summary.collectAsStateWithLifecycle()
    val category by viewModel.category.collectAsStateWithLifecycle()
    val content by viewModel.content.collectAsStateWithLifecycle()
    val isPublishing by viewModel.isPublishing.collectAsStateWithLifecycle()
    val categories by viewModel.categories.collectAsStateWithLifecycle()
    var selectedCover by rememberSaveable { mutableStateOf(1) }
    var isPublic by rememberSaveable { mutableStateOf(true) }
    var categoryExpanded by rememberSaveable { mutableStateOf(false) }
    var isScheduled by rememberSaveable { mutableStateOf(false) }
    var tags by rememberSaveable { mutableStateOf(listOf("writing", "reflection", "story")) }
    val wordCount = content.trim().split(Regex("\\s+")).count { it.isNotBlank() }
    val readTime = if (wordCount == 0) 0 else maxOf(1, (wordCount + 199) / 200)

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        bottomBar = {
            Surface(color = MaterialTheme.colorScheme.background) {
                Button(
                    onClick = { viewModel.publishStory(onPublished) },
                    enabled = !isPublishing,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = WritOnSpacing.lg, vertical = WritOnSpacing.md),
                    colors = ButtonDefaults.buttonColors(containerColor = BrandRed, contentColor = Color.White),
                    shape = RoundedCornerShape(WritOnRadius.field)
                ) {
                    Text(if (isPublishing) "Publishing…" else "Publish Story", fontSize = 20.sp, fontWeight = FontWeight.SemiBold)
                }
            }
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .verticalScroll(rememberScrollState())
                .padding(horizontal = WritOnSpacing.lg)
        ) {
            PublishHeader(onBackClick)
            PublishPreview(title, summary, wordCount, readTime, selectedCover)
            PublishTextEntry(
                label = stringResource(R.string.editor_title_hint),
                value = title,
                maxLength = 100,
                singleLine = true,
                onValueChange = viewModel::updateTitle
            )
            PublishTextEntry(
                label = stringResource(R.string.editor_summary_hint),
                value = summary,
                maxLength = 300,
                singleLine = false,
                onValueChange = viewModel::updateSummary
            )
            Text(stringResource(R.string.editor_category), modifier = Modifier.padding(top = WritOnSpacing.lg, bottom = WritOnSpacing.sm), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Box {
                Surface(
                    onClick = { categoryExpanded = true },
                    modifier = Modifier.fillMaxWidth(),
                    color = MaterialTheme.colorScheme.surface,
                    shape = RoundedCornerShape(WritOnRadius.field),
                    border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = WritOnSpacing.md, vertical = 15.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(category, style = MaterialTheme.typography.titleMedium)
                        Spacer(Modifier.weight(1f))
                        Image(painterResource(R.drawable.ic_chevron_down), contentDescription = "Choose category", modifier = Modifier.size(24.dp))
                    }
                }
                DropdownMenu(expanded = categoryExpanded, onDismissRequest = { categoryExpanded = false }) {
                    categories.forEach { item ->
                        DropdownMenuItem(
                            text = { Text(item) },
                            onClick = { viewModel.updateCategory(item); categoryExpanded = false }
                        )
                    }
                }
            }
            Text(stringResource(R.string.editor_tags), modifier = Modifier.padding(top = WritOnSpacing.lg, bottom = WritOnSpacing.sm), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Row(
                modifier = Modifier.horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                tags.forEach { tag ->
                    Surface(
                        onClick = { tags = tags - tag },
                        color = MaterialTheme.colorScheme.surfaceVariant,
                        shape = RoundedCornerShape(WritOnRadius.pill)
                    ) {
                        Row(
                            modifier = Modifier.padding(start = 8.dp, end = 6.dp, top = 7.dp, bottom = 7.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(tag, fontSize = 16.sp)
                            Spacer(Modifier.width(4.dp))
                            Image(painterResource(R.drawable.ic_close), contentDescription = "Remove $tag", modifier = Modifier.width(15.dp))
                        }
                    }
                }
                TextButton(onClick = { tags = tags + "new tag" }, contentPadding = PaddingValues(horizontal = 4.dp)) {
                    Image(painterResource(R.drawable.ic_add_orange), contentDescription = null, modifier = Modifier.size(20.dp))
                    Text(stringResource(R.string.editor_add_tag), color = BrandRed, fontSize = 16.sp, fontWeight = FontWeight.Medium)
                }
            }
            Text(stringResource(R.string.editor_visibility), modifier = Modifier.padding(top = WritOnSpacing.lg, bottom = WritOnSpacing.sm), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Row(horizontalArrangement = Arrangement.spacedBy(WritOnSpacing.sm)) {
                VisibilityChoice(
                    modifier = Modifier.weight(1f),
                    selected = isPublic,
                    icon = R.drawable.ic_public,
                    title = stringResource(R.string.editor_public),
                    description = "Everyone on WritOn",
                    onClick = { isPublic = true }
                )
                VisibilityChoice(
                    modifier = Modifier.weight(1f),
                    selected = !isPublic,
                    icon = R.drawable.ic_lock,
                    title = stringResource(R.string.editor_private),
                    description = "Only you can see",
                    onClick = { isPublic = false }
                )
            }
            Text(stringResource(R.string.editor_more_options), modifier = Modifier.padding(top = WritOnSpacing.lg, bottom = WritOnSpacing.sm), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Surface(
                onClick = { isScheduled = !isScheduled },
                modifier = Modifier.fillMaxWidth(),
                color = MaterialTheme.colorScheme.surface,
                shape = RoundedCornerShape(WritOnRadius.field),
                border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = WritOnSpacing.md, vertical = 15.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Image(
                        painterResource(R.drawable.ic_calendar),
                        contentDescription = null,
                        modifier = Modifier.size(24.dp),
                        colorFilter = ColorFilter.tint(MaterialTheme.colorScheme.onSurfaceVariant)
                    )
                    Spacer(Modifier.width(WritOnSpacing.md))
                    Text(if (isScheduled) "Scheduled for later" else "Schedule for later", style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.onSurface)
                    Spacer(Modifier.weight(1f))
                    Image(
                        painterResource(R.drawable.ic_chevron_right),
                        contentDescription = "Schedule",
                        modifier = Modifier.size(24.dp),
                        colorFilter = ColorFilter.tint(MaterialTheme.colorScheme.onSurfaceVariant)
                    )
                }
            }
            Spacer(Modifier.height(WritOnSpacing.xl))
        }
    }
}

@Composable
private fun PublishHeader(onBackClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = WritOnSpacing.sm, bottom = WritOnSpacing.lg),
        verticalAlignment = Alignment.CenterVertically
    ) {
        IconButton(onClick = onBackClick) {
            Image(
                painterResource(R.drawable.ic_back),
                contentDescription = "Back to editor",
                modifier = Modifier.size(24.dp),
                colorFilter = ColorFilter.tint(MaterialTheme.colorScheme.onBackground)
            )
        }
        Text(
            "Publish",
            modifier = Modifier.padding(start = WritOnSpacing.sm),
            style = MaterialTheme.typography.headlineLarge.copy(fontFamily = EditorEditorialFamily, fontWeight = FontWeight.Normal),
            color = MaterialTheme.colorScheme.onBackground
        )
        Spacer(Modifier.weight(1f))
        TextButton(onClick = onBackClick) { Text("Save draft", color = MaterialTheme.colorScheme.onBackground, fontWeight = FontWeight.Medium) }
    }
}

@Composable
private fun PublishPreview(title: String, summary: String, wordCount: Int, readTime: Int, cover: Int) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = MaterialTheme.colorScheme.surface,
        shape = RoundedCornerShape(WritOnRadius.card),
        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
        shadowElevation = WritOnElevation.raised
    ) {
        Row(modifier = Modifier.padding(WritOnSpacing.md), verticalAlignment = Alignment.CenterVertically) {
            CoverArt(cover = cover, modifier = Modifier.width(104.dp).height(138.dp))
            Spacer(Modifier.width(WritOnSpacing.md))
            Column(modifier = Modifier.weight(1f)) {
                Text(title, style = MaterialTheme.typography.titleLarge.copy(fontFamily = EditorEditorialFamily, fontWeight = FontWeight.SemiBold), color = MaterialTheme.colorScheme.onSurface, maxLines = 2)
                if (summary.isNotBlank()) {
                    Text(summary, modifier = Modifier.padding(top = 8.dp), style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 3)
                } else {
                    Text("Add a short description to help readers discover your story.", modifier = Modifier.padding(top = 8.dp), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 3)
                }
                Row(modifier = Modifier.padding(top = WritOnSpacing.sm), verticalAlignment = Alignment.CenterVertically) {
                    Image(
                        painterResource(R.drawable.ic_clock_muted),
                        contentDescription = null,
                        modifier = Modifier.width(19.dp),
                        colorFilter = ColorFilter.tint(MaterialTheme.colorScheme.onSurfaceVariant)
                    )
                    Spacer(Modifier.width(5.dp))
                    Text("$readTime min read", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("  •  $wordCount words", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }
}

@Composable
private fun PublishTextEntry(label: String, value: String, maxLength: Int, singleLine: Boolean, onValueChange: (String) -> Unit) {
    Column(modifier = Modifier.padding(top = WritOnSpacing.lg)) {
        Text(label, style = MaterialTheme.typography.titleMedium, color = Color(0xFF6D6963))
        TextField(
            value = value,
            onValueChange = { if (it.length <= maxLength) onValueChange(it) },
            modifier = Modifier.fillMaxWidth().padding(top = 2.dp),
            textStyle = MaterialTheme.typography.titleLarge.copy(fontFamily = if (label == "Title") EditorEditorialFamily else FontFamily.Default),
            colors = editorTextFieldColors(),
            singleLine = singleLine,
            minLines = if (singleLine) 1 else 2
        )
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
            Spacer(Modifier.weight(1f))
            Text("${value.length}/$maxLength", style = MaterialTheme.typography.bodyMedium, color = Color(0xFF6D6963))
        }
        androidx.compose.material3.HorizontalDivider(color = Color(0xFFE9E1D7))
    }
}

@Composable
private fun CoverPicker(selectedCover: Int, onCoverSelected: (Int) -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(top = WritOnSpacing.sm)
            .horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(WritOnSpacing.sm)
    ) {
        Surface(
            onClick = { onCoverSelected(0) },
            modifier = Modifier.width(104.dp).height(138.dp),
            color = Color(0xFFFFFDF9),
            shape = RoundedCornerShape(WritOnRadius.field),
            border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFE9E1D7))
        ) {
            Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                Image(painterResource(R.drawable.ic_image_muted), contentDescription = "Add cover image", modifier = Modifier.size(24.dp))
                Text("Add Image", modifier = Modifier.padding(top = 6.dp), color = Color(0xFF6D6963))
            }
        }
        (1..3).forEach { cover ->
            Box(modifier = Modifier.width(104.dp).height(138.dp).clickable { onCoverSelected(cover) }) {
                CoverArt(cover = cover, modifier = Modifier.fillMaxSize())
                if (selectedCover == cover) {
                    Surface(
                        modifier = Modifier.fillMaxSize(),
                        color = Color.Transparent,
                        shape = RoundedCornerShape(WritOnRadius.field),
                        border = androidx.compose.foundation.BorderStroke(2.dp, BrandRed)
                    ) {}
                    Surface(
                        modifier = Modifier.align(Alignment.TopEnd).padding(8.dp),
                        shape = CircleShape,
                        color = BrandRed
                    ) { Image(painterResource(R.drawable.ic_check_white), contentDescription = "Selected cover", modifier = Modifier.padding(5.dp).width(16.dp)) }
                }
            }
        }
    }
}

@Composable
private fun CoverArt(cover: Int, modifier: Modifier = Modifier) {
    val color = when (cover) {
        1 -> Color(0xFF6D6963)
        2 -> Color(0xFFF2ECE4)
        else -> Color(0xFFE9E1D7)
    }
    Surface(modifier = modifier, color = color, shape = RoundedCornerShape(WritOnRadius.field)) {
        Column(
            modifier = Modifier.padding(12.dp),
            verticalArrangement = Arrangement.SpaceBetween
        ) {
            Text("W", color = Color(0xFFFFFDF9).copy(alpha = 0.8f), style = MaterialTheme.typography.headlineMedium.copy(fontFamily = EditorEditorialFamily))
            Text(
                if (cover == 1) "Quiet\nthoughts" else if (cover == 2) "Soft\nlight" else "Far\nhorizon",
                color = Color(0xFFFFFDF9),
                style = MaterialTheme.typography.titleMedium.copy(fontFamily = EditorEditorialFamily, lineHeight = 19.sp)
            )
        }
    }
}

@Composable
private fun VisibilityChoice(
    modifier: Modifier,
    selected: Boolean,
    icon: Int,
    title: String,
    description: String,
    onClick: () -> Unit
) {
    Surface(
        onClick = onClick,
        modifier = modifier,
        color = Color(0xFFFFFDF9),
        shape = RoundedCornerShape(WritOnRadius.field),
        border = androidx.compose.foundation.BorderStroke(if (selected) 2.dp else 1.dp, if (selected) BrandRed else Color(0xFFE9E1D7))
    ) {
        Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Image(painterResource(if (selected) when (icon) { R.drawable.ic_public -> R.drawable.ic_public_orange; else -> R.drawable.ic_lock_orange } else icon), contentDescription = title, modifier = Modifier.size(24.dp))
            Spacer(Modifier.width(9.dp))
            Column {
                Text(title, style = MaterialTheme.typography.titleMedium)
                Text(description, style = MaterialTheme.typography.bodySmall, color = Color(0xFF6D6963), maxLines = 2)
            }
        }
    }
}
