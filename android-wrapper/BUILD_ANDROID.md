# Build the Android APK

The repository contains the web application and Capacitor configuration. It does not contain a generated Android Gradle project or a compiled APK yet.

## Requirements
- Node.js 20 or newer
- Android Studio with Android SDK and platform tools
- JDK 21 (required by Capacitor 7)

## Build
From the project root:

```bash
npm install
npx cap add android
npx cap sync android
npx cap open android
```

In Android Studio, select **Build > Build Bundle(s) / APK(s) > Build APK(s)**. The debug APK is normally written to `android/app/build/outputs/apk/debug/app-debug.apk`.

Before building for a deployed backend, set `apiBase` in `web/config.js` to the HTTPS FastAPI origin and set the backend `CORS_ORIGINS` to the exact allowed origins. The user enters a personal Groq key in the app; never hard-code a shared key in `web/config.js`, the APK, or source control.

For a release APK, configure an Android signing key in Android Studio and protect the keystore and passwords.
