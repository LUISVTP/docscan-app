# DocScan App - Agent Instructions

## Goal
A document scanner mobile app (original branding) built with React Native + Expo.
MVP features: capture with camera or gallery, crop, filters (B/W, document, color), multi-page documents, export to PDF/JPG, local list of saved documents.

## Stack
- Expo (managed workflow), React Native, TypeScript
- expo-camera, expo-image-picker, expo-image-manipulator, expo-print, expo-file-system, expo-sharing
- Navigation: expo-router or React Navigation
- Storage: local file system + AsyncStorage for document metadata

## Structure
- src/screens: one file per screen
- src/components: reusable UI components
- src/services: scanning, filters, PDF export, storage logic
- src/utils: helpers
- src/types: shared TypeScript types

## Rules
- Never use the name, logo, or assets of CamScanner or any other brand. Use the name DocScan.
- Work in small steps: one feature per task, then commit.
- The app must compile and start (npx expo start) after every step.
- Do not use git push --force or git reset --hard.
- Do not add paid services or API keys to the repo. Never commit secrets.
- Keep code typed (no any unless unavoidable) and commented only where needed.
- Update README.md when a feature is completed.

## Out of scope for now
OCR, automatic edge detection, cloud sync, user accounts.
