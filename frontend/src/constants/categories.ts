import type { Category } from '../types';

export const CATEGORIES: Category[] = [
  'pothole',
  'streetlight',
  'garbage',
  'water_leak',
  'drainage',
  'road_damage',
  'other',
];

export const CATEGORY_LABELS: Record<Category, string> = {
  pothole: 'Pothole',
  streetlight: 'Streetlight',
  garbage: 'Garbage',
  water_leak: 'Water Leak',
  drainage: 'Drainage',
  road_damage: 'Road Damage',
  other: 'Other',
};

export const CATEGORY_COLORS: Record<Category, string> = {
  pothole: '#e53935',
  streetlight: '#fb8c00',
  garbage: '#43a047',
  water_leak: '#1e88e5',
  drainage: '#8e24aa',
  road_damage: '#d81b60',
  other: '#757575',
};

export const STATUS_COLORS: Record<string, string> = {
  open: '#e53935',
  resolved: '#43a047',
};

