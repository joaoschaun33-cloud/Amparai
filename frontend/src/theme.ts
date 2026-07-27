// Amparai design tokens — mirror of /app/design_guidelines.json
import { Platform } from 'react-native';

export const colors = {
  surface: '#F7F0E6',
  surfaceSecondary: '#FFFFFF',
  surfaceTertiary: '#EAE0D3',
  onSurface: '#2D2621',
  onSurfaceSoft: '#6B5A4C',

  brand: '#2E7D60', // Airbnb Primary Verde Marca
  onBrand: '#FFFFFF',
  brandSoft: '#E8F4F0',

  olive: '#5C6E49',
  onOlive: '#FFFFFF',

  amber: '#D97706',
  onAmber: '#FFFFFF',

  clayRed: '#A9402E', // SOS Emergency Mode
  onClayRed: '#FFFFFF',

  border: '#E6DEC6',
  divider: '#E6DEC6',
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
  xs: 4,
  sm: 8,
  md: 14, // Airbnb Card Geometry (~14px)
  lg: 20,
  xl: 32,
  pill: 9999,
};

export const type = {
  serif: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }) as string,
  sans: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }) as string,
};

export const shadow = {
  card: {
    shadowColor: '#2D2621',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  modal: {
    shadowColor: '#2D2621',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
};
