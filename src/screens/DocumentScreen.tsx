import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import * as MediaLibrary from 'expo-media-library';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../types/navigation';
import { Document } from '../types/document';
import { getDocument, removePage } from '../services/storage';
import { exportJpgs, exportPdf, shareUri } from '../services/export';

type Props = NativeStackScreenProps<RootStackParamList, 'Document'>;

export default function DocumentScreen({ navigation, route }: Props) {
  const documentId = route.params.documentId;
  const [doc, setDoc] = useState<Document | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [fullPage, setFullPage] = useState<string | null>(null);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);

  useEffect(() => {
    scale.value = 1;
    savedScale.value = 1;
  }, [fullPage, scale, savedScale]);

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = savedScale.value * e.scale;
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value < 1) {
        scale.value = withSpring(1);
        savedScale.value = 1;
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await getDocument(documentId);
      setDoc(d);
      if (!d) {
        navigation.navigate('Home');
      }
    } finally {
      setLoading(false);
    }
  }, [documentId, navigation]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleRemovePage = (index: number) => {
    Alert.alert('Eliminar página', '¿Eliminar esta página?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          const result = await removePage(documentId, index);
          if (result === null) {
            navigation.navigate('Home');
          } else {
            setDoc(result);
          }
        },
      },
    ]);
  };

  const handlePdf = async () => {
    if (!doc) return;
    setExporting(true);
    try {
      const uri = await exportPdf(doc);
      await shareUri(uri, 'pdf');
    } catch (e) {
      console.log('PDF error:', e);
      Alert.alert('Error', String(e instanceof Error ? e.message : e));
    } finally {
      setExporting(false);
    }
  };

  const handleJpg = () => {
    if (!doc) return;
    const options: { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' | 'default' }[] = doc.pages.map(
      (uri, index) => ({
        text: `Página ${index + 1}`,
        onPress: async () => {
          setExporting(true);
          try {
            await shareUri(uri, 'image');
          } catch (e) {
            console.log('JPG error:', e);
            Alert.alert('Error', String(e instanceof Error ? e.message : e));
          } finally {
            setExporting(false);
          }
        },
      }),
    );
    options.push({
      text: 'Todas (guardar en galería)',
      onPress: async () => {
        setExporting(true);
        try {
          const perm = await MediaLibrary.requestPermissionsAsync();
          if (!perm.granted) {
            Alert.alert('Permiso requerido', 'Se necesita acceso a la galería.');
            return;
          }
          for (const uri of doc.pages) {
            await MediaLibrary.saveToLibraryAsync(uri);
          }
          Alert.alert('Guardado', 'Las imágenes se guardaron en la galería.');
        } catch (e) {
          console.log('Gallery error:', e);
          Alert.alert('Error', String(e instanceof Error ? e.message : e));
        } finally {
          setExporting(false);
        }
      },
    });
    options.push({ text: 'Cancelar', style: 'cancel' });
    Alert.alert('Compartir JPG', 'Elige una opción', options);
  };

  if (loading || !doc) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{doc.name}</Text>
      </View>

      <View style={styles.gridContainer}>
        {doc.pages.map((uri, index) => (
          <Pressable
            key={`${uri}_${index}`}
            style={styles.thumb}
            onPress={() => setFullPage(uri)}
            onLongPress={() => handleRemovePage(index)}
          >
            <Image source={{ uri }} style={styles.thumbImage} />
            <Text style={styles.thumbNumber}>{index + 1}</Text>
          </Pressable>
        ))}
      </View>

      {exporting && (
        <View style={styles.exportingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.exportingText}>Procesando...</Text>
        </View>
      )}

      <View style={styles.buttons}>
        <Pressable
          style={styles.button}
          onPress={() => navigation.navigate('Scan', { documentId: doc.id })}
        >
          <Text style={styles.buttonText}>Agregar página</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={handlePdf} disabled={exporting}>
          <Text style={styles.buttonText}>PDF</Text>
        </Pressable>
        <Pressable style={styles.button} onPress={handleJpg} disabled={exporting}>
          <Text style={styles.buttonText}>JPG</Text>
        </Pressable>
      </View>

      <Modal visible={!!fullPage} transparent animationType="fade">
        <View style={styles.fullscreen}>
          <Pressable style={styles.closeButton} onPress={() => setFullPage(null)}>
            <Text style={styles.closeText}>Cerrar</Text>
          </Pressable>
          <GestureDetector gesture={pinch}>
            <Animated.View style={[styles.fullscreenImageWrap, animatedStyle]}>
              {fullPage ? (
                <Image
                  source={{ uri: fullPage }}
                  style={styles.fullImage}
                  resizeMode="contain"
                />
              ) : null}
            </Animated.View>
          </GestureDetector>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
  },
  thumb: {
    width: '30%',
    aspectRatio: 3 / 4,
    margin: '1.66%',
    backgroundColor: '#fff',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbNumber: {
    position: 'absolute',
    bottom: 4,
    right: 6,
    color: '#fff',
    fontWeight: '700',
    textShadowColor: '#000',
    textShadowRadius: 4,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    backgroundColor: '#fff',
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#007aff',
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  exportingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportingText: {
    color: '#fff',
    marginTop: 8,
  },
  fullscreen: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
  },
  closeText: {
    color: '#fff',
    fontWeight: '600',
  },
  fullscreenImageWrap: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
});
