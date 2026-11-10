import {
  Alert,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../types/navigation';
import { Document } from '../types/document';
import {
  deleteDocument,
  getDocuments,
  renameDocument,
} from '../services/storage';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');

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

  const openRename = (doc: Document) => {
    setRenameId(doc.id);
    setRenameText(doc.name);
  };

  const confirmRename = async () => {
    if (renameId && renameText.trim()) {
      await renameDocument(renameId, renameText.trim());
      setRenameId(null);
      setRenameText('');
      load();
    }
  };

  const confirmDelete = (doc: Document) => {
    Alert.alert('Eliminar documento', `¿Eliminar "${doc.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          await deleteDocument(doc.id);
          load();
        },
      },
    ]);
  };

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
            <Pressable
              key={doc.id}
              style={styles.card}
              onPress={() => navigation.navigate('Document', { documentId: doc.id })}
              onLongPress={() => confirmDelete(doc)}
            >
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
              <Pressable
                style={styles.menuButton}
                onPress={() => {
                  Alert.alert(doc.name, 'Elige una opción', [
                    { text: 'Renombrar', onPress: () => openRename(doc) },
                    { text: 'Eliminar', onPress: () => confirmDelete(doc), style: 'destructive' },
                    { text: 'Cancelar', style: 'cancel' },
                  ]);
                }}
              >
                <Text style={styles.menuText}>⋮</Text>
              </Pressable>
            </Pressable>
          ))}
        </View>
      )}

      <Modal visible={!!renameId} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Renombrar documento</Text>
            <TextInput
              style={styles.modalInput}
              value={renameText}
              onChangeText={setRenameText}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={styles.modalButton}
                onPress={() => {
                  setRenameId(null);
                  setRenameText('');
                }}
              >
                <Text>Cancelar</Text>
              </Pressable>
              <Pressable style={styles.modalButton} onPress={confirmRename}>
                <Text style={{ fontWeight: '600' }}>Guardar</Text>
              </Pressable>
            </View>
          </View>
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
  menuButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  menuText: {
    fontSize: 22,
    color: '#666',
  },
  message: {
    textAlign: 'center',
    marginTop: 40,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
    gap: 12,
  },
  modalButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});
