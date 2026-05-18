import type { ItemType } from './types';

export interface FurnitureDef {
  type: ItemType;
  label: string;
  category: string;
  widthCm: number;
  heightCm: number;
  color: string;
  emoji: string;
}

export const FURNITURE_CATALOG: FurnitureDef[] = [
  // Beds
  { type: 'bed-single', label: 'Single Bed', category: 'Bedroom', widthCm: 90, heightCm: 190, color: '#7c6f64', emoji: '🛏' },
  { type: 'bed-double', label: 'Double Bed', category: 'Bedroom', widthCm: 135, heightCm: 190, color: '#7c6f64', emoji: '🛏' },
  { type: 'bed-queen', label: 'Queen Bed', category: 'Bedroom', widthCm: 150, heightCm: 200, color: '#7c6f64', emoji: '🛏' },
  { type: 'bed-king', label: 'King Bed', category: 'Bedroom', widthCm: 180, heightCm: 200, color: '#7c6f64', emoji: '🛏' },
  { type: 'wardrobe', label: 'Wardrobe', category: 'Bedroom', widthCm: 180, heightCm: 60, color: '#5c5346', emoji: '🚪' },
  // Seating
  { type: 'sofa-2', label: '2-Seater Sofa', category: 'Living', widthCm: 150, heightCm: 80, color: '#6b7280', emoji: '🛋' },
  { type: 'sofa-3', label: '3-Seater Sofa', category: 'Living', widthCm: 210, heightCm: 80, color: '#6b7280', emoji: '🛋' },
  { type: 'sofa-l', label: 'L-Shape Sofa', category: 'Living', widthCm: 250, heightCm: 250, color: '#6b7280', emoji: '🛋' },
  { type: 'chair', label: 'Armchair', category: 'Living', widthCm: 80, heightCm: 80, color: '#78716c', emoji: '🪑' },
  { type: 'tv-unit', label: 'TV Unit', category: 'Living', widthCm: 180, heightCm: 40, color: '#374151', emoji: '📺' },
  // Dining
  { type: 'dining-4', label: 'Dining Table (4)', category: 'Dining', widthCm: 120, heightCm: 80, color: '#92400e', emoji: '🍽' },
  { type: 'dining-6', label: 'Dining Table (6)', category: 'Dining', widthCm: 160, heightCm: 90, color: '#92400e', emoji: '🍽' },
  { type: 'dining-8', label: 'Dining Table (8)', category: 'Dining', widthCm: 220, heightCm: 100, color: '#92400e', emoji: '🍽' },
  // Kitchen
  { type: 'kitchen-counter', label: 'Kitchen Counter', category: 'Kitchen', widthCm: 180, heightCm: 60, color: '#d97706', emoji: '🍳' },
  { type: 'kitchen-island', label: 'Kitchen Island', category: 'Kitchen', widthCm: 120, heightCm: 90, color: '#b45309', emoji: '🏝' },
  { type: 'refrigerator', label: 'Refrigerator', category: 'Kitchen', widthCm: 70, heightCm: 75, color: '#9ca3af', emoji: '🧊' },
  { type: 'stove', label: 'Stove / Hob', category: 'Kitchen', widthCm: 60, heightCm: 60, color: '#374151', emoji: '🔥' },
  // Study
  { type: 'desk', label: 'Study Desk', category: 'Study', widthCm: 140, heightCm: 70, color: '#78350f', emoji: '🖥' },
  // Office
  { type: 'office-desk', label: 'Office Desk', category: 'Office', widthCm: 140, heightCm: 70, color: '#334155', emoji: '🖥' },
  { type: 'office-desk-l', label: 'L-Shape Desk', category: 'Office', widthCm: 160, heightCm: 160, color: '#334155', emoji: '🖥' },
  { type: 'office-chair', label: 'Office Chair', category: 'Office', widthCm: 60, heightCm: 60, color: '#1e3a5f', emoji: '🪑' },
  { type: 'visitor-chair', label: 'Visitor Chair', category: 'Office', widthCm: 50, heightCm: 50, color: '#374151', emoji: '🪑' },
  { type: 'meeting-table-4', label: 'Meeting Table (4)', category: 'Office', widthCm: 120, heightCm: 70, color: '#1c3d2e', emoji: '🗃' },
  { type: 'meeting-table-6', label: 'Meeting Table (6)', category: 'Office', widthCm: 180, heightCm: 80, color: '#1c3d2e', emoji: '🗃' },
  { type: 'meeting-table-8', label: 'Meeting Table (8)', category: 'Office', widthCm: 240, heightCm: 90, color: '#1c3d2e', emoji: '🗃' },
  { type: 'meeting-table-round', label: 'Round Table', category: 'Office', widthCm: 120, heightCm: 120, color: '#1c3d2e', emoji: '⭕' },
  { type: 'filing-cabinet', label: 'Filing Cabinet', category: 'Office', widthCm: 45, heightCm: 60, color: '#475569', emoji: '🗄' },
  { type: 'reception-desk', label: 'Reception Desk', category: 'Office', widthCm: 180, heightCm: 90, color: '#312e81', emoji: '🏢' },
  { type: 'cubicle', label: 'Cubicle', category: 'Office', widthCm: 150, heightCm: 150, color: '#292524', emoji: '📦' },
  { type: 'whiteboard', label: 'Whiteboard', category: 'Office', widthCm: 180, heightCm: 10, color: '#f1f5f9', emoji: '📋' },
  { type: 'printer', label: 'Printer / Copier', category: 'Office', widthCm: 55, heightCm: 55, color: '#374151', emoji: '🖨' },
  // Bathroom
  { type: 'bath-tub', label: 'Bathtub', category: 'Bathroom', widthCm: 170, heightCm: 75, color: '#bfdbfe', emoji: '🛁' },
  { type: 'toilet', label: 'Toilet', category: 'Bathroom', widthCm: 40, heightCm: 70, color: '#e5e7eb', emoji: '🚽' },
  { type: 'sink', label: 'Sink', category: 'Bathroom', widthCm: 60, heightCm: 50, color: '#dbeafe', emoji: '🚰' },
  { type: 'shower', label: 'Shower', category: 'Bathroom', widthCm: 90, heightCm: 90, color: '#bfdbfe', emoji: '🚿' },
];

export const CATEGORIES = [...new Set(FURNITURE_CATALOG.map(f => f.category))];

export function cmToPixels(cm: number, scale: number) {
  return (cm / 100) * scale;
}
