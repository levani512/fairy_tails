import React from 'react';
import {
  Text as NativeText,
  TextInput as NativeInput,
  View,
  StyleSheet,
  type TextProps,
  type TextInputProps,
} from 'react-native';
import { Image } from 'expo-image';
import { colors as c } from './theme';

// One bundled family and one icon vocabulary across the reading experience.
export function Text({ style, ...props }: TextProps) {
  return (
    <NativeText
      {...props}
      style={[{ fontFamily: 'Nunito', color: c.ink }, style]}
    />
  );
}
export function TextInput({ style, ...props }: TextInputProps) {
  return <NativeInput {...props} style={[{ fontFamily: 'Nunito' }, style]} />;
}
export function Paper() {
  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      accessible={false}
    >
      <Image
        source={require('../assets/design/paper.png')}
        contentFit="cover"
        style={[StyleSheet.absoluteFill, { opacity: 0.48 }]}
      />
    </View>
  );
}
const paths = {
  heart:
    'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',
  person: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM5 21v-2a7 7 0 0 1 14 0v2',
  tag: 'M20 3H12L2 13l9 9L21 12V4ZM16 7h.01',
  play: 'M8 4l12 8-12 8Z',
  next: 'M5 12h14M13 5l7 7-7 7',
  back: 'M19 12H5M11 5l-7 7 7 7',
  close: 'M6 6l12 12M18 6 6 18',
  fullscreen: 'M9 3H3v6M15 3h6v6M21 15v6h-6M9 21H3v-6',
  download: 'M12 2v14M7 12l5 5 5-5M2 11v10a1 1 0 0 0 1 1h18a1 1 0 0 0 1-1V11',
  check: 'M5 12l4 4L20 5',
  replay: 'M20 8a9 9 0 1 0 1 8M20 2v6h-6M10 9l5 3-5 3Z',
  settings:
    'M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1ZM16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
  music:
    'M9 18V5l11-2v13M9 8l11-2M9 18a3 3 0 1 1-3-3c1 0 3 0 3 3ZM20 16a3 3 0 1 1-3-3c1 0 3 0 3 3Z',
  sound: 'M3 9h4l5-5v16l-5-5H3ZM16 8a6 6 0 0 1 0 8M19 4a11 11 0 0 1 0 16',
  chevron: 'M6 9l6 6 6-6',
};
export function Icon({
  name,
  size = 24,
  color = c.ink,
  filled = false,
}: {
  name: keyof typeof paths;
  size?: number;
  color?: string;
  filled?: boolean;
}) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${paths[name]}" fill="${filled ? color : 'none'}" stroke="${color}" stroke-width="${name === 'download' ? 2.4 : 1.8}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  return (
    <Image
      accessible={false}
      source={{ uri: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}` }}
      style={{ width: size, height: size }}
    />
  );
}
export function Brand({ small = false }: { small?: boolean }) {
  const leaf = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 40"><path d="M25 23C5 27 1 18 2 14c11-3 19 2 23 9ZM25 16C10 13 9 3 12 0c10 3 13 10 13 16ZM25 30C9 27 5 34 6 38c10 1 16-3 19-8Z" fill="#87A94D"/></svg>`;
  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', gap: small ? 3 : 7 }}
    >
      <Image
        source={{ uri: `data:image/svg+xml;utf8,${encodeURIComponent(leaf)}` }}
        style={{ width: small ? 13 : 25, height: small ? 25 : 36 }}
      />
      <Text
        style={{
          fontSize: small ? 27 : 46,
          fontWeight: '900',
          color: c.orange,
          letterSpacing: -1.3,
        }}
      >
        FairyTails
      </Text>
      {!small && (
        <Image
          source={{
            uri: `data:image/svg+xml;utf8,${encodeURIComponent(leaf)}`,
          }}
          style={{ width: 25, height: 36, transform: [{ scaleX: -1 }] }}
        />
      )}
    </View>
  );
}
