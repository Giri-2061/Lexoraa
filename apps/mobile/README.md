# Lexora Mobile (Expo Android)

This app is a production-ready Android shell around your existing web platform.

Why this approach:
- Guarantees feature parity with the website (auth, classroom, tests, writing/speaking AI evaluations, dashboard)
- Lets you ship to Play Store quickly without rewriting all flows in React Native

## Prerequisites

- Node.js 18+
- Android Studio + Android SDK
- Java 17
- Expo account (for EAS builds)

## Environment

1. Copy `.env.example` to `.env`
2. Set:

```bash
EXPO_PUBLIC_WEB_APP_URL=https://your-production-domain.com
```

For Android emulator local testing, use:

```bash
EXPO_PUBLIC_WEB_APP_URL=http://10.0.2.2:8080
```

## Run Locally (Android)

```bash
# from repository root
npm install
npm --workspace=@lexora/common run build

# run native android shell
npm --workspace=lexora-mobile run android
```

## Build AAB For Play Store

```bash
cd apps/mobile
npx eas login
npx eas build -p android --profile production
```

The `production` profile generates an Android App Bundle (AAB), which is the required format for Google Play.

## Release Checklist

- Replace `assets/icon.png` and `assets/splash.png` with brand assets
- Set final `EXPO_PUBLIC_WEB_APP_URL` to production web domain
- Validate login, classroom, tests, writing/speaking evaluation, and dashboard on a real Android device
- Confirm microphone/camera/media permissions are accepted where needed
- Upload generated AAB to Google Play Console
