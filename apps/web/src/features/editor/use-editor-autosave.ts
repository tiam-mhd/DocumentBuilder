'use client';

import { useEffect, useRef } from 'react';
import { updateDocument } from '@/shared/api/documents';
import { useEditorStore } from './store/editor-store';

const DEBOUNCE_MS = 800;

/** Debounced PATCH of document body — never triggers PDF. */
export function useEditorAutosave(writable: boolean) {
  const dirty = useEditorStore((s) => s.dirty);
  const body = useEditorStore((s) => s.body);
  const businessId = useEditorStore((s) => s.businessId);
  const documentId = useEditorStore((s) => s.documentId);
  const markSaving = useEditorStore((s) => s.markSaving);
  const markSaved = useEditorStore((s) => s.markSaved);
  const markSaveError = useEditorStore((s) => s.markSaveError);
  const markSaveIdle = useEditorStore((s) => s.markSaveIdle);
  const markReadonly = useEditorStore((s) => s.markReadonly);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bodyRef = useRef(body);
  bodyRef.current = body;

  useEffect(() => {
    if (!writable) {
      markReadonly();
    }
  }, [writable, markReadonly]);

  useEffect(() => {
    if (!writable || !dirty || !businessId || !documentId || !body) {
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void (async () => {
        const snapshot = bodyRef.current;
        if (!snapshot) return;
        const fingerprint = JSON.stringify(snapshot);
        markSaving();
        try {
          await updateDocument(businessId, documentId, {
            title: snapshot.title,
            locale: snapshot.locale,
            body: snapshot,
          });
          const stillSame = JSON.stringify(bodyRef.current) === fingerprint;
          if (stillSame) markSaved();
          else markSaveIdle();
        } catch {
          markSaveError();
        }
      })();
    }, DEBOUNCE_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [
    dirty,
    body,
    businessId,
    documentId,
    writable,
    markSaving,
    markSaved,
    markSaveError,
    markSaveIdle,
  ]);
}

export const EDITOR_AUTOSAVE_DEBOUNCE_MS = DEBOUNCE_MS;
