import type { CSSProperties } from 'react';

export type BackgroundKey =
  | 'default' | 'aurora' | 'sunset' | 'ocean' | 'forest'
  | 'midnight' | 'cherry' | 'golden' | 'galaxy' | 'monochrome';

export interface ProfileBackground {
  label: string;
  style: CSSProperties;
  textColor: 'white' | 'default';
}

export const PROFILE_BACKGROUNDS: Record<BackgroundKey, ProfileBackground> = {
  default: {
    label: 'Default',
    style: {},
    textColor: 'default',
  },
  aurora: {
    label: 'Aurora',
    style: { background: 'linear-gradient(135deg, #6B46C1 0%, #0EA5E9 50%, #14B8A6 100%)' },
    textColor: 'white',
  },
  sunset: {
    label: 'Sunset',
    style: { background: 'linear-gradient(135deg, #F97316 0%, #EC4899 50%, #8B5CF6 100%)' },
    textColor: 'white',
  },
  ocean: {
    label: 'Ocean',
    style: { background: 'linear-gradient(135deg, #1E3A5F 0%, #0369A1 50%, #06B6D4 100%)' },
    textColor: 'white',
  },
  forest: {
    label: 'Forest',
    style: { background: 'linear-gradient(135deg, #14532D 0%, #16A34A 60%, #34D399 100%)' },
    textColor: 'white',
  },
  midnight: {
    label: 'Midnight',
    style: { background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #4C1D95 100%)' },
    textColor: 'white',
  },
  cherry: {
    label: 'Cherry',
    style: { background: 'linear-gradient(135deg, #FB7185 0%, #F43F5E 50%, #BE123C 100%)' },
    textColor: 'white',
  },
  golden: {
    label: 'Golden',
    style: { background: 'linear-gradient(135deg, #D97706 0%, #FBBF24 50%, #F97316 100%)' },
    textColor: 'white',
  },
  galaxy: {
    label: 'Galaxy',
    style: { background: 'linear-gradient(135deg, #0d1b2a 0%, #1a1a4e 40%, #2d1b69 70%, #0d1b2a 100%)' },
    textColor: 'white',
  },
  monochrome: {
    label: 'Mono',
    style: { background: 'linear-gradient(135deg, #111827 0%, #374151 50%, #6B7280 100%)' },
    textColor: 'white',
  },
};
