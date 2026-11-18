package com.dcc.studentmanagement.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.InputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.ConcurrentHashMap

object GasApiClient {
    private const val API_URL = "https://script.google.com/macros/s/AKfycbzhSkApquHe8n5Z5FQzvkMrxdZxR6HURPFwE2geZQ0mWMHfhYhsd-_PtzfSe-1nfRGp9A/exec"

    // High-speed In-Memory Cache (RAM)
    private val memoryCache = ConcurrentHashMap<String, Pair<Long, JSONObject>>()
    private const val CACHE_EXPIRY_MS = 3 * 60 * 1000L // 3 minutes cache validity

    fun invalidateCache(prefix: String? = null) {
        if (prefix == null) {
            memoryCache.clear()
        } else {
            val keysToRemove = memoryCache.keys.filter { it.startsWith(prefix) }
            keysToRemove.forEach { memoryCache.remove(it) }
        }
    }

    private fun getFromCache(key: String): JSONObject? {
        val entry = memoryCache[key] ?: return null
        val (timestamp, json) = entry
        if (System.currentTimeMillis() - timestamp < CACHE_EXPIRY_MS) {
            return json
        }
        memoryCache.remove(key)
        return null
    }

    private fun putInCache(key: String, json: JSONObject) {
        memoryCache[key] = Pair(System.currentTimeMillis(), json)
    }

    suspend fun executePost(body: JSONObject): Result<JSONObject> = withContext(Dispatchers.IO) {
        try {
            var currentUrl = API_URL
            var isPost = true
            var responseText = ""
            var redirectCount = 0
            val maxRedirects = 6

            while (redirectCount < maxRedirects) {
                val url = URL(currentUrl)
                val conn = url.openConnection() as HttpURLConnection
                conn.instanceFollowRedirects = false
                conn.connectTimeout = 20000
                conn.readTimeout = 20000
                conn.setRequestProperty("User-Agent", "Mozilla/5.0 (Linux; Android 13; Mobile) DCC-Portal/2.0")
                conn.setRequestProperty("Accept", "application/json, text/plain, */*")
                conn.setRequestProperty("Connection", "Keep-Alive")

                if (isPost) {
                    conn.requestMethod = "POST"
                    conn.setRequestProperty("Content-Type", "text/plain; charset=UTF-8")
                    conn.doOutput = true
                    conn.outputStream.use { os ->
                        os.write(body.toString().toByteArray(Charsets.UTF_8))
                    }
                } else {
                    conn.requestMethod = "GET"
                }

                val responseCode = conn.responseCode

                if (responseCode in listOf(301, 302, 303, 307, 308)) {
                    val location = conn.getHeaderField("Location")
                    conn.disconnect()
                    if (!location.isNullOrBlank()) {
                        currentUrl = location
                        isPost = false
                        redirectCount++
                        continue
                    }
                }

                val stream: InputStream? = if (responseCode in 200..299) {
                    conn.inputStream
                } else {
                    conn.errorStream ?: conn.inputStream
                }

                responseText = stream?.bufferedReader()?.use { it.readText() } ?: ""
                conn.disconnect()
                break
            }

            val trimmed = responseText.trim()
            if (trimmed.startsWith("<")) {
                val match = Regex("(?i)<div[^>]*>([^<]*(?:ReferenceError|SyntaxError|Error|Exception)[^<]*)</div>").find(trimmed)
                    ?: Regex("(?i)<title>([^<]+)</title>").find(trimmed)
                val errorMsg = match?.groupValues?.getOrNull(1)?.trim() ?: "Server returned an HTML response instead of JSON data"
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
        val result = executePost(payload)
        result.onSuccess {
            // Clear any stale cached data upon fresh login
            invalidateCache()
        }
        return result
    }

    suspend fun getStudentData(id: String, forceRefresh: Boolean = false): Result<JSONObject> {
        val cacheKey = "student_data_${id.trim().lowercase()}"
        if (!forceRefresh) {
            val cached = getFromCache(cacheKey)
            if (cached != null) {
                return Result.success(cached)
            }
        }

        val payload = JSONObject().apply {
            put("action", "getStudent")
            put("id", id.trim())
        }
        val res = executePost(payload)
        res.onSuccess { json ->
            if (json.optBoolean("success", true)) {
                putInCache(cacheKey, json)
            }
        }
        return res
    }

    suspend fun getStudentFees(id: String, forceRefresh: Boolean = false): Result<JSONObject> {
        val cacheKey = "student_fees_${id.trim().lowercase()}"
        if (!forceRefresh) {
            val cached = getFromCache(cacheKey)
            if (cached != null) {
                return Result.success(cached)
            }
        }

        val payload = JSONObject().apply {
            put("action", "getStudentFees")
            put("id", id.trim())
        }
        val res = executePost(payload)
        res.onSuccess { json ->
            if (json.optBoolean("success", true)) {
                putInCache(cacheKey, json)
            }
        }
        return res
    }

    suspend fun getNotices(role: String, branch: String, forceRefresh: Boolean = false): Result<JSONObject> {
        val cacheKey = "notices_${role.trim().lowercase()}_${branch.trim().lowercase()}"
        if (!forceRefresh) {
            val cached = getFromCache(cacheKey)
            if (cached != null) {
                return Result.success(cached)
            }
        }

        val payload = JSONObject().apply {
            put("action", "getNotices")
            put("role", role)
            put("branch", branch)
        }
        val res = executePost(payload)
        res.onSuccess { json ->
            if (json.optBoolean("success", true)) {
                putInCache(cacheKey, json)
            }
        }
        return res
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
        val res = executePost(payload)
        res.onSuccess {
            invalidateCache("student_data_")
            invalidateCache("admin_data_")
        }
        return res
    }

    suspend fun getChatConversations(
        userId: String,
        userRole: String,
        userName: String,
        branch: String,
        forceRefresh: Boolean = false
    ): Result<JSONObject> {
        val cacheKey = "chat_conv_${userId.trim().lowercase()}_${branch.trim().lowercase()}"
        if (!forceRefresh) {
            val cached = getFromCache(cacheKey)
            if (cached != null) {
                return Result.success(cached)
            }
        }

        val payload = JSONObject().apply {
            put("action", "getChatConversations")
            put("userId", userId)
            put("userRole", userRole)
            put("userName", userName)
            put("branch", branch)
        }
        val res = executePost(payload)
        res.onSuccess { json ->
            if (json.optBoolean("success", true)) {
                putInCache(cacheKey, json)
            }
        }
        return res
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
        val res = executePost(payload)
        res.onSuccess {
            invalidateCache("chat_conv_")
        }
        return res
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

    suspend fun loadAdminData(branch: String, forceRefresh: Boolean = false): Result<JSONObject> {
        val cacheKey = "admin_data_${branch.trim().lowercase()}"
        if (!forceRefresh) {
            val cached = getFromCache(cacheKey)
            if (cached != null) {
                return Result.success(cached)
            }
        }

        val payload = JSONObject().apply {
            put("action", "loadAdminData")
            put("branch", branch)
        }
        val res = executePost(payload)
        res.onSuccess { json ->
            if (json.has("admissions") || json.has("stats") || json.optBoolean("success", true)) {
                putInCache(cacheKey, json)
            }
        }
        return res
    }

    suspend fun saveNotice(title: String, message: String, branch: String): Result<JSONObject> {
        val form = JSONObject().apply {
            put("title", title)
            put("message", message)
            put("branch", branch)
            put("audience", "All")
            put("date", java.text.SimpleDateFormat("dd-MMM", java.util.Locale.ENGLISH).format(java.util.Date()))
        }
        val payload = JSONObject().apply {
            put("action", "saveNotice")
            put("form", form)
        }
        val res = executePost(payload)
        res.onSuccess {
            invalidateCache("admin_data_")
            invalidateCache("notices_")
            invalidateCache("student_data_")
        }
        return res
    }

    suspend fun saveFee(form: JSONObject): Result<JSONObject> {
        val payload = JSONObject().apply {
            put("action", "saveFee")
            put("form", form)
        }
        val res = executePost(payload)
        res.onSuccess {
            invalidateCache("admin_data_")
            invalidateCache("student_fees_")
            invalidateCache("student_data_")
        }
        return res
    }

    suspend fun actionLeave(id: String, status: String): Result<JSONObject> {
        val payload = JSONObject().apply {
            put("action", "actionLeave")
            put("id", id)
            put("status", status)
        }
        val res = executePost(payload)
        res.onSuccess {
            invalidateCache("admin_data_")
        }
        return res
    }
}
