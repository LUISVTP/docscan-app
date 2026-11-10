export type RootStackParamList = {
  Home: undefined;
  Scan: { documentId?: string } | undefined;
  Crop: { imageUri?: string; documentId?: string } | undefined;
  Preview: { imageUri?: string; documentId?: string } | undefined;
};
