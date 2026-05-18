import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuid } from 'uuid';
import type { Wall, Room, DetectedFurniture } from '../types';

export interface DetectionResult {
  walls: Wall[];
  rooms: Room[];
  detectedFurniture: DetectedFurniture[];
  imageWidth: number;
  imageHeight: number;
}

const ROOM_COLORS = [
  '#1e3a5f', '#1e3d2f', '#3d1e1e', '#2d1e3d', '#1e2d3d',
  '#3d2d1e', '#1e3d3a', '#3a1e3d', '#2a3d1e', '#3d1e2a',
];

const PROMPT = `You are analyzing an architectural floor plan image. Extract all spatial elements and return ONLY valid JSON — no markdown, no commentary.

Return this exact JSON structure:
{
  "imageWidthPx": <natural pixel width of the image — use 1000 if unknown>,
  "imageHeightPx": <natural pixel height of the image — use 750 if unknown>,
  "rooms": [
    {
      "label": "<room name exactly as labeled, e.g. 'LOUNGE SITTING', 'DIRECTORS CABIN 1'>",
      "xPct": <left edge of room as % of image width, 0-100>,
      "yPct": <top edge of room as % of image height, 0-100>,
      "wPct": <room width as % of image width, 0-100>,
      "hPct": <room height as % of image height, 0-100>
    }
  ],
  "walls": [
    {
      "x1Pct": <wall start x as % of image width>,
      "y1Pct": <wall start y as % of image height>,
      "x2Pct": <wall end x as % of image width>,
      "y2Pct": <wall end y as % of image height>,
      "thicknessPx": <wall thickness in pixels, usually 4-12>
    }
  ],
  "furniture": [
    {
      "label": "<detected item name, e.g. 'Desk', 'Chair', 'Conference Table'>",
      "xPct": <center x as % of image width>,
      "yPct": <center y as % of image height>,
      "wPct": <width as % of image width>,
      "hPct": <height as % of image height>
    }
  ]
}

Rules:
- Identify ALL labeled rooms you can see (offices, cabins, reception, corridors, etc.)
- For walls: trace the major outer perimeter walls and key interior dividing walls. Aim for 20-60 wall segments
- For furniture: detect desks, chairs, tables, sofas — label from what's printed, or guess from shape
- Use percentage coordinates (0-100) relative to the full image dimensions
- The JSON must be parseable with JSON.parse() — no trailing commas, no comments`;

export async function detectFloorPlan(
  apiKey: string,
  imageDataUrl: string,
  naturalWidth: number,
  naturalHeight: number,
): Promise<DetectionResult> {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });

  const base64 = imageDataUrl.split(',')[1];
  const mimeType = imageDataUrl.split(';')[0].split(':')[1] as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif';

  const response = await client.messages.create({
    model: 'claude-opus-4-7',
    max_tokens: 8192,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mimeType, data: base64 },
          },
          { type: 'text', text: PROMPT },
        ],
      },
    ],
  });

  const raw = (response.content[0] as { type: string; text: string }).text.trim();
  // Strip any accidental markdown fences
  const jsonStr = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  const data = JSON.parse(jsonStr);

  const iw = naturalWidth;
  const ih = naturalHeight;

  const walls: Wall[] = (data.walls ?? []).map((w: { x1Pct: number; y1Pct: number; x2Pct: number; y2Pct: number; thicknessPx: number }) => ({
    id: uuid(),
    x1: (w.x1Pct / 100) * iw,
    y1: (w.y1Pct / 100) * ih,
    x2: (w.x2Pct / 100) * iw,
    y2: (w.y2Pct / 100) * ih,
    thickness: Math.max(3, Math.min(20, w.thicknessPx ?? 6)),
  }));

  const rooms: Room[] = (data.rooms ?? []).map((r: { label: string; xPct: number; yPct: number; wPct: number; hPct: number }, i: number) => ({
    id: uuid(),
    label: r.label,
    x: (r.xPct / 100) * iw,
    y: (r.yPct / 100) * ih,
    width: (r.wPct / 100) * iw,
    height: (r.hPct / 100) * ih,
    color: ROOM_COLORS[i % ROOM_COLORS.length],
  }));

  const detectedFurniture: DetectedFurniture[] = (data.furniture ?? []).map((f: { label: string; xPct: number; yPct: number; wPct: number; hPct: number }) => ({
    id: uuid(),
    label: f.label,
    x: (f.xPct / 100) * iw - ((f.wPct / 100) * iw) / 2,
    y: (f.yPct / 100) * ih - ((f.hPct / 100) * ih) / 2,
    width: Math.max(10, (f.wPct / 100) * iw),
    height: Math.max(10, (f.hPct / 100) * ih),
  }));

  return { walls, rooms, detectedFurniture, imageWidth: iw, imageHeight: ih };
}
