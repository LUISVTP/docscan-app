import {
  ActivityIndicator,
  Alert,
  Button,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useEffect, useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../types/navigation';
import { applyFilter, FilterName } from '../services/filters';
import { colors } from '../utils/theme';
import { addPage, createDocument } from '../services/storage';

type Props = NativeStackScreenProps<RootStackParamList, 'Preview'>;

const FILTERS: { key: FilterName; label: string }[] = [
  { key: 'original', label: 'Original' },
  { key: 'magic', label: 'Mágico' },
  { key: 'bw', label: 'B/N' },
  { key: 'gray', label: 'Grises' },
  { key: 'lighten', label: 'Aclarar' },
];

export default function PreviewScreen({ navigation, route }: Props) {
  const imageUri = route.params?.imageUri;
  const documentId = route.params?.documentId;

  const [originalUri, setOriginalUri] = useState<string | undefined>(imageUri);
  const [displayUri, setDisplayUri] = useState<string | undefined>(undefined);
  const [activeFilter, setActiveFilter] = useState<FilterName>('bw');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setOriginalUri(imageUri);
    setActiveFilter('bw');
    if (!imageUri) {
      setDisplayUri(undefined);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const result = await applyFilter(imageUri, 'bw');
        if (!cancelled) setDisplayUri(result);
      } catch {
        if (!cancelled) {
          Alert.alert('Error', 'No se pudo aplicar el filtro. Se usa el original.');
          setActiveFilter('original');
          setDisplayUri(imageUri);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [imageUri]);

  const handleFilter = async (filter: FilterName) => {
    if (!originalUri) return;
    setActiveFilter(filter);
    if (filter === 'original') {
      setDisplayUri(originalUri);
      return;
    }
    setLoading(true);
    try {
      const result = await applyFilter(originalUri, filter);
      setDisplayUri(result);
    } catch {
      Alert.alert('Error', 'No se pudo aplicar el filtro. Se usa el original.');
      setActiveFilter('original');
      setDisplayUri(originalUri);
    } finally {
      setLoading(false);
    }
  };

  const savePage = async () => {
    const uriToSave = displayUri ?? originalUri;
    if (!uriToSave) return;
    setSaving(true);
    try {
      let currentDocId = documentId;
      if (!currentDocId) {
        const doc = await createDocument(uriToSave);
        currentDocId = doc.id;
      } else {
        await addPage(currentDocId, uriToSave);
      }
      Alert.alert('Página guardada', '¿Qué deseas hacer?', [
        {
          text: 'Agregar otra página',
          onPress: () => navigation.navigate('Scan', { documentId: currentDocId }),
        },
        {
          text: 'Terminar',
          onPress: () => navigation.navigate('Home'),
        },
      ]);
    } catch {
      Alert.alert('Error', 'No se pudo guardar la página.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.imageArea}>
        {displayUri ? (
          <Image
            source={{ uri: displayUri }}
            style={styles.image}
            resizeMode="contain"
          />
        ) : (
          <Text style={styles.placeholder}>No hay imagen para mostrar.</Text>
        )}
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        )}
      </View>
      <View style={styles.filters}>
        {FILTERS.map((filter) => (
          <Pressable
            key={filter.key}
            style={[
              styles.filterButton,
              activeFilter === filter.key && styles.filterButtonActive,
            ]}
            onPress={() => handleFilter(filter.key)}
            disabled={loading || saving}
          >
            <Text
              style={[
                styles.filterText,
                activeFilter === filter.key && styles.filterTextActive,
              ]}
            >
              {filter.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.buttons}>
        <Button
          title="Repetir"
          onPress={() => navigation.navigate('Scan', { documentId })}
        />
        <Button
          title={saving ? 'Guardando...' : 'Guardar página'}
          onPress={savePage}
          disabled={saving || loading || !displayUri}
        />
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
    flex: 1,
    width: '100%',
  },
  placeholder: {
    flex: 1,
    color: '#fff',
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  filters: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    backgroundColor: '#111',
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    margin: 4,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    color: '#fff',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#fff',
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    backgroundColor: '#111',
  },
});
