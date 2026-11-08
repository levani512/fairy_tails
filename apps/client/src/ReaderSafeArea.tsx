import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Paper } from './Storybook';
import { colors } from './theme';
import { phoneNotchSide } from './reader-safe-area';

type Size = { width: number; height: number };
const ReaderSize = createContext<Size | null>(null);

export function useReaderDimensions() {
  const window = useWindowDimensions();
  return useContext(ReaderSize) ?? window;
}

// Measure the usable scene, including changes caused by rotation or browser UI.
// On web, CSS safe-area values update directly without relying on initial insets.
export function ReaderSafeArea({
  children,
  protectBottom = false,
}: React.PropsWithChildren<{ protectBottom?: boolean }>) {
  const [size, setSize] = useState<Size | null>(null);
  const [notchSide, setNotchSide] = useState<'left' | 'right' | null>(null);
  useEffect(() => {
    if (Platform.OS !== 'web' || !/iPhone|iPod/.test(navigator.userAgent))
      return;
    const update = () => {
      // Safari also reserves space on the rounded-corner side opposite the notch.
      // Keep only the notch-side inset in landscape; retain both if unknown.
      const legacyAngle = (window as Window & { orientation?: number })
        .orientation;
      setNotchSide(
        phoneNotchSide(
          legacyAngle ?? window.screen.orientation?.angle,
          window.innerWidth,
          window.innerHeight,
        ),
      );
    };
    update();
    window.addEventListener('orientationchange', update);
    window.addEventListener('resize', update);
    window.screen.orientation?.addEventListener('change', update);
    return () => {
      window.removeEventListener('orientationchange', update);
      window.removeEventListener('resize', update);
      window.screen.orientation?.removeEventListener('change', update);
    };
  }, []);
  const content = (
    <View
      style={{ flex: 1, minWidth: 0, minHeight: 0 }}
      onLayout={({ nativeEvent: { layout } }) => {
        if (layout.width > 0 && layout.height > 0)
          setSize((previous) =>
            previous?.width === layout.width &&
            previous.height === layout.height
              ? previous
              : { width: layout.width, height: layout.height },
          );
      }}
    >
      <ReaderSize.Provider value={size}>{size && children}</ReaderSize.Provider>
    </View>
  );
  return (
    <View style={{ flex: 1, minHeight: 0, backgroundColor: colors.paper }}>
      <Paper />
      {Platform.OS === 'web' ? (
        <div
          data-reader-safe-area="true"
          style={{
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0,
            minWidth: 0,
            position: 'relative',
            boxSizing: 'border-box',
            paddingTop: 'env(safe-area-inset-top, 0px)',
            paddingRight:
              notchSide === 'left' ? 0 : 'env(safe-area-inset-right, 0px)',
            paddingBottom: protectBottom
              ? 'env(safe-area-inset-bottom, 0px)'
              : 0,
            paddingLeft:
              notchSide === 'right' ? 0 : 'env(safe-area-inset-left, 0px)',
          }}
        >
          {content}
        </div>
      ) : (
        <SafeAreaView
          edges={
            protectBottom
              ? ['top', 'left', 'right', 'bottom']
              : ['top', 'left', 'right']
          }
          style={{ flex: 1 }}
        >
          {content}
        </SafeAreaView>
      )}
    </View>
  );
}
