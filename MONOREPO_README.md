Monorepo setup summary

Workspaces:
- apps/mobile  — Expo React Native app (Android)
- packages/common — shared utilities

How to bootstrap locally:

```bash
# from repo root
npm install
# build shared packages
npm --workspace=@lexora/common run build
# run mobile app
cd apps/mobile
npm install
npm run android
```

Android build options:
- Local device/emulator: `npm run android` (needs Android SDK)
- EAS build: configure `eas.json` and run `eas build -p android`

Play Store release (recommended: EAS builds producing AAB):

1. Install EAS CLI: `npm install -g eas-cli` or `npx eas login`.
2. Create an Expo account and login: `npx eas login`.
3. Configure project with `eas build --platform android` or use `eas.json` profiles (already added).
4. Let EAS manage credentials or provide your own keystore. For production, EAS will produce an AAB suitable for Play Store.
5. Download the generated AAB and upload it to Google Play Console.

Notes on credentials:
- If you want to manage your own signing key, follow `eas credentials` steps to upload your keystore.
- Keep signing credentials secure — do not commit them to source control.
