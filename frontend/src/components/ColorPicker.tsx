import React from 'react';

interface ColorPickerProps {
  label?: string;
  value: string;
  onChange: (color: string) => void;
  presetColors?: string[];
}

const DEFAULT_PRESETS = [
  '#FACC15', // Gold / Yellow
  '#FFFFFF', // White
  '#38BDF8', // Sky Blue
  '#06B6D4', // Cyan
  '#EC4899', // Pink
  '#EF4444', // Red
  '#10B981', // Emerald
  '#F97316', // Orange
  '#94A3B8', // Slate
  '#000000', // Black
];

export const ColorPicker: React.FC<ColorPickerProps> = ({
  label,
  value,
  onChange,
  presetColors = DEFAULT_PRESETS,
}) => {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
          {label}
        </label>
      )}

      <div className="flex items-center gap-2">
        {/* Native Color Input wrapper */}
        <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-studio-600 shrink-0 cursor-pointer shadow-inner">
          <input
            type="color"
            value={value.startsWith('#') && value.length === 7 ? value : '#FACC15'}
            onChange={(e) => onChange(e.target.value)}
            className="absolute -inset-2 w-12 h-12 cursor-pointer opacity-0"
          />
          <div
            className="w-full h-full"
            style={{ backgroundColor: value }}
          />
        </div>

        {/* Text Input */}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-24 px-2.5 py-1.5 bg-studio-950 border border-studio-700 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-studio-accent"
        />

        {/* Color Presets */}
        <div className="flex flex-wrap items-center gap-1.5 ml-auto">
          {presetColors.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => onChange(color)}
              title={color}
              className={`w-5 h-5 rounded-md border transition-transform ${
                value.toLowerCase() === color.toLowerCase()
                  ? 'scale-110 border-white ring-2 ring-studio-accent shadow-sm'
                  : 'border-white/20 hover:scale-105'
              }`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
