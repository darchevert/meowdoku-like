/** Warm cream palette matching the reference screenshots: soft beige
 * background, brown ink text, orange call-to-action. */
export const colors = {
  background: '#F7E9DA',
  surface: '#FFFFFF',
  surfaceMuted: '#F3E3D3',
  ink: '#6B4630',
  inkSoft: '#8A6A55',
  accent: '#F0932B',
  accentDark: '#D97706',
  success: '#3FA55A',
  danger: '#E0554F',
  cardShadow: 'rgba(107, 70, 48, 0.15)',
} as const;

/** Palette for puzzle regions. Chosen to be distinguishable at a glance
 * (including for common forms of color-blindness) at up to 10 regions. */
export const regionPalette = [
  '#F4C15C', // gold
  '#F2A0C4', // pink
  '#8E86D6', // periwinkle
  '#4FA97B', // green
  '#C98A5E', // brown/tan
  '#63B3D6', // sky blue
  '#E6725A', // coral
  '#B6C24C', // olive
  '#9C6FC9', // violet
  '#5CC7B8', // teal
] as const;

export function regionColor(regionId: number): string {
  return regionPalette[regionId % regionPalette.length];
}
