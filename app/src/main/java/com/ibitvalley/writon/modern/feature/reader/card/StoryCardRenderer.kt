package com.ibitvalley.writon.modern.feature.reader.card

import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.Canvas
import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import android.view.View
import androidx.compose.runtime.Composable
import androidx.compose.ui.platform.ComposeView
import androidx.core.content.FileProvider
import com.ibitvalley.writon.modern.cardStoryShareUrl
import com.ibitvalley.writon.modern.core.database.model.PostEntity
import com.ibitvalley.writon.modern.core.telemetry.WritOnTelemetry
import java.io.File
import java.io.FileOutputStream

import android.content.ContextWrapper
import android.view.ViewGroup
import androidx.activity.ComponentActivity
import androidx.compose.runtime.CompositionContext

/**
 * Bitmap rendering and sharing engine for Story Cards.
 */
object StoryCardRenderer {

    private fun Context.findActivity(): ComponentActivity? {
        var current = this
        while (current is ContextWrapper) {
            if (current is ComponentActivity) return current
            current = current.baseContext
        }
        return null
    }

    /**
     * Renders a Composable card to a hardware or software Bitmap using an offscreen ComposeView.
     * Must be invoked on the Main/UI thread (Dispatchers.Main.immediate) so the ComposeView,
     * recomposer, and view-tree owners are attached and measured safely.
     */
    fun renderComposableToBitmap(
        context: Context,
        widthPx: Int,
        heightPx: Int,
        parentComposition: CompositionContext? = null,
        ownerView: View? = null,
        content: @Composable () -> Unit
    ): Bitmap {
        val composeView = ComposeView(context).apply {
            if (parentComposition != null) {
                setParentCompositionContext(parentComposition)
            }
            setContent(content)
        }

        // Attach composeView temporarily to the active window hierarchy so that Jetpack Compose
        // can locate the WindowRecomposer, LifecycleOwner, SavedStateRegistryOwner, and ViewModelStoreOwner.
        val rootViewGroup = (ownerView?.rootView as? ViewGroup)
            ?: (context.findActivity()?.window?.decorView as? ViewGroup)

        val isAttached = rootViewGroup != null
        if (isAttached) {
            composeView.visibility = View.GONE
            rootViewGroup?.addView(composeView, ViewGroup.LayoutParams(widthPx, heightPx))
        }

        try {
            val widthSpec = View.MeasureSpec.makeMeasureSpec(widthPx, View.MeasureSpec.EXACTLY)
            val heightSpec = View.MeasureSpec.makeMeasureSpec(heightPx, View.MeasureSpec.EXACTLY)

            composeView.measure(widthSpec, heightSpec)
            composeView.layout(0, 0, widthPx, heightPx)

            val bitmap = Bitmap.createBitmap(widthPx, heightPx, Bitmap.Config.ARGB_8888)
            val canvas = Canvas(bitmap)
            composeView.draw(canvas)

            return bitmap
        } finally {
            if (isAttached) {
                rootViewGroup?.removeView(composeView)
            }
        }
    }

    /**
     * Saves a rendered card Bitmap to the app cache directory and returns its FileProvider content Uri.
     */
    fun saveBitmapToShareCache(context: Context, bitmap: Bitmap): Uri? {
        return runCatching {
            val cacheFolder = File(context.cacheDir, "share_cards")
            if (!cacheFolder.exists()) {
                cacheFolder.mkdirs()
            }
            val cardFile = File(cacheFolder, "writon_story_card.png")
            FileOutputStream(cardFile).use { out ->
                bitmap.compress(Bitmap.CompressFormat.PNG, 100, out)
            }
            FileProvider.getUriForFile(
                context,
                "${context.packageName}.fileprovider",
                cardFile
            )
        }.getOrNull()
    }

    /**
     * Saves a rendered card Bitmap to device external storage (Pictures/WritOn) via MediaStore.
     */
    fun saveBitmapToGallery(
        context: Context,
        bitmap: Bitmap,
        title: String
    ): Boolean {
        return runCatching {
            val safeTitle = title.take(24).replace(Regex("[^a-zA-Z0-9_-]"), "_")
            val filename = "WritOn_${safeTitle}_${System.currentTimeMillis()}.png"

            val values = ContentValues().apply {
                put(MediaStore.Images.Media.DISPLAY_NAME, filename)
                put(MediaStore.Images.Media.MIME_TYPE, "image/png")
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    put(MediaStore.Images.Media.RELATIVE_PATH, "Pictures/WritOn")
                    put(MediaStore.Images.Media.IS_PENDING, 1)
                }
            }

            val uri = context.contentResolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values)
                ?: return false

            context.contentResolver.openOutputStream(uri)?.use { out ->
                bitmap.compress(Bitmap.CompressFormat.PNG, 100, out)
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                values.clear()
                values.put(MediaStore.Images.Media.IS_PENDING, 0)
                context.contentResolver.update(uri, values, null, null)
            }

            true
        }.getOrDefault(false)
    }

    /**
     * Launches Android native share chooser with the generated card image and deep link text.
     */
    fun shareCard(
        context: Context,
        imageUri: Uri,
        post: PostEntity,
        sizeRatio: String
    ) {
        val shareLink = cardStoryShareUrl(post.slug)
        val shareMessage = "${post.title} by ${post.authorName}\n\nRead on WritOn:\n$shareLink"

        val shareIntent = Intent(Intent.ACTION_SEND).apply {
            type = "image/png"
            putExtra(Intent.EXTRA_STREAM, imageUri)
            putExtra(Intent.EXTRA_TEXT, shareMessage)
            putExtra(Intent.EXTRA_SUBJECT, post.title)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }

        WritOnTelemetry.logCardShareInitiated(
            storyId = post.id,
            sizeRatio = sizeRatio,
            context = context
        )

        val chooser = Intent.createChooser(shareIntent, "Share Story Card").apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(chooser)
    }
}
