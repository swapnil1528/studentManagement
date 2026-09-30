package com.dcc.studentmanagement.ui.webview

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.app.DownloadManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.net.Uri
import android.net.http.SslError
import android.os.Build
import android.os.Environment
import android.view.ViewGroup
import android.webkit.*
import android.widget.Toast
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import com.dcc.studentmanagement.theme.*

private const val WEB_ROOT = "https://student-management-one-wine.vercel.app"

@Composable
fun WebViewScreen(
    url: String,
    title: String,
    onBack: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val prefs = remember { context.getSharedPreferences("dcc_credentials", Context.MODE_PRIVATE) }
    val savedSession = remember { prefs.getString("saved_session", "") ?: "" }

    var isLoading by remember { mutableStateOf(true) }
    var progress by remember { mutableIntStateOf(0) }
    var webViewInstance by remember { mutableStateOf<WebView?>(null) }
    var canGoBack by remember { mutableStateOf(false) }
    var isOffline by remember { mutableStateOf(false) }

    val resolvedUrl = remember(url) {
        if (url.startsWith("http://") || url.startsWith("https://")) {
            url
        } else {
            WEB_ROOT + (if (url.startsWith("/")) url else "/" + url)
        }
    }

    var filePathCallback by remember { mutableStateOf<ValueCallback<Array<Uri>>?>(null) }

    val fileChooserLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (filePathCallback != null) {
            val results: Array<Uri>? = when {
                result.resultCode == Activity.RESULT_OK && result.data?.data != null -> {
                    arrayOf(result.data!!.data!!)
                }
                result.resultCode == Activity.RESULT_OK && result.data?.clipData != null -> {
                    val clipData = result.data!!.clipData!!
                    Array(clipData.itemCount) { i -> clipData.getItemAt(i).uri }
                }
                else -> null
            }
            filePathCallback?.onReceiveValue(results)
            filePathCallback = null
        }
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions()
    ) {}

    LaunchedEffect(Unit) {
        val permissionsToRequest = mutableListOf(
            Manifest.permission.CAMERA,
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissionsToRequest.add(Manifest.permission.POST_NOTIFICATIONS)
        }
        val needed = permissionsToRequest.filter {
            ContextCompat.checkSelfPermission(context, it) != PackageManager.PERMISSION_GRANTED
        }
        if (needed.isNotEmpty()) {
            permissionLauncher.launch(needed.toTypedArray())
        }
    }

    BackHandler(enabled = true) {
        if (webViewInstance?.canGoBack() == true) {
            webViewInstance?.goBack()
        } else {
            onBack()
        }
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .background(DarkBg)
    ) {
        // Navigation Top Bar
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .statusBarsPadding()
                .padding(horizontal = 12.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            FilledTonalButton(
                onClick = onBack,
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.filledTonalButtonColors(
                    containerColor = DarkCardElevated,
                    contentColor = TextWhite
                ),
                contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp),
                modifier = Modifier.height(34.dp)
            ) {
                Text("< Dashboard", fontSize = 12.sp, fontWeight = FontWeight.Bold)
            }

            Spacer(Modifier.width(10.dp))

            Text(
                text = title,
                fontSize = 14.sp,
                fontWeight = FontWeight.Bold,
                color = TextWhite,
                modifier = Modifier.weight(1f),
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )

            FilledTonalButton(
                onClick = {
                    isOffline = false
                    webViewInstance?.reload()
                },
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.filledTonalButtonColors(
                    containerColor = DarkCardElevated,
                    contentColor = CyanNeon
                ),
                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp),
                modifier = Modifier.height(34.dp)
            ) {
                Text("Refresh", fontSize = 11.sp, fontWeight = FontWeight.Bold)
            }
        }

        // Progress Indicator
        AnimatedVisibility(
            visible = isLoading,
            enter = fadeIn(),
            exit = fadeOut()
        ) {
            LinearProgressIndicator(
                progress = { progress / 100f },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(2.5.dp),
                color = BrandPrimary,
                trackColor = DarkCard
            )
        }

        // Content Area
        Box(modifier = Modifier.fillMaxSize()) {
            if (isOffline) {
                Column(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(32.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Text("📡", fontSize = 48.sp)
                    Spacer(Modifier.height(16.dp))
                    Text(
                        text = "Connection Notice",
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextWhite
                    )
                    Spacer(Modifier.height(8.dp))
                    Text(
                        text = "Unable to connect to the portal. Please verify your internet connection.",
                        fontSize = 13.sp,
                        color = TextMuted,
                        textAlign = TextAlign.Center
                    )
                    Spacer(Modifier.height(20.dp))
                    Button(
                        onClick = {
                            isOffline = false
                            webViewInstance?.loadUrl(resolvedUrl)
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = BrandPrimary),
                        shape = RoundedCornerShape(14.dp)
                    ) {
                        Text("Retry", fontWeight = FontWeight.Bold)
                    }
                }
            } else {
                AndroidView(
                    factory = { ctx ->
                        WebView(ctx).apply {
                            layoutParams = ViewGroup.LayoutParams(
                                ViewGroup.LayoutParams.MATCH_PARENT,
                                ViewGroup.LayoutParams.MATCH_PARENT
                            )

                            CookieManager.getInstance().setAcceptCookie(true)
                            CookieManager.getInstance().setAcceptThirdPartyCookies(this, true)

                            settings.apply {
                                @SuppressLint("SetJavaScriptEnabled")
                                javaScriptEnabled = true
                                domStorageEnabled = true
                                databaseEnabled = true
                                allowFileAccess = true
                                allowContentAccess = true
                                loadWithOverviewMode = true
                                useWideViewPort = true
                                setSupportZoom(true)
                                builtInZoomControls = true
                                displayZoomControls = false
                                javaScriptCanOpenWindowsAutomatically = true
                                mediaPlaybackRequiresUserGesture = false
                                mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                                cacheMode = WebSettings.LOAD_DEFAULT
                                userAgentString = (userAgentString ?: "") + " DCC_Native_Android/1.0"
                            }

                            setDownloadListener { downloadUrl, userAgent, contentDisposition, mimetype, _ ->
                                try {
                                    val request = DownloadManager.Request(Uri.parse(downloadUrl)).apply {
                                        setMimeType(mimetype)
                                        addRequestHeader("User-Agent", userAgent)
                                        setDescription("Downloading student document...")
                                        setTitle(URLUtil.guessFileName(downloadUrl, contentDisposition, mimetype))
                                        setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                                        setDestinationInExternalPublicDir(
                                            Environment.DIRECTORY_DOWNLOADS,
                                            URLUtil.guessFileName(downloadUrl, contentDisposition, mimetype)
                                        )
                                    }
                                    val dm = ctx.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
                                    dm.enqueue(request)
                                    Toast.makeText(ctx, "Download started...", Toast.LENGTH_SHORT).show()
                                } catch (e: Exception) {
                                    try {
                                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(downloadUrl))
                                        ctx.startActivity(intent)
                                    } catch (_: Exception) {}
                                }
                            }

                            webViewClient = object : WebViewClient() {
                                override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                                    isLoading = true
                                    // Inject saved authentication session early
                                    if (savedSession.isNotBlank()) {
                                        val escaped = savedSession.replace("\\", "\\\\").replace("'", "\\'")
                                        view?.evaluateJavascript("try { localStorage.setItem('erp_session', '$escaped'); } catch(e) {}", null)
                                    }
                                }

                                override fun onPageFinished(view: WebView?, url: String?) {
                                    isLoading = false
                                    canGoBack = view?.canGoBack() ?: false
                                    // Reinforce authentication session injection
                                    if (savedSession.isNotBlank()) {
                                        val escaped = savedSession.replace("\\", "\\\\").replace("'", "\\'")
                                        view?.evaluateJavascript("try { localStorage.setItem('erp_session', '$escaped'); } catch(e) {}", null)
                                    }
                                    CookieManager.getInstance().flush()
                                }

                                // Prevent white/blank screens on SSL cert discrepancies
                                override fun onReceivedSslError(view: WebView?, handler: SslErrorHandler?, error: SslError?) {
                                    handler?.proceed()
                                }

                                override fun onReceivedError(view: WebView?, request: WebResourceRequest?, error: WebResourceError?) {
                                    if (request?.isForMainFrame == true && (error?.errorCode == ERROR_HOST_LOOKUP || error?.errorCode == ERROR_CONNECT)) {
                                        isOffline = true
                                    }
                                }

                                override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                                    val reqUrl = request?.url?.toString() ?: return false
                                    if (reqUrl.startsWith("tel:") || reqUrl.startsWith("mailto:") || reqUrl.startsWith("whatsapp:")) {
                                        try {
                                            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(reqUrl))
                                            ctx.startActivity(intent)
                                            return true
                                        } catch (_: Exception) {
                                            return true
                                        }
                                    }
                                    return false
                                }
                            }

                            webChromeClient = object : WebChromeClient() {
                                override fun onProgressChanged(view: WebView?, newProgress: Int) {
                                    progress = newProgress
                                    if (newProgress >= 100) isLoading = false
                                }

                                override fun onShowFileChooser(
                                    webView: WebView?,
                                    filePathCallbackParam: ValueCallback<Array<Uri>>?,
                                    fileChooserParams: FileChooserParams?
                                ): Boolean {
                                    filePathCallback?.onReceiveValue(null)
                                    filePathCallback = filePathCallbackParam

                                    val intent = fileChooserParams?.createIntent() ?: Intent(Intent.ACTION_GET_CONTENT).apply {
                                        type = "*/*"
                                        addCategory(Intent.CATEGORY_OPENABLE)
                                    }

                                    try {
                                        fileChooserLauncher.launch(intent)
                                    } catch (e: Exception) {
                                        filePathCallback = null
                                        return false
                                    }
                                    return true
                                }

                                override fun onPermissionRequest(request: PermissionRequest?) {
                                    request?.grant(request.resources)
                                }

                                override fun onGeolocationPermissionsShowPrompt(
                                    origin: String?,
                                    callback: GeolocationPermissions.Callback?
                                ) {
                                    callback?.invoke(origin, true, false)
                                }
                            }

                            loadUrl(resolvedUrl)
                            webViewInstance = this
                        }
                    },
                    modifier = Modifier.fillMaxSize()
                )
            }
        }
    }
}
