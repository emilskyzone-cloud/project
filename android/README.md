# Aimaker Android — Google Play Release Project

Android Studio project for the Aimaker mobile app (`tech.aimaker.app`).

## What works now

- Native AIReel-inspired creation dashboard using Aimaker branding.
- Product Ads and Image-to-Video open the existing authenticated Aimaker generation workflow.
- Community, My Work, and Plans reuse the current Aimaker account, credits, and server.
- Future generator modes are visible but clearly marked NEXT or PLANNED rather than falsely presented as live.

## Release identity

- Package: `tech.aimaker.app`
- Version: `1.0.0` (`versionCode 1`)
- Minimum Android: 7.0 / API 24
- Target Android: 16 / API 36
- Privacy policy: `https://aimaker.tech/privacy`

## Before Play Store release

1. Verify `aimaker.tech` login, image generation, video generation, credits, and plans on a physical Android device.
2. Replace web-based generation with direct authenticated API calls after native Clerk session-token handling is connected.
3. Integrate Google Play Billing and verify purchases on the backend before granting credits.
4. Add privacy policy, terms, data-safety answers, final icon/screenshots, signing key, and release bundle.
5. Remove unsupported marketing claims and the GreatStack footer from the website before promotion.

Open this folder in Android Studio, sync Gradle, then use **Build > Generate Signed Bundle / APK > Android App Bundle**. Create an upload key and keep it backed up securely. Upload the resulting `.aab` to Play Console's Internal testing track first.

The `play/` folder contains store listing copy, release notes, a Data safety draft, and the submission checklist.
