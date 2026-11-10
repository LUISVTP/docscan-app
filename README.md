# docscan-app
Document scanner app built with React Native + Expo (camera, crop, filters, multi-page, PDF export).

## Features
- Camera capture with flash toggle.
- Gallery image picker.
- Crop-first flow: crop then filters.
- Scanner-quality filters via SkSL: original, magic, B/W, gray, lighten (default B/W).
- Multi-page documents saved locally with AsyncStorage.
- Document viewer with pinch zoom, page removal, rename/delete.
- PDF generation with pdf-lib and JPG save/share.

## Getting started
- Install dependencies: `npm install`
- Start the app: `npx expo start`
- Type check: `npx tsc --noEmit`
