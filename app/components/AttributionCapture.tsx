'use client';
import { useEffect } from 'react';
import { captureAttribution } from '@/lib/attribution';

// Ничего не рендерит — просто один раз на первой загрузке страницы
// сохраняет UTM-метки/реферер, если они ещё не были сохранены раньше.
export default function AttributionCapture() {
  useEffect(() => { captureAttribution(); }, []);
  return null;
}
