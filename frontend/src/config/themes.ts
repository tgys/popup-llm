import type { ThemeId } from '@/types';

export interface ThemeDefinition {
  id: ThemeId;
  label: string;
  mode: 'dark' | 'light';
  vars: Record<string, string>;
}

// Compact theme color definitions
const themeColors = {
  'midnight-blue': {
    mode: 'dark' as const,
    label: 'Midnight Blue',
    bg: [13, 13, 26],
    header: [26, 26, 46],
    panel: [30, 30, 58],
    hover: [37, 37, 69],
    border: [42, 42, 74],
    text: ['#e0e0e0', '#9ca3af', '#6b7280', '#d0d0d0'],
    accent: ['#4a9eff', '#3a8eef'],
    success: ['#10b981', 5, 150, 105],
    danger: ['#ef4444', '#dc2626'],
    warning: ['#fbbf24', 251, 191, 36],
  },
  'forest-night': {
    mode: 'dark' as const,
    label: 'Forest Night',
    bg: [10, 24, 22],
    header: [18, 41, 36],
    panel: [24, 56, 49],
    hover: [30, 70, 60],
    border: [43, 94, 82],
    text: ['#e6f5ef', '#9ac7b9', '#6b9488', '#f3fffb'],
    accent: ['#58d68d', '#44c379'],
    success: ['#34d399', 52, 211, 153],
    danger: ['#ff7a7a', '#f26464'],
    warning: ['#f7c66b', 247, 198, 107],
  },
  'ember-dark': {
    mode: 'dark' as const,
    label: 'Ember Dark',
    bg: [30, 16, 14],
    header: [52, 27, 22],
    panel: [71, 38, 30],
    hover: [86, 45, 35],
    border: [110, 56, 44],
    text: ['#f8ebe5', '#d6b1a2', '#a87f72', '#fff6f2'],
    accent: ['#ff8a65', '#ff7043'],
    success: ['#4ade80', 74, 222, 128],
    danger: ['#ff6b6b', '#ef5350'],
    warning: ['#ffcb6b', 255, 203, 107],
  },
  'graphite': {
    mode: 'dark' as const,
    label: 'Graphite',
    bg: [20, 22, 26],
    header: [34, 38, 45],
    panel: [42, 47, 56],
    hover: [52, 58, 70],
    border: [69, 78, 91],
    text: ['#eceff1', '#b0bec5', '#7f8c93', '#fafcfd'],
    accent: ['#90caf9', '#64b5f6'],
    success: ['#66bb6a', 102, 187, 106],
    danger: ['#ef5350', '#e53935'],
    warning: ['#ffca28', 255, 202, 40],
  },
  'aurora-dark': {
    mode: 'dark' as const,
    label: 'Aurora Dark',
    bg: [14, 18, 34],
    header: [24, 31, 58],
    panel: [35, 43, 76],
    hover: [48, 58, 97],
    border: [55, 69, 118],
    text: ['#e8f2ff', '#a9bbdf', '#7889ad', '#f7fbff'],
    accent: ['#6ccbff', '#42b9ff'],
    success: ['#5eead4', 94, 234, 212],
    danger: ['#fb7185', '#f43f5e'],
    warning: ['#facc15', 250, 204, 21],
  },
  'paper-sky': {
    mode: 'light' as const,
    label: 'Paper Sky',
    bg: [243, 248, 255],
    header: [226, 237, 252],
    panel: [255, 255, 255],
    hover: [231, 240, 255],
    border: [148, 163, 184],
    text: ['#162033', '#475569', '#64748b', '#0f172a'],
    accent: ['#2563eb', '#1d4ed8'],
    success: ['#059669', 5, 150, 105],
    danger: ['#dc2626', '#b91c1c'],
    warning: ['#d97706', 217, 119, 6],
  },
  'sand-light': {
    mode: 'light' as const,
    label: 'Sand Light',
    bg: [250, 245, 237],
    header: [242, 232, 214],
    panel: [255, 252, 247],
    hover: [245, 237, 225],
    border: [180, 150, 118],
    text: ['#2f241c', '#6f5a4a', '#8a7768', '#1c140f'],
    accent: ['#b45309', '#92400e'],
    success: ['#15803d', 21, 128, 61],
    danger: ['#dc2626', '#b91c1c'],
    warning: ['#c2410c', 194, 65, 12],
  },
  'mint-light': {
    mode: 'light' as const,
    label: 'Mint Light',
    bg: [240, 252, 248],
    header: [219, 245, 236],
    panel: [255, 255, 255],
    hover: [228, 249, 240],
    border: [134, 188, 173],
    text: ['#15322d', '#456860', '#5f8379', '#0d211d'],
    accent: ['#0d9488', '#0f766e'],
    success: ['#16a34a', 22, 163, 74],
    danger: ['#dc2626', '#b91c1c'],
    warning: ['#ca8a04', 202, 138, 4],
  },
  'rose-light': {
    mode: 'light' as const,
    label: 'Rose Light',
    bg: [255, 244, 246],
    header: [255, 228, 234],
    panel: [255, 255, 255],
    hover: [255, 236, 240],
    border: [212, 162, 174],
    text: ['#3b1822', '#7b4b59', '#9a6a78', '#230c13'],
    accent: ['#e11d48', '#be123c'],
    success: ['#15803d', 21, 128, 61],
    danger: ['#dc2626', '#b91c1c'],
    warning: ['#c2410c', 194, 65, 12],
  },
  'slate-light': {
    mode: 'light' as const,
    label: 'Slate Light',
    bg: [245, 247, 250],
    header: [231, 236, 242],
    panel: [255, 255, 255],
    hover: [237, 241, 246],
    border: [148, 163, 184],
    text: ['#1e293b', '#475569', '#64748b', '#0f172a'],
    accent: ['#475569', '#334155'],
    success: ['#15803d', 21, 128, 61],
    danger: ['#dc2626', '#b91c1c'],
    warning: ['#ca8a04', 202, 138, 4],
  },
} as const;

function rgba(rgb: readonly number[], alpha: number): string {
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

function buildThemeVars(id: keyof typeof themeColors): Record<string, string> {
  const t = themeColors[id];
  const isDark = t.mode === 'dark';
  const [bgA, popupA, headerA, headerSoftA] = isDark ? [0.85, 0.92, 0.6, 0.4] : [0.95, 0.98, 0.86, 0.74];
  const [panelA, panelSoftA, panelStrongA] = isDark ? [0.78, 0.5, 0.85] : [0.88, 0.84, 0.96];
  const [hoverA, selectedA] = isDark ? [0.7, 0.15] : [0.95, 0.1];
  const [borderA, borderStrongA, borderSoftA] = isDark ? [0.5, 0.2, 0.3] : [0.35, 0.22, 0.24];
  const overlayA = isDark ? 0.4 : 0.25;
  const shadowA = isDark ? 0.4 : 0.14;
  const inputA = isDark ? 0.8 : 0.38;

  const accentRgb = t.accent[0].match(/\w{2}/g)!.map((h) => parseInt(h, 16));
  const successRgb = typeof t.success[1] === 'number' ? [t.success[1], t.success[2], t.success[3]] : [0, 0, 0];
  const warningRgb = typeof t.warning[1] === 'number' ? [t.warning[1], t.warning[2], t.warning[3]] : [0, 0, 0];
  const dangerRgb = t.danger[0].match(/\w{2}/g)!.map((h) => parseInt(h, 16));

  return {
    '--theme-bg': rgba(t.bg, bgA),
    '--theme-bg-popup': rgba(t.bg, popupA),
    '--theme-header': rgba(t.header, headerA + 0.08),
    '--theme-header-soft': rgba(t.header, headerSoftA + 0.06),
    '--theme-panel': rgba(isDark ? t.panel : t.panel, panelA + (isDark ? 0 : 0.02)),
    '--theme-panel-soft': rgba(isDark ? t.bg : [t.bg[0] + 5, t.bg[1] + 3, t.bg[2] + 2], panelSoftA + (isDark ? 0 : 0)),
    '--theme-panel-strong': rgba(t.header, panelStrongA + 0.05),
    '--theme-hover': rgba(t.hover, hoverA + 0.04),
    '--theme-selected': rgba(accentRgb, selectedA + 0.03),
    '--theme-border': rgba(t.border, borderA + 0.05),
    '--theme-border-strong': rgba(accentRgb, borderStrongA + 0.02),
    '--theme-border-soft': rgba(t.border, borderSoftA + 0.04),
    '--theme-text': t.text[0],
    '--theme-text-soft': t.text[1],
    '--theme-text-muted': t.text[2],
    '--theme-text-strong': t.text[3],
    '--theme-accent': t.accent[0],
    '--theme-accent-hover': t.accent[1],
    '--theme-accent-soft': rgba(accentRgb, selectedA + 0.03),
    '--theme-success': t.success[0] as string,
    '--theme-success-soft': rgba(successRgb as number[], 0.2),
    '--theme-danger': t.danger[0],
    '--theme-danger-hover': t.danger[1],
    '--theme-danger-soft': rgba(dangerRgb, isDark ? 0.18 : 0.12),
    '--theme-warning': t.warning[0] as string,
    '--theme-warning-soft': rgba(warningRgb as number[], isDark ? 0.12 : 0.12),
    '--theme-warning-border': rgba(warningRgb as number[], isDark ? 0.3 : 0.24),
    '--theme-overlay': rgba(isDark ? [0, 0, 0] : t.border, overlayA),
    '--theme-shadow': `rgba(${isDark ? '0, 0, 0' : '15, 23, 42'}, ${shadowA})`,
    '--theme-input-track': rgba(t.border, inputA + 0.02),
    '--theme-contrast': '#ffffff',
  };
}

export const THEMES: ThemeDefinition[] = Object.entries(themeColors).map(([id, config]) => ({
  id: id as ThemeId,
  label: config.label,
  mode: config.mode,
  vars: buildThemeVars(id as keyof typeof themeColors),
}));

export const darkThemes = THEMES.filter((t) => t.mode === 'dark');
export const lightThemes = THEMES.filter((t) => t.mode === 'light');
