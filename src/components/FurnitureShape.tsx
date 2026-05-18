import { Group, Rect, Text, Line, Circle, Arc } from 'react-konva';
import type { FurnitureItem } from '../types';
import type Konva from 'konva';

interface Props {
  item: FurnitureItem;
  selected?: boolean;
  ghost?: boolean;
  opacity?: number;
  draggable?: boolean;
  onClick?: () => void;
  onDragEnd?: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onTransformEnd?: (e: Konva.KonvaEventObject<Event>) => void;
}

export function FurnitureShape({ item, selected, ghost, opacity = 1, draggable, onClick, onDragEnd, onTransformEnd }: Props) {
  const baseOpacity = ghost ? 0.35 : opacity;
  const strokeColor = selected ? '#3b82f6' : ghost ? '#f97316' : '#64748b';
  const strokeWidth = selected ? 2 : 1;

  const isDoor = item.type === 'door';
  const isWindow = item.type === 'window';
  const isOfficeChair = item.type === 'office-chair' || item.type === 'visitor-chair';
  const isRoundTable = item.type === 'meeting-table-round';
  const w = item.width, h = item.height;

  return (
    <Group
      id={item.id}
      x={item.x}
      y={item.y}
      width={w}
      height={h}
      rotation={item.rotation}
      offsetX={w / 2}
      offsetY={h / 2}
      draggable={draggable}
      onClick={onClick}
      onDragEnd={onDragEnd}
      onTransformEnd={onTransformEnd}
      opacity={baseOpacity}
    >
      {isOfficeChair ? (
        <>
          {/* Backrest across top */}
          <Rect
            x={w * 0.1} y={0}
            width={w * 0.8} height={h * 0.22}
            fill={item.color} stroke={strokeColor} strokeWidth={strokeWidth} cornerRadius={2}
            shadowBlur={selected ? 8 : 0} shadowColor="#3b82f6" shadowOpacity={0.5}
          />
          {/* Seat circle */}
          <Circle
            x={w / 2} y={h * 0.62}
            radius={Math.min(w, h) * 0.36}
            fill={item.color} stroke={strokeColor} strokeWidth={strokeWidth}
          />
          {/* Armrests */}
          <Rect x={0} y={h * 0.28} width={w * 0.14} height={h * 0.28} fill={item.color} stroke={strokeColor} strokeWidth={0.5} cornerRadius={1} />
          <Rect x={w * 0.86} y={h * 0.28} width={w * 0.14} height={h * 0.28} fill={item.color} stroke={strokeColor} strokeWidth={0.5} cornerRadius={1} />
        </>
      ) : isRoundTable ? (
        <>
          <Circle
            x={w / 2} y={h / 2}
            radius={Math.min(w, h) / 2 - strokeWidth / 2}
            fill={item.color} stroke={strokeColor} strokeWidth={strokeWidth}
            shadowBlur={selected ? 10 : 0} shadowColor="#3b82f6" shadowOpacity={0.5}
          />
          <Text
            text={item.label} width={w} height={h}
            align="center" verticalAlign="middle"
            fontSize={Math.min(12, w / 8, h / 3)} fill="#f1f5f9" listening={false}
          />
        </>
      ) : (
        <>
          <Rect
            width={w} height={h}
            fill={item.color} stroke={strokeColor} strokeWidth={strokeWidth}
            cornerRadius={4}
            shadowBlur={selected ? 10 : 0} shadowColor="#3b82f6" shadowOpacity={0.5}
          />
          {isDoor && <Line points={[0, 0, w, h]} stroke="#94a3b8" strokeWidth={1} dash={[4, 4]} />}
          {isWindow && (
            <>
              <Line points={[w * 0.1, h / 2, w * 0.9, h / 2]} stroke="#93c5fd" strokeWidth={2} />
              <Line points={[w / 2, h * 0.1, w / 2, h * 0.9]} stroke="#93c5fd" strokeWidth={2} />
            </>
          )}
          <Text
            text={item.label} width={w} height={h}
            align="center" verticalAlign="middle"
            fontSize={Math.min(12, w / 8, h / 3)} fill="#f1f5f9" listening={false}
          />
        </>
      )}
      {isOfficeChair && (
        <Text text={item.label} width={w} y={h * 0.88} align="center"
          fontSize={Math.min(9, w / 6)} fill="#94a3b8" listening={false} />
      )}
      {item.locked && <Text text="🔒" x={2} y={2} fontSize={10} listening={false} />}
    </Group>
  );
}
