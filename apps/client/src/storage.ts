import AsyncStorage from '@react-native-async-storage/async-storage';
import { DownloadManager } from '../../../packages/asset-manager/src/index';
import { assetStore } from './storageAdapter';
import { GuestRepository } from '../../../packages/shared/src/guest';
export type { Guest } from '../../../packages/shared/src/guest';
export const metadata = {
  get: (key: string) => AsyncStorage.getItem(key),
  set: (key: string, value: string) => AsyncStorage.setItem(key, value),
  remove: (key: string) => AsyncStorage.removeItem(key),
};
export const downloads = new DownloadManager(assetStore, metadata);
export const guests = new GuestRepository(
  metadata,
  () => `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`,
);
export const loadGuest = () => guests.load();
