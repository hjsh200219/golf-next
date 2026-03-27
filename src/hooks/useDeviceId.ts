'use client';

import { useState, useEffect } from 'react';

const DEVICE_ID_KEY = 'golf_device_id';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback UUID v4 implementation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function useDeviceId(): string | null {
  const [deviceId, setDeviceId] = useState<string | null>(null);

  useEffect(() => {
    try {
      let id = localStorage.getItem(DEVICE_ID_KEY);
      if (!id) {
        id = generateUUID();
        localStorage.setItem(DEVICE_ID_KEY, id);
      }
      setDeviceId(id);
    } catch {
      // localStorage not available (SSR or private mode)
      setDeviceId(null);
    }
  }, []);

  return deviceId;
}
