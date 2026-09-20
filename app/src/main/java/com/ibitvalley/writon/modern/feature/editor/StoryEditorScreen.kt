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
import androidx.compose.material3.AlertDialog
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
import com.ibitvalley.writon.modern.core.designsystem.components.PostCoverImage

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
    val isEditingPublished by viewModel.isEditingPublished.collectAsStateWithLifecycle()
    val legacyDraft by viewModel.legacyDraft.collectAsStateWithLifecycle()
    var bodyValue by rememberSaveable(stateSaver = TextFieldValue.Saver) {
        mutableStateOf(TextFieldValue(content))
    }
    val undoManager = androidx.compose.runtime.remember { EditorUndoManager(bodyValue) }
    val context = LocalContext.current
    val coverPicker = rememberLauncherForActivityResult(ActivityResultContracts.PickVisualMedia()) { uri ->
        uri?.let { viewModel.uploadCover(context, it) }
    }

    LaunchedEffect(content) {
        if (content != bodyValue.text) {
            bodyValue = TextFieldValue(content, selection = TextRange(content.length))
            undoManager.reset(bodyValue)
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
                canUndo = undoManager.canUndo,
                canRedo = undoManager.canRedo,
                onUndo = {
                    bodyValue = undoManager.undo()
                    viewModel.updateContent(bodyValue.text)
                },
                onRedo = {
                    bodyValue = undoManager.redo()
                    viewModel.updateContent(bodyValue.text)
                },
                onFormat = { action ->
                    bodyValue = undoManager.record(bodyValue.apply(action))
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
                canPublish = validateStoryForPublish(title, content) == null,
                isEditingPublished = isEditingPublished,
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
                        stringResource(R.string.editor_add_title),
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
                    bodyValue = if (it.text == bodyValue.text) it else undoManager.record(it)
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

    if (legacyDraft != null) {
        AlertDialog(
            onDismissRequest = viewModel::dismissLegacyDraft,
            title = { Text(stringResource(R.string.legacy_draft_title)) },
            text = { Text(stringResource(R.string.legacy_draft_message)) },
            confirmButton = {
                TextButton(onClick = viewModel::restoreLegacyDraft) {
                    Text(stringResource(R.string.legacy_draft_restore))
                }
            },
            dismissButton = {
                TextButton(onClick = viewModel::dismissLegacyDraft) {
                    Text(stringResource(R.string.common_not_now))
                }
            }
        )
    }
}
@Composable
private fun EditorDraftStatus.label(): String = when (this) {
    EditorDraftStatus.Unsaved -> stringResource(R.string.editor_status_unsaved)
    EditorDraftStatus.Saving -> stringResource(R.string.editor_status_saving)
    EditorDraftStatus.Saved -> stringResource(R.string.editor_status_saved)
    EditorDraftStatus.Offline -> stringResource(R.string.editor_status_saved_device)
    EditorDraftStatus.QueuedForPublish -> stringResource(R.string.editor_status_queued_short)
    is EditorDraftStatus.Failed -> stringResource(R.string.editor_status_attention)
}

@Composable
private fun EditorWritingTopBar(
    onBackClick: () -> Unit,
    onSaveClick: () -> Unit,
    onPublishClick: () -> Unit,
    canPublish: Boolean,
    isEditingPublished: Boolean,
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
            Text(stringResource(R.string.common_save), style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onBackground)
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
            Text(
                stringResource(if (isEditingPublished) R.string.editor_review_update else R.string.editor_publish),
                style = MaterialTheme.typography.labelLarge
            )
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
internal fun EditorBodyField(
    value: TextFieldValue,
    onValueChange: (TextFieldValue) -> Unit,
    modifier: Modifier = Modifier
) {
    val storyContentDescription = stringResource(R.string.editor_story_content)
    val bodyStyle = MaterialTheme.typography.bodyLarge.copy(
        fontFamily = EditorEditorialFamily,
        fontSize = 18.sp,
        lineHeight = 31.sp,
        color = MaterialTheme.colorScheme.onBackground
    )

    BasicTextField(
        value = value,
        onValueChange = onValueChange,
        modifier = modifier.semantics { contentDescription = storyContentDescription },
        textStyle = bodyStyle,
        visualTransformation = EditorMarkdownVisualTransformation,
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
                                stringResource(R.string.editor_start_writing),
                                style = bodyStyle.copy(fontStyle = FontStyle.Italic, fontSize = 17.sp),
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        HorizontalDivider(
                            modifier = Modifier.padding(top = 25.dp, end = 36.dp),
                            color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.55f)
                        )
                        Text(
                            stringResource(R.string.editor_writing_prompt),
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

internal class EditorUndoManager(initial: TextFieldValue, private val limit: Int = 100) {
    private var current = initial
    private val undo = ArrayDeque<TextFieldValue>()
    private val redo = ArrayDeque<TextFieldValue>()

    init {
        require(limit > 0)
    }

    val canUndo: Boolean get() = undo.isNotEmpty()
    val canRedo: Boolean get() = redo.isNotEmpty()

    fun record(next: TextFieldValue): TextFieldValue {
        if (next.text != current.text) {
            if (undo.size == limit) undo.removeFirst()
            undo.addLast(current)
            redo.clear()
        }
        current = next
        return current
    }

    fun undo(): TextFieldValue {
        if (undo.isEmpty()) return current
        redo.addLast(current)
        current = undo.removeLast()
        return current
    }

    fun redo(): TextFieldValue {
        if (redo.isEmpty()) return current
        undo.addLast(current)
        current = redo.removeLast()
        return current
    }

    fun reset(value: TextFieldValue) {
        current = value
        undo.clear()
        redo.clear()
    }
}

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

internal fun TextFieldValue.prefixCurrentLine(prefix: String): TextFieldValue {
    val cursor = selection.start.coerceIn(0, text.length)
    val lineStart = text.lastIndexOf('\n', cursor - 1).let { if (it < 0) 0 else it + 1 }
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
    canUndo: Boolean,
    canRedo: Boolean,
    onUndo: () -> Unit,
    onRedo: () -> Unit,
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
        ToolbarLabel("↶", stringResource(R.string.editor_undo), enabled = canUndo, onClick = onUndo)
        ToolbarLabel("↷", stringResource(R.string.editor_redo), enabled = canRedo, onClick = onRedo)
        VerticalDivider(modifier = Modifier.height(24.dp), color = MaterialTheme.colorScheme.outlineVariant)
        ToolbarLabel("B", stringResource(R.string.editor_format_bold), FontWeight.Bold, onClick = { onFormat(EditorFormatAction.Bold) })
        ToolbarLabel("I", stringResource(R.string.editor_format_italic), FontWeight.Normal, FontStyle.Italic, onClick = { onFormat(EditorFormatAction.Italic) })
        ToolbarLabel("U", stringResource(R.string.editor_format_underline), onClick = { onFormat(EditorFormatAction.Underline) })
        VerticalDivider(modifier = Modifier.height(24.dp), color = MaterialTheme.colorScheme.outlineVariant)
        ToolbarIcon(R.drawable.ic_bullet_list, stringResource(R.string.editor_format_bullets), onClick = { onFormat(EditorFormatAction.Bullet) })
        ToolbarIcon(R.drawable.ic_quote, stringResource(R.string.editor_format_quote), onClick = { onFormat(EditorFormatAction.Quote) })
        ToolbarIcon(R.drawable.ic_image, stringResource(R.string.editor_add_cover_image), onClick = onPickImage)
    }
}

@Composable
private fun ToolbarLabel(
    text: String,
    description: String,
    weight: FontWeight = FontWeight.Medium,
    style: FontStyle = FontStyle.Normal,
    enabled: Boolean = true,
    onClick: () -> Unit
) {
    Box(
        modifier = Modifier
            .size(48.dp)
            .semantics { contentDescription = description }
            .clickable(enabled = enabled, onClick = onClick),
        contentAlignment = Alignment.Center
    ) {
        Text(text, color = MaterialTheme.colorScheme.onSurface.copy(alpha = if (enabled) 1f else 0.35f), fontWeight = weight, fontStyle = style, fontSize = 18.sp)
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
    canUndo: Boolean,
    canRedo: Boolean,
    onUndo: () -> Unit,
    onRedo: () -> Unit,
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
                Text(stringResource(R.string.editor_words_count, wordCount), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(Modifier.width(14.dp))
                Image(
                    painter = painterResource(R.drawable.ic_clock_muted),
                    contentDescription = null,
                    modifier = Modifier.size(15.dp),
                    colorFilter = ColorFilter.tint(MaterialTheme.colorScheme.onSurfaceVariant)
                )
                Spacer(Modifier.width(5.dp))
                Text(stringResource(R.string.common_min_read, readTime), style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
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
                        contentDescription = stringResource(
                            if (formattingExpanded) R.string.editor_hide_formatting else R.string.editor_show_formatting
                        ),
                        modifier = Modifier.size(18.dp),
                        colorFilter = ColorFilter.tint(MaterialTheme.colorScheme.onSurfaceVariant)
                    )
                }
            }
            if (formattingExpanded) {
                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.55f))
                Spacer(Modifier.height(5.dp))
                EditorToolbar(
                    canUndo = canUndo,
                    canRedo = canRedo,
                    onUndo = onUndo,
                    onRedo = onRedo,
                    onFormat = onFormat,
                    onPickImage = onPickImage
                )
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
    val coverImage by viewModel.coverImage.collectAsStateWithLifecycle()
    val isPublishing by viewModel.isPublishing.collectAsStateWithLifecycle()
    val isEditingPublished by viewModel.isEditingPublished.collectAsStateWithLifecycle()
    val draftStatus by viewModel.draftStatus.collectAsStateWithLifecycle()
    val categories by viewModel.categories.collectAsStateWithLifecycle()
    var categoryExpanded by rememberSaveable { mutableStateOf(false) }
    val wordCount = content.trim().split(Regex("\\s+")).count { it.isNotBlank() }
    val readTime = if (wordCount == 0) 0 else maxOf(1, (wordCount + 199) / 200)
    val validationMessage = validateStoryForPublish(title, content)

    Scaffold(
        containerColor = MaterialTheme.colorScheme.background,
        bottomBar = {
            Surface(color = MaterialTheme.colorScheme.background) {
                Button(
                    onClick = { viewModel.publishStory(onPublished) },
                    enabled = !isPublishing && validationMessage == null,
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = WritOnSpacing.lg, vertical = WritOnSpacing.md),
                    colors = ButtonDefaults.buttonColors(containerColor = BrandRed, contentColor = Color.White),
                    shape = RoundedCornerShape(WritOnRadius.field)
                ) {
                    Text(
                        if (isPublishing) stringResource(R.string.editor_publishing)
                        else if (draftStatus is EditorDraftStatus.QueuedForPublish) stringResource(R.string.editor_try_publish_now)
                        else if (isEditingPublished) stringResource(R.string.editor_update_story)
                        else stringResource(R.string.editor_publish_story),
                        fontSize = 20.sp,
                        fontWeight = FontWeight.SemiBold
                    )
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
            PublishPreview(title, summary, category, coverImage, wordCount, readTime)
            PublishTextEntry(
                label = stringResource(R.string.editor_title_hint),
                value = title,
                maxLength = 100,
                singleLine = true,
                editorialStyle = true,
                onValueChange = viewModel::updateTitle
            )
            PublishTextEntry(
                label = stringResource(R.string.editor_summary_hint),
                value = summary,
                maxLength = 300,
                singleLine = false,
                editorialStyle = false,
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
                        Image(painterResource(R.drawable.ic_chevron_down), contentDescription = stringResource(R.string.editor_choose_category), modifier = Modifier.size(24.dp))
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
            val statusText = when (draftStatus) {
                is EditorDraftStatus.Failed -> (draftStatus as EditorDraftStatus.Failed).message
                EditorDraftStatus.Offline -> stringResource(R.string.editor_publish_status_offline)
                EditorDraftStatus.Saving -> stringResource(R.string.editor_publish_status_saving)
                EditorDraftStatus.Unsaved -> stringResource(R.string.editor_status_unsaved)
                EditorDraftStatus.Saved -> stringResource(R.string.editor_publish_status_ready)
                EditorDraftStatus.QueuedForPublish -> stringResource(R.string.editor_publish_status_queued)
            }
            val localizedValidationMessage = when {
                title.isBlank() && content.isBlank() -> stringResource(R.string.editor_validation_title_story)
                title.isBlank() -> stringResource(R.string.editor_validation_title)
                title.trim().length < 3 -> stringResource(R.string.editor_validation_title_length)
                content.isBlank() -> stringResource(R.string.editor_validation_story)
                else -> null
            }
            Text(
                text = localizedValidationMessage ?: statusText,
                modifier = Modifier.padding(top = WritOnSpacing.lg),
                style = MaterialTheme.typography.bodyMedium,
                color = if (localizedValidationMessage != null || draftStatus is EditorDraftStatus.Failed) BrandRed else MaterialTheme.colorScheme.onSurfaceVariant
            )
            if (draftStatus is EditorDraftStatus.QueuedForPublish) {
                TextButton(onClick = viewModel::cancelQueuedPublish) {
                    Text(stringResource(R.string.editor_keep_as_draft), color = BrandRed)
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
                contentDescription = stringResource(R.string.editor_back_to_editor),
                modifier = Modifier.size(24.dp),
                colorFilter = ColorFilter.tint(MaterialTheme.colorScheme.onBackground)
            )
        }
        Text(
            stringResource(R.string.editor_publish),
            modifier = Modifier.padding(start = WritOnSpacing.sm),
            style = MaterialTheme.typography.headlineLarge.copy(fontFamily = EditorEditorialFamily, fontWeight = FontWeight.Normal),
            color = MaterialTheme.colorScheme.onBackground
        )
        Spacer(Modifier.weight(1f))
        TextButton(onClick = onBackClick) { Text(stringResource(R.string.editor_save_draft), color = MaterialTheme.colorScheme.onBackground, fontWeight = FontWeight.Medium) }
    }
}

@Composable
private fun PublishPreview(
    title: String,
    summary: String,
    category: String,
    coverImage: String?,
    wordCount: Int,
    readTime: Int
) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        color = MaterialTheme.colorScheme.surface,
        shape = RoundedCornerShape(WritOnRadius.card),
        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f)),
        shadowElevation = WritOnElevation.raised
    ) {
        Row(modifier = Modifier.padding(WritOnSpacing.md), verticalAlignment = Alignment.CenterVertically) {
            PostCoverImage(
                imageUrl = coverImage,
                category = category,
                contentDescription = stringResource(R.string.editor_cover_preview),
                modifier = Modifier.width(104.dp).height(138.dp),
                categoryFontSize = 16.sp
            )
            Spacer(Modifier.width(WritOnSpacing.md))
            Column(modifier = Modifier.weight(1f)) {
                Text(title, style = MaterialTheme.typography.titleLarge.copy(fontFamily = EditorEditorialFamily, fontWeight = FontWeight.SemiBold), color = MaterialTheme.colorScheme.onSurface, maxLines = 2)
                if (summary.isNotBlank()) {
                    Text(summary, modifier = Modifier.padding(top = 8.dp), style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 3)
                } else {
                    Text(stringResource(R.string.editor_summary_desc), modifier = Modifier.padding(top = 8.dp), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant, maxLines = 3)
                }
                Row(modifier = Modifier.padding(top = WritOnSpacing.sm), verticalAlignment = Alignment.CenterVertically) {
                    Image(
                        painterResource(R.drawable.ic_clock_muted),
                        contentDescription = null,
                        modifier = Modifier.width(19.dp),
                        colorFilter = ColorFilter.tint(MaterialTheme.colorScheme.onSurfaceVariant)
                    )
                    Spacer(Modifier.width(5.dp))
                    Text(stringResource(R.string.common_min_read, readTime), style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                    Text("  •  ${stringResource(R.string.editor_words_count, wordCount)}", style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
            }
        }
    }
}

@Composable
private fun PublishTextEntry(label: String, value: String, maxLength: Int, singleLine: Boolean, editorialStyle: Boolean, onValueChange: (String) -> Unit) {
    Column(modifier = Modifier.padding(top = WritOnSpacing.lg)) {
        Text(label, style = MaterialTheme.typography.titleMedium, color = Color(0xFF6D6963))
        TextField(
            value = value,
            onValueChange = { if (it.length <= maxLength) onValueChange(it) },
            modifier = Modifier.fillMaxWidth().padding(top = 2.dp),
            textStyle = MaterialTheme.typography.titleLarge.copy(fontFamily = if (editorialStyle) EditorEditorialFamily else FontFamily.Default),
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
