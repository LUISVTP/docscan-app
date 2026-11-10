import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Sharing from 'expo-sharing';
import { PDFDocument } from 'pdf-lib';
import { Alert } from 'react-native';

import { Document } from '../types/document';

export async function exportPdf(doc: Document): Promise<string> {
  const pdfDoc = await PDFDocument.create();

  for (const uri of doc.pages) {
    const resized = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1240 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true },
    );

    if (!resized.base64) {
      throw new Error('No se pudo obtener la imagen en base64.');
    }

    const image = await pdfDoc.embedJpg(resized.base64);
    const page = pdfDoc.addPage([595, 842]);

    const margin = 10;
    const maxW = 595 - margin * 2;
    const maxH = 842 - margin * 2;
    const scale = Math.min(maxW / image.width, maxH / image.height);
    const w = image.width * scale;
    const h = image.height * scale;
    const x = (595 - w) / 2;
    const y = (842 - h) / 2;

    page.drawImage(image, { x, y, width: w, height: h });
  }

  const base64Pdf = await pdfDoc.saveAsBase64();

  const safeName = doc.name.replace(/[^a-zA-Z0-9]/g, '_') || 'document';
  const target = `${FileSystem.cacheDirectory}${safeName}.pdf`;
  await FileSystem.writeAsStringAsync(target, base64Pdf, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return target;
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
