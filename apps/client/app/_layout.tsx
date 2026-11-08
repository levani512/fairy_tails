import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { Platform } from 'react-native';
import { setAudioModeAsync } from 'expo-audio';
import { useFonts } from 'expo-font';
import { inbound, sendToUnity } from '../../../integrations/unity/bridge';
export default function Layout() {
  const [fontsLoaded, fontError] = useFonts({
    Nunito: require('../assets/design/Nunito.ttf'),
  });
  const router = useRouter();
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const receive = (event: MessageEvent) => {
      if (event.source !== window || event.origin !== window.location.origin)
        return;
      let data = event.data;
      try {
        if (typeof data === 'string') data = JSON.parse(data);
      } catch {
        return;
      }
      const result = inbound.safeParse(data);
      if (!result.success) return;
      if (result.data.type === 'CLOSE_PLAYER') {
        sendToUnity({ version: 1, type: 'RETURN_TO_UNITY' });
        router.replace('/');
      } else
        router.push({
          pathname: '/player/[id]',
          params: { id: result.data.storyId, language: result.data.language },
        });
    };
    window.addEventListener('message', receive);
    sendToUnity({ version: 1, type: 'PLAYER_READY' });
    return () => window.removeEventListener('message', receive);
  }, [router]);
  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
    });
    if (Platform.OS === 'web' && 'serviceWorker' in navigator)
      navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);
  if (!fontsLoaded && !fontError) return null;
  return <Stack screenOptions={{ headerShown: false }} />;
}
