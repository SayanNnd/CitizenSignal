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
  pothole: '#E4572E',
  streetlight: '#E0A100',
  garbage: '#3E9B4F',
  water_leak: '#2B7FD4',
  drainage: '#8B4FC0',
  road_damage: '#D6336C',
  other: '#6B7A8C',
};
