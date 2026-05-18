import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import type { Project, Variation, FurnitureItem, Comment, Reply, ActivePanel, ActiveTool, Wall, Room, DetectedFurniture } from './types';

const STORAGE_KEY = 'planloop-v2';

const defaultVariation = (): Variation => ({
  id: uuid(),
  name: 'Layout A — Base Plan',
  tag: 'draft',
  createdAt: new Date().toISOString(),
  items: [],
  walls: [],
  rooms: [],
  detectedFurniture: [],
  comments: [],
  scale: 100,
});

const defaultProject = (): Project => {
  const v = defaultVariation();
  return {
    id: uuid(),
    name: 'My Home Project',
    createdAt: new Date().toISOString(),
    variations: [v],
    activeVariationId: v.id,
  };
};

function loadSaved(): { project: Project; apiKey: string; activePanel: ActivePanel } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Patch any old variations missing new fields
    if (data.project?.variations) {
      data.project.variations = data.project.variations.map((v: Variation) => ({
        ...v,
        rooms: (v.rooms ?? []),
        detectedFurniture: (v.detectedFurniture ?? []),
        walls: (v.walls ?? []).map((w: import('./types').Wall) => ({ ...w, material: w.material ?? ('concrete' as const), height: w.height ?? 2.7 })),
      }));
    }
    return data;
  } catch {
    return null;
  }
}

const saved = loadSaved();

interface UndoEntry { items: FurnitureItem[]; walls: Wall[] }

interface AppState {
  project: Project;
  activePanel: ActivePanel;
  activeTool: ActiveTool;
  selectedItemIds: string[];
  selectedItemId: string | null;
  selectedWallIds: string[];
  selectedWallId: string | null;
  compareVariationId: string | null;
  undoStack: UndoEntry[];
  redoStack: UndoEntry[];
  pendingCommentPos: { x: number; y: number } | null;
  clipboard: FurnitureItem[];
  clipboardWalls: Wall[];
  apiKey: string;
  isDetecting: boolean;
  isWalkMode: boolean;

  setProjectName: (name: string) => void;
  setActiveVariation: (id: string) => void;
  forkVariation: (fromId: string) => void;
  renameVariation: (id: string, name: string) => void;
  tagVariation: (id: string, tag: Variation['tag']) => void;
  deleteVariation: (id: string) => void;
  setCompareVariation: (id: string | null) => void;
  setFloorPlan: (dataUrl: string, scale?: number) => void;
  setScale: (scale: number) => void;
  setDetectionResult: (walls: Wall[], rooms: Room[], detectedFurniture: DetectedFurniture[], imageWidth: number, imageHeight: number) => void;
  addItem: (item: FurnitureItem) => void;
  updateItem: (id: string, patch: Partial<FurnitureItem>) => void;
  deleteItem: (id: string) => void;
  deleteSelectedItems: () => void;
  deleteSelected: () => void;
  setSelectedItem: (id: string | null) => void;
  setSelectedItems: (ids: string[]) => void;
  toggleSelectItem: (id: string) => void;
  selectAll: () => void;
  setSelectedWall: (id: string | null) => void;
  setSelectedWalls: (ids: string[]) => void;
  setSelectionMarquee: (itemIds: string[], wallIds: string[]) => void;
  toggleSelectWall: (id: string) => void;
  addWall: (wall: Wall) => void;
  updateWall: (id: string, patch: Partial<Wall>) => void;
  deleteWall: (id: string) => void;
  addComment: (c: Omit<Comment, 'id' | 'createdAt' | 'resolved' | 'replies'>) => void;
  resolveComment: (id: string) => void;
  addReply: (commentId: string, reply: Omit<Reply, 'id' | 'createdAt'>) => void;
  setPendingCommentPos: (pos: { x: number; y: number } | null) => void;
  pushUndo: () => void;
  undo: () => void;
  redo: () => void;
  setActivePanel: (p: ActivePanel) => void;
  setActiveTool: (t: ActiveTool) => void;
  setApiKey: (key: string) => void;
  setIsDetecting: (v: boolean) => void;
  setWalkMode: (v: boolean) => void;
  copyItem: () => void;
  pasteItem: () => void;
  duplicateSelected: () => void;
  loadProject: (project: Project) => void;
}

const MAX_UNDO = 100;

const getAV = (project: Project): Variation =>
  project.variations.find(v => v.id === project.activeVariationId) ?? project.variations[0];

export const useStore = create<AppState>((set, get) => ({
  project: saved?.project ?? defaultProject(),
  activePanel: saved?.activePanel ?? 'furniture',
  apiKey: saved?.apiKey ?? '',
  activeTool: 'select',
  selectedItemIds: [],
  selectedItemId: null,
  selectedWallIds: [],
  selectedWallId: null,
  compareVariationId: null,
  undoStack: [],
  redoStack: [],
  pendingCommentPos: null,
  clipboard: [],
  clipboardWalls: [],
  isDetecting: false,
  isWalkMode: false,

  setProjectName: (name) =>
    set(s => ({ project: { ...s.project, name } })),

  setActiveVariation: (id) =>
    set(s => ({ project: { ...s.project, activeVariationId: id }, selectedItemId: null, selectedItemIds: [], selectedWallId: null, selectedWallIds: [] })),

  forkVariation: (fromId) => {
    const src = get().project.variations.find(v => v.id === fromId);
    if (!src) return;
    const newV: Variation = {
      rooms: [],
      detectedFurniture: [],
      ...JSON.parse(JSON.stringify(src)),
      id: uuid(),
      name: src.name + ' (copy)',
      tag: 'draft',
      createdAt: new Date().toISOString(),
    };
    set(s => ({
      project: {
        ...s.project,
        variations: [...s.project.variations, newV],
        activeVariationId: newV.id,
      },
    }));
  },

  renameVariation: (id, name) =>
    set(s => ({
      project: {
        ...s.project,
        variations: s.project.variations.map(v => v.id === id ? { ...v, name } : v),
      },
    })),

  tagVariation: (id, tag) =>
    set(s => ({
      project: {
        ...s.project,
        variations: s.project.variations.map(v => v.id === id ? { ...v, tag } : v),
      },
    })),

  deleteVariation: (id) => {
    const { project } = get();
    if (project.variations.length <= 1) return;
    const remaining = project.variations.filter(v => v.id !== id);
    set(s => ({
      project: {
        ...s.project,
        variations: remaining,
        activeVariationId: s.project.activeVariationId === id ? remaining[0].id : s.project.activeVariationId,
      },
    }));
  },

  setCompareVariation: (id) => set({ compareVariationId: id }),

  setFloorPlan: (dataUrl, scale) =>
    set(s => ({
      project: {
        ...s.project,
        variations: s.project.variations.map(v =>
          v.id === s.project.activeVariationId
            ? { ...v, floorPlanImage: dataUrl, scale: scale ?? v.scale }
            : v
        ),
      },
    })),

  setScale: (scale) =>
    set(s => ({
      project: {
        ...s.project,
        variations: s.project.variations.map(v =>
          v.id === s.project.activeVariationId ? { ...v, scale } : v
        ),
      },
    })),

  setDetectionResult: (walls, rooms, detectedFurniture, imageWidth, imageHeight) =>
    set(s => ({
      project: {
        ...s.project,
        variations: s.project.variations.map(v =>
          v.id === s.project.activeVariationId
            ? { ...v, walls, rooms, detectedFurniture, imageWidth, imageHeight }
            : v
        ),
      },
    })),

  pushUndo: () => {
    const { project } = get();
    const av = getAV(project);
    const entry: UndoEntry = {
      items: JSON.parse(JSON.stringify(av.items)),
      walls: JSON.parse(JSON.stringify(av.walls)),
    };
    set(s => ({
      undoStack: [...s.undoStack.slice(-MAX_UNDO + 1), entry],
      redoStack: [],
    }));
  },

  undo: () => {
    const { undoStack, redoStack, project } = get();
    if (!undoStack.length) return;
    const top = undoStack[undoStack.length - 1];
    const av = getAV(project);
    const redoEntry: UndoEntry = {
      items: JSON.parse(JSON.stringify(av.items)),
      walls: JSON.parse(JSON.stringify(av.walls)),
    };
    set({
      undoStack: undoStack.slice(0, -1),
      redoStack: [...redoStack, redoEntry],
      project: {
        ...project,
        variations: project.variations.map(v =>
          v.id === project.activeVariationId ? { ...v, items: top.items, walls: top.walls } : v
        ),
      },
    });
  },

  redo: () => {
    const { undoStack, redoStack, project } = get();
    if (!redoStack.length) return;
    const top = redoStack[redoStack.length - 1];
    const av = getAV(project);
    const undoEntry: UndoEntry = {
      items: JSON.parse(JSON.stringify(av.items)),
      walls: JSON.parse(JSON.stringify(av.walls)),
    };
    set({
      redoStack: redoStack.slice(0, -1),
      undoStack: [...undoStack, undoEntry],
      project: {
        ...project,
        variations: project.variations.map(v =>
          v.id === project.activeVariationId ? { ...v, items: top.items, walls: top.walls } : v
        ),
      },
    });
  },

  addItem: (item) => {
    get().pushUndo();
    set(s => ({
      project: {
        ...s.project,
        variations: s.project.variations.map(v =>
          v.id === s.project.activeVariationId
            ? { ...v, items: [...v.items, item] }
            : v
        ),
      },
    }));
  },

  updateItem: (id, patch) =>
    set(s => ({
      project: {
        ...s.project,
        variations: s.project.variations.map(v =>
          v.id === s.project.activeVariationId
            ? { ...v, items: v.items.map(i => i.id === id ? { ...i, ...patch } : i) }
            : v
        ),
      },
    })),

  deleteItem: (id) => {
    get().pushUndo();
    set(s => ({
      project: {
        ...s.project,
        variations: s.project.variations.map(v =>
          v.id === s.project.activeVariationId
            ? { ...v, items: v.items.filter(i => i.id !== id) }
            : v
        ),
      },
      selectedItemId: s.selectedItemId === id ? null : s.selectedItemId,
      selectedItemIds: s.selectedItemIds.filter(i => i !== id),
    }));
  },

  deleteSelectedItems: () => {
    const { selectedItemIds } = get();
    if (!selectedItemIds.length) return;
    get().pushUndo();
    const idSet = new Set(selectedItemIds);
    set(s => ({
      selectedItemIds: [],
      selectedItemId: null,
      project: {
        ...s.project,
        variations: s.project.variations.map(v =>
          v.id === s.project.activeVariationId
            ? { ...v, items: v.items.filter(i => !idSet.has(i.id)) }
            : v
        ),
      },
    }));
  },

  setSelectedItem: (id) => set({
    selectedItemId: id,
    selectedItemIds: id ? [id] : [],
    selectedWallId: null,
  }),

  setSelectedItems: (ids) => set({
    selectedItemIds: ids,
    selectedItemId: ids[0] ?? null,
    selectedWallId: null,
  }),

  toggleSelectItem: (id) => {
    const { selectedItemIds } = get();
    const next = selectedItemIds.includes(id)
      ? selectedItemIds.filter(i => i !== id)
      : [...selectedItemIds, id];
    set({ selectedItemIds: next, selectedItemId: next[0] ?? null, selectedWallId: null });
  },

  selectAll: () => {
    const av = getAV(get().project);
    const itemIds = av.items.map(i => i.id);
    const wallIds = av.walls.map(w => w.id);
    set({ selectedItemIds: itemIds, selectedItemId: itemIds[0] ?? null, selectedWallIds: wallIds, selectedWallId: wallIds[0] ?? null });
  },

  setSelectedWall: (id) => set({
    selectedWallId: id,
    selectedWallIds: id ? [id] : [],
    selectedItemId: null,
    selectedItemIds: [],
  }),

  setSelectedWalls: (ids) => set({
    selectedWallIds: ids,
    selectedWallId: ids[0] ?? null,
    selectedItemId: null,
    selectedItemIds: [],
  }),

  setSelectionMarquee: (itemIds, wallIds) => set({
    selectedItemIds: itemIds,
    selectedItemId: itemIds[0] ?? null,
    selectedWallIds: wallIds,
    selectedWallId: wallIds[0] ?? null,
  }),

  toggleSelectWall: (id) => {
    const { selectedWallIds } = get();
    const next = selectedWallIds.includes(id)
      ? selectedWallIds.filter(w => w !== id)
      : [...selectedWallIds, id];
    set({ selectedWallIds: next, selectedWallId: next[0] ?? null, selectedItemIds: [], selectedItemId: null });
  },

  deleteSelected: () => {
    const { selectedItemIds, selectedWallIds } = get();
    if (!selectedItemIds.length && !selectedWallIds.length) return;
    get().pushUndo();
    const iSet = new Set(selectedItemIds), wSet = new Set(selectedWallIds);
    set(s => ({
      selectedItemIds: [], selectedItemId: null,
      selectedWallIds: [], selectedWallId: null,
      project: {
        ...s.project,
        variations: s.project.variations.map(v =>
          v.id === s.project.activeVariationId
            ? { ...v, items: v.items.filter(i => !iSet.has(i.id)), walls: v.walls.filter(w => !wSet.has(w.id)) }
            : v
        ),
      },
    }));
  },

  updateWall: (id, patch) =>
    set(s => ({
      project: {
        ...s.project,
        variations: s.project.variations.map(v =>
          v.id === s.project.activeVariationId
            ? { ...v, walls: v.walls.map(w => w.id === id ? { ...w, ...patch } : w) }
            : v
        ),
      },
    })),

  addWall: (wall) => {
    get().pushUndo();
    set(s => ({
      project: {
        ...s.project,
        variations: s.project.variations.map(v =>
          v.id === s.project.activeVariationId
            ? { ...v, walls: [...v.walls, wall] }
            : v
        ),
      },
    }));
  },

  deleteWall: (id) => {
    get().pushUndo();
    set(s => ({
      selectedWallId: s.selectedWallId === id ? null : s.selectedWallId,
      project: {
        ...s.project,
        variations: s.project.variations.map(v =>
          v.id === s.project.activeVariationId
            ? { ...v, walls: v.walls.filter(w => w.id !== id) }
            : v
        ),
      },
    }));
  },

  addComment: (c) =>
    set(s => ({
      pendingCommentPos: null,
      project: {
        ...s.project,
        variations: s.project.variations.map(v =>
          v.id === s.project.activeVariationId
            ? {
                ...v,
                comments: [...v.comments, {
                  ...c,
                  id: uuid(),
                  createdAt: new Date().toISOString(),
                  resolved: false,
                  replies: [],
                }],
              }
            : v
        ),
      },
    })),

  resolveComment: (id) =>
    set(s => ({
      project: {
        ...s.project,
        variations: s.project.variations.map(v =>
          v.id === s.project.activeVariationId
            ? { ...v, comments: v.comments.map(c => c.id === id ? { ...c, resolved: !c.resolved } : c) }
            : v
        ),
      },
    })),

  addReply: (commentId, reply) =>
    set(s => ({
      project: {
        ...s.project,
        variations: s.project.variations.map(v =>
          v.id === s.project.activeVariationId
            ? {
                ...v,
                comments: v.comments.map(c =>
                  c.id === commentId
                    ? { ...c, replies: [...c.replies, { ...reply, id: uuid(), createdAt: new Date().toISOString() }] }
                    : c
                ),
              }
            : v
        ),
      },
    })),

  setPendingCommentPos: (pos) => set({ pendingCommentPos: pos }),
  setActivePanel: (p) => set({ activePanel: p }),
  setActiveTool: (t) => set({ activeTool: t }),
  setApiKey: (key) => set({ apiKey: key }),
  setIsDetecting: (v) => set({ isDetecting: v }),
  setWalkMode: (v) => set({ isWalkMode: v }),

  copyItem: () => {
    const { selectedItemIds, selectedWallIds, project } = get();
    const av = getAV(project);
    const items = av.items.filter(i => selectedItemIds.includes(i.id));
    const walls = av.walls.filter(w => selectedWallIds.includes(w.id));
    if (items.length || walls.length) set({ clipboard: items, clipboardWalls: walls });
  },

  pasteItem: () => {
    const { clipboard, clipboardWalls } = get();
    if (!clipboard.length && !clipboardWalls.length) return;
    get().pushUndo();
    const OFFSET = 20;
    const newItems = clipboard.map(item => ({ ...item, id: uuid(), x: item.x + OFFSET, y: item.y + OFFSET }));
    const newWalls = clipboardWalls.map(wall => ({
      ...wall, id: uuid(),
      x1: wall.x1 + OFFSET, y1: wall.y1 + OFFSET,
      x2: wall.x2 + OFFSET, y2: wall.y2 + OFFSET,
    }));
    const newItemIds = newItems.map(i => i.id);
    const newWallIds = newWalls.map(w => w.id);
    set(s => ({
      selectedItemIds: newItemIds,
      selectedItemId: newItemIds[0] ?? null,
      selectedWallIds: newWallIds,
      selectedWallId: newWallIds[0] ?? null,
      project: {
        ...s.project,
        variations: s.project.variations.map(v =>
          v.id === s.project.activeVariationId
            ? { ...v, items: [...v.items, ...newItems], walls: [...v.walls, ...newWalls] }
            : v
        ),
      },
    }));
  },

  duplicateSelected: () => {
    const { selectedItemIds, selectedWallIds, project } = get();
    if (!selectedItemIds.length && !selectedWallIds.length) return;
    get().pushUndo();
    const av = getAV(project);

    // Offset = bounding box width + 30px gap so the copy lands right beside the original
    const xs: number[] = [], ys: number[] = [];
    av.items.filter(i => selectedItemIds.includes(i.id)).forEach(i => {
      xs.push(i.x - i.width / 2, i.x + i.width / 2);
      ys.push(i.y - i.height / 2, i.y + i.height / 2);
    });
    av.walls.filter(w => selectedWallIds.includes(w.id)).forEach(w => {
      xs.push(w.x1, w.x2); ys.push(w.y1, w.y2);
    });
    const bboxW = xs.length ? Math.max(...xs) - Math.min(...xs) : 0;
    const OFFSET = Math.max(Math.round(bboxW + 30), 60);

    const newItems = av.items
      .filter(i => selectedItemIds.includes(i.id))
      .map(i => ({ ...i, id: uuid(), x: i.x + OFFSET }));
    const newWalls = av.walls
      .filter(w => selectedWallIds.includes(w.id))
      .map(w => ({ ...w, id: uuid(), x1: w.x1 + OFFSET, x2: w.x2 + OFFSET }));

    const newItemIds = newItems.map(i => i.id);
    const newWallIds = newWalls.map(w => w.id);
    set(s => ({
      selectedItemIds: newItemIds,
      selectedItemId: newItemIds[0] ?? null,
      selectedWallIds: newWallIds,
      selectedWallId: newWallIds[0] ?? null,
      project: {
        ...s.project,
        variations: s.project.variations.map(v =>
          v.id === s.project.activeVariationId
            ? { ...v, items: [...v.items, ...newItems], walls: [...v.walls, ...newWalls] }
            : v
        ),
      },
    }));
  },

  loadProject: (project) => {
    set({
      project,
      selectedItemId: null,
      selectedItemIds: [],
      selectedWallId: null,
      selectedWallIds: [],
      undoStack: [],
      redoStack: [],
    });
  },
}));

// Manual localStorage persistence — save on every state change
// Note: skips large base64 floorPlanImage to avoid quota issues
useStore.subscribe((state) => {
  try {
    const slim = {
      project: {
        ...state.project,
        variations: state.project.variations.map(v => ({
          ...v,
          // Strip base64 image from storage — re-import on each session
          floorPlanImage: undefined,
        })),
      },
      apiKey: state.apiKey,
      activePanel: state.activePanel,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
  } catch {
    // Storage quota exceeded — silently ignore
  }
});

// Stable selector — use this instead of store.activeVariation() in components
export const selectActiveVariation = (state: AppState): Variation =>
  getAV(state.project);

// Convenience hook — returns only the active variation, re-renders only when it changes
export const useActiveVariation = () => useStore(selectActiveVariation);
