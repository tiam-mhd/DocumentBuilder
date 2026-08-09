'use client';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { BlockNode } from '@vdb/document-schema';
import { useTranslations } from 'next-intl';
import { useEditorStore } from './store/editor-store';
import styles from './flow-canvas.module.css';

type Props = {
  blocks: BlockNode[];
  selectedBlockId: string | null;
  disabled: boolean;
};

function SortableRow({
  block,
  selected,
  disabled,
  label,
}: {
  block: BlockNode;
  selected: boolean;
  disabled: boolean;
  label: string;
}) {
  const t = useTranslations('editor');
  const selectBlock = useEditorStore((s) => s.selectBlock);
  const removeBlock = useEditorStore((s) => s.removeBlock);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
  };

  const summary =
    block.type === 'text'
      ? String(block.props.content ?? '').slice(0, 48) || t('emptyText')
      : block.type === 'section'
        ? String(block.props.title ?? '') || t('sectionUntitled')
        : block.type === 'repeater'
          ? String(block.props.source ?? '')
          : label;

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`${styles.row} ${selected ? styles.rowSelected : ''}`}
    >
      <button
        type="button"
        className={styles.handle}
        disabled={disabled}
        aria-label={t('dragHandle')}
        {...attributes}
        {...listeners}
      >
        ⋮⋮
      </button>
      <button
        type="button"
        className={styles.rowMain}
        onClick={() => selectBlock(block.id)}
      >
        <span className={styles.type}>{label}</span>
        <span className={styles.summary}>{summary}</span>
        {block.when ? (
          <span className={styles.whenBadge}>{t('visibilityBadge')}</span>
        ) : null}
      </button>
      <button
        type="button"
        className={styles.remove}
        disabled={disabled}
        onClick={() => removeBlock(block.id)}
      >
        {t('remove')}
      </button>
    </li>
  );
}

export function FlowCanvas({ blocks, selectedBlockId, disabled }: Props) {
  const tBlocks = useTranslations('blocks');
  const t = useTranslations('editor');
  const reorderTopLevel = useEditorStore((s) => s.reorderTopLevel);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    reorderTopLevel(String(active.id), String(over.id));
  }

  if (blocks.length === 0) {
    return <p className={styles.empty}>{t('emptyFlow')}</p>;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
    >
      <SortableContext
        items={blocks.map((b) => b.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className={styles.list} aria-label={t('flowList')}>
          {blocks.map((block) => (
            <SortableRow
              key={block.id}
              block={block}
              selected={selectedBlockId === block.id}
              disabled={disabled}
              label={tBlocks(block.type)}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

/** Exported for tests / future nested DnD — avoid unused import of arrayMove. */
export function reorderIds(ids: string[], activeId: string, overId: string) {
  const from = ids.indexOf(activeId);
  const to = ids.indexOf(overId);
  if (from < 0 || to < 0) return ids;
  return arrayMove(ids, from, to);
}
