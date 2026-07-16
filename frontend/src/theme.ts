// Amparai design tokens — mirror of /app/design_guidelines.json
import { Platform } from 'react-native';

export const colors = {
  surface: '#F7F0E6',
  surfaceSecondary: '#FFF9F0',
  surfaceTertiary: '#EAE0D3',
  onSurface: '#3E2F25',
  onSurfaceSoft: '#6B5A4C',

  brand: '#C4633F',
  onBrand: '#FFFFFF',

  olive: '#5C6E49',
  onOlive: '#FFFFFF',

  amber: '#E8A854',
  onAmber: '#3E2F25',

  clayRed: '#A9402E', // SOS only
  onClayRed: '#FFFFFF',

  border: '#EAE0D3',
  divider: '#EAE0D3',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radius = {
  sm: 8,
  md: 16,
  lg: 24,
  pill: 999,
};

export const type = {
  // Fraunces isn't installed as a font file; use platform serif as a warm fallback.
  serif: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }) as string,
  sans: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }) as string,
};

export const shadow = {
  card: {
    shadowColor: '#3E2F25',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
};
