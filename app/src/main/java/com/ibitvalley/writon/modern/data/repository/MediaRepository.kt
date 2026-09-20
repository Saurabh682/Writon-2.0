package com.ibitvalley.writon.modern.data.repository

import android.content.Context
import android.net.Uri
import com.google.gson.JsonParser
import com.ibitvalley.writon.BuildConfig
import com.ibitvalley.writon.modern.core.network.WritOnApiService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.ByteArrayOutputStream
import java.io.InputStream
import java.net.URLEncoder

internal const val MAX_IMAGE_UPLOAD_BYTES = 10 * 1024 * 1024

internal fun canonicalUploadedMediaUrl(key: String): String =
    "${BuildConfig.API_BASE_URL.trimEnd('/')}/api/v1/media/${URLEncoder.encode(key, "UTF-8")}"

internal fun mediaUploadFailureMessage(statusCode: Int, responseBody: String?): String {
    val serverMessage = responseBody
        ?.takeIf { it.isNotBlank() }
        ?.let { body ->
            runCatching {
                JsonParser.parseString(body).asJsonObject
                    .get("error")
                    ?.asString
                    ?.trim()
                    ?.takeIf { it.isNotBlank() }
            }.getOrNull()
        }
    return serverMessage ?: "Image upload failed ($statusCode). Please try again."
}

internal fun readImageBytes(input: InputStream, maxBytes: Int = MAX_IMAGE_UPLOAD_BYTES): ByteArray {
    require(maxBytes >= 0) { "The image-size limit must not be negative." }
    val output = ByteArrayOutputStream(minOf(maxBytes, 32 * 1024))
    val buffer = ByteArray(8 * 1024)
    var totalBytes = 0
    while (true) {
        val bytesToRead = minOf(buffer.size, maxBytes - totalBytes + 1)
        val count = input.read(buffer, 0, bytesToRead)
        if (count < 0) break
        totalBytes += count
        if (totalBytes > maxBytes) {
            throw IllegalArgumentException("Choose an image smaller than 10 MB.")
        }
        output.write(buffer, 0, count)
    }
    return output.toByteArray()
}

class MediaRepository(private val apiService: WritOnApiService) {
    suspend fun uploadImage(context: Context, uri: Uri): Result<String> = withContext(Dispatchers.IO) {
        try {
            context.contentResolver.openAssetFileDescriptor(uri, "r")?.use { descriptor ->
                if (descriptor.length > MAX_IMAGE_UPLOAD_BYTES) {
                    return@withContext Result.failure(
                        IllegalArgumentException("Choose an image smaller than 10 MB.")
                    )
                }
            }
            val bytes = context.contentResolver.openInputStream(uri)?.use { readImageBytes(it) }
                ?: return@withContext Result.failure(IllegalStateException("Could not open the selected image."))
            val mimeType = context.contentResolver.getType(uri)?.toMediaTypeOrNull()
                ?: "image/jpeg".toMediaTypeOrNull()!!
            val part = MultipartBody.Part.createFormData(
                "file",
                "cover-upload",
                bytes.toRequestBody(mimeType)
            )
            val response = apiService.uploadMedia(part)
            val body = response.body()
            if (response.isSuccessful && body != null) Result.success(canonicalUploadedMediaUrl(body.key))
            else Result.failure(
                IllegalStateException(
                    mediaUploadFailureMessage(response.code(), response.errorBody()?.string())
                )
            )
        } catch (error: Exception) {
            Result.failure(error)
        }
    }
}
