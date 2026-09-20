package com.ibitvalley.writon.modern.feature.editor

import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.OffsetMapping
import androidx.compose.ui.text.input.TransformedText
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextDecoration

internal data class FormattedEditorText(
    val text: AnnotatedString,
    val offsetMapping: OffsetMapping
)

private data class EditorInlineFormat(
    val sourceStart: Int,
    val sourceEnd: Int,
    val markerLength: Int,
    val style: SpanStyle
)

internal object EditorMarkdownVisualTransformation : VisualTransformation {
    override fun filter(text: AnnotatedString): TransformedText {
        val formatted = formatEditorMarkdown(text.text)
        return TransformedText(formatted.text, formatted.offsetMapping)
    }
}

internal fun formatEditorMarkdown(source: String): FormattedEditorText {
    val inlineFormats = EDITOR_INLINE_MARKUP.findAll(source).map { match ->
        val token = match.value
        val markerLength = if (token.startsWith("**") || token.startsWith("__")) 2 else 1
        val style = when {
            token.startsWith("**") -> SpanStyle(fontWeight = FontWeight.Bold)
            token.startsWith("__") -> SpanStyle(textDecoration = TextDecoration.Underline)
            else -> SpanStyle(fontStyle = FontStyle.Italic)
        }
        EditorInlineFormat(
            sourceStart = match.range.first,
            sourceEnd = match.range.last + 1,
            markerLength = markerLength,
            style = style
        )
    }.toList()

    val hidden = BooleanArray(source.length)
    inlineFormats.forEach { format ->
        repeat(format.markerLength) { offset ->
            hidden[format.sourceStart + offset] = true
            hidden[format.sourceEnd - format.markerLength + offset] = true
        }
    }

    val quoteLines = source.lineRanges().filter { range ->
        range.first < range.last && source.startsWith("> ", range.first)
    }
    val quoteMarkers = quoteLines.mapTo(mutableSetOf()) { it.first }

    val output = StringBuilder(source.length)
    val originalToTransformed = IntArray(source.length + 1)
    val transformedToOriginal = mutableListOf(0)

    source.indices.forEach { sourceIndex ->
        originalToTransformed[sourceIndex] = output.length
        if (!hidden[sourceIndex]) {
            transformedToOriginal[output.length] = sourceIndex
            output.append(if (sourceIndex in quoteMarkers) '│' else source[sourceIndex])
            transformedToOriginal += sourceIndex + 1
        }
    }
    originalToTransformed[source.length] = output.length

    inlineFormats.forEach { format ->
        val contentStart = format.sourceStart + format.markerLength
        val contentEnd = format.sourceEnd - format.markerLength
        transformedToOriginal[originalToTransformed[contentStart]] = contentStart
        transformedToOriginal[originalToTransformed[contentEnd]] = contentEnd
    }

    val styles = buildList {
        inlineFormats.forEach { format ->
            add(
                AnnotatedString.Range(
                    item = format.style,
                    start = originalToTransformed[format.sourceStart + format.markerLength],
                    end = originalToTransformed[format.sourceEnd - format.markerLength]
                )
            )
        }
        quoteLines.forEach { range ->
            add(
                AnnotatedString.Range(
                    item = SpanStyle(fontStyle = FontStyle.Italic),
                    start = originalToTransformed[range.first],
                    end = originalToTransformed[range.last + 1]
                )
            )
        }
    }

    return FormattedEditorText(
        text = AnnotatedString(output.toString(), spanStyles = styles),
        offsetMapping = EditorOffsetMapping(
            originalToTransformed = originalToTransformed,
            transformedToOriginal = transformedToOriginal.toIntArray()
        )
    )
}

private class EditorOffsetMapping(
    private val originalToTransformed: IntArray,
    private val transformedToOriginal: IntArray
) : OffsetMapping {
    override fun originalToTransformed(offset: Int): Int =
        originalToTransformed[offset.coerceIn(originalToTransformed.indices)]

    override fun transformedToOriginal(offset: Int): Int =
        transformedToOriginal[offset.coerceIn(transformedToOriginal.indices)]
}

private fun String.lineRanges(): List<IntRange> {
    if (isEmpty()) return emptyList()
    val ranges = mutableListOf<IntRange>()
    var start = 0
    forEachIndexed { index, character ->
        if (character == '\n') {
            ranges += start until index
            start = index + 1
        }
    }
    ranges += start until length
    return ranges
}

private val EDITOR_INLINE_MARKUP =
    Regex("(\\*\\*[^\\n]*?\\*\\*|__[^\\n]*?__|\\*[^*\\n]+?\\*|_[^_\\n]+?_)")
