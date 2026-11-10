import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Document } from '../types/document';

const STORAGE_KEY = 'docscan_documents';
const DOCS_DIR = `${FileSystem.documentDirectory}docs/`;

async function readDocuments(): Promise<Document[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Document[];
  } catch {
    return [];
  }
}

async function writeDocuments(docs: Document[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(docs));
}

function makeId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function createDocument(firstPageUri: string): Promise<Document> {
  const id = makeId();
  const folder = `${DOCS_DIR}${id}/`;
  await FileSystem.makeDirectoryAsync(folder, { intermediates: true });

  const pagePath = `${folder}page-1.jpg`;
  await FileSystem.copyAsync({ from: firstPageUri, to: pagePath });

  const doc: Document = {
    id,
    name: `Documento ${new Date().toLocaleString()}`,
    createdAt: Date.now(),
    pages: [pagePath],
  };

  const docs = await readDocuments();
  docs.push(doc);
  await writeDocuments(docs);
  return doc;
}

export async function addPage(documentId: string, pageUri: string): Promise<Document | null> {
  const docs = await readDocuments();
  const index = docs.findIndex((d) => d.id === documentId);
  if (index === -1) return null;

  const doc = docs[index];
  const folder = `${DOCS_DIR}${doc.id}/`;
  const pageNumber = doc.pages.length + 1;
  const pagePath = `${folder}page-${pageNumber}.jpg`;
  await FileSystem.copyAsync({ from: pageUri, to: pagePath });

  doc.pages.push(pagePath);
  docs[index] = doc;
  await writeDocuments(docs);
  return doc;
}

export async function getDocuments(): Promise<Document[]> {
  const docs = await readDocuments();
  return [...docs].sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteDocument(id: string): Promise<void> {
  const folder = `${DOCS_DIR}${id}/`;
  try {
    await FileSystem.deleteAsync(folder, { idempotent: true });
  } catch {
    // ignore
  }
  const docs = await readDocuments();
  const filtered = docs.filter((d) => d.id !== id);
  await writeDocuments(filtered);
}
