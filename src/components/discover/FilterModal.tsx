'use client';

import React, { useState } from 'react';
import { X, SlidersHorizontal, Check } from 'lucide-react';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: {
    gender?: string;
    minAge?: number;
    maxAge?: number;
    maxDistanceKm?: number;
  }) => void;
  initialFilters: {
    gender?: string;
    minAge?: number;
    maxAge?: number;
    maxDistanceKm?: number;
  };
}

export function FilterModal({
  isOpen,
  onClose,
  onApply,
  initialFilters,
}: FilterModalProps) {
  const [gender, setGender] = useState<string>(initialFilters.gender || 'ALL');
  const [minAge, setMinAge] = useState<number>(initialFilters.minAge || 18);
  const [maxAge, setMaxAge] = useState<number>(initialFilters.maxAge || 40);
  const [maxDistanceKm, setMaxDistanceKm] = useState<number>(
    initialFilters.maxDistanceKm || 50
  );

  if (!isOpen) return null;

  const handleApply = () => {
    onApply({
      gender: gender === 'ALL' ? undefined : gender,
      minAge,
      maxAge,
      maxDistanceKm,
    });
    onClose();
  };

  const handleReset = () => {
    setGender('ALL');
    setMinAge(18);
    setMaxAge(50);
    setMaxDistanceKm(50);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm bg-[#1A202C] text-white rounded-3xl border border-gray-700/60 shadow-2xl p-5 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-700/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#F43F5E]/20 text-[#F43F5E] flex items-center justify-center">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Discovery Filters</h3>
              <p className="text-[10px] text-gray-400">Refine who you meet on SociLaLink</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-gray-800 text-gray-400 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filters Body */}
        <div className="mt-4 space-y-4">
          {/* Gender Preference */}
          <div>
            <label className="text-[11px] font-semibold text-gray-300 block mb-2">
              Interested in Meeting
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Women', value: 'FEMALE' },
                { label: 'Men', value: 'MALE' },
                { label: 'Everyone', value: 'ALL' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setGender(opt.value)}
                  className={`py-2 px-2.5 rounded-xl text-xs font-medium transition cursor-pointer flex items-center justify-center gap-1 ${
                    gender === opt.value
                      ? 'gradient-pink text-white font-semibold shadow-sm'
                      : 'bg-gray-800/80 text-gray-300 hover:bg-gray-800 border border-gray-700/40'
                  }`}
                >
                  {gender === opt.value && <Check className="w-3 h-3" />}
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Age Range Slider */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[11px] font-semibold text-gray-300">Age Range</label>
              <span className="text-xs font-bold text-[#F43F5E]">
                {minAge} - {maxAge} yrs
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-gray-400 w-7">Min:</span>
                <input
                  type="range"
                  min="18"
                  max="60"
                  value={minAge}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (val <= maxAge) setMinAge(val);
                  }}
                  className="w-full accent-[#F43F5E] cursor-pointer"
                />
                <span className="text-[10px] text-gray-300 w-5">{minAge}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-gray-400 w-7">Max:</span>
                <input
                  type="range"
                  min="18"
                  max="99"
                  value={maxAge}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (val >= minAge) setMaxAge(val);
                  }}
                  className="w-full accent-[#F43F5E] cursor-pointer"
                />
                <span className="text-[10px] text-gray-300 w-5">{maxAge}</span>
              </div>
            </div>
          </div>

          {/* Distance Radius */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[11px] font-semibold text-gray-300">Max Distance</label>
              <span className="text-xs font-bold text-[#F43F5E]">{maxDistanceKm} km</span>
            </div>
            <input
              type="range"
              min="5"
              max="200"
              step="5"
              value={maxDistanceKm}
              onChange={(e) => setMaxDistanceKm(Number(e.target.value))}
              className="w-full accent-[#F43F5E] cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-gray-500 mt-1">
              <span>5 km</span>
              <span>100 km</span>
              <span>200 km</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 pt-3 border-t border-gray-700/50 flex gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="w-1/3 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-medium transition cursor-pointer"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="w-2/3 py-2.5 rounded-xl gradient-pink text-white text-xs font-bold shadow-lg shadow-rose-900/40 hover:opacity-95 transition cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply Filters</span>
          </button>
        </div>
      </div>
    </div>
  );
}

