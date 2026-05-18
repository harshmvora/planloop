export type ItemType =
  | 'bed-single' | 'bed-double' | 'bed-queen' | 'bed-king'
  | 'sofa-2' | 'sofa-3' | 'sofa-l'
  | 'dining-4' | 'dining-6' | 'dining-8'
  | 'wardrobe' | 'desk' | 'chair' | 'tv-unit'
  | 'kitchen-counter' | 'kitchen-island' | 'refrigerator' | 'stove'
  | 'bath-tub' | 'toilet' | 'sink' | 'shower'
  | 'door' | 'window'
  | 'office-desk' | 'office-desk-l' | 'office-chair' | 'visitor-chair'
  | 'meeting-table-4' | 'meeting-table-6' | 'meeting-table-8' | 'meeting-table-round'
  | 'filing-cabinet' | 'reception-desk' | 'cubicle' | 'whiteboard' | 'printer'
  | 'wall';

export interface FurnitureItem {
  id: string;
  type: ItemType;
  label: string;
  x: number;
  y: number;
  width: number;  // in pixels (scaled from real cm)
  height: number;
  rotation: number;
  color: string;
  locked: boolean;
  group?: string;
}

export type WallMaterial = 'concrete' | 'brick' | 'glass' | 'wood' | 'drywall' | 'steel';

export interface Wall {
  id: string;
  x1: number; y1: number;
  x2: number; y2: number;
  thickness: number;
  material: WallMaterial;
  height: number; // metres
}

export interface Comment {
  id: string;
  x: number;
  y: number;
  text: string;
  author: string;
  createdAt: string;
  resolved: boolean;
  replies: Reply[];
  imageUrl?: string;
}

export interface Reply {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

export type VariationTag = 'draft' | 'submitted' | 'approved' | 'rejected';

export interface Room {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

export interface DetectedFurniture {
  id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Variation {
  id: string;
  name: string;
  tag: VariationTag;
  createdAt: string;
  items: FurnitureItem[];
  walls: Wall[];
  rooms: Room[];
  detectedFurniture: DetectedFurniture[];
  comments: Comment[];
  floorPlanImage?: string;  // base64 data URL
  scale: number;            // pixels per meter
  imageWidth?: number;
  imageHeight?: number;
}

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  variations: Variation[];
  activeVariationId: string;
}

export type ActivePanel = 'furniture' | 'comments' | 'variations' | 'export' | '3d';
export type ActiveTool = 'select' | 'wall' | 'comment-pin' | 'pan';
