'use client';

import { useState, useEffect } from 'react';
import { useFilterStore } from '@/hooks/useFilters';

interface PriceFilterProps {
  minValue?: number | null;
  maxValue?: number | null;
  onMinChange?: (value: number | null) => void;
  onMaxChange?: (value: number | null) => void;
}

const PRICE_STEP = 10_000;
const PRICE_PLACEHOLDER_MIN = '최솟값';
const PRICE_PLACEHOLDER_MAX = '최댓값';

function parseInputPrice(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9]/g, '');
  if (!cleaned) return null;
  return parseInt(cleaned, 10);
}

export default function PriceFilter({
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
}: PriceFilterProps) {
  const storeMin = useFilterStore((s) => s.priceMin);
  const storeMax = useFilterStore((s) => s.priceMax);
  const storeSetMin = useFilterStore((s) => s.setPriceMin);
  const storeSetMax = useFilterStore((s) => s.setPriceMax);

  const effectiveMin = minValue !== undefined ? minValue : storeMin;
  const effectiveMax = maxValue !== undefined ? maxValue : storeMax;

  const [minInput, setMinInput] = useState(
    effectiveMin !== null ? String(effectiveMin) : '',
  );
  const [maxInput, setMaxInput] = useState(
    effectiveMax !== null ? String(effectiveMax) : '',
  );

  // Keep local inputs in sync when external value changes
  useEffect(() => {
    setMinInput(effectiveMin !== null ? String(effectiveMin) : '');
  }, [effectiveMin]);

  useEffect(() => {
    setMaxInput(effectiveMax !== null ? String(effectiveMax) : '');
  }, [effectiveMax]);

  const commitMin = (raw: string) => {
    const val = parseInputPrice(raw);
    if (onMinChange) {
      onMinChange(val);
    } else {
      storeSetMin(val);
    }
  };

  const commitMax = (raw: string) => {
    const val = parseInputPrice(raw);
    if (onMaxChange) {
      onMaxChange(val);
    } else {
      storeSetMax(val);
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">단위: 원</p>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <label htmlFor="price-min" className="sr-only">
            최소 가격
          </label>
          <input
            id="price-min"
            type="number"
            min={0}
            step={PRICE_STEP}
            placeholder={PRICE_PLACEHOLDER_MIN}
            value={minInput}
            onChange={(e) => setMinInput(e.target.value)}
            onBlur={(e) => commitMin(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          />
        </div>
        <span className="text-gray-400">~</span>
        <div className="flex-1">
          <label htmlFor="price-max" className="sr-only">
            최대 가격
          </label>
          <input
            id="price-max"
            type="number"
            min={0}
            step={PRICE_STEP}
            placeholder={PRICE_PLACEHOLDER_MAX}
            value={maxInput}
            onChange={(e) => setMaxInput(e.target.value)}
            onBlur={(e) => commitMax(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
          />
        </div>
      </div>
      {/* Quick presets */}
      <div className="flex flex-wrap gap-1">
        {[
          { label: '10만 이하', max: 100_000 },
          { label: '15만 이하', max: 150_000 },
          { label: '20만 이하', max: 200_000 },
        ].map(({ label, max }) => (
          <button
            key={label}
            type="button"
            onClick={() => {
              setMaxInput(String(max));
              commitMax(String(max));
            }}
            className="rounded border border-gray-300 px-2 py-0.5 text-xs text-gray-600 hover:border-green-400 hover:text-green-700 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-green-500"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
