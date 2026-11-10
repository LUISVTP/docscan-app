import * as FileSystem from 'expo-file-system/legacy';
import { ImageFormat, Skia } from '@shopify/react-native-skia';

export type FilterName = 'original' | 'document' | 'bw' | 'color';

const BW_MATRIX = [
  0.2126, 0.7152, 0.0722, 0, 0,
  0.2126, 0.7152, 0.0722, 0, 0,
  0.2126, 0.7152, 0.0722, 0, 0,
  0, 0, 0, 1, 0,
];

const DOCUMENT_MATRIX = (() => {
  const c = 1.6;
  const b = 0.15;
  return [
    c * 0.2126, c * 0.7152, c * 0.0722, 0, b,
    c * 0.2126, c * 0.7152, c * 0.0722, 0, b,
    c * 0.2126, c * 0.7152, c * 0.0722, 0, b,
    0, 0, 0, 1, 0,
  ];
})();

const COLOR_MATRIX = (() => {
  const s = 1.5;
  return [
    0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s, 0, 0,
    0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s, 0, 0,
    0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s, 0, 0,
    0, 0, 0, 1, 0,
  ];
})();

const MATRICES: Record<Exclude<FilterName, 'original'>, number[]> = {
  document: DOCUMENT_MATRIX,
  bw: BW_MATRIX,
  color: COLOR_MATRIX,
};

export async function applyFilter(uri: string, filter: FilterName): Promise<string> {
  if (filter === 'original') {
    return uri;
  }

  const data = await Skia.Data.fromURI(uri);
  const image = Skia.Image.MakeImageFromEncoded(data);
  if (!image) {
    throw new Error('No se pudo decodificar la imagen.');
  }

  const surface = Skia.Surface.Make(image.width(), image.height());
  if (!surface) {
    throw new Error('No se pudo crear la superficie de dibujo.');
  }

  const canvas = surface.getCanvas();
  const paint = Skia.Paint();
  paint.setColorFilter(Skia.ColorFilter.MakeMatrix(MATRICES[filter]));
  canvas.drawImage(image, 0, 0, paint);
  surface.flush();

  const snapshot = surface.makeImageSnapshot();
  const base64 = snapshot.encodeToBase64(ImageFormat.JPEG, 90);

  const target = `${FileSystem.cacheDirectory}filtered_${filter}_${Date.now()}.jpg`;
  await FileSystem.writeAsStringAsync(target, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return target;
}
