package com.ibitvalley.writon.modern.data.repository

import android.content.Context
import android.net.Uri
import com.ibitvalley.writon.modern.core.network.WritOnApiService
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody

class MediaRepository(private val apiService: WritOnApiService) {
    suspend fun uploadImage(context: Context, uri: Uri): Result<String> = withContext(Dispatchers.IO) {
        try {
            val bytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() }
                ?: return@withContext Result.failure(IllegalStateException("Could not open the selected image."))
            if (bytes.size > 10 * 1024 * 1024) {
                return@withContext Result.failure(IllegalArgumentException("Choose an image smaller than 10 MB."))
            }
            val mimeType = context.contentResolver.getType(uri)?.toMediaTypeOrNull()
                ?: "image/jpeg".toMediaTypeOrNull()!!
            val part = MultipartBody.Part.createFormData(
                "file",
                "cover-upload",
                bytes.toRequestBody(mimeType)
            )
            val response = apiService.uploadMedia(part)
            val body = response.body()
            if (response.isSuccessful && body != null) Result.success(body.url)
            else Result.failure(IllegalStateException("Image upload failed (${response.code()})."))
        } catch (error: Exception) {
            Result.failure(error)
        }
    }
}
