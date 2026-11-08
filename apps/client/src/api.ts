import { ApiClient } from '../../../packages/api-client/src/index';
import { Platform } from 'react-native';
const configured =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1';
const localProxy =
  Platform.OS === 'web' &&
  typeof window !== 'undefined' &&
  window.location.port === '8082' &&
  /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/)/.test(configured);
export const api = new ApiClient(
  localProxy ? `${window.location.origin}/api/v1` : configured,
);
