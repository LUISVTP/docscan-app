import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
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
      await shareUri(uri);
    } catch {
      Alert.alert('Error', 'No se pudo generar el PDF.');
    } finally {
      setExporting(false);
    }
  };

  const handleJpg = async () => {
    if (!doc) return;
    setExporting(true);
    try {
      const uris = exportJpgs(doc);
      if (uris.length === 0) return;
      await shareUri(uris[0]);
      if (uris.length > 1) {
        Alert.alert('JPG', `Se generaron ${uris.length} imágenes. Se compartió la primera.`);
      }
    } catch {
      Alert.alert('Error', 'No se pudo compartir las imágenes.');
    } finally {
      setExporting(false);
    }
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

      <ScrollView contentContainerStyle={styles.grid}>
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
      </ScrollView>

      {exporting && (
        <View style={styles.exportingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.exportingText}>Generando...</Text>
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
          <ScrollView
            contentContainerStyle={styles.fullscreenScroll}
            maximumZoomScale={4}
            minimumZoomScale={1}
            centerContent
          >
            {fullPage ? (
              <Image
                source={{ uri: fullPage }}
                style={styles.fullImage}
                resizeMode="contain"
              />
            ) : null}
          </ScrollView>
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
  grid: {
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
  fullscreenScroll: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
});
