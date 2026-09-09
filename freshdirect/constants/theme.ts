export const Colors = {
  // Brand
  primary: '#005322',
  primaryContainer: '#006e2f',
  onPrimaryContainer: '#e8f5e9',
  primaryFixed: '#c8f0d0',
  secondary: '#9d4300',
  onSurfaceDeep: '#0b1c30',
  onSurface: '#121e13',
  onSurfaceVariant: '#3f493f',
  outline: '#6f7a6e',
  outlineVariant: '#d5e8d3',
  background: '#effeeb',
  surfaceCard: '#ffffff',
  surfaceMain: '#f8f9ff',
  surfaceContainerLow: '#e9f8e5',
  surfaceContainerHigh: '#dceede',
  // Accents
  accentOrange: '#fd761a',
  accentMint: '#28c38a',
  // Semantic
  error: '#d32f2f',
  errorContainer: '#ffebee',
  success: '#2e7d32',
  successContainer: '#e8f5e9',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  base: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const BorderRadius = {
  sm: 4,
  DEFAULT: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

import { Platform } from 'react-native';

const shadow = (h: number, r: number, o: number, e: number) =>
  Platform.select({
    web: { boxShadow: `0px ${h}px ${r}px rgba(0,0,0,${o})` } as object,
    default: { shadowColor: '#000', shadowOffset: { width: 0, height: h }, shadowOpacity: o, shadowRadius: r, elevation: e },
  }) ?? {};

const primaryShadow = (h: number, r: number, o: number, e: number) =>
  Platform.select({
    web: { boxShadow: `0px ${h}px ${r}px rgba(0,83,34,${o})` } as object,
    default: { shadowColor: '#005322', shadowOffset: { width: 0, height: h }, shadowOpacity: o, shadowRadius: r, elevation: e },
  }) ?? {};

export const Shadows = {
  card:        shadow(2,  8,  0.06, 2),
  elevated:    shadow(6,  16, 0.12, 5),
  heavy:       shadow(12, 24, 0.18, 10),
  primaryBtn:  primaryShadow(8,  16, 0.30, 6),
  primaryCard: primaryShadow(4,  8,  0.25, 3),
};

export const Typography = {
  display: { fontFamily: 'PlusJakartaSans-ExtraBold', fontSize: 32, lineHeight: 40 },
  h1: { fontFamily: 'PlusJakartaSans-Bold', fontSize: 24, lineHeight: 32 },
  h2: { fontFamily: 'PlusJakartaSans-SemiBold', fontSize: 20, lineHeight: 28 },
  h3: { fontFamily: 'HankenGrotesk-SemiBold', fontSize: 16, lineHeight: 24 },
  body: { fontFamily: 'HankenGrotesk-Regular', fontSize: 14, lineHeight: 22 },
  caption: { fontFamily: 'HankenGrotesk-Regular', fontSize: 12, lineHeight: 18 },
  label: { fontFamily: 'HankenGrotesk-Medium', fontSize: 13, lineHeight: 20 },
};
