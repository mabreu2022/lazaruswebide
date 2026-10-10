import React, { useState, useRef, useEffect, useCallback } from 'react';
import type {
  LComponent,
  LComponentType,
  LForm
} from '../types/lazarus';
import { renderComponentIcon } from './ComponentPalette';
import {
  X,
  Minus,
  Square,
  Trash2,
  Copy,
  Code,
  ArrowUp,
  ArrowDown,
  AlignCenter
} from 'lucide-react';

interface FormDesignerProps {
  form: LForm;
  selectedComponentIds: string[];
  selectedPaletteComponent: LComponentType | null;
  gridSize: number;
  snapToGrid: boolean;
  showGrid: boolean;
  onSelectComponent: (id: string, isMulti?: boolean) => void;
  onSelectForm: () => void;
  onAddComponent: (type: LComponentType, x: number, y: number) => void;
  onUpdateComponent: (id: string, updates: Partial<LComponent>) => void;
  onUpdateForm: (updates: Partial<LForm>) => void;
  onDeleteComponents: (ids: string[]) => void;
  onDuplicateComponent: (id: string) => void;
  onBringToFront: (id: string) => void;
  onSendToBack: (id: string) => void;
  onDoubleClickComponent: (comp: LComponent) => void;
  onToggleFormCode: () => void;
}

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

interface DragState {
  type: 'move' | 'resize' | 'rubberband' | 'move-form' | 'resize-form';
  startX: number;
  startY: number;
  initialComponents: { id: string; left: number; top: number; width: number; height: number }[];
  initialForm?: { left: number; top: number; width: number; height: number };
  activeHandle?: ResizeHandle;
  currentX?: number;
  currentY?: number;
}

export const FormDesigner: React.FC<FormDesignerProps> = ({
  form,
  selectedComponentIds,
  selectedPaletteComponent,
  gridSize,
  snapToGrid,
  showGrid,
  onSelectComponent,
  onSelectForm,
  onAddComponent,
  onUpdateComponent,
  onUpdateForm,
  onDeleteComponents,
  onDuplicateComponent,
  onBringToFront,
  onSendToBack,
  onDoubleClickComponent,
  onToggleFormCode
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [dragState, setDragState] = useState<DragState | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; componentId?: string } | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const snap = useCallback((val: number) => {
    if (!snapToGrid) return Math.round(val);
    return Math.round(val / gridSize) * gridSize;
  }, [snapToGrid, gridSize]);

  // Handle Drag Over from HTML5 Drag and Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  // Handle Drop from Component Palette
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const compType = e.dataTransfer.getData('text/lazarus-component') as LComponentType;
    if (!compType || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;

    const x = Math.max(0, snap(rawX));
    const y = Math.max(0, snap(rawY));

    onAddComponent(compType, x, y);
  };

  // Canvas Click (Placing component from click or selecting form)
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (contextMenu) {
      setContextMenu(null);
      return;
    }

    if (selectedPaletteComponent && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const rawX = e.clientX - rect.left;
      const rawY = e.clientY - rect.top;

      const x = Math.max(0, snap(rawX));
      const y = Math.max(0, snap(rawY));

      onAddComponent(selectedPaletteComponent, x, y);
      return;
    }

    // Otherwise select the form itself
    if (e.target === canvasRef.current) {
      onSelectForm();
    }
  };

  // Handle Mouse Down on a Component
  const handleComponentMouseDown = (e: React.MouseEvent, comp: LComponent) => {
    e.stopPropagation();
    if (e.button !== 0) return; // Only left click for drag

    const isMulti = e.shiftKey || e.ctrlKey;
    const isAlreadySelected = selectedComponentIds.includes(comp.id);

    if (!isAlreadySelected) {
      onSelectComponent(comp.id, isMulti);
    }

    const currentSelectedIds = isAlreadySelected
      ? selectedComponentIds
      : (isMulti ? [...selectedComponentIds, comp.id] : [comp.id]);

    const initialComps = form.components
      .filter(c => currentSelectedIds.includes(c.id))
      .map(c => ({
        id: c.id,
        left: c.left,
        top: c.top,
        width: c.width,
        height: c.height
      }));

    setDragState({
      type: 'move',
      startX: e.clientX,
      startY: e.clientY,
      initialComponents: initialComps
    });
  };

  // Handle Resize Handle Mouse Down
  const handleResizeMouseDown = (e: React.MouseEvent, handle: ResizeHandle, comp: LComponent) => {
    e.stopPropagation();
    if (e.button !== 0) return;

    setDragState({
      type: 'resize',
      startX: e.clientX,
      startY: e.clientY,
      activeHandle: handle,
      initialComponents: [{
        id: comp.id,
        left: comp.left,
        top: comp.top,
        width: comp.width,
        height: comp.height
      }]
    });
  };

  // Handle Form Move Mouse Down (via title bar)
  const handleFormHeaderMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    onSelectForm();

    setDragState({
      type: 'move-form',
      startX: e.clientX,
      startY: e.clientY,
      initialComponents: [],
      initialForm: {
        left: form.left,
        top: form.top,
        width: form.width,
        height: form.height
      }
    });
  };

  // Handle Form Resize Handle Mouse Down
  const handleFormResizeMouseDown = (e: React.MouseEvent, handle: ResizeHandle) => {
    e.stopPropagation();
    if (e.button !== 0) return;

    setDragState({
      type: 'resize-form',
      startX: e.clientX,
      startY: e.clientY,
      activeHandle: handle,
      initialComponents: [],
      initialForm: {
        left: form.left,
        top: form.top,
        width: form.width,
        height: form.height
      }
    });
  };

  // Global Mouse Move and Up for Dragging & Resizing
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        setMousePos({
          x: Math.max(0, Math.round(e.clientX - rect.left)),
          y: Math.max(0, Math.round(e.clientY - rect.top))
        });
      }

      if (!dragState) return;

      const deltaX = e.clientX - dragState.startX;
      const deltaY = e.clientY - dragState.startY;

      if (dragState.type === 'move') {
        dragState.initialComponents.forEach(init => {
          const newLeft = Math.max(0, snap(init.left + deltaX));
          const newTop = Math.max(0, snap(init.top + deltaY));
          onUpdateComponent(init.id, { left: newLeft, top: newTop });
        });
      } else if (dragState.type === 'resize' && dragState.activeHandle) {
        const init = dragState.initialComponents[0];
        if (!init) return;

        let newLeft = init.left;
        let newTop = init.top;
        let newWidth = init.width;
        let newHeight = init.height;

        const handle = dragState.activeHandle;

        if (handle.includes('e')) {
          newWidth = Math.max(20, snap(init.width + deltaX));
        }
        if (handle.includes('s')) {
          newHeight = Math.max(20, snap(init.height + deltaY));
        }
        if (handle.includes('w')) {
          const potentialWidth = Math.max(20, snap(init.width - deltaX));
          newLeft = init.left + (init.width - potentialWidth);
          newWidth = potentialWidth;
        }
        if (handle.includes('n')) {
          const potentialHeight = Math.max(20, snap(init.height - deltaY));
          newTop = init.top + (init.height - potentialHeight);
          newHeight = potentialHeight;
        }

        onUpdateComponent(init.id, {
          left: newLeft,
          top: newTop,
          width: newWidth,
          height: newHeight
        });
      } else if (dragState.type === 'move-form' && dragState.initialForm) {
        const newLeft = Math.max(16, snap(dragState.initialForm.left + deltaX));
        const newTop = Math.max(16, snap(dragState.initialForm.top + deltaY));
        onUpdateForm({ left: newLeft, top: newTop });
      } else if (dragState.type === 'resize-form' && dragState.initialForm && dragState.activeHandle) {
        let newWidth = dragState.initialForm.width;
        let newHeight = dragState.initialForm.height;
        if (dragState.activeHandle.includes('e')) {
          newWidth = Math.max(200, snap(dragState.initialForm.width + deltaX));
        }
        if (dragState.activeHandle.includes('s')) {
          newHeight = Math.max(150, snap(dragState.initialForm.height + deltaY));
        }
        onUpdateForm({ width: newWidth, height: newHeight });
      }
    };

    const handleMouseUp = () => {
      setDragState(null);
    };

    if (dragState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, snap, onUpdateComponent, onUpdateForm]);

  // Context Menu Handler
  const handleContextMenu = (e: React.MouseEvent, componentId?: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (componentId) {
      onSelectComponent(componentId);
    }
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      componentId
    });
  };

  // Keyboard shortcut listener for canvas operations
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedComponentIds.length > 0) {
          e.preventDefault();
          onDeleteComponents(selectedComponentIds);
        }
      } else if (e.key === 'F12') {
        e.preventDefault();
        onToggleFormCode();
      } else if (e.key === 'd' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (selectedComponentIds.length === 1) {
          onDuplicateComponent(selectedComponentIds[0]);
        }
      } else if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (selectedComponentIds.length > 0) {
          e.preventDefault();
          const step = e.shiftKey ? gridSize : 1;
          const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
          const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;

          selectedComponentIds.forEach(id => {
            const comp = form.components.find(c => c.id === id);
            if (comp) {
              onUpdateComponent(id, {
                left: Math.max(0, comp.left + dx),
                top: Math.max(0, comp.top + dy)
              });
            }
          });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedComponentIds, form.components, gridSize, onDeleteComponents, onToggleFormCode, onDuplicateComponent, onUpdateComponent]);

  // Close context menu on outside click
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const singleSelectedComp = selectedComponentIds.length === 1
    ? form.components.find(c => c.id === selectedComponentIds[0])
    : null;

  return (
    <div
      ref={containerRef}
      className={`lazarus-designer-workspace ${selectedPaletteComponent ? 'placement-mode' : ''}`}
      onClick={() => setContextMenu(null)}
    >
      {/* Visual Form Window (Delphi / Lazarus Desktop Form) */}
      <div
        className="lazarus-form-window"
        style={{
          left: `${form.left}px`,
          top: `${form.top}px`,
          width: `${form.width}px`,
          height: `${form.height}px`
        }}
      >
        {/* Form Title Bar */}
        <div
          className="form-window-titlebar"
          onMouseDown={handleFormHeaderMouseDown}
          onDoubleClick={onToggleFormCode}
        >
          <div className="titlebar-caption">
            <span className="window-icon">🗂️</span>
            <span className="window-title-text">{form.caption}</span>
          </div>

          <div className="window-control-buttons">
            <button className="win-btn win-min" title="Minimizar">
              <Minus size={10} />
            </button>
            <button className="win-btn win-max" title="Maximizar">
              <Square size={10} />
            </button>
            <button className="win-btn win-close" title="Fechar">
              <X size={10} />
            </button>
          </div>
        </div>

        {/* Form Client Area / Dotted Grid Canvas */}
        <div
          ref={canvasRef}
          className={`form-client-area ${showGrid ? 'show-dots' : ''}`}
          style={{
            backgroundColor: form.color || '#ece9d8',
            fontFamily: form.fontFamily || 'Inter, sans-serif'
          }}
          onClick={handleCanvasClick}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onContextMenu={(e) => handleContextMenu(e)}
        >
          {/* Render All Form Components */}
          {form.components.map(comp => {
            const isSelected = selectedComponentIds.includes(comp.id);

            return (
              <div
                key={comp.id}
                id={`comp-${comp.id}`}
                className={`designer-component-wrapper ${isSelected ? 'selected' : ''}`}
                style={{
                  left: `${comp.left}px`,
                  top: `${comp.top}px`,
                  width: `${comp.width}px`,
                  height: `${comp.height}px`,
                  zIndex: isSelected ? 50 : 1
                }}
                onMouseDown={(e) => handleComponentMouseDown(e, comp)}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  onDoubleClickComponent(comp);
                }}
                onContextMenu={(e) => handleContextMenu(e, comp.id)}
              >
                {/* Component Render */}
                <ComponentRenderer comp={comp} />

                {/* 8 Selection Handles if selected */}
                {isSelected && (
                  <div className="selection-handles-layer">
                    <div className="sel-handle nw" onMouseDown={(e) => handleResizeMouseDown(e, 'nw', comp)} />
                    <div className="sel-handle n" onMouseDown={(e) => handleResizeMouseDown(e, 'n', comp)} />
                    <div className="sel-handle ne" onMouseDown={(e) => handleResizeMouseDown(e, 'ne', comp)} />
                    <div className="sel-handle e" onMouseDown={(e) => handleResizeMouseDown(e, 'e', comp)} />
                    <div className="sel-handle se" onMouseDown={(e) => handleResizeMouseDown(e, 'se', comp)} />
                    <div className="sel-handle s" onMouseDown={(e) => handleResizeMouseDown(e, 's', comp)} />
                    <div className="sel-handle sw" onMouseDown={(e) => handleResizeMouseDown(e, 'sw', comp)} />
                    <div className="sel-handle w" onMouseDown={(e) => handleResizeMouseDown(e, 'w', comp)} />

                    {/* Dimensions & coordinates tooltip */}
                    <div className="component-dimensions-badge">
                      {comp.name} [{comp.left}, {comp.top} - {comp.width}x{comp.height}]
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Form Resize Handles (Bottom, Right, Corner) */}
        <div className="form-resize-handle form-resize-e" onMouseDown={(e) => handleFormResizeMouseDown(e, 'e')} />
        <div className="form-resize-handle form-resize-s" onMouseDown={(e) => handleFormResizeMouseDown(e, 's')} />
        <div className="form-resize-handle form-resize-se" onMouseDown={(e) => handleFormResizeMouseDown(e, 'se')} />
      </div>

      {/* Floating Status Indicator at bottom left */}
      <div className="designer-status-dock">
        <span>X: {mousePos.x} px</span>
        <span>Y: {mousePos.y} px</span>
        <span className="sep">|</span>
        <span>
          {singleSelectedComp
            ? `Selecionado: ${singleSelectedComp.name} (${singleSelectedComp.type})`
            : selectedComponentIds.length > 1
              ? `${selectedComponentIds.length} componentes selecionados`
              : `Formulário: ${form.name} (T${form.name})`}
        </span>
        <span className="sep">|</span>
        <span className="hint-text">Dica: F12 alterna código Pascal | F9 executa</span>
      </div>

      {/* Context Menu Popup */}
      {contextMenu && (
        <div
          className="lazarus-context-menu"
          style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="ctx-item"
            onClick={() => {
              if (contextMenu.componentId) {
                const comp = form.components.find(c => c.id === contextMenu.componentId);
                if (comp) onDoubleClickComponent(comp);
              } else {
                onToggleFormCode();
              }
              setContextMenu(null);
            }}
          >
            <Code size={14} /> Exibir Código <span className="ctx-short">F12</span>
          </div>

          {contextMenu.componentId && (
            <>
              <div className="ctx-divider" />
              <div
                className="ctx-item"
                onClick={() => {
                  onDuplicateComponent(contextMenu.componentId!);
                  setContextMenu(null);
                }}
              >
                <Copy size={14} /> Duplicar <span className="ctx-short">Ctrl+D</span>
              </div>
              <div
                className="ctx-item"
                onClick={() => {
                  onBringToFront(contextMenu.componentId!);
                  setContextMenu(null);
                }}
              >
                <ArrowUp size={14} /> Trazer para a Frente
              </div>
              <div
                className="ctx-item"
                onClick={() => {
                  onSendToBack(contextMenu.componentId!);
                  setContextMenu(null);
                }}
              >
                <ArrowDown size={14} /> Enviar para Trás
              </div>
              <div
                className="ctx-item"
                onClick={() => {
                  const comp = form.components.find(c => c.id === contextMenu.componentId);
                  if (comp) {
                    onUpdateComponent(comp.id, {
                      left: Math.round((form.width - comp.width) / 2)
                    });
                  }
                  setContextMenu(null);
                }}
              >
                <AlignCenter size={14} /> Centralizar no Formulário
              </div>
              <div className="ctx-divider" />
              <div
                className="ctx-item danger"
                onClick={() => {
                  onDeleteComponents([contextMenu.componentId!]);
                  setContextMenu(null);
                }}
              >
                <Trash2 size={14} /> Excluir Componente <span className="ctx-short">Del</span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// Component Visual Renderer for each Lazarus Control Type
const ComponentRenderer: React.FC<{ comp: LComponent }> = ({ comp }) => {
  const fontStyle: React.CSSProperties = {
    color: comp.fontColor || 'inherit',
    fontSize: comp.fontSize ? `${comp.fontSize}px` : undefined,
    fontWeight: comp.fontBold ? 'bold' : 'normal',
    fontStyle: comp.fontItalic ? 'italic' : 'normal'
  };

  switch (comp.type) {
    case 'TButton':
      return (
        <button
          className="lcl-widget lcl-button"
          style={{ ...fontStyle, backgroundColor: comp.color || undefined }}
          disabled={!comp.enabled}
        >
          {comp.caption || comp.name}
        </button>
      );

    case 'TLabel':
      return (
        <div className="lcl-widget lcl-label" style={fontStyle}>
          {comp.caption || comp.name}
        </div>
      );

    case 'TEdit':
      return (
        <div
          className="lcl-widget lcl-edit"
          style={{ ...fontStyle, backgroundColor: comp.color || '#ffffff' }}
        >
          {comp.text || <span className="placeholder">{comp.placeholder || comp.name}</span>}
        </div>
      );

    case 'TMemo':
      return (
        <div
          className="lcl-widget lcl-memo"
          style={{ ...fontStyle, backgroundColor: comp.color || '#ffffff' }}
        >
          {comp.text || comp.caption || comp.name}
        </div>
      );

    case 'TCheckBox':
      return (
        <div className="lcl-widget lcl-checkbox" style={fontStyle}>
          <input type="checkbox" checked={comp.checked || false} readOnly />
          <span>{comp.caption || comp.name}</span>
        </div>
      );

    case 'TRadioButton':
      return (
        <div className="lcl-widget lcl-radio" style={fontStyle}>
          <input type="radio" checked={comp.checked || false} readOnly />
          <span>{comp.caption || comp.name}</span>
        </div>
      );

    case 'TListBox':
      return (
        <div className="lcl-widget lcl-listbox" style={fontStyle}>
          {(comp.items && comp.items.length > 0 ? comp.items : ['Item 1', 'Item 2', 'Item 3']).map((it, idx) => (
            <div key={idx} className={`listbox-item ${idx === (comp.selectedIndex ?? 0) ? 'active' : ''}`}>
              {it}
            </div>
          ))}
        </div>
      );

    case 'TComboBox':
      return (
        <div className="lcl-widget lcl-combobox" style={fontStyle}>
          <span>{comp.text || (comp.items?.[0] ?? comp.name)}</span>
          <span className="combo-arrow">▼</span>
        </div>
      );

    case 'TScrollBar':
      return (
        <div className="lcl-widget lcl-scrollbar">
          <div className="scroll-btn left">◄</div>
          <div className="scroll-track">
            <div className="scroll-thumb" style={{ width: '30%', left: '20%' }} />
          </div>
          <div className="scroll-btn right">►</div>
        </div>
      );

    case 'TGroupBox':
      return (
        <div className="lcl-widget lcl-groupbox" style={fontStyle}>
          <fieldset>
            <legend>{comp.caption || comp.name}</legend>
          </fieldset>
        </div>
      );

    case 'TRadioGroup':
      return (
        <div className="lcl-widget lcl-radiogroup" style={fontStyle}>
          <fieldset>
            <legend>{comp.caption || comp.name}</legend>
            <div className="radio-options">
              {(comp.items && comp.items.length > 0 ? comp.items : ['Opção A', 'Opção B']).map((op, i) => (
                <label key={i} className="radio-item">
                  <input type="radio" name={comp.name} defaultChecked={i === 0} readOnly />
                  <span>{op}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      );

    case 'TPanel':
      return (
        <div
          className="lcl-widget lcl-panel"
          style={{ ...fontStyle, backgroundColor: comp.color || '#ece9d8' }}
        >
          <span className="panel-caption">{comp.caption || comp.name}</span>
        </div>
      );

    case 'TBitBtn':
      return (
        <button className="lcl-widget lcl-bitbtn" style={fontStyle}>
          <span className="btn-glyph">✔</span>
          <span>{comp.caption || comp.name}</span>
        </button>
      );

    case 'TSpeedButton':
      return (
        <button className="lcl-widget lcl-speedbutton" style={fontStyle}>
          ⚡ {comp.caption || ''}
        </button>
      );

    case 'TImage':
      return (
        <div className="lcl-widget lcl-image">
          {comp.imageUrl ? (
            <img src={comp.imageUrl} alt={comp.name} />
          ) : (
            <div className="image-placeholder">
              <span>🖼️ TImage</span>
            </div>
          )}
        </div>
      );

    case 'TShape':
      return (
        <div
          className={`lcl-widget lcl-shape shape-${comp.shapeType || 'rectangle'}`}
          style={{
            backgroundColor: comp.color || '#4096ff',
            borderColor: comp.fontColor || '#1677ff'
          }}
        />
      );

    case 'TBevel':
      return <div className="lcl-widget lcl-bevel" />;

    case 'TProgressBar':
      const pct = Math.min(100, Math.max(0, comp.progress ?? 45));
      return (
        <div className="lcl-widget lcl-progressbar">
          <div className="progress-fill" style={{ width: `${pct}%`, backgroundColor: comp.color || '#1677ff' }} />
        </div>
      );

    case 'TTrackBar':
      return (
        <div className="lcl-widget lcl-trackbar">
          <input
            type="range"
            min={comp.min ?? 0}
            max={comp.max ?? 100}
            value={comp.value ?? 50}
            readOnly
          />
        </div>
      );

    case 'TStatusBar':
      return (
        <div className="lcl-widget lcl-statusbar">
          <div className="status-panel">{comp.caption || 'Pronto'}</div>
          <div className="status-panel small">100%</div>
        </div>
      );

    case 'TPageControl':
      const tabs = comp.tabs && comp.tabs.length > 0 ? comp.tabs : ['Página 1', 'Página 2'];
      return (
        <div className="lcl-widget lcl-pagecontrol">
          <div className="page-tabs-header">
            {tabs.map((tb, idx) => (
              <div key={idx} className={`page-tab ${idx === (comp.activeTab ?? 0) ? 'active' : ''}`}>
                {tb}
              </div>
            ))}
          </div>
          <div className="page-tab-content">
            <span className="tab-hint">Conteúdo da {tabs[comp.activeTab ?? 0]}</span>
          </div>
        </div>
      );

    case 'TOpenDialog':
    case 'TSaveDialog':
      return (
        <div className="lcl-widget lcl-nonvisual-dialog" title={comp.name}>
          <div className="dialog-icon">
            {renderComponentIcon(comp.type === 'TOpenDialog' ? 'FolderOpen' : 'Save', 20)}
          </div>
          <span className="dialog-name">{comp.name}</span>
        </div>
      );

    case 'TDBGrid':
      return (
        <div className="lcl-widget lcl-dbgrid">
          <div className="grid-header-row">
            <div className="grid-cell col-id">ID</div>
            <div className="grid-cell col-name">Nome</div>
            <div className="grid-cell col-email">E-mail</div>
            <div className="grid-cell col-status">Status</div>
          </div>
          <div className="grid-body-rows">
            <div className="grid-row">
              <div className="grid-cell col-id">1</div>
              <div className="grid-cell col-name">Pascal Brasil</div>
              <div className="grid-cell col-email">dev@pascal.org</div>
              <div className="grid-cell col-status tag-ok">Ativo</div>
            </div>
            <div className="grid-row selected-row">
              <div className="grid-cell col-id">2</div>
              <div className="grid-cell col-name">Lazarus Web</div>
              <div className="grid-cell col-email">web@lazarus.net</div>
              <div className="grid-cell col-status tag-ok">Ativo</div>
            </div>
            <div className="grid-row">
              <div className="grid-cell col-id">3</div>
              <div className="grid-cell col-name">Free Pascal</div>
              <div className="grid-cell col-email">fpc@freepascal.org</div>
              <div className="grid-cell col-status tag-warn">Pendente</div>
            </div>
          </div>
        </div>
      );

    default:
      return (
        <div className="lcl-widget lcl-generic">
          <span>{comp.name} ({comp.type})</span>
        </div>
      );
  }
};
