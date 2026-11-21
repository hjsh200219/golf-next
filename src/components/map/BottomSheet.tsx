'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { resolveSnap, type SheetSnap } from '@/lib/utils/sheetSnap';

interface BottomSheetProps {
  snap: SheetSnap;
  onSnapChange: (snap: SheetSnap) => void;
  /** Always visible part: drag handle row + this content (date tabs, summary) */
  header: ReactNode;
  children: ReactNode;
  /** Reports the peek height so the map can keep pins clear of the sheet */
  onPeekHeight?: (px: number) => void;
  /** Reports the height the sheet covers (capped at half) so the map can center a pin above it */
  onVisibleHeight?: (px: number) => void;
}

const NEXT: Record<SheetSnap, SheetSnap> = { peek: 'half', half: 'full', full: 'peek' };
const LABEL: Record<SheetSnap, string> = { peek: '접힘', half: '절반', full: '전체' };
const DRAG_THRESHOLD = 6;

const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * Non-modal bottom sheet over the map with three snap points. Drag the top part
 * (handle + header) to resize; the handle button cycles sizes for keyboard and
 * screen-reader users. Body scrolls inside the visible height only.
 */
export default function BottomSheet({ snap, onSnapChange, header, children, onPeekHeight, onVisibleHeight }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const [containerH, setContainerH] = useState(0);
  const [peekH, setPeekH] = useState(0);
  const [dragVisible, setDragVisible] = useState<number | null>(null);
  const drag = useRef<{ startY: number; startVisible: number; lastY: number; lastT: number; v: number; active: boolean } | null>(null);

  useIsoLayoutEffect(() => {
    const parent = sheetRef.current?.parentElement;
    const top = topRef.current;
    if (!parent || !top || typeof ResizeObserver === 'undefined') return;
    const measure = () => {
      setContainerH(parent.clientHeight);
      setPeekH(top.offsetHeight);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(parent);
    ro.observe(top);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (peekH) onPeekHeight?.(peekH);
  }, [peekH, onPeekHeight]);

  const heights = useMemo<Record<SheetSnap, number>>(() => ({
    peek: peekH,
    half: Math.max(peekH, Math.round(containerH * 0.5)),
    full: Math.max(peekH, containerH - 12),
  }), [peekH, containerH]);
  const visible = dragVisible ?? heights[snap];
  const covered = Math.min(heights[snap], heights.half);
  useEffect(() => {
    onVisibleHeight?.(covered);
  }, [covered, onVisibleHeight]);
  const translate = containerH ? Math.max(0, containerH - visible) : 0;

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    drag.current = { startY: e.clientY, startVisible: heights[snap], lastY: e.clientY, lastT: e.timeStamp, v: 0, active: false };
  }, [heights, snap]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dy = d.startY - e.clientY;
    if (!d.active) {
      if (Math.abs(dy) < DRAG_THRESHOLD) return;
      d.active = true;
      (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    }
    const dt = Math.max(1, e.timeStamp - d.lastT);
    d.v = (d.lastY - e.clientY) / dt;
    d.lastY = e.clientY;
    d.lastT = e.timeStamp;
    setDragVisible(Math.min(heights.full, Math.max(heights.peek, d.startVisible + dy)));
  }, [heights]);

  const onPointerUp = useCallback(() => {
    const d = drag.current;
    drag.current = null;
    if (!d?.active || dragVisible == null) return;
    const next = resolveSnap(dragVisible, d.v, heights);
    setDragVisible(null);
    onSnapChange(next);
  }, [dragVisible, heights, onSnapChange]);

  return (
    <div
      ref={sheetRef}
      role="region"
      aria-label="예약 조회 시트"
      className={[
        'absolute inset-x-0 bottom-0 z-20 flex h-full flex-col rounded-t-3xl bg-white',
        'shadow-[0_-8px_32px_rgba(15,23,42,0.14)] ring-1 ring-black/5',
        dragVisible == null ? 'motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-[cubic-bezier(0.16,1,0.3,1)]' : '',
      ].join(' ')}
      style={{ transform: `translateY(${translate}px)` }}
    >
      <div
        ref={topRef}
        className="shrink-0 select-none [touch-action:pan-x]"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <button
          type="button"
          onClick={() => onSnapChange(NEXT[snap])}
          aria-label={`시트 크기 바꾸기 (지금 ${LABEL[snap]})`}
          aria-expanded={snap === 'full'}
          className="flex w-full items-center justify-center pb-1.5 pt-2.5 min-h-[28px] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-golf-primary/40 rounded-t-3xl"
        >
          <span aria-hidden className="h-1.5 w-10 rounded-full bg-gray-300" />
        </button>
        {header}
      </div>
      <div
        className="min-h-0 overflow-y-auto overscroll-contain border-t border-gray-100"
        style={{ height: Math.max(0, visible - peekH) }}
      >
        {children}
      </div>
    </div>
  );
}
