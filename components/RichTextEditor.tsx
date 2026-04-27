"use client";

import { useState, useRef, useEffect } from 'react';
import { AlignLeft, AlignCenter, AlignRight, AlignJustify, Type, Underline, Italic, Bold, Image as ImageIcon, List, ListOrdered } from 'lucide-react';
import ColorPicker from './ColorPicker';
import ImageCropper from './ImageCropper';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const DEFAULT_COLORS: string[] = [];

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "write your note here..."
}: RichTextEditorProps) {
  const editorRef       = useRef<HTMLDivElement>(null);
  const savedRangeRef   = useRef<Range | null>(null);
  const fileInputRef    = useRef<HTMLInputElement>(null);

  const [savedColors, setSavedColors] = useState<string[]>(DEFAULT_COLORS);
  const [activeColor, setActiveColor]   = useState<string | null>(null);
  const [pickerOpen, setPickerOpen]     = useState(false);
  const [pickerColor, setPickerColor]   = useState('#EF4444');
  const [uploading, setUploading]       = useState(false);
  const [cropperOpen, setCropperOpen]   = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>('');
  const selectedImageRef = useRef<HTMLImageElement | null>(null);
  const colorsLoaded = useRef(false);

  // Load saved colors from localStorage after hydration
  useEffect(() => {
    try {
      const stored = localStorage.getItem('tananotes-colors');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setSavedColors(parsed);
      }
    } catch {}
    colorsLoaded.current = true;
  }, []);

  // Persist savedColors to localStorage — only after initial load
  useEffect(() => {
    if (!colorsLoaded.current) return;
    localStorage.setItem('tananotes-colors', JSON.stringify(savedColors));
  }, [savedColors]);

  // Sync value prop with editor content
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  /** Save cursor position before toolbar button steals focus */
  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

  /** Restore cursor and refocus editor */
  const restoreFocus = () => {
    editorRef.current?.focus();
    const sel = window.getSelection();
    if (sel && savedRangeRef.current) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }
  };

  const execCommand = (command: string, val: string = '') => {
    restoreFocus();
    document.execCommand(command, false, val);
    handleInput();
  };

  /** Click a color circle → activate for next typing */
  const activateColor = (color: string) => {
    setActiveColor(color);
    restoreFocus();
    document.execCommand('foreColor', false, color);
    handleInput();
  };

  /** Called by ColorPicker when a color changes */
  const handlePickerChange = (hex: string) => {
    setPickerColor(hex);
    setActiveColor(hex);
    restoreFocus();
    document.execCommand('foreColor', false, hex);
    handleInput();
  };

  /** Save to quick-access row from inside the picker */
  const handleSaveColor = (hex: string) => {
    setSavedColors(prev => {
      if (prev.includes(hex)) return prev;
      const next = [...prev, hex];
      return next.length > 8 ? next.slice(next.length - 8) : next;
    });
  };

  /** Delete a color from the saved row */
  const handleDeleteColor = (hex: string) => {
    setSavedColors(prev => prev.filter(c => c !== hex));
  };

  /** Handle double-click on image to open cropper */
  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'IMG') {
      const img = target as HTMLImageElement;
      selectedImageRef.current = img;
      setSelectedImageUrl(img.src);
      setCropperOpen(true);
    }
  };

  /** Handle crop complete */
  const handleCropComplete = (croppedImageUrl: string) => {
    if (selectedImageRef.current) {
      selectedImageRef.current.src = croppedImageUrl;
      handleInput();
    }
    setCropperOpen(false);
    selectedImageRef.current = null;
  };

  /** Handle crop cancel */
  const handleCropCancel = () => {
    setCropperOpen(false);
    selectedImageRef.current = null;
  };

  /** Handle Tab key and auto-formatting for lists */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // Handle Tab key
    if (e.key === 'Tab') {
      e.preventDefault();
      
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      
      // Check if we're inside a list
      let node = sel.anchorNode;
      let listItem = null;
      
      while (node && node !== editorRef.current) {
        if (node.nodeName === 'LI') {
          listItem = node as HTMLElement;
          break;
        }
        node = node.parentNode as Node;
      }
      
      if (listItem) {
        // Inside a list - indent or outdent
        if (e.shiftKey) {
          document.execCommand('outdent', false);
        } else {
          document.execCommand('indent', false);
        }
      } else {
        // Not in list - insert spaces
        const spaces = '\u00A0\u00A0\u00A0\u00A0';
        document.execCommand('insertText', false, spaces);
      }
      
      handleInput();
      return;
    }
    
    // Handle Enter key for auto-continuing lists
    if (e.key === 'Enter') {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      
      let node = sel.anchorNode;
      let listItem = null;
      
      // Check if we're in a list item
      while (node && node !== editorRef.current) {
        if (node.nodeName === 'LI') {
          listItem = node as HTMLElement;
          break;
        }
        node = node.parentNode as Node;
      }
      
      // If in empty list item, exit the list
      if (listItem && listItem.textContent?.trim() === '') {
        e.preventDefault();
        document.execCommand('outdent', false);
        document.execCommand('formatBlock', false, 'p');
        handleInput();
        return;
      }
    }
    
    // Auto-detect bullet list: "- " at start of line
    if (e.key === ' ') {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      
      const range = sel.getRangeAt(0);
      const textNode = range.startContainer;
      
      if (textNode.nodeType === Node.TEXT_NODE) {
        const text = textNode.textContent || '';
        const cursorPos = range.startOffset;
        
        // Check if we just typed "- " at the beginning or after line break
        const beforeCursor = text.substring(0, cursorPos);
        
        if (beforeCursor === '-' || beforeCursor.endsWith('\n-')) {
          e.preventDefault();
          
          // Remove the "- " we just typed
          if (beforeCursor === '-') {
            textNode.textContent = text.substring(1);
          } else {
            const lastDashIndex = beforeCursor.lastIndexOf('-');
            textNode.textContent = text.substring(0, lastDashIndex) + text.substring(cursorPos);
          }
          
          // Create bullet list
          restoreFocus();
          document.execCommand('insertUnorderedList', false);
          handleInput();
          return;
        }
      }
    }
    
    // Auto-detect numbered list: "1. " at start of line
    if (e.key === ' ') {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      
      const range = sel.getRangeAt(0);
      const textNode = range.startContainer;
      
      if (textNode.nodeType === Node.TEXT_NODE) {
        const text = textNode.textContent || '';
        const cursorPos = range.startOffset;
        const beforeCursor = text.substring(0, cursorPos);
        
        // Check for numbered list pattern: "1." or "2." etc.
        const numberedMatch = beforeCursor.match(/(\n|^)(\d+)\.$/);
        
        if (numberedMatch) {
          e.preventDefault();
          
          // Remove the number and dot
          const matchLength = numberedMatch[2].length + 1; // number + dot
          if (numberedMatch[1] === '') {
            // At start of text
            textNode.textContent = text.substring(matchLength);
          } else {
            // After newline
            const lastNumIndex = beforeCursor.lastIndexOf(numberedMatch[2]);
            textNode.textContent = text.substring(0, lastNumIndex) + text.substring(cursorPos);
          }
          
          // Create numbered list
          restoreFocus();
          document.execCommand('insertOrderedList', false);
          handleInput();
          return;
        }
      }
    }
  };

  /** Handle image upload */
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');
      
      const data = await response.json();
      
      // Insert image at cursor position
      restoreFocus();
      const img = document.createElement('img');
      img.src = data.url;
      img.alt = 'Uploaded image';
      img.draggable = true;

      const sel = window.getSelection();
      if (sel && savedRangeRef.current) {
        sel.removeAllRanges();
        sel.addRange(savedRangeRef.current);
        savedRangeRef.current.insertNode(img);
        // Add a space after image for easier typing
        const space = document.createTextNode(' ');
        savedRangeRef.current.collapse(false);
        savedRangeRef.current.insertNode(space);
        savedRangeRef.current.setStartAfter(space);
        savedRangeRef.current.collapse(true);
      } else if (editorRef.current) {
        editorRef.current.appendChild(img);
      }

      handleInput();
      
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative w-full">
      {/* Editor Area */}
      <div className="bg-white border-2 border-black rounded-[32px] p-6 pb-56 w-full min-h-[500px]">
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onMouseUp={saveSelection}
          onKeyUp={saveSelection}
          onKeyDown={handleKeyDown}
          onDoubleClick={handleDoubleClick}
          data-placeholder={placeholder}
          className="w-full h-full text-lg font-medium leading-relaxed outline-none min-h-[400px]
                    [&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-gray-400
                    [&_img]:inline-block [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg 
                    [&_img]:border-2 [&_img]:border-black [&_img]:my-2 [&_img]:cursor-pointer
                    [&_img:hover]:shadow-[4px_4px_0px_rgba(0,0,0,1)] [&_img]:transition-all
                    [&_ul]:list-disc [&_ul]:list-inside [&_ul]:my-2 [&_ul]:pl-4
                    [&_ol]:list-decimal [&_ol]:list-inside [&_ol]:my-2 [&_ol]:pl-4
                    [&_li]:my-1 [&_li]:pl-2
                    [&_ul_ul]:list-circle [&_ul_ul]:pl-6
                    [&_ol_ol]:list-lower-alpha [&_ol_ol]:pl-6"
        />
      </div>

      {/* Floating Toolbar */}
      <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 w-11/12 max-w-[340px] bg-[#93C5FD] border-2 border-black rounded-3xl p-4 flex flex-col gap-3 brutalist-shadow z-10 transition-opacity ${pickerOpen || cropperOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>

        {/* Colors */}
        <div className="flex justify-center gap-2 items-center flex-wrap">
          {savedColors.map((color, i) => (
            <button
              key={i}
              onMouseDown={saveSelection}
              onClick={() => activateColor(color)}
              className="w-7 h-7 rounded-full border-2 border-black hover:-translate-y-1 transition-transform flex-shrink-0"
              style={{
                backgroundColor: color,
                boxShadow: activeColor === color ? '0 0 0 3px white, 0 0 0 5px black' : undefined,
                transform: activeColor === color ? 'translateY(-4px)' : undefined,
              }}
              title={color}
            />
          ))}

          {/* Black (reset) */}
          <button
            onMouseDown={saveSelection}
            onClick={() => { setActiveColor(null); restoreFocus(); document.execCommand('foreColor', false, '#000000'); handleInput(); }}
            className="w-7 h-7 rounded-full border-2 border-black bg-black hover:-translate-y-1 transition-transform flex-shrink-0"
            title="Black"
            style={{ boxShadow: activeColor === null ? '0 0 0 3px white, 0 0 0 5px black' : undefined }}
          />

          {/* Open full color picker */}
          <button
            onMouseDown={saveSelection}
            onClick={() => { saveSelection(); setPickerOpen(true); }}
            className="w-7 h-7 rounded-full border-2 border-black bg-gradient-to-tr from-red-500 via-green-400 to-blue-500 hover:-translate-y-1 transition-transform flex-shrink-0 flex items-center justify-center"
            title="Open color picker"
          />
        </div>

        {/* Text Styles */}
        <div className="flex justify-center">
          <div className="bg-[#B9DFFB] border-2 border-black rounded-xl px-5 py-2 flex items-center justify-center gap-6 w-full max-w-[300px]">
            <button onMouseDown={saveSelection} onClick={() => execCommand('italic')}           className="hover:-translate-y-0.5 transition-transform"><Italic    className="w-5 h-5" strokeWidth={3} /></button>
            <button onMouseDown={saveSelection} onClick={() => execCommand('bold')}             className="hover:-translate-y-0.5 transition-transform"><Bold      className="w-5 h-5" strokeWidth={3} /></button>
            <button onMouseDown={saveSelection} onClick={() => execCommand('underline')}        className="hover:-translate-y-0.5 transition-transform"><Underline  className="w-5 h-5" strokeWidth={3} /></button>
            <button onMouseDown={saveSelection} onClick={() => execCommand('formatBlock', 'H2')} className="hover:-translate-y-0.5 transition-transform"><Type       className="w-5 h-5" strokeWidth={3} /></button>
            <button 
              onMouseDown={saveSelection} 
              onClick={() => fileInputRef.current?.click()} 
              disabled={uploading}
              className="hover:-translate-y-0.5 transition-transform disabled:opacity-50"
              title="Upload image"
            >
              <ImageIcon className="w-5 h-5" strokeWidth={3} />
            </button>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />

        {/* Lists */}
        <div className="flex justify-center gap-4">
          <button 
            onMouseDown={saveSelection} 
            onClick={() => execCommand('insertUnorderedList')} 
            className="bg-[#B9DFFB] border-2 border-black rounded-lg px-4 py-2 hover:-translate-y-0.5 transition-transform flex items-center gap-2"
            title="Bullet List (Type: - + Space)"
          >
            <List className="w-5 h-5" strokeWidth={2.5} />
            <span className="text-xs font-bold">Bullet</span>
          </button>
          <button 
            onMouseDown={saveSelection} 
            onClick={() => execCommand('insertOrderedList')} 
            className="bg-[#B9DFFB] border-2 border-black rounded-lg px-4 py-2 hover:-translate-y-0.5 transition-transform flex items-center gap-2"
            title="Numbered List (Type: 1. + Space)"
          >
            <ListOrdered className="w-5 h-5" strokeWidth={2.5} />
            <span className="text-xs font-bold">Number</span>
          </button>
        </div>

        {/* Alignment */}
        <div className="flex justify-between items-center px-2">
          <button onMouseDown={saveSelection} onClick={() => execCommand('justifyLeft')}    className="bg-[#B9DFFB] border-2 border-black rounded-lg p-2 hover:-translate-y-0.5 transition-transform"><AlignLeft    className="w-5 h-5" strokeWidth={2.5} /></button>
          <button onMouseDown={saveSelection} onClick={() => execCommand('justifyCenter')}  className="bg-[#B9DFFB] border-2 border-black rounded-lg p-2 hover:-translate-y-0.5 transition-transform"><AlignCenter  className="w-5 h-5" strokeWidth={2.5} /></button>
          <button onMouseDown={saveSelection} onClick={() => execCommand('justifyRight')}   className="bg-[#B9DFFB] border-2 border-black rounded-lg p-2 hover:-translate-y-0.5 transition-transform"><AlignRight   className="w-5 h-5" strokeWidth={2.5} /></button>
          <button onMouseDown={saveSelection} onClick={() => execCommand('justifyFull')}    className="bg-[#B9DFFB] border-2 border-black rounded-lg p-2 hover:-translate-y-0.5 transition-transform"><AlignJustify className="w-5 h-5" strokeWidth={2.5} /></button>
        </div>

      </div>

      {/* Color Picker Modal */}
      {pickerOpen && (
        <ColorPicker
          currentColor={pickerColor}
          savedColors={savedColors}
          onColorChange={handlePickerChange}
          onSaveColor={handleSaveColor}
          onDeleteColor={handleDeleteColor}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {/* Image Cropper Modal */}
      {cropperOpen && selectedImageUrl && (
        <ImageCropper
          imageUrl={selectedImageUrl}
          onCropComplete={handleCropComplete}
          onCancel={handleCropCancel}
        />
      )}
    </div>
  );
}
