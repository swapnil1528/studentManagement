package com.dcc.studentmanagement.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

object GasApiClient {
    private const val API_URL = "https://script.google.com/macros/s/AKfycbzhSkApquHe8n5Z5FQzvkMrxdZxR6HURPFwE2geZQ0mWMHfhYhsd-_PtzfSe-1nfRGp9A/exec"

    suspend fun executePost(body: JSONObject): Result<JSONObject> = withContext(Dispatchers.IO) {
        try {
            val url = URL(API_URL)
            val conn = url.openConnection() as HttpURLConnection
            conn.requestMethod = "POST"
            conn.setRequestProperty("Content-Type", "text/plain")
            conn.doOutput = true
            conn.instanceFollowRedirects = false
            conn.connectTimeout = 20000
            conn.readTimeout = 20000

            conn.outputStream.use { os ->
                os.write(body.toString().toByteArray(Charsets.UTF_8))
            }

            val responseCode = conn.responseCode
            var responseText = ""

            if (responseCode == 302 || responseCode == 301) {
                val redirectUrl = conn.getHeaderField("Location")
                if (redirectUrl != null) {
                    val getConn = URL(redirectUrl).openConnection() as HttpURLConnection
                    getConn.requestMethod = "GET"
                    getConn.instanceFollowRedirects = true
                    getConn.connectTimeout = 20000
                    getConn.readTimeout = 20000
                    responseText = getConn.inputStream.bufferedReader().readText()
                }
            } else {
                val inputStream = if (responseCode in 200..299) conn.inputStream else conn.errorStream
                responseText = inputStream?.bufferedReader()?.readText() ?: ""
            }

            val trimmed = responseText.trim()
            if (trimmed.startsWith("<")) {
                val match = Regex("(?i)<div[^>]*>([^<]*(?:ReferenceError|SyntaxError|Error|Exception)[^<]*)</div>").find(trimmed)
                val errorMsg = match?.groupValues?.getOrNull(1)?.trim() ?: "Server returned an HTML error page"
                return@withContext Result.failure(Exception(errorMsg))
            }

            val json = JSONObject(trimmed)
            Result.success(json)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun login(u: String, p: String): Result<JSONObject> {
        val payload = JSONObject().apply {
            put("action", "login")
            put("u", u.trim())
            put("p", p.trim())
            put("username", u.trim())
            put("password", p.trim())
        }
        return executePost(payload)
    }

    suspend fun getStudentData(id: String): Result<JSONObject> {
        val payload = JSONObject().apply {
            put("action", "getStudent")
            put("id", id.trim())
        }
        return executePost(payload)
    }

    suspend fun getStudentFees(id: String): Result<JSONObject> {
        val payload = JSONObject().apply {
            put("action", "getStudentFees")
            put("id", id.trim())
        }
        return executePost(payload)
    }

    suspend fun markStudentAttendance(
        id: String,
        type: String,
        lat: Double,
        lng: Double,
        photoBase64: String? = null
    ): Result<JSONObject> {
        val payload = JSONObject().apply {
            put("action", "markStudentAtt")
            put("id", id.trim())
            put("type", type.trim())
            put("lat", lat)
            put("lng", lng)
            put("device", "native-android")
            if (!photoBase64.isNullOrBlank()) {
                put("photo", photoBase64)
            }
        }
        return executePost(payload)
    }

    suspend fun getChatConversations(
        userId: String,
        userRole: String,
        userName: String,
        branch: String
    ): Result<JSONObject> {
        val payload = JSONObject().apply {
            put("action", "getChatConversations")
            put("userId", userId)
            put("userRole", userRole)
            put("userName", userName)
            put("branch", branch)
        }
        return executePost(payload)
    }

    suspend fun getChatMessages(
        conversationId: String,
        userId: String,
        limit: Int = 100
    ): Result<JSONObject> {
        val payload = JSONObject().apply {
            put("action", "getChatMessages")
            put("conversationId", conversationId)
            put("userId", userId)
            put("limit", limit)
        }
        return executePost(payload)
    }

    suspend fun sendChatMessage(messageObj: JSONObject): Result<JSONObject> {
        val payload = JSONObject().apply {
            put("action", "sendChatMessage")
            put("message", messageObj)
        }
        return executePost(payload)
    }

    suspend fun uploadChatMedia(
        fileData: String,
        fileName: String,
        mimeType: String,
        senderId: String
    ): Result<JSONObject> {
        val payload = JSONObject().apply {
            put("action", "uploadChatMedia")
            put("fileData", fileData)
            put("fileName", fileName)
            put("mimeType", mimeType)
            put("senderId", senderId)
        }
        return executePost(payload)
    }

    suspend fun deleteChatMessage(
        messageId: String,
        userId: String,
        deleteForEveryone: Boolean
    ): Result<JSONObject> {
        val payload = JSONObject().apply {
            put("action", "deleteChatMessage")
            put("messageId", messageId)
            put("userId", userId)
            put("deleteForEveryone", deleteForEveryone)
        }
        return executePost(payload)
    }

    suspend fun starChatMessage(
        messageId: String,
        userId: String,
        isStarred: Boolean
    ): Result<JSONObject> {
        val payload = JSONObject().apply {
            put("action", "starChatMessage")
            put("messageId", messageId)
            put("userId", userId)
            put("isStarred", isStarred)
        }
        return executePost(payload)
    }

    suspend fun loadAdminData(branch: String): Result<JSONObject> {
        val payload = JSONObject().apply {
            put("action", "loadAdminData")
            put("branch", branch)
        }
        return executePost(payload)
    }

    suspend fun saveNotice(title: String, message: String, branch: String): Result<JSONObject> {
        val form = JSONObject().apply {
            put("title", title)
            put("message", message)
            put("branch", branch)
            put("date", java.text.SimpleDateFormat("dd-MMM", java.util.Locale.ENGLISH).format(java.util.Date()))
        }
        val payload = JSONObject().apply {
            put("action", "saveNotice")
            put("form", form)
        }
        return executePost(payload)
    }
}
