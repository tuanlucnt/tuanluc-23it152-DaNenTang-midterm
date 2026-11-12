import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const KEY = 'qlgv.admin.session';
export async function readSession() {
  if (Platform.OS === 'web')
    return typeof window === 'undefined' ? null : window.sessionStorage.getItem(KEY);
  return SecureStore.getItemAsync(KEY);
}
export async function writeSession(value: string | null) {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return;
    if (value === null) window.sessionStorage.removeItem(KEY);
    else window.sessionStorage.setItem(KEY, value);
  } else if (value === null) await SecureStore.deleteItemAsync(KEY);
  else await SecureStore.setItemAsync(KEY, value);
}
