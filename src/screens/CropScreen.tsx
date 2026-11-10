import * as ImageManipulator from 'expo-image-manipulator';
import { PanResponder } from 'react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../types/navigation';
import { colors, radii } from '../utils/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Crop'>;

const MIN_SIZE = 40;

export default function CropScreen({ navigation, route }: Props) {
  const imageUri = route.params?.imageUri;
  const documentId = route.params?.documentId;

  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(
    null,
  );
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [rect, setRect] = useState<{
    x: number;
    y: number;
    w: number;
    h: number;
  } | null>(null);

  const rectRef = useRef(rect);
  const startRectRef = useRef(rect);

  useEffect(() => {
    rectRef.current = rect;
  }, [rect]);

  useEffect(() => {
    if (!imageUri) return;
    Image.getSize(
      imageUri,
      (width, height) => setImageSize({ width, height }),
      () => Alert.alert('Error', 'No se pudo cargar la imagen.'),
    );
  }, [imageUri]);

  const displayMetrics = useMemo(() => {
    if (!imageSize || !containerSize.width || !containerSize.height) return null;
    const scale = Math.min(
      containerSize.width / imageSize.width,
      containerSize.height / imageSize.height,
    );
    const dispW = imageSize.width * scale;
    const dispH = imageSize.height * scale;
    const offsetX = (containerSize.width - dispW) / 2;
    const offsetY = (containerSize.height - dispH) / 2;
    return { scale, dispW, dispH, offsetX, offsetY };
  }, [imageSize, containerSize]);

  useEffect(() => {
    if (!displayMetrics) return;
    const { dispW, dispH, offsetX, offsetY } = displayMetrics;
    const margin = 0.1;
    setRect({
      x: offsetX + dispW * margin,
      y: offsetY + dispH * margin,
      w: dispW * (1 - 2 * margin),
      h: dispH * (1 - 2 * margin),
    });
  }, [displayMetrics]);

  const createPanResponder = (corner: 'tl' | 'tr' | 'br' | 'bl') =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        if (rectRef.current) {
          startRectRef.current = { ...rectRef.current };
        }
      },
      onPanResponderMove: (_, gesture) => {
        const start = startRectRef.current;
        if (!start || !displayMetrics) return;
        const { dispW, dispH, offsetX, offsetY } = displayMetrics;
        const minX = offsetX;
        const minY = offsetY;
        const maxX = offsetX + dispW;
        const maxY = offsetY + dispH;

        let r = { ...start };
        if (corner === 'tl') {
          r.x = start.x + gesture.dx;
          r.y = start.y + gesture.dy;
          r.w = start.w - gesture.dx;
          r.h = start.h - gesture.dy;
        } else if (corner === 'tr') {
          r.y = start.y + gesture.dy;
          r.w = start.w + gesture.dx;
          r.h = start.h - gesture.dy;
        } else if (corner === 'br') {
          r.w = start.w + gesture.dx;
          r.h = start.h + gesture.dy;
        } else if (corner === 'bl') {
          r.x = start.x + gesture.dx;
          r.w = start.w - gesture.dx;
          r.h = start.h + gesture.dy;
        }

        r.x = Math.max(minX, Math.min(r.x, maxX - MIN_SIZE));
        r.y = Math.max(minY, Math.min(r.y, maxY - MIN_SIZE));
        r.w = Math.max(MIN_SIZE, Math.min(r.w, maxX - r.x));
        r.h = Math.max(MIN_SIZE, Math.min(r.h, maxY - r.y));

        rectRef.current = r;
        setRect(r);
      },
    });

  const panResponders = useMemo(
    () => ({
      tl: createPanResponder('tl'),
      tr: createPanResponder('tr'),
      br: createPanResponder('br'),
      bl: createPanResponder('bl'),
    }),
    [displayMetrics],
  );

  const cropImage = async () => {
    if (!imageUri || !rect || !imageSize || !displayMetrics) return;
    const { scale, dispW, dispH, offsetX, offsetY } = displayMetrics;
    const originX = Math.round((rect.x - offsetX) / scale);
    const originY = Math.round((rect.y - offsetY) / scale);
    const width = Math.round(rect.w / scale);
    const height = Math.round(rect.h / scale);

    const clampedX = Math.max(0, Math.min(originX, imageSize.width - 1));
    const clampedY = Math.max(0, Math.min(originY, imageSize.height - 1));
    const clampedW = Math.max(1, Math.min(width, imageSize.width - clampedX));
    const clampedH = Math.max(1, Math.min(height, imageSize.height - clampedY));

    try {
      const result = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ crop: { originX: clampedX, originY: clampedY, width: clampedW, height: clampedH } }],
        { compress: 1, format: ImageManipulator.SaveFormat.JPEG },
      );
      navigation.navigate('Preview', { imageUri: result.uri, documentId });
    } catch {
      Alert.alert('Error', 'No se pudo recortar la imagen.');
    }
  };

  if (!imageUri) {
    return (
      <View style={styles.center}>
        <Text>No hay imagen para recortar.</Text>
        <Pressable style={styles.button} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>Volver</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View
        style={styles.imageArea}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          setContainerSize({ width, height });
        }}
      >
        <Image
          source={{ uri: imageUri }}
          style={styles.image}
          resizeMode="contain"
        />
        {rect && (
          <>
            <View
              style={[
                styles.overlay,
                { top: 0, left: 0, right: 0, height: rect.y },
              ]}
            />
            <View
              style={[
                styles.overlay,
                { top: rect.y + rect.h, left: 0, right: 0, bottom: 0 },
              ]}
            />
            <View
              style={[
                styles.overlay,
                { top: rect.y, left: 0, width: rect.x, height: rect.h },
              ]}
            />
            <View
              style={[
                styles.overlay,
                { top: rect.y, left: rect.x + rect.w, right: 0, height: rect.h },
              ]}
            />
            <View
              style={[
                styles.cropRect,
                { left: rect.x, top: rect.y, width: rect.w, height: rect.h },
              ]}
            />
            <View
              {...panResponders.tl.panHandlers}
              style={[
                styles.handle,
                { left: rect.x - 12, top: rect.y - 12 },
              ]}
            />
            <View
              {...panResponders.tr.panHandlers}
              style={[
                styles.handle,
                { left: rect.x + rect.w - 12, top: rect.y - 12 },
              ]}
            />
            <View
              {...panResponders.br.panHandlers}
              style={[
                styles.handle,
                { left: rect.x + rect.w - 12, top: rect.y + rect.h - 12 },
              ]}
            />
            <View
              {...panResponders.bl.panHandlers}
              style={[
                styles.handle,
                { left: rect.x - 12, top: rect.y + rect.h - 12 },
              ]}
            />
          </>
        )}
      </View>
      <View style={styles.buttons}>
        <Pressable style={styles.button} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>Cancelar</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={cropImage}>
          <Text style={styles.buttonText}>Recortar</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  imageArea: {
    flex: 1,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  cropRect: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: 'transparent',
  },
  handle: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    backgroundColor: '#111',
  },
  button: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: radii.sm,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
});
