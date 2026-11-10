import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { useRef, useState } from 'react';
import {
  Alert,
  Button,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Scan'>;

export default function ScanScreen({ navigation, route }: Props) {
  const documentId = route.params?.documentId;
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [flashOn, setFlashOn] = useState(false);
  const [mediaPermission, requestMediaPermission] =
    ImagePicker.useMediaLibraryPermissions();

  const takePicture = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync();
      if (photo?.uri) {
        navigation.navigate('Crop', { imageUri: photo.uri, documentId });
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo capturar la imagen.');
    }
  };

  const pickFromGallery = async () => {
    if (!mediaPermission?.granted) {
      const result = await requestMediaPermission();
      if (!result.granted) {
        Alert.alert('Permiso requerido', 'Se necesita acceso a la galeria.');
        return;
      }
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
    if (!result.canceled && result.assets.length > 0) {
      navigation.navigate('Crop', { imageUri: result.assets[0].uri, documentId });
    }
  };

  if (!permission) {
    return (
      <View style={styles.center}>
        <Text>Cargando permisos...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>
          Se necesita permiso de camara para escanear documentos.
        </Text>
        <Button title="Conceder permiso" onPress={requestPermission} />
        <Button title="Volver" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
        flash={flashOn ? 'on' : 'off'}
      />
      <View style={styles.controls}>
        <Pressable style={styles.sideButton} onPress={pickFromGallery}>
          <Text style={styles.buttonText}>Galeria</Text>
        </Pressable>
        <Pressable style={styles.captureButton} onPress={takePicture}>
          <View style={styles.captureInner} />
        </Pressable>
        <Pressable
          style={styles.sideButton}
          onPress={() => setFlashOn((value) => !value)}
        >
          <Text style={styles.buttonText}>
            {flashOn ? 'Flash ON' : 'Flash OFF'}
          </Text>
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
  camera: {
    flex: 1,
  },
  controls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  sideButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 8,
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#fff',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  message: {
    textAlign: 'center',
    marginBottom: 12,
  },
});
