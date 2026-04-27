"use client";

import { useState, useRef, useEffect } from 'react';
import { 
  Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, 
  AlignRight, AlignJustify, List, ListOrdered, Image as ImageIcon,
  Link as LinkIcon, Code, Quote, Minus, Eraser,
  Heading1, Heading2, Heading3, X, Check, Palette
} from 'lucide-react';
import ColorPicker from './ColorPicker';

interface ProfessionalEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const DEFAULT_COLORS: string[] = [];

export default function ProfessionalEditor({
  value,
  onChange,
  placeholder = "Start writing..."
}: ProfessionalEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const colorsLoaded = useRef(false);
  
  const [uploading, setUploading] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
  
  // Color picker states
  const [savedColors, setSavedColors] = useState<string[]>(DEFAULT_COLORS);
  const [activeColor, setActiveColor] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerColor, setPickerColor] = useState('#EF4444');
  
  // Active formatting states
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    h1: false,
    h2: false,
    h3: false,
    alignLeft: false,
    alignCenter: false,
    alignRight: false,
    alignJustify: false,
    unorderedList: false,
    orderedList: false,
  });

  // Load saved colors from localStorage
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

  // Persist saved colors to localStorage
  useEffect(() => {
    if (!colorsLoaded.current) return;
    localStorage.setItem('tananotes-colors', JSON.stringify(savedColors));
  }, [savedColors]);

  // Sync value prop with editor
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  // Handle image selection for positioning
  useEffect(() => {
    const handleImageClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG' && editorRef.current?.contains(target)) {
        setSelectedImage(target as HTMLImageElement);
        // Remove selection from other images
        editorRef.current?.querySelectorAll('img').forEach(img => {
          img.classList.remove('selected-image');
        });
        target.classList.add('selected-image');
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName !== 'IMG' && !target.closest('.image-toolbar')) {
        setSelectedImage(null);
        editorRef.current?.querySelectorAll('img').forEach(img => {
          img.classList.remove('selected-image');
        });
      }
    };

    document.addEventListener('click', handleImageClick);
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleImageClick);
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
    updateActiveFormats();
  };

  // Update active format states based on current selection
  const updateActiveFormats = () => {
    try {
      const formats = {
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strikethrough: document.queryCommandState('strikeThrough'),
        h1: document.queryCommandValue('formatBlock') === 'h1',
        h2: document.queryCommandValue('formatBlock') === 'h2',
        h3: document.queryCommandValue('formatBlock') === 'h3',
        alignLeft: document.queryCommandState('justifyLeft'),
        alignCenter: document.queryCommandState('justifyCenter'),
        alignRight: document.queryCommandState('justifyRight'),
        alignJustify: document.queryCommandState('justifyFull'),
        unorderedList: document.queryCommandState('insertUnorderedList'),
        orderedList: document.queryCommandState('insertOrderedList'),
      };
      setActiveFormats(formats);
    } catch {
      // Ignore errors
    }
  };

  // Save cursor position before toolbar button steals focus
  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedRangeRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

  // Restore cursor and refocus editor
  const restoreFocus = () => {
    editorRef.current?.focus();
    const sel = window.getSelection();
    if (sel && savedRangeRef.current) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
    }
  };

  const execCommand = (command: string, value: string = '') => {
    restoreFocus();
    document.execCommand(command, false, value);
    handleInput();
    updateActiveFormats();
  };

  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    if (e.key === ' ') {
      const range = selection.getRangeAt(0);
      if (!range.collapsed) return;

      const anchorNode = range.startContainer;
      const anchorElement = anchorNode.nodeType === Node.ELEMENT_NODE
        ? anchorNode as Element
        : anchorNode.parentElement;
      if (!anchorElement) return;
      if (anchorElement.closest('li')) return;

      if (anchorNode.nodeType !== Node.TEXT_NODE) return;

      const textNode = anchorNode as Text;
      const beforeCursor = textNode.data.slice(0, range.startOffset).replace(/\u00A0/g, ' ');
      if (!/^\s*-$/.test(beforeCursor)) return;

      e.preventDefault();

      textNode.deleteData(0, range.startOffset);
      const caretRange = document.createRange();
      caretRange.setStart(textNode, 0);
      caretRange.collapse(true);
      selection.removeAllRanges();
      selection.addRange(caretRange);

      document.execCommand('insertUnorderedList', false);
      handleInput();
      saveSelection();
      return;
    }

    if (e.key !== 'Tab') return;

    e.preventDefault();

    let node: Node | null = selection.anchorNode;
    let listItem: HTMLElement | null = null;

    while (node && node !== editorRef.current) {
      if (node.nodeName === 'LI') {
        listItem = node as HTMLElement;
        break;
      }
      node = node.parentNode;
    }

    if (listItem) {
      document.execCommand(e.shiftKey ? 'outdent' : 'indent', false);
    } else {
      // Word-like paragraph indent for non-list text.
      document.execCommand('insertText', false, '\u00A0\u00A0\u00A0\u00A0');
    }

    handleInput();
    saveSelection();
  };

  // Color management
  const activateColor = (color: string) => {
    setActiveColor(color);
    restoreFocus();
    document.execCommand('foreColor', false, color);
    handleInput();
  };

  const handlePickerChange = (hex: string) => {
    setPickerColor(hex);
    setActiveColor(hex);
    restoreFocus();
    document.execCommand('foreColor', false, hex);
    handleInput();
  };

  const handleSaveColor = (hex: string) => {
    setSavedColors(prev => {
      if (prev.includes(hex)) return prev;
      const next = [...prev, hex];
      return next.length > 8 ? next.slice(next.length - 8) : next;
    });
  };

  const handleDeleteColor = (hex: string) => {
    setSavedColors(prev => prev.filter(c => c !== hex));
  };

  // Helper function for button className with active state
  const getButtonClass = (isActive: boolean) => {
    const baseClass = "p-2 bg-white border-2 border-black rounded-lg font-bold transition-all flex items-center justify-center hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none";
    const activeClass = "ring-4 ring-[#93C5FD] bg-[#E0F2FE]";
    return isActive ? `${baseClass} ${activeClass}` : baseClass;
  };

  // Text formatting
  const formatBold = () => execCommand('bold');
  const formatItalic = () => execCommand('italic');
  const formatUnderline = () => execCommand('underline');
  const formatStrikethrough = () => execCommand('strikeThrough');

  // Alignment
  const alignLeft = () => execCommand('justifyLeft');
  const alignCenter = () => execCommand('justifyCenter');
  const alignRight = () => execCommand('justifyRight');
  const alignJustify = () => execCommand('justifyFull');

  // Lists
  const insertBulletList = () => execCommand('insertUnorderedList');
  const insertNumberedList = () => execCommand('insertOrderedList');

  // Headings
  const formatHeading = (level: number) => {
    execCommand('formatBlock', `<h${level}>`);
  };

  // Clear formatting
  const clearFormatting = () => {
    execCommand('removeFormat');
    execCommand('formatBlock', '<div>');
  };

  // Blockquote
  const insertBlockquote = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    const blockquote = document.createElement('blockquote');
    
    try {
      range.surroundContents(blockquote);
      handleInput();
    } catch {
      // If can't surround, insert at cursor
      blockquote.textContent = 'Quote text here';
      range.insertNode(blockquote);
      handleInput();
    }
  };

  // Code block
  const insertCode = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    const code = document.createElement('code');
    const text = selection.toString() || 'code';
    code.textContent = text;
    
    try {
      range.deleteContents();
      range.insertNode(code);
      handleInput();
    } catch (e) {
      console.error('Error inserting code:', e);
    }
  };

  // Horizontal rule
  const insertHR = () => {
    execCommand('insertHorizontalRule');
  };

  // Link insertion
  const insertLink = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const selectedText = selection.toString();
    if (!selectedText) {
      alert('Please select text first');
      return;
    }
    
    setShowLinkInput(true);
  };

  const confirmLink = () => {
    if (!linkUrl) return;
    
    const url = linkUrl.startsWith('http') ? linkUrl : `https://${linkUrl}`;
    execCommand('createLink', url);
    setShowLinkInput(false);
    setLinkUrl('');
  };

  const cancelLink = () => {
    setShowLinkInput(false);
    setLinkUrl('');
  };

  // Image upload
  const triggerImageUpload = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
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
      
      // Insert image
      editorRef.current?.focus();
      const img = `<img src="${data.url}" alt="Uploaded image" class="editor-image" style="max-width: 500px; height: auto; border-radius: 8px; margin: 8px 0;" />`;
      document.execCommand('insertHTML', false, img);
      handleInput();
      
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  // Image positioning
  const positionImage = (position: 'left' | 'center' | 'right' | 'inline') => {
    if (!selectedImage) return;

    // Remove all positioning classes
    selectedImage.classList.remove('image-left', 'image-center', 'image-right', 'image-inline');
    selectedImage.style.display = '';
    selectedImage.style.margin = '';
    selectedImage.style.float = '';

    switch (position) {
      case 'left':
        selectedImage.classList.add('image-left');
        selectedImage.style.display = 'block';
        selectedImage.style.marginLeft = '0';
        selectedImage.style.marginRight = 'auto';
        break;
      case 'center':
        selectedImage.classList.add('image-center');
        selectedImage.style.display = 'block';
        selectedImage.style.marginLeft = 'auto';
        selectedImage.style.marginRight = 'auto';
        break;
      case 'right':
        selectedImage.classList.add('image-right');
        selectedImage.style.display = 'block';
        selectedImage.style.marginLeft = 'auto';
        selectedImage.style.marginRight = '0';
        break;
      case 'inline':
        selectedImage.classList.add('image-inline');
        selectedImage.style.display = 'inline-block';
        selectedImage.style.marginLeft = '4px';
        selectedImage.style.marginRight = '4px';
        break;
    }
    handleInput();
  };

  const resizeImage = (size: 'small' | 'medium' | 'large' | 'full') => {
    if (!selectedImage) return;

    const sizes = {
      small: '200px',
      medium: '400px',
      large: '600px',
      full: '100%'
    };

    selectedImage.style.maxWidth = sizes[size];
    selectedImage.style.height = 'auto';
    handleInput();
  };

  return (
    <div className="relative w-full">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />

      {/* Link Input Modal */}
      {showLinkInput && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white border-2 border-black rounded-2xl p-6 shadow-[8px_8px_0px_rgba(0,0,0,1)] w-full max-w-md mx-4">
            <h3 className="text-xl font-bold mb-4">Insert Link</h3>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-4 py-3 border-2 border-black rounded-lg font-semibold mb-4 focus:outline-none focus:ring-2 focus:ring-[#93C5FD]"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmLink();
                if (e.key === 'Escape') cancelLink();
              }}
            />
            <div className="flex gap-3">
              <button
                onClick={confirmLink}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#93EB7D] border-2 border-black rounded-lg font-bold hover:-translate-y-1 transition-all shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_rgba(0,0,0,1)]"
              >
                <Check className="w-4 h-4" />
                Insert
              </button>
              <button
                onClick={cancelLink}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#FF6B6B] border-2 border-black rounded-lg font-bold hover:-translate-y-1 transition-all shadow-[3px_3px_0px_rgba(0,0,0,1)] hover:shadow-[5px_5px_0px_rgba(0,0,0,1)]"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Color Picker Modal */}
      {pickerOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
          <div className="relative">
            <ColorPicker
              currentColor={pickerColor}
              onColorChange={handlePickerChange}
              onSaveColor={handleSaveColor}
              onDeleteColor={handleDeleteColor}
              onClose={() => setPickerOpen(false)}
              savedColors={savedColors}
            />
          </div>
        </div>
      )}

      {/* Main Toolbar - Floating */}
      <div className="mb-3 sm:mb-4 md:sticky md:top-4 z-30">
        <div className="bg-white border-2 border-black rounded-2xl p-2 sm:p-3 shadow-[4px_4px_0px_rgba(0,0,0,1)] max-w-full overflow-x-auto">
          <div className="flex gap-2 items-center min-w-max">
            
            {/* Color Picker Section */}
            <div className="flex gap-1 p-2 bg-gradient-to-br from-[#FDE047] to-[#FCA5A5] rounded-lg border-2 border-black">
              {savedColors.map((color, i) => (
                <button
                  key={i}
                  onMouseDown={saveSelection}
                  onClick={() => activateColor(color)}
                  className="w-8 h-8 rounded-full border-2 border-black hover:scale-110 transition-transform flex-shrink-0"
                  style={{
                    backgroundColor: color,
                    boxShadow: activeColor === color ? '0 0 0 3px white, 0 0 0 5px #000' : undefined,
                    transform: activeColor === color ? 'scale(1.15)' : undefined,
                  }}
                  title={`Use color: ${color}`}
                />
              ))}
              
              {/* Black (reset) */}
              <button
                onMouseDown={saveSelection}
                onClick={() => { 
                  setActiveColor(null); 
                  restoreFocus(); 
                  document.execCommand('foreColor', false, '#000000'); 
                  handleInput(); 
                }}
                className="w-8 h-8 rounded-full border-2 border-black bg-black hover:scale-110 transition-transform flex-shrink-0"
                title="Black (Default)"
                style={{ 
                  boxShadow: activeColor === null ? '0 0 0 3px white, 0 0 0 5px #000' : undefined,
                  transform: activeColor === null ? 'scale(1.15)' : undefined,
                }}
              />
              
              {/* Open full color picker */}
              <button
                onMouseDown={saveSelection}
                onClick={() => { saveSelection(); setPickerOpen(true); }}
                className="w-8 h-8 rounded-full border-2 border-black bg-gradient-to-tr from-red-500 via-green-400 to-blue-500 hover:scale-110 transition-transform flex-shrink-0 flex items-center justify-center"
                title="Open color picker"
              >
                <Palette className="w-4 h-4 text-white drop-shadow" strokeWidth={2.5} />
              </button>
            </div>

            <div className="w-px h-8 bg-black/20" />

            {/* Headings */}
            <div className="flex gap-1 p-1 bg-gray-100 rounded-lg border border-black/20">
              <button onMouseDown={saveSelection} onClick={() => formatHeading(1)} className={getButtonClass(activeFormats.h1)} title="Heading 1">
                <Heading1 className="w-4 h-4" />
              </button>
              <button onMouseDown={saveSelection} onClick={() => formatHeading(2)} className={getButtonClass(activeFormats.h2)} title="Heading 2">
                <Heading2 className="w-4 h-4" />
              </button>
              <button onMouseDown={saveSelection} onClick={() => formatHeading(3)} className={getButtonClass(activeFormats.h3)} title="Heading 3">
                <Heading3 className="w-4 h-4" />
              </button>
            </div>

            <div className="w-px h-6 bg-black/20" />

            {/* Text Format */}
            <div className="flex gap-1 p-1 bg-gray-100 rounded-lg border border-black/20">
              <button onMouseDown={saveSelection} onClick={formatBold} className={getButtonClass(activeFormats.bold)} title="Bold (Ctrl+B)">
                <Bold className="w-4 h-4" />
              </button>
              <button onMouseDown={saveSelection} onClick={formatItalic} className={getButtonClass(activeFormats.italic)} title="Italic (Ctrl+I)">
                <Italic className="w-4 h-4" />
              </button>
              <button onMouseDown={saveSelection} onClick={formatUnderline} className={getButtonClass(activeFormats.underline)} title="Underline (Ctrl+U)">
                <Underline className="w-4 h-4" />
              </button>
              <button onMouseDown={saveSelection} onClick={formatStrikethrough} className={getButtonClass(activeFormats.strikethrough)} title="Strikethrough">
                <Strikethrough className="w-4 h-4" />
              </button>
            </div>

            <div className="w-px h-6 bg-black/20" />

            {/* Alignment */}
            <div className="flex gap-1 p-1 bg-gray-100 rounded-lg border border-black/20">
              <button onMouseDown={saveSelection} onClick={alignLeft} className={getButtonClass(activeFormats.alignLeft)} title="Align Left">
                <AlignLeft className="w-4 h-4" />
              </button>
              <button onMouseDown={saveSelection} onClick={alignCenter} className={getButtonClass(activeFormats.alignCenter)} title="Align Center">
                <AlignCenter className="w-4 h-4" />
              </button>
              <button onMouseDown={saveSelection} onClick={alignRight} className={getButtonClass(activeFormats.alignRight)} title="Align Right">
                <AlignRight className="w-4 h-4" />
              </button>
              <button onMouseDown={saveSelection} onClick={alignJustify} className={getButtonClass(activeFormats.alignJustify)} title="Justify">
                <AlignJustify className="w-4 h-4" />
              </button>
            </div>

            <div className="w-px h-6 bg-black/20" />

            {/* Lists */}
            <div className="flex gap-1 p-1 bg-gray-100 rounded-lg border border-black/20">
              <button onMouseDown={saveSelection} onClick={insertBulletList} className={getButtonClass(activeFormats.unorderedList)} title="Bullet List">
                <List className="w-4 h-4" />
              </button>
              <button onMouseDown={saveSelection} onClick={insertNumberedList} className={getButtonClass(activeFormats.orderedList)} title="Numbered List">
                <ListOrdered className="w-4 h-4" />
              </button>
            </div>

            <div className="w-px h-6 bg-black/20" />

            {/* Insert */}
            <div className="flex gap-1 p-1 bg-gray-100 rounded-lg border border-black/20">
              <button onMouseDown={saveSelection} onClick={insertLink} className="p-2 bg-white border-2 border-black rounded-lg font-bold transition-all flex items-center justify-center hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none" title="Insert Link">
                <LinkIcon className="w-4 h-4" />
              </button>
              <button onMouseDown={saveSelection} onClick={triggerImageUpload} className="p-2 bg-white border-2 border-black rounded-lg font-bold transition-all flex items-center justify-center hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed" title="Insert Image" disabled={uploading}>
                <ImageIcon className="w-4 h-4" />
              </button>
              <button onMouseDown={saveSelection} onClick={insertBlockquote} className="p-2 bg-white border-2 border-black rounded-lg font-bold transition-all flex items-center justify-center hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none" title="Blockquote">
                <Quote className="w-4 h-4" />
              </button>
              <button onMouseDown={saveSelection} onClick={insertCode} className="p-2 bg-white border-2 border-black rounded-lg font-bold transition-all flex items-center justify-center hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none" title="Code">
                <Code className="w-4 h-4" />
              </button>
              <button onMouseDown={saveSelection} onClick={insertHR} className="p-2 bg-white border-2 border-black rounded-lg font-bold transition-all flex items-center justify-center hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none" title="Horizontal Line">
                <Minus className="w-4 h-4" />
              </button>
            </div>

            <div className="w-px h-6 bg-black/20" />

            {/* Clear Format */}
            <button onMouseDown={saveSelection} onClick={clearFormatting} className="p-2 bg-white border-2 border-black rounded-lg font-bold transition-all flex items-center justify-center hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-y-0 active:shadow-none" title="Clear Formatting">
              <Eraser className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Image Toolbar (shows when image selected) */}
      {selectedImage && (
        <div className="mb-4 md:sticky md:top-20 z-30">
          <div className="bg-[#FDE047] border-2 border-black rounded-2xl p-3 shadow-[4px_4px_0px_rgba(0,0,0,1)] image-toolbar">
            <div className="flex flex-wrap gap-2 items-center justify-center">
              <span className="text-sm font-bold mr-2">Image Position:</span>
              <button onClick={() => positionImage('left')} className="px-3 py-1 bg-white border-2 border-black rounded-lg font-bold text-sm hover:-translate-y-1 transition-all">Left</button>
              <button onClick={() => positionImage('center')} className="px-3 py-1 bg-white border-2 border-black rounded-lg font-bold text-sm hover:-translate-y-1 transition-all">Center</button>
              <button onClick={() => positionImage('right')} className="px-3 py-1 bg-white border-2 border-black rounded-lg font-bold text-sm hover:-translate-y-1 transition-all">Right</button>
              <button onClick={() => positionImage('inline')} className="px-3 py-1 bg-white border-2 border-black rounded-lg font-bold text-sm hover:-translate-y-1 transition-all">Inline</button>
              
              <div className="w-px h-6 bg-black/20 mx-2" />
              
              <span className="text-sm font-bold mr-2">Size:</span>
              <button onClick={() => resizeImage('small')} className="px-3 py-1 bg-white border-2 border-black rounded-lg font-bold text-sm hover:-translate-y-1 transition-all">Small</button>
              <button onClick={() => resizeImage('medium')} className="px-3 py-1 bg-white border-2 border-black rounded-lg font-bold text-sm hover:-translate-y-1 transition-all">Medium</button>
              <button onClick={() => resizeImage('large')} className="px-3 py-1 bg-white border-2 border-black rounded-lg font-bold text-sm hover:-translate-y-1 transition-all">Large</button>
              <button onClick={() => resizeImage('full')} className="px-3 py-1 bg-white border-2 border-black rounded-lg font-bold text-sm hover:-translate-y-1 transition-all">Full</button>
            </div>
          </div>
        </div>
      )}

      {/* Editor Area */}
      <div className="bg-white border-2 border-black rounded-2xl p-4 sm:p-8 min-h-[420px] sm:min-h-[600px] shadow-[2px_2px_0px_rgba(0,0,0,1)]">
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onKeyDown={handleEditorKeyDown}
          onMouseUp={() => { saveSelection(); updateActiveFormats(); }}
          onKeyUp={() => { saveSelection(); updateActiveFormats(); }}
          data-placeholder={placeholder}
          className="w-full min-h-[360px] sm:min-h-[550px] text-base leading-relaxed outline-none
                    [&:empty]:before:content-[attr(data-placeholder)] [&:empty]:before:text-gray-400
                    [&_h1]:text-3xl [&_h1]:font-extrabold [&_h1]:my-4 [&_h1]:tracking-tight
                    [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:my-3 [&_h2]:tracking-tight
                    [&_h3]:text-xl [&_h3]:font-bold [&_h3]:my-2 [&_h3]:tracking-tight
                    [&_p]:my-2
                    [&_a]:text-blue-600 [&_a]:underline [&_a]:font-semibold [&_a:hover]:text-blue-800
                    [&_img]:my-4 [&_img]:rounded-lg [&_img]:border-2 [&_img]:border-black [&_img]:transition-all
                    [&_img.selected-image]:ring-4 [&_img.selected-image]:ring-[#FDE047] [&_img.selected-image]:shadow-[6px_6px_0px_rgba(0,0,0,1)]
                    [&_blockquote]:border-l-4 [&_blockquote]:border-black [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:my-4 [&_blockquote]:text-gray-700
                    [&_code]:bg-gray-100 [&_code]:px-2 [&_code]:py-1 [&_code]:rounded [&_code]:font-mono [&_code]:text-sm [&_code]:border [&_code]:border-black/20
                    [&_ul]:list-disc [&_ul]:list-inside [&_ul]:my-2 [&_ul]:pl-4
                    [&_ol]:list-decimal [&_ol]:list-inside [&_ol]:my-2 [&_ol]:pl-4
                    [&_li]:my-1 [&_li]:pl-2
                    [&_hr]:border-2 [&_hr]:border-black [&_hr]:my-6"
        />
      </div>
    </div>
  );
}
