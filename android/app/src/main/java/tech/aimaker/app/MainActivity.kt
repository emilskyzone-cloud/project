package tech.aimaker.app

import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.webkit.ValueCallback
import android.webkit.WebChromeClient.FileChooserParams
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.WebResourceRequest
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView

private val Night = Color(0xFF090B12)
private val Panel = Color(0xFF151925)
private val Violet = Color(0xFF7C5CFC)
private val Cyan = Color(0xFF35D8FF)
private const val AIMAKER_HOST = "aimaker.tech"

data class GeneratorMode(val title: String, val subtitle: String, val icon: ImageVector, val path: String?, val badge: String)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent { AimakerApp() }
    }
}

@Composable
fun AimakerApp() {
    var route by remember { mutableStateOf("home") }
    MaterialTheme(colorScheme = darkColorScheme(primary = Violet, secondary = Cyan, background = Night, surface = Panel)) {
        Scaffold(
            containerColor = Night,
            bottomBar = {
                NavigationBar(containerColor = Color(0xFF10131C)) {
                    NavigationBarItem(route == "home", { route = "home" }, { Icon(Icons.Default.Home, null) }, label={Text("Create")})
                    NavigationBarItem(route == "community", { route = "community" }, { Icon(Icons.Default.Explore, null) }, label={Text("Community")})
                    NavigationBarItem(route == "library", { route = "library" }, { Icon(Icons.Default.VideoLibrary, null) }, label={Text("My work")})
                    NavigationBarItem(route == "plans", { route = "plans" }, { Icon(Icons.Default.Diamond, null) }, label={Text("Plans")})
                }
            }
        ) { padding ->
            when (route) {
                "home" -> HomeScreen(padding) { route = it }
                "generator" -> AimakerWebScreen("https://aimaker.tech/generate", padding)
                "community" -> AimakerWebScreen("https://aimaker.tech/community", padding)
                "library" -> AimakerWebScreen("https://aimaker.tech/my-generations", padding)
                "plans" -> AimakerWebScreen("https://aimaker.tech/plans", padding)
            }
        }
    }
}

@Composable
private fun HomeScreen(padding: PaddingValues, open: (String) -> Unit) {
    val modes = listOf(
        GeneratorMode("Product Ads", "Combine a product and model into campaign-ready images", Icons.Default.ShoppingBag, "generator", "LIVE"),
        GeneratorMode("Image to Video", "Animate your generated product creative", Icons.Default.MovieCreation, "generator", "LIVE"),
        GeneratorMode("Text to Image", "Create original visuals from a prompt", Icons.Default.AutoAwesome, null, "NEXT"),
        GeneratorMode("Text to Video", "Turn a written concept into a short video", Icons.Default.SmartDisplay, null, "NEXT"),
        GeneratorMode("Social Trends", "Adapt creative concepts to current formats", Icons.Default.TrendingUp, null, "PLANNED"),
        GeneratorMode("AI Camera", "Direct angles, motion, framing, and product focus", Icons.Default.Videocam, null, "PLANNED")
    )
    LazyColumn(modifier=Modifier.fillMaxSize().padding(padding), contentPadding=PaddingValues(20.dp), verticalArrangement=Arrangement.spacedBy(14.dp)) {
        item {
            Text("AIMAKER", color=Cyan, fontSize=13.sp)
            Spacer(Modifier.height(8.dp))
            Text("Create product content\nwithout the production delay", fontSize=31.sp, lineHeight=36.sp)
            Spacer(Modifier.height(10.dp))
            Text("Start with the working product-ad and image-to-video tools. New generation modes plug into the same account and credit system.", color=Color(0xFFAAB1C3))
            Spacer(Modifier.height(18.dp))
            Button(onClick={ open("generator") }, colors=ButtonDefaults.buttonColors(containerColor=Violet), modifier=Modifier.fillMaxWidth().height(54.dp)) { Text("Create now") }
            Spacer(Modifier.height(12.dp))
            Text("Generation studio", fontSize=20.sp)
        }
        items(modes) { mode -> ModeCard(mode) { mode.path?.let(open) } }
        item { Spacer(Modifier.height(16.dp)) }
    }
}

@Composable
private fun ModeCard(mode: GeneratorMode, onClick: () -> Unit) {
    Card(modifier=Modifier.fillMaxWidth().clickable(enabled=mode.path != null, onClick=onClick), shape=RoundedCornerShape(22.dp), colors=CardDefaults.cardColors(containerColor=Panel)) {
        Row(Modifier.padding(18.dp), verticalAlignment=Alignment.CenterVertically) {
            Box(Modifier.size(52.dp).background(Brush.linearGradient(listOf(Violet,Cyan)),RoundedCornerShape(16.dp)), contentAlignment=Alignment.Center) { Icon(mode.icon,null,tint=Color.White) }
            Spacer(Modifier.width(15.dp))
            Column(Modifier.weight(1f)) { Text(mode.title,fontSize=18.sp); Text(mode.subtitle,color=Color(0xFFAAB1C3),fontSize=13.sp) }
            AssistChip(onClick={},label={Text(mode.badge,fontSize=10.sp)},enabled=false)
        }
    }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
private fun AimakerWebScreen(url: String, padding: PaddingValues) {
    var webView by remember { mutableStateOf<WebView?>(null) }
    var pendingFiles by remember { mutableStateOf<ValueCallback<Array<Uri>>?>(null) }
    val picker = rememberLauncherForActivityResult(ActivityResultContracts.OpenMultipleDocuments()) { uris ->
        pendingFiles?.onReceiveValue(uris.toTypedArray())
        pendingFiles = null
    }

    BackHandler(enabled = webView?.canGoBack() == true) { webView?.goBack() }

    AndroidView(
        modifier=Modifier.fillMaxSize().padding(padding),
        factory={ context -> WebView(context).apply {
            settings.javaScriptEnabled=true
            settings.domStorageEnabled=true
            settings.allowFileAccess=true
            settings.mediaPlaybackRequiresUserGesture=false
            webViewClient=object : WebViewClient() {
                override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                    val target = request?.url ?: return false
                    val trusted = target.scheme == "https" &&
                        (target.host == AIMAKER_HOST || target.host?.endsWith(".$AIMAKER_HOST") == true)
                    if (!trusted) context.startActivity(Intent(Intent.ACTION_VIEW, target))
                    return !trusted
                }
            }
            webChromeClient=object : WebChromeClient() {
                override fun onShowFileChooser(
                    view: WebView?,
                    filePathCallback: ValueCallback<Array<Uri>>?,
                    fileChooserParams: FileChooserParams?
                ): Boolean {
                    pendingFiles?.onReceiveValue(null)
                    pendingFiles = filePathCallback
                    picker.launch(arrayOf("image/*"))
                    return true
                }
            }
            setDownloadListener { downloadUrl, _, _, _, _ ->
                context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(downloadUrl)))
            }
            loadUrl(url)
            webView=this
        } },
        update={ view -> if (view.url == null) view.loadUrl(url) }
    )
}
