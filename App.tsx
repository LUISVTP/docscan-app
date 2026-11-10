import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';

import CropScreen from './src/screens/CropScreen';
import DocumentScreen from './src/screens/DocumentScreen';
import HomeScreen from './src/screens/HomeScreen';
import PreviewScreen from './src/screens/PreviewScreen';
import ScanScreen from './src/screens/ScanScreen';
import { RootStackParamList } from './src/types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Mis documentos' }} />
        <Stack.Screen name="Scan" component={ScanScreen} options={{ title: 'Escanear' }} />
        <Stack.Screen name="Preview" component={PreviewScreen} options={{ title: 'Filtros' }} />
        <Stack.Screen name="Crop" component={CropScreen} options={{ title: 'Recortar' }} />
        <Stack.Screen name="Document" component={DocumentScreen} />
      </Stack.Navigator>
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}
