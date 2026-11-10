# docscan-app
Document scanner app built with React Native + Expo (camera, crop, filters, multi-page, PDF export).

## Features
- Camera capture with flash toggle.
- Gallery image picker.
- Crop-first flow: crop then filters.
- Scanner-quality filters via SkSL: original, magic, B/W, gray, lighten (default B/W).
- Multi-page documents saved locally with AsyncStorage.
- Document viewer with full-screen zoom, page removal, rename/delete.
- Export to PDF or JPG and sharing.

## Getting started
- Install dependencies: `npm install`
- Start the app: `npx expo start`
- Type check: `npx tsc --noEmit`
