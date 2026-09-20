package com.ibitvalley.writon.modern.feature.editor

import androidx.compose.ui.text.TextRange
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextDecoration
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class EditorMarkdownFormattingTest {

    @Test
    fun `inline formatting is visible without markdown markers`() {
        val formatted = formatEditorMarkdown("**Bold** _soft_ __underlined__")

        assertEquals("Bold soft underlined", formatted.text.text)
        assertTrue(formatted.text.spanStyles.any {
            it.start == 0 && it.end == 4 && it.item.fontWeight == FontWeight.Bold
        })
        assertTrue(formatted.text.spanStyles.any {
            it.start == 5 && it.end == 9 && it.item.fontStyle == FontStyle.Italic
        })
        assertTrue(formatted.text.spanStyles.any {
            it.start == 10 && it.end == 20 && it.item.textDecoration == TextDecoration.Underline
        })
    }

    @Test
    fun `cursor offsets skip hidden formatting markers`() {
        val formatted = formatEditorMarkdown("**Bold**")

        assertEquals(0, formatted.offsetMapping.originalToTransformed(2))
        assertEquals(4, formatted.offsetMapping.originalToTransformed(6))
        assertEquals(2, formatted.offsetMapping.transformedToOriginal(0))
        assertEquals(6, formatted.offsetMapping.transformedToOriginal(4))
    }

    @Test
    fun `quote syntax becomes a visible quote treatment`() {
        val formatted = formatEditorMarkdown("> A remembered line")

        assertEquals("│ A remembered line", formatted.text.text)
        assertTrue(formatted.text.spanStyles.any {
            it.start == 0 && it.end == 19 && it.item.fontStyle == FontStyle.Italic
        })
    }

    @Test
    fun `line prefix at the start of a leading newline stays in bounds`() {
        val updated = TextFieldValue("\nFirst line", TextRange.Zero).prefixCurrentLine("• ")

        assertEquals("• \nFirst line", updated.text)
        assertEquals(TextRange(2), updated.selection)
    }

    @Test
    fun `line prefix at a newline formats the preceding line`() {
        val updated = TextFieldValue("First\nSecond", TextRange(5)).prefixCurrentLine("> ")

        assertEquals("> First\nSecond", updated.text)
        assertEquals(TextRange(7), updated.selection)
    }

    @Test
    fun `undo and redo restore writing without losing cursor state`() {
        val original = TextFieldValue("First", TextRange(5))
        val edited = TextFieldValue("First line", TextRange(10))
        val history = EditorUndoManager(original)

        assertEquals(edited, history.record(edited))
        assertTrue(history.canUndo)
        assertEquals(original, history.undo())
        assertTrue(history.canRedo)
        assertEquals(edited, history.redo())
    }

    @Test
    fun `new writing clears redo history`() {
        val history = EditorUndoManager(TextFieldValue("One"))
        history.record(TextFieldValue("One two"))
        history.undo()
        history.record(TextFieldValue("One three"))

        assertTrue(!history.canRedo)
        assertEquals("One three", history.redo().text)
    }
}
