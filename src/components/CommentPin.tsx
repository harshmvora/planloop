import { Group, Circle, Text } from 'react-konva';
import type { Comment } from '../types';

interface Props {
  comment: Comment;
  index: number;
  onClick: () => void;
}

export function CommentPin({ comment, index, onClick }: Props) {
  const color = comment.resolved ? '#22c55e' : '#f59e0b';
  return (
    <Group x={comment.x} y={comment.y} onClick={onClick}>
      <Circle radius={14} fill={color} stroke="#1e293b" strokeWidth={2} shadowBlur={6} shadowColor={color} shadowOpacity={0.5} />
      <Text
        text={String(index)}
        width={28}
        height={28}
        offsetX={14}
        offsetY={14}
        align="center"
        verticalAlign="middle"
        fontSize={11}
        fontStyle="bold"
        fill="#fff"
        listening={false}
      />
    </Group>
  );
}
