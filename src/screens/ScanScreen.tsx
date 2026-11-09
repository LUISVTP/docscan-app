import { Button, Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Scan'>;

export default function ScanScreen({ navigation }: Props) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <Text>ScanScreen - camara</Text>
      <Button title="Ir a Preview" onPress={() => navigation.navigate('Preview')} />
      <Button title="Volver" onPress={() => navigation.goBack()} />
    </View>
  );
}
