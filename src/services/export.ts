import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

import { Document } from '../types/document';

export async function exportPdf(doc: Document): Promise<string> {
  const images: string[] = [];
  for (const uri of doc.pages) {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    images.push(`data:image/jpeg;base64,${base64}`);
  }

  const pagesHtml = images
    .map(
      (src) =>
        `<div class="page"><img src="${src}" /></div>`,
    )
    .join('');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { size: A4; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { margin: 0; }
  .page {
    width: 210mm;
    height: 297mm;
    display: flex;
    align-items: center;
    justify-content: center;
    page-break-after: always;
  }
  .page:last-child { page-break-after: auto; }
  img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
</style>
</head>
<body>${pagesHtml}</body>
</html>`;

  const result = await Print.printToFileAsync({ html });

  const safeName = doc.name.replace(/[^a-z0-9]/gi, '_') || 'document';
  const target = `${FileSystem.cacheDirectory}${safeName}.pdf`;
  await FileSystem.copyAsync({ from: result.uri, to: target });
  try {
    await FileSystem.deleteAsync(result.uri, { idempotent: true });
  } catch {
    // ignore
  }
  return target;
}

export function exportJpgs(doc: Document): string[] {
  return [...doc.pages];
}

export async function shareUri(uri: string): Promise<void> {
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    Alert.alert('No disponible', 'Compartir no está disponible en este dispositivo.');
    return;
  }
  await Sharing.shareAsync(uri);
}
