import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

import { Document } from '../types/document';

export async function exportPdf(doc: Document): Promise<string> {
  const images: string[] = [];
  for (const uri of doc.pages) {
    const resized = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1240 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
    );
    const base64 = await FileSystem.readAsStringAsync(resized.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    images.push(`data:image/jpeg;base64,${base64}`);
    try {
      await FileSystem.deleteAsync(resized.uri, { idempotent: true });
    } catch {
      // ignore
    }
  }

  const pagesHtml = images
    .map(
      (src) =>
        `<div class="page"><img src="${src}" style="width:100%;height:100%;object-fit:contain;" /></div>`,
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
    width: 100%;
    height: 100%;
    object-fit: contain;
  }
</style>
</head>
<body>${pagesHtml}</body>
</html>`;

  const result = await Print.printToFileAsync({ html, width: 595, height: 842 });

  if (!result.uri) {
    throw new Error('El PDF no se generó correctamente.');
  }
  return result.uri;
}

export function exportJpgs(doc: Document): string[] {
  return [...doc.pages];
}

export async function shareUri(uri: string, kind: 'pdf' | 'image' = 'image'): Promise<void> {
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    Alert.alert('No disponible', 'Compartir no está disponible en este dispositivo.');
    return;
  }
  if (kind === 'pdf') {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: 'Compartir PDF',
    });
  } else {
    await Sharing.shareAsync(uri, {
      mimeType: 'image/jpeg',
      dialogTitle: 'Compartir imagen',
    });
  }
}
