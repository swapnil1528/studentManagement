package com.dcc.studentmanagement.ui.chat

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import android.util.Base64
import android.widget.Toast
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dcc.studentmanagement.data.GasApiClient
import com.dcc.studentmanagement.theme.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream

data class ChatConversation(
    val id: String,
    val name: String,
    val subtitle: String,
    val avatar: String,
    val lastMessage: String,
    val lastTime: String,
    val type: String,
    val recipientId: String
)

data class ChatMessage(
    val id: String,
    val senderId: String,
    val senderName: String,
    val senderRole: String,
    val text: String,
    val time: String,
    val mediaUrl: String,
    val mediaType: String,
    val isStarred: Boolean,
    val deletedEveryone: Boolean
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ChatScreen(
    userId: String,
    userRole: String,
    userName: String,
    branch: String,
    onBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var activeConversation by remember { mutableStateOf<ChatConversation?>(null) }
    var conversations by remember { mutableStateOf<List<ChatConversation>>(emptyList()) }
    var messages by remember { mutableStateOf<List<ChatMessage>>(emptyList()) }
    var isLoadingConversations by remember { mutableStateOf(true) }
    var isLoadingMessages by remember { mutableStateOf(false) }

    var inputText by remember { mutableStateOf("") }
    var isSending by remember { mutableStateOf(false) }
    var selectedMessageForAction by remember { mutableStateOf<ChatMessage?>(null) }

    val listState = rememberLazyListState()

    // 1. Fetch Conversations
    fun loadConversations() {
        isLoadingConversations = true
        scope.launch {
            val res = GasApiClient.getChatConversations(userId, userRole, userName, branch)
            res.onSuccess { json ->
                val arr = json.optJSONArray("conversations") ?: JSONArray()
                val list = mutableListOf<ChatConversation>()
                for (i in 0 until arr.length()) {
                    val o = arr.optJSONObject(i)
                    if (o != null) {
                        val lastMsgObj = o.optJSONObject("lastMessage")
                        val lastText = lastMsgObj?.optString("text", "") ?: ""
                        val lastTime = lastMsgObj?.optString("time", "") ?: ""
                        list.add(
                            ChatConversation(
                                id = o.optString("id", ""),
                                name = o.optString("name", "Group Chat"),
                                subtitle = o.optString("subtitle", ""),
                                avatar = o.optString("avatar", "💬"),
                                lastMessage = lastText,
                                lastTime = lastTime,
                                type = o.optString("type", "group"),
                                recipientId = o.optString("recipientId", "")
                            )
                        )
                    }
                }
                conversations = list
            }
            isLoadingConversations = false
        }
    }

    // 2. Fetch Messages for active conversation
    fun loadMessages(convId: String) {
        scope.launch {
            val res = GasApiClient.getChatMessages(convId, userId, 150)
            res.onSuccess { json ->
                val arr = json.optJSONArray("messages") ?: JSONArray()
                val list = mutableListOf<ChatMessage>()
                for (i in 0 until arr.length()) {
                    val m = arr.optJSONObject(i)
                    if (m != null) {
                        list.add(
                            ChatMessage(
                                id = m.optString("id", ""),
                                senderId = m.optString("senderId", ""),
                                senderName = m.optString("senderName", "User"),
                                senderRole = m.optString("senderRole", "student"),
                                text = m.optString("text", ""),
                                time = m.optString("timestamp", ""),
                                mediaUrl = m.optString("mediaUrl", ""),
                                mediaType = m.optString("mediaType", "none"),
                                isStarred = m.optBoolean("isStarred", false),
                                deletedEveryone = m.optBoolean("deletedEveryone", false)
                            )
                        )
                    }
                }
                messages = list
                if (list.isNotEmpty()) {
                    listState.animateScrollToItem(list.size - 1)
                }
            }
        }
    }

    LaunchedEffect(Unit) {
        loadConversations()
    }

    // Live Polling when inside a conversation
    LaunchedEffect(activeConversation?.id) {
        val convId = activeConversation?.id ?: return@LaunchedEffect
        while (isActive) {
            loadMessages(convId)
            delay(5000)
        }
    }

    // Image Picker & Upload
    val imagePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        if (uri != null) {
            scope.launch {
                try {
                    Toast.makeText(context, "Uploading media...", Toast.LENGTH_SHORT).show()
                    val inputStream = context.contentResolver.openInputStream(uri)
                    val bytes = inputStream?.readBytes()
                    if (bytes != null) {
                        val base64 = Base64.encodeToString(bytes, Base64.NO_WRAP)
                        val fileName = "img_" + System.currentTimeMillis() + ".jpg"
                        val uploadRes = GasApiClient.uploadChatMedia(
                            fileData = "data:image/jpeg;base64," + base64,
                            fileName = fileName,
                            mimeType = "image/jpeg",
                            senderId = userId
                        )
                        uploadRes.onSuccess { resp ->
                            val url = resp.optString("url", "")
                            // Send message with image URL
                            val conv = activeConversation
                            if (conv != null) {
                                val msgObj = JSONObject().apply {
                                    put("conversationId", conv.id)
                                    put("type", conv.type)
                                    put("senderId", userId)
                                    put("senderName", userName)
                                    put("senderRole", userRole)
                                    put("recipientId", conv.recipientId)
                                    put("text", "📷 Photo")
                                    put("mediaUrl", url)
                                    put("mediaType", "image")
                                    put("fileName", fileName)
                                    put("fileSize", bytes.size.toString())
                                }
                                GasApiClient.sendChatMessage(msgObj)
                                loadMessages(conv.id)
                            }
                        }.onFailure {
                            Toast.makeText(context, "Upload failed: " + it.message, Toast.LENGTH_SHORT).show()
                        }
                    }
                } catch (e: Exception) {
                    Toast.makeText(context, "Error selecting image", Toast.LENGTH_SHORT).show()
                }
            }
        }
    }

    // Intercept back button when inside chat thread
    BackHandler(enabled = activeConversation != null) {
        activeConversation = null
        loadConversations()
    }

    // Action dialog for selected message
    if (selectedMessageForAction != null) {
        val msg = selectedMessageForAction!!
        val isMine = msg.senderId.equals(userId, ignoreCase = true) || userRole == "admin"
        AlertDialog(
            onDismissRequest = { selectedMessageForAction = null },
            title = { Text("Message Options", fontWeight = FontWeight.Bold, color = TextWhite) },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = if (msg.isStarred) "★ Unstar Note" else "⭐ Star & Save Note",
                        color = AmberGold,
                        fontWeight = FontWeight.Bold,
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable {
                                scope.launch {
                                    GasApiClient.starChatMessage(msg.id, userId, !msg.isStarred)
                                    selectedMessageForAction = null
                                    activeConversation?.id?.let { loadMessages(it) }
                                }
                            }
                            .padding(12.dp)
                    )

                    Text(
                        text = "🗑️ Delete for Me",
                        color = TextWhite,
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable {
                                scope.launch {
                                    GasApiClient.deleteChatMessage(msg.id, userId, false)
                                    selectedMessageForAction = null
                                    activeConversation?.id?.let { loadMessages(it) }
                                }
                            }
                            .padding(12.dp)
                    )

                    if (isMine) {
                        Text(
                            text = "🚫 Delete for Everyone",
                            color = Color(0xFFF43F5E),
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    scope.launch {
                                        GasApiClient.deleteChatMessage(msg.id, userId, true)
                                        selectedMessageForAction = null
                                        activeConversation?.id?.let { loadMessages(it) }
                                    }
                                }
                                .padding(12.dp)
                        )
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { selectedMessageForAction = null }) {
                    Text("Close", color = BrandLight)
                }
            },
            containerColor = DarkCard
        )
    }

    if (activeConversation == null) {
        // VIEW 1: CONVERSATION LIST
        Scaffold(
            topBar = {
                TopAppBar(
                    title = {
                        Column {
                            Text("DCC WhatsApp Chat", fontWeight = FontWeight.Bold, color = TextWhite, fontSize = 18.sp)
                            Text("Groups, 1-on-1 & Faculty Support", fontSize = 11.sp, color = EmeraldLight)
                        }
                    },
                    navigationIcon = {
                        Text(
                            text = "← Back",
                            color = BrandLight,
                            fontWeight = FontWeight.Bold,
                            modifier = Modifier
                                .clickable { onBack() }
                                .padding(16.dp)
                        )
                    },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = DarkCard)
                )
            },
            containerColor = DarkBg,
            modifier = modifier
        ) { padding ->
            if (isLoadingConversations) {
                Box(Modifier.fillMaxSize().padding(padding), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = EmeraldGreen)
                }
            } else {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                ) {
                    item {
                        // WhatsApp style banner
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .background(Color(0xFF0F2E23))
                                .padding(16.dp)
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text("🔒", fontSize = 16.sp)
                                Spacer(Modifier.width(10.dp))
                                Text(
                                    text = "All chat sessions are synchronized directly with your DCC Institute Google Cloud portal.",
                                    fontSize = 12.sp,
                                    color = EmeraldLight
                                )
                            }
                        }
                    }

                    if (conversations.isEmpty()) {
                        item {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(40.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text("No chat conversations found.", color = TextMuted)
                            }
                        }
                    } else {
                        items(conversations) { conv ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clickable {
                                        activeConversation = conv
                                        loadMessages(conv.id)
                                    }
                                    .padding(horizontal = 16.dp, vertical = 14.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(52.dp)
                                        .clip(CircleShape)
                                        .background(DarkCardElevated)
                                        .border(1.5.dp, if (conv.type == "direct") CyanNeon else EmeraldGreen, CircleShape),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(conv.avatar, fontSize = 24.sp)
                                }

                                Spacer(Modifier.width(14.dp))

                                Column(modifier = Modifier.weight(1f)) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(
                                            text = conv.name,
                                            fontWeight = FontWeight.Bold,
                                            fontSize = 15.sp,
                                            color = TextWhite,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis,
                                            modifier = Modifier.weight(1f)
                                        )
                                        if (conv.lastTime.isNotBlank()) {
                                            Text(
                                                text = conv.lastTime.take(16),
                                                fontSize = 11.sp,
                                                color = TextSubtle
                                            )
                                        }
                                    }

                                    Spacer(Modifier.height(4.dp))
                                    Text(
                                        text = conv.lastMessage.ifBlank { conv.subtitle },
                                        fontSize = 13.sp,
                                        color = if (conv.lastMessage.isNotBlank()) TextMuted else TextSubtle,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                }
                            }
                            HorizontalDivider(color = DarkBorderSubtle, thickness = 0.5.dp)
                        }
                    }
                }
            }
        }
    } else {
        // VIEW 2: ACTIVE CHAT THREAD
        val conv = activeConversation!!
        Scaffold(
            topBar = {
                TopAppBar(
                    title = {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(38.dp)
                                    .clip(CircleShape)
                                    .background(DarkBorder),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(conv.avatar, fontSize = 20.sp)
                            }
                            Spacer(Modifier.width(10.dp))
                            Column {
                                Text(
                                    text = conv.name,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 15.sp,
                                    color = TextWhite,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                                Text(
                                    text = if (conv.type == "direct") "Online • Helpdesk" else "Group Conversation",
                                    fontSize = 11.sp,
                                    color = EmeraldLight
                                )
                            }
                        }
                    },
                    navigationIcon = {
                        Text(
                            text = "←",
                            fontSize = 24.sp,
                            color = TextWhite,
                            modifier = Modifier
                                .clickable {
                                    activeConversation = null
                                    loadConversations()
                                }
                                .padding(horizontal = 16.dp)
                        )
                    },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = Color(0xFF13221E))
                )
            },
            bottomBar = {
                // Bottom Input Bar
                Surface(
                    color = Color(0xFF1A2724),
                    modifier = Modifier.fillMaxWidth().navigationBarsPadding()
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 12.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        IconButton(
                            onClick = { imagePickerLauncher.launch("image/*") }
                        ) {
                            Text("📎", fontSize = 22.sp)
                        }

                        OutlinedTextField(
                            value = inputText,
                            onValueChange = { inputText = it },
                            placeholder = { Text("Message...", color = TextMuted) },
                            modifier = Modifier
                                .weight(1f)
                                .heightIn(min = 44.dp, max = 120.dp),
                            shape = RoundedCornerShape(22.dp),
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedContainerColor = Color(0xFF243430),
                                unfocusedContainerColor = Color(0xFF243430),
                                focusedTextColor = TextWhite,
                                unfocusedTextColor = TextWhite,
                                focusedBorderColor = Color.Transparent,
                                unfocusedBorderColor = Color.Transparent
                            )
                        )

                        Spacer(Modifier.width(8.dp))

                        FloatingActionButton(
                            onClick = {
                                if (inputText.isNotBlank() && !isSending) {
                                    val textToSend = inputText.trim()
                                    inputText = ""
                                    isSending = true
                                    scope.launch {
                                        val msgObj = JSONObject().apply {
                                            put("conversationId", conv.id)
                                            put("type", conv.type)
                                            put("senderId", userId)
                                            put("senderName", userName)
                                            put("senderRole", userRole)
                                            put("recipientId", conv.recipientId)
                                            put("text", textToSend)
                                            put("mediaUrl", "")
                                            put("mediaType", "none")
                                            put("fileName", "")
                                            put("fileSize", "")
                                        }
                                        GasApiClient.sendChatMessage(msgObj)
                                        isSending = false
                                        loadMessages(conv.id)
                                    }
                                }
                            },
                            modifier = Modifier.size(46.dp),
                            shape = CircleShape,
                            containerColor = EmeraldGreen,
                            contentColor = Color.White
                        ) {
                            Text("➤", fontSize = 18.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            },
            containerColor = DarkBg,
            modifier = modifier
        ) { padding ->
            LazyColumn(
                state = listState,
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(horizontal = 12.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                item { Spacer(Modifier.height(8.dp)) }

                items(messages) { msg ->
                    val isMine = msg.senderId.equals(userId, ignoreCase = true)
                    Box(
                        modifier = Modifier.fillMaxWidth(),
                        contentAlignment = if (isMine) Alignment.CenterEnd else Alignment.CenterStart
                    ) {
                        Card(
                            modifier = Modifier
                                .widthIn(max = 280.dp)
                                .combinedClickable(
                                    onClick = {},
                                    onLongClick = { selectedMessageForAction = msg }
                                ),
                            shape = RoundedCornerShape(
                                topStart = 16.dp,
                                topEnd = 16.dp,
                                bottomStart = if (isMine) 16.dp else 4.dp,
                                bottomEnd = if (isMine) 4.dp else 16.dp
                            ),
                            colors = CardDefaults.cardColors(
                                containerColor = if (isMine) Color(0xFF005C4B) else Color(0xFF202C33)
                            )
                        ) {
                            Column(Modifier.padding(10.dp)) {
                                if (!isMine) {
                                    Text(
                                        text = msg.senderName,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 12.sp,
                                        color = CyanNeon
                                    )
                                    Spacer(Modifier.height(2.dp))
                                }

                                if (msg.deletedEveryone) {
                                    Text(
                                        text = "🚫 This message was deleted",
                                        fontStyle = androidx.compose.ui.text.font.FontStyle.Italic,
                                        color = TextMuted,
                                        fontSize = 13.sp
                                    )
                                } else {
                                    if (msg.mediaUrl.isNotBlank()) {
                                        Box(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .height(140.dp)
                                                .clip(RoundedCornerShape(8.dp))
                                                .background(Color.Black.copy(alpha = 0.3f)),
                                            contentAlignment = Alignment.Center
                                        ) {
                                            Text("🖼️ [Photo Attached]", color = TextWhite, fontSize = 12.sp)
                                        }
                                        Spacer(Modifier.height(6.dp))
                                    }

                                    Text(
                                        text = msg.text,
                                        color = TextWhite,
                                        fontSize = 14.sp
                                    )
                                }

                                Spacer(Modifier.height(4.dp))
                                Row(
                                    modifier = Modifier.align(Alignment.End),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    if (msg.isStarred) {
                                        Text("⭐ ", fontSize = 10.sp)
                                    }
                                    Text(
                                        text = msg.time.takeLast(8),
                                        fontSize = 10.sp,
                                        color = TextWhite.copy(alpha = 0.6f)
                                    )
                                }
                            }
                        }
                    }
                }

                item { Spacer(Modifier.height(8.dp)) }
            }
        }
    }
}
