# Aimaker has no JavaScript bridge. Keep WebView callbacks used by Android.
-keepclassmembers class * extends android.webkit.WebChromeClient { *; }
-keepclassmembers class * extends android.webkit.WebViewClient { *; }
