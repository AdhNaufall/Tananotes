"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2 } from 'lucide-react';

/* ─── Color math helpers ─────────────────────────────────────── */
function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60)       { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else              { r = c; g = 0; b = x; }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  if (h.length !== 6) return [0, 0, 0];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const v = max;
  const s = max === 0 ? 0 : (max - min) / max;
  let h = 0;
  if (max !== min) {
    const d = max - min;
    if (max === r)      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else                h = ((r - g) / d + 4) / 6;
  }
  return [h * 360, s, v];
}

/* ─── Grid palette ───────────────────────────────────────────── */
const GRID_COLORS: string[][] = (() => {
  const rows: string[][] = [];
  rows.push(Array.from({ length: 11 }, (_, i) => {
    const v = Math.round(255 - (255 * i) / 10);
    return rgbToHex(v, v, v);
  }));
  const hues = [0, 30, 60, 120, 160, 200, 240, 270, 300, 330];
  hues.forEach(hue => {
    const row: string[] = [];
    for (let col = 0; col < 11; col++) {
      const s = col < 6 ? 0.2 + col * 0.16 : 1;
      const v = col < 6 ? 1 : 1 - (col - 6) * 0.14;
      const [r, g, b] = hsvToRgb(hue, Math.min(s, 1), Math.max(v, 0));
      row.push(rgbToHex(r, g, b));
    }
    rows.push(row);
  });
  return rows;
})();

interface ColorPickerProps {
  currentColor: string;
  savedColors: string[];
  onColorChange: (hex: string) => void;
  onSaveColor: (hex: string) => void;
  onDeleteColor: (hex: string) => void;
  onClose: () => void;
}

type Tab = 'Grid' | 'Spectrum' | 'Sliders';

export default function ColorPicker({ currentColor, savedColors, onColorChange, onSaveColor, onDeleteColor, onClose }: ColorPickerProps) {
  const [tab, setTab] = useState<Tab>('Spectrum');
  const [deleteMode, setDeleteMode] = useState(false);

  const initRgb = hexToRgb(currentColor || '#000000');
  const initHsv = rgbToHsv(...initRgb);
  const [hue, setHue] = useState(initHsv[0]);
  const [sat, setSat] = useState(initHsv[1]);
  const [val, setVal] = useState(initHsv[2]);
  const [opacity, setOpacity] = useState(100);

  const derivedHex = rgbToHex(...hsvToRgb(hue, sat, val));

  const emit = useCallback((hex: string) => { onColorChange(hex); }, [onColorChange]);

  
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  
  const specCanvasRef  = useRef<HTMLCanvasElement>(null);
  const hueCanvasRef   = useRef<HTMLCanvasElement>(null);
  const specWrapRef    = useRef<HTMLDivElement>(null);
  const hueWrapRef     = useRef<HTMLDivElement>(null);
  const draggingSpec   = useRef(false);
  const draggingHue    = useRef(false);

 
  const hueRef = useRef(hue);
  const satRef = useRef(sat);
  const valRef = useRef(val);
  useEffect(() => { hueRef.current = hue; }, [hue]);
  useEffect(() => { satRef.current = sat; }, [sat]);
  useEffect(() => { valRef.current = val; }, [val]);

  /* ── Draw canvases ── */
  const drawSpectrum = useCallback(() => {
    const canvas = specCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const w = canvas.width, h = canvas.height;
    const [hr, hg, hb] = hsvToRgb(hue, 1, 1);
    const gradH = ctx.createLinearGradient(0, 0, w, 0);
    gradH.addColorStop(0, '#ffffff');
    gradH.addColorStop(1, `rgb(${hr},${hg},${hb})`);
    ctx.fillStyle = gradH;
    ctx.fillRect(0, 0, w, h);
    const gradV = ctx.createLinearGradient(0, 0, 0, h);
    gradV.addColorStop(0, 'rgba(0,0,0,0)');
    gradV.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = gradV;
    ctx.fillRect(0, 0, w, h);
  }, [hue]);

  const drawHueSlider = useCallback(() => {
    const canvas = hueCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const w = canvas.width, h = canvas.height;
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    for (let i = 0; i <= 360; i += 30) {
      const [r, g, b] = hsvToRgb(i, 1, 1);
      grad.addColorStop(i / 360, `rgb(${r},${g},${b})`);
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }, []);

  useEffect(() => { drawSpectrum(); }, [drawSpectrum, tab]);
  useEffect(() => { drawHueSlider(); }, [drawHueSlider, tab]);

  
  useEffect(() => {
    const el = specWrapRef.current;
    if (!el) return;

    const getXY = (e: TouchEvent | MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      return {
        x: Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)),
        y: Math.max(0, Math.min(1, (clientY - rect.top)  / rect.height)),
      };
    };

    const onStart = (e: TouchEvent | MouseEvent) => {
      draggingSpec.current = true;
      e.preventDefault();
      const { x, y } = getXY(e);
      setSat(x); setVal(1 - y);
      emit(rgbToHex(...hsvToRgb(hueRef.current, x, 1 - y)));
    };
    const onMove = (e: TouchEvent | MouseEvent) => {
      if (!draggingSpec.current) return;
      e.preventDefault();
      const { x, y } = getXY(e);
      setSat(x); setVal(1 - y);
      emit(rgbToHex(...hsvToRgb(hueRef.current, x, 1 - y)));
    };
    const onEnd = () => { draggingSpec.current = false; };

    el.addEventListener('mousedown',  onStart, { passive: false });
    el.addEventListener('mousemove',  onMove,  { passive: false });
    el.addEventListener('touchstart', onStart, { passive: false });
    el.addEventListener('touchmove',  onMove,  { passive: false });
    window.addEventListener('mouseup',  onEnd);
    window.addEventListener('touchend', onEnd);
    return () => {
      el.removeEventListener('mousedown',  onStart);
      el.removeEventListener('mousemove',  onMove);
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove',  onMove);
      window.removeEventListener('mouseup',  onEnd);
      window.removeEventListener('touchend', onEnd);
    };
  }, [emit, tab]);

  useEffect(() => {
    const el = hueWrapRef.current;
    if (!el) return;

    const getX = (e: TouchEvent | MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    };

    const onStart = (e: TouchEvent | MouseEvent) => {
      draggingHue.current = true;
      e.preventDefault();
      const x = getX(e);
      const newHue = x * 360;
      setHue(newHue);
      emit(rgbToHex(...hsvToRgb(newHue, satRef.current, valRef.current)));
    };
    const onMove = (e: TouchEvent | MouseEvent) => {
      if (!draggingHue.current) return;
      e.preventDefault();
      const x = getX(e);
      const newHue = x * 360;
      setHue(newHue);
      emit(rgbToHex(...hsvToRgb(newHue, satRef.current, valRef.current)));
    };
    const onEnd = () => { draggingHue.current = false; };

    el.addEventListener('mousedown',  onStart, { passive: false });
    el.addEventListener('mousemove',  onMove,  { passive: false });
    el.addEventListener('touchstart', onStart, { passive: false });
    el.addEventListener('touchmove',  onMove,  { passive: false });
    window.addEventListener('mouseup',  onEnd);
    window.addEventListener('touchend', onEnd);
    return () => {
      el.removeEventListener('mousedown',  onStart);
      el.removeEventListener('mousemove',  onMove);
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove',  onMove);
      window.removeEventListener('mouseup',  onEnd);
      window.removeEventListener('touchend', onEnd);
    };
  }, [emit, tab]);

  /* ── RGB Sliders ── */
  const [r, g, b] = hexToRgb(derivedHex);
  const setRGB = (nr: number, ng: number, nb: number) => {
    const hex = rgbToHex(nr, ng, nb);
    const [nh, ns, nv] = rgbToHsv(nr, ng, nb);
    setHue(nh); setSat(ns); setVal(nv);
    emit(hex);
  };

  const cursorX = `${sat * 100}%`;
  const cursorY = `${(1 - val) * 100}%`;
  const hueX    = `${(hue / 360) * 100}%`;

  if (typeof window === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel — prevent any touch from bleeding through */}
      <div
        className="relative z-10 w-[320px] bg-gradient-to-br from-[#2a2a2a] to-[#1e1e1e] rounded-3xl shadow-2xl overflow-hidden mb-6 sm:mb-0 border-2 border-white/10"
        onTouchMove={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 bg-black/20">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl border-2 border-white/30 shadow-lg" 
              style={{ backgroundColor: derivedHex }}
            />
            <div>
              <span className="block text-white font-bold text-base tracking-wide">Color Picker</span>
              <span className="block text-white/50 text-xs font-mono uppercase mt-0.5">{derivedHex}</span>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-white/60 hover:text-white hover:bg-white/10 transition-all p-2 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex mx-4 mb-4 bg-black/30 rounded-xl p-1.5 gap-1.5 border border-white/5">
          {(['Grid', 'Spectrum', 'Sliders'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                tab === t 
                  ? 'bg-gradient-to-br from-[#3b82f6] to-[#2563eb] text-white shadow-lg' 
                  : 'text-white/40 hover:text-white/70 hover:bg-white/5'
              }`}
            >{t}</button>
          ))}
        </div>

        {/* ── Grid ── */}
        {tab === 'Grid' && (
          <div className="px-4 pb-3">
            <div className="flex flex-col gap-1">
              {GRID_COLORS.map((row, ri) => (
                <div key={ri} className="flex gap-1">
                  {row.map((col, ci) => (
                    <button key={ci} onClick={() => {
                        const [nr, ng, nb] = hexToRgb(col);
                        const [nh, ns, nv] = rgbToHsv(nr, ng, nb);
                        setHue(nh); setSat(ns); setVal(nv); emit(col);
                      }}
                      className="flex-1 aspect-square rounded-lg border-2 border-white/20 hover:scale-110 hover:border-white/50 transition-all active:scale-95 shadow-md"
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Spectrum ── */}
        {tab === 'Spectrum' && (
          <div className="px-4 pb-3">
            {/* Spectrum canvas */}
            <div
              ref={specWrapRef}
              className="relative rounded-xl overflow-hidden mb-4 cursor-crosshair select-none border-2 border-white/10 shadow-lg"
              style={{ height: 170, touchAction: 'none' }}
            >
              <canvas ref={specCanvasRef} width={284} height={170} className="w-full h-full block pointer-events-none" />
              <div
                className="absolute w-5 h-5 rounded-full border-3 border-white pointer-events-none"
                style={{
                  left: cursorX, top: cursorY,
                  transform: 'translate(-50%, -50%)',
                  boxShadow: '0 0 0 2px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.4)',
                  backgroundColor: derivedHex,
                }}
              />
            </div>

            {/* Hue slider */}
            <div
              ref={hueWrapRef}
              className="relative h-6 rounded-full overflow-hidden mb-2 cursor-pointer select-none border-2 border-white/10 shadow-md"
              style={{ touchAction: 'none' }}
            >
              <canvas ref={hueCanvasRef} width={284} height={24} className="w-full h-full block pointer-events-none" />
              <div
                className="absolute top-1 bottom-1 w-5 rounded-full border-3 border-white pointer-events-none"
                style={{
                  left: hueX, transform: 'translateX(-50%)',
                  backgroundColor: rgbToHex(...hsvToRgb(hue, 1, 1)),
                  boxShadow: '0 0 0 2px rgba(0,0,0,0.6), 0 2px 4px rgba(0,0,0,0.3)',
                }}
              />
            </div>
          </div>
        )}

        {/* ── Sliders (RGB) ── */}
        {tab === 'Sliders' && (
          <div className="px-4 pb-3 flex flex-col gap-3">
            {([
              { label: 'R', value: r, color: '#EF4444', setter: (v: number) => setRGB(v, g, b) },
              { label: 'G', value: g, color: '#22C55E', setter: (v: number) => setRGB(r, v, b) },
              { label: 'B', value: b, color: '#3B82F6', setter: (v: number) => setRGB(r, g, v) },
            ] as const).map(({ label, value, color, setter }) => (
              <div key={label} className="flex items-center gap-3">
                <span className="text-white font-bold text-sm w-5">{label}</span>
                <div className="flex-1 relative h-5 rounded-full overflow-hidden cursor-pointer border-2 border-white/10 shadow-inner"
                  style={{ background: `linear-gradient(to right, #000, ${color})` }}
                  onClick={e => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setter(Math.round(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * 255));
                  }}
                >
                  <div className="absolute top-0.5 bottom-0.5 w-4 rounded-full border-2 border-white pointer-events-none"
                    style={{ 
                      left: `${(value / 255) * 100}%`, 
                      transform: 'translateX(-50%)', 
                      backgroundColor: color, 
                      boxShadow: '0 0 0 1.5px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.3)' 
                    }}
                  />
                </div>
                <input type="number" min={0} max={255} value={value}
                  onChange={e => setter(Math.max(0, Math.min(255, parseInt(e.target.value) || 0)))}
                  className="w-12 bg-black/40 text-white text-xs text-center rounded-lg px-2 py-1.5 border-2 border-white/10 outline-none focus:border-white/30 font-mono"
                />
              </div>
            ))}
          </div>
        )}

        {/* Opacity */}
        <div className="px-4 mt-3 pb-3 border-t border-white/5 pt-3">
          <div className="flex items-center gap-3">
            <span className="text-white/50 text-xs font-bold uppercase tracking-wider w-16">Opacity</span>
            <div className="flex-1 relative h-5 rounded-full overflow-hidden cursor-pointer border-2 border-white/10"
              style={{
                background: `linear-gradient(to right, transparent, ${derivedHex}),
                             repeating-conic-gradient(#666 0% 25%, #444 0% 50%) 0 0 / 12px 12px`,
              }}
              onClick={e => {
                const rect = e.currentTarget.getBoundingClientRect();
                setOpacity(Math.round(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * 100));
              }}
            >
              <div className="absolute top-0.5 bottom-0.5 w-4 rounded-full border-2 border-white pointer-events-none"
                style={{ 
                  left: `${opacity}%`, 
                  transform: 'translateX(-50%)', 
                  backgroundColor: derivedHex, 
                  boxShadow: '0 0 0 1.5px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.3)' 
                }}
              />
            </div>
            <span className="text-white text-sm font-bold w-12 text-right">{opacity}%</span>
          </div>
        </div>

        {/* Saved Colors */}
        <div className="px-4 pt-3 pb-5 border-t border-white/5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white/50 text-xs font-bold uppercase tracking-wider">Saved Colors</span>
            <button
              onClick={() => setDeleteMode(d => !d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border-2 flex items-center gap-1.5 ${
                deleteMode
                  ? 'bg-red-500 border-red-400 text-white shadow-lg'
                  : 'border-white/20 text-white/50 hover:text-white hover:border-white/40 hover:bg-white/5'
              }`}
              title={deleteMode ? 'Done deleting' : 'Delete colors'}
            >
              {deleteMode ? (
                <>
                  <X className="w-3.5 h-3.5" strokeWidth={3} />
                  <span>Done</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </>
              )}
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {savedColors.map((sc, i) => (
              <div key={i} className="relative">
                <button
                  onClick={() => {
                    if (deleteMode) {
                      onDeleteColor(sc);
                    } else {
                      const [nr, ng, nb] = hexToRgb(sc);
                      const [nh, ns, nv] = rgbToHsv(nr, ng, nb);
                      setHue(nh); setSat(ns); setVal(nv); emit(sc);
                    }
                  }}
                  className={`w-10 h-10 rounded-xl border-2 transition-all shadow-md ${
                    deleteMode 
                      ? 'border-red-400 hover:scale-95' 
                      : 'border-white/30 hover:scale-110 hover:border-white/60'
                  }`}
                  style={{
                    backgroundColor: sc,
                    transform: deleteMode ? 'scale(0.95)' : undefined,
                  }}
                  title={deleteMode ? 'Click to delete' : `Use color: ${sc}`}
                />
                {deleteMode && (
                  <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center pointer-events-none shadow-lg border-2 border-white">
                    <X className="w-3 h-3 text-white" strokeWidth={3} />
                  </div>
                )}
              </div>
            ))}

            {/* Add color */}
            {!deleteMode && (
              <button 
                onClick={() => onSaveColor(derivedHex)}
                className="w-10 h-10 rounded-xl border-2 border-dashed border-white/40 flex items-center justify-center text-white/40 hover:text-white hover:border-white hover:bg-white/10 transition-all hover:scale-110"
                title="Save current color"
              >
                <Plus className="w-5 h-5" strokeWidth={2.5} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
