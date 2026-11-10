import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../types/navigation';
import { Document } from '../types/document';
import { getDocuments } from '../services/storage';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const docs = await getDocuments();
      setDocuments(docs);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>DocScan</Text>
        <Pressable
          style={styles.scanButton}
          onPress={() => navigation.navigate('Scan', undefined)}
        >
          <Text style={styles.scanButtonText}>Escanear</Text>
        </Pressable>
      </View>

      {loading ? (
        <Text style={styles.message}>Cargando...</Text>
      ) : documents.length === 0 ? (
        <Text style={styles.message}>No hay documentos guardados.</Text>
      ) : (
        <View style={styles.list}>
          {documents.map((doc) => (
            <View key={doc.id} style={styles.card}>
              {doc.pages.length > 0 ? (
                <Image source={{ uri: doc.pages[0] }} style={styles.thumbnail} />
              ) : (
                <View style={styles.thumbnailPlaceholder} />
              )}
              <View style={styles.cardInfo}>
                <Text style={styles.docName}>{doc.name}</Text>
                <Text style={styles.docMeta}>
                  {doc.pages.length} página{doc.pages.length === 1 ? '' : 's'}
                </Text>
                <Text style={styles.docMeta}>
                  {new Date(doc.createdAt).toLocaleString()}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  scanButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#007aff',
    borderRadius: 8,
  },
  scanButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  list: {
    padding: 12,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  thumbnail: {
    width: 60,
    height: 80,
    borderRadius: 6,
    backgroundColor: '#eee',
  },
  thumbnailPlaceholder: {
    width: 60,
    height: 80,
    borderRadius: 6,
    backgroundColor: '#eee',
  },
  cardInfo: {
    marginLeft: 12,
    flex: 1,
  },
  docName: {
    fontSize: 16,
    fontWeight: '600',
  },
  docMeta: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  message: {
    textAlign: 'center',
    marginTop: 40,
    color: '#666',
  },
});
