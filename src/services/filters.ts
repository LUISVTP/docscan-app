import * as FileSystem from 'expo-file-system/legacy';
import {
  FilterMode,
  ImageFormat,
  MipmapMode,
  Skia,
  TileMode,
} from '@shopify/react-native-skia';

export type FilterName = 'original' | 'magic' | 'bw' | 'gray' | 'lighten';

// Ajusta estas constantes para calibrar los filtros.
const MAX_WIDTH = 1600;
const BLUR_RATIO = 0.03; // blur ~3% del ancho
const BW_LOW = 0.80;
const BW_HIGH = 0.88;
const MAGIC_CONTRAST = 1.1;
const MAGIC_SATURATION = 1.2;
const MAGIC_WHITE_THRESHOLD = 0.92;
const GRAY_CONTRAST = 1.2;
const LIGHTEN_MIX = 0.5;

const SKSL_MAGIC = `
uniform shader original;
uniform shader background;
half4 main(float2 coord) {
  half4 o = original.eval(coord);
  half4 b = background.eval(coord);
  half3 denom = max(b.rgb, half3(0.01));
  half3 norm = clamp(o.rgb / denom, 0.0, 1.0);
  norm = (norm - 0.5) * ${MAGIC_CONTRAST} + 0.5;
  float luma = dot(norm, half3(0.2126, 0.7152, 0.0722));
  norm = mix(half3(luma), norm, ${MAGIC_SATURATION});
  if (o.r > ${MAGIC_WHITE_THRESHOLD} && o.g > ${MAGIC_WHITE_THRESHOLD} && o.b > ${MAGIC_WHITE_THRESHOLD}) {
    norm = half3(1.0);
  }
  norm = clamp(norm, 0.0, 1.0);
  return half4(norm, o.a);
}
`;

const SKSL_BW = `
uniform shader original;
uniform shader background;
half4 main(float2 coord) {
  half4 o = original.eval(coord);
  half4 b = background.eval(coord);
  half3 denom = max(b.rgb, half3(0.01));
  half3 norm = clamp(o.rgb / denom, 0.0, 1.0);
  float luma = dot(norm, half3(0.2126, 0.7152, 0.0722));
  float v = smoothstep(${BW_LOW}, ${BW_HIGH}, luma);
  return half4(v, v, v, o.a);
}
`;

const SKSL_GRAY = `
uniform shader original;
uniform shader background;
half4 main(float2 coord) {
  half4 o = original.eval(coord);
  half4 b = background.eval(coord);
  half3 denom = max(b.rgb, half3(0.01));
  half3 norm = clamp(o.rgb / denom, 0.0, 1.0);
  float luma = dot(norm, half3(0.2126, 0.7152, 0.0722));
  luma = (luma - 0.5) * ${GRAY_CONTRAST} + 0.5;
  luma = clamp(luma, 0.0, 1.0);
  return half4(luma, luma, luma, o.a);
}
`;

const SKSL_LIGHTEN = `
uniform shader original;
uniform shader background;
half4 main(float2 coord) {
  half4 o = original.eval(coord);
  half4 b = background.eval(coord);
  half3 denom = max(b.rgb, half3(0.01));
  half3 norm = clamp(o.rgb / denom, 0.0, 1.0);
  half3 result = mix(o.rgb, norm, ${LIGHTEN_MIX});
  result = clamp(result, 0.0, 1.0);
  return half4(result, o.a);
}
`;

const SHADERS: Record<Exclude<FilterName, 'original'>, string> = {
  magic: SKSL_MAGIC,
  bw: SKSL_BW,
  gray: SKSL_GRAY,
  lighten: SKSL_LIGHTEN,
};

function toResized(image: NonNullable<ReturnType<typeof Skia.Image.MakeImageFromEncoded>>, w: number, h: number) {
  if (image.width() === w && image.height() === h) return image;
  const surface = Skia.Surface.Make(w, h);
  if (!surface) throw new Error('No se pudo crear superficie.');
  const canvas = surface.getCanvas();
  const paint = Skia.Paint();
  canvas.drawImageRect(
    image,
    Skia.XYWHRect(0, 0, image.width(), image.height()),
    Skia.XYWHRect(0, 0, w, h),
    paint,
    true,
  );
  surface.flush();
  return surface.makeImageSnapshot();
}

function toBlurred(image: NonNullable<ReturnType<typeof Skia.Image.MakeImageFromEncoded>>, sigma: number) {
  const w = image.width();
  const h = image.height();
  const surface = Skia.Surface.Make(w, h);
  if (!surface) throw new Error('No se pudo crear superficie.');
  const canvas = surface.getCanvas();
  const paint = Skia.Paint();
  paint.setImageFilter(Skia.ImageFilter.MakeBlur(sigma, sigma, TileMode.Clamp, null));
  canvas.drawImage(image, 0, 0, paint);
  surface.flush();
  return surface.makeImageSnapshot();
}

export async function applyFilter(uri: string, filter: FilterName): Promise<string> {
  if (filter === 'original') {
    return uri;
  }

  const data = await Skia.Data.fromURI(uri);
  const image = Skia.Image.MakeImageFromEncoded(data);
  if (!image) {
    throw new Error('No se pudo decodificar la imagen.');
  }

  const scale = image.width() > MAX_WIDTH ? MAX_WIDTH / image.width() : 1;
  const w = Math.round(image.width() * scale);
  const h = Math.round(image.height() * scale);

  const resized = toResized(image, w, h);
  const sigma = Math.max(1, w * BLUR_RATIO);
  const blurred = toBlurred(resized, sigma);

  const source = SHADERS[filter];
  const effect = Skia.RuntimeEffect.Make(source);
  if (!effect) {
    throw new Error('El shader no compilo.');
  }

  const origShader = resized.makeShaderOptions(
    TileMode.Clamp,
    TileMode.Clamp,
    FilterMode.Linear,
    MipmapMode.None,
  );
  const blurShader = blurred.makeShaderOptions(
    TileMode.Clamp,
    TileMode.Clamp,
    FilterMode.Linear,
    MipmapMode.None,
  );

  const runtimeShader = effect.makeShaderWithChildren([], [origShader, blurShader]);

  const surface = Skia.Surface.Make(w, h);
  if (!surface) {
    throw new Error('No se pudo crear la superficie de dibujo.');
  }
  const canvas = surface.getCanvas();
  const paint = Skia.Paint();
  paint.setShader(runtimeShader);
  canvas.drawRect(Skia.XYWHRect(0, 0, w, h), paint);
  surface.flush();

  const snapshot = surface.makeImageSnapshot();
  const base64 = snapshot.encodeToBase64(ImageFormat.JPEG, 90);

  const target = `${FileSystem.cacheDirectory}filtered_${filter}_${Date.now()}.jpg`;
  await FileSystem.writeAsStringAsync(target, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  return target;
}
