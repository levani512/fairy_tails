import { Text, Icon } from './Storybook';
import React from 'react';
import { View, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import type { Preview } from '../../../packages/shared/src/index';
import { colors as c } from './theme';
export function Button({
  children,
  onPress,
  quiet = false,
  disabled = false,
  icon,
}: {
  children: React.ReactNode;
  onPress: () => void;
  quiet?: boolean;
  disabled?: boolean;
  icon?: React.ComponentProps<typeof Icon>['name'];
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: quiet ? '#F5EBD9' : c.orange,
          opacity: disabled ? 0.4 : pressed ? 0.75 : 1,
        },
      ]}
    >
      {icon && <Icon name={icon} size={20} color={quiet ? c.ink : '#FFFFFF'} />}
      <Text
        style={{
          fontSize: 16,
          fontWeight: '700',
          color: quiet ? c.ink : '#FFFFFF',
        }}
      >
        {children}
      </Text>
    </Pressable>
  );
}
export function LoadingScreen() {
  return (
    <View style={{ padding: 50, alignItems: 'center', gap: 16 }}>
      <ActivityIndicator color={c.green} />
      <Text style={styles.body}>Opening a little world of wonder…</Text>
    </View>
  );
}
export function StoryCard({
  story,
  onPress,
  favorite,
  onFavorite,
  status,
  onDownload,
}: {
  story: Preview;
  onPress: () => void;
  favorite: boolean;
  onFavorite: () => void;
  status: string;
  onDownload: () => void;
}) {
  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Read ${story.title}`}
        onPress={onPress}
      >
        <Image
          source={(story.thumbnail ?? story.cover).url}
          style={{ width: '100%', aspectRatio: 1.65, borderRadius: 16 }}
          contentFit="cover"
        />
        {story.access === 'premium' && (
          <View
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              padding: 6,
              borderRadius: 12,
              backgroundColor: c.paper,
            }}
          >
            <Text style={styles.small}>
              {story.locked ? '♜ Premium' : '✧ Premium included'}
            </Text>
          </View>
        )}
      </Pressable>
      <View style={{ padding: 8, gap: 6 }}>
        <Pressable onPress={onPress}>
          <Text style={styles.cardTitle}>{story.title}</Text>
        </Pressable>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            minHeight: 44,
            flexWrap: 'nowrap',
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Icon name="person" size={15} />
            <Text style={styles.small}>
              {story.minAge}–{story.maxAge}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={favorite ? 'Remove favorite' : 'Add favorite'}
            onPress={onFavorite}
            style={styles.icon}
          >
            <Icon name="heart" size={22} color={c.orange} filled={favorite} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${status === 'downloaded' ? 'Available offline' : status === 'downloading' ? 'Saving' : status === 'error' ? 'Retry download' : 'Download'} ${story.title}`}
            onPress={onDownload}
            style={[styles.icon, { marginLeft: 'auto' }]}
          >
            {status === 'downloading' ? (
              <ActivityIndicator size="small" color={c.ink} />
            ) : (
              <Icon
                name={
                  status === 'downloaded'
                    ? 'check'
                    : status === 'error'
                      ? 'replay'
                      : 'download'
                }
                size={22}
              />
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}
export const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    gap: 9,
    borderWidth: 1,
    borderColor: '#CD8E4540',
    boxShadow: '0px 2px 2px #62421D15',
    minHeight: 48,
    borderRadius: 24,
    paddingVertical: 13,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { fontSize: 17, lineHeight: 27, color: c.ink },
  small: { fontSize: 13, color: c.muted, lineHeight: 21 },
  title: { fontSize: 40, fontWeight: '700', color: c.ink, letterSpacing: -1.3 },
  card: {
    backgroundColor: '#FFFCF5A6',
    boxShadow: '0px 2px 1px #62421D1C',
    borderRadius: 24,
    padding: 7,
    borderWidth: 1,
    borderColor: c.line,
    flex: 1,
  },
  cardTitle: { fontSize: 20, lineHeight: 23, fontWeight: '900', color: c.ink },
  icon: {
    width: 44,
    height: 44,
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
});
