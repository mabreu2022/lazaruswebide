import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type {
  LComponent,
  LComponentType,
  LForm
} from '../types/lazarus';
import { renderComponentIcon } from './componentIcons';
import {
  computeFullFormLayout,
  isContainerComponent,
  // (hierarquia: ver componentTree.ts)
  canAdoptChild,
  getContainerPadding,
  PAGE_PARENT_TYPE,
  repairPageHierarchy
} from '../utils/layoutEngine';
import { setParent, getChildrenIds } from '../utils/componentTree';
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
  onAddComponent: (type: LComponentType, x: number, y: number, parentId?: string) => void;
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
  initialComponents: { id: string; left: number; top: number; width: number; height: number; parentId?: string }[];
  initialForm?: { left: number; top: number; width: number; height: number };
  activeHandle?: ResizeHandle;
  currentX?: number;
  currentY?: number;
}

function getHierarchyDepth(id: string, components: LComponent[]): number {
  let depth = 0;
  let curr = components.find(c => c.id === id)?.parentId;
  const visited = new Set<string>();
  while (curr) {
    if (visited.has(curr)) break;
    visited.add(curr);
    depth++;
    const p = components.find(c => c.id === curr);
    curr = p?.parentId;
  }
  return depth;
}

function isComponentVisibleInHierarchy(comp: LComponent, components: LComponent[]): boolean {
  const isPageLike = (c: LComponent) => c.type === 'TTabSheet' || c.type === 'TPage';
  if (comp.visible === false && !isPageLike(comp)) return false;
  let currParentId = comp.parentId;
  const visited = new Set<string>();

  while (currParentId) {
    if (visited.has(currParentId)) break;
    visited.add(currParentId);

    const parent = components.find(c => c.id === currParentId);
    if (!parent) break;
    if (parent.visible === false && !isPageLike(parent)) return false;

    // Check if parent is a TabSheet inside a PageControl
    if (parent.type === 'TTabSheet' && parent.parentId) {
      const pc = components.find(c => c.id === parent.parentId);
      if (pc && pc.type === 'TPageControl') {
        const tabSheets = components.filter(c => c.parentId === pc.id && c.type === 'TTabSheet');
        const activeIdx = pc.activeTab ?? pc.activePageIndex ?? 0;
        const activeSheet = tabSheets[activeIdx] || tabSheets[0];
        if (activeSheet && activeSheet.id !== parent.id) return false;
      }
    }

    // Check if parent is a Page inside a Notebook
    if (parent.type === 'TPage' && parent.parentId) {
      const nb = components.find(c => c.id === parent.parentId);
      if (nb && nb.type === 'TNotebook') {
        const pages = components.filter(c => c.parentId === nb.id && c.type === 'TPage');
        const activeIdx = nb.pageIndex ?? nb.activePageIndex ?? 0;
        const activePage = pages[activeIdx] || pages[0];
        if (activePage && activePage.id !== parent.id) return false;
      }
    }

    currParentId = parent.parentId;
  }

  return true;
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

  // Compute full hierarchical layout taking Lazarus LCL alignment and parent containers into account
  const layoutMap = useMemo(() => {
    return computeFullFormLayout(form.components, form.width, form.height);
  }, [form.components, form.width, form.height]);

  // Find container component at a canvas point (prioritizing deepest valid container)
  const findContainerAtPoint = useCallback((
    canvasX: number,
    canvasY: number,
    excludeId?: string
  ): LComponent | null => {
    const matchingContainers: LComponent[] = [];

    for (let i = form.components.length - 1; i >= 0; i--) {
      const c = form.components[i];
      if (c.id === excludeId) continue;
      if (!isContainerComponent(c.type)) continue;
      if (excludeId && !canAdoptChild(c.id, excludeId, form.components)) continue;

      const rect = layoutMap.get(c.id);
      if (!rect) continue;

      if (
        canvasX >= rect.absLeft &&
        canvasX <= rect.absLeft + rect.width &&
        canvasY >= rect.absTop &&
        canvasY <= rect.absTop + rect.height
      ) {
        matchingContainers.push(c);
      }
    }

    if (matchingContainers.length === 0) return null;

    // Sort to pick the deepest nested container (descendants first)
    matchingContainers.sort((a, b) => {
      let curr = a.parentId;
      while (curr) {
        if (curr === b.id) return -1;
        const p = form.components.find(x => x.id === curr);
        curr = p?.parentId;
      }
      return 1;
    });

    const chosen = matchingContainers[0];

    // If chosen container is TPageControl, target its active TTabSheet
    if (chosen.type === 'TPageControl') {
      const tabSheets = form.components.filter(c => c.parentId === chosen.id && c.type === 'TTabSheet');
      const activeIdx = chosen.activeTab ?? chosen.activePageIndex ?? 0;
      const activeSheet = tabSheets[activeIdx] || tabSheets[0];
      if (activeSheet) return activeSheet;
    }

    // If chosen container is TNotebook, target its active TPage
    if (chosen.type === 'TNotebook') {
      const pages = form.components.filter(c => c.parentId === chosen.id && c.type === 'TPage');
      const activeIdx = chosen.pageIndex ?? chosen.activePageIndex ?? 0;
      const activePage = pages[activeIdx] || pages[0];
      if (activePage) return activePage;
    }

    // If chosen container is TPairSplitter, target the side containing the mouse point
    if (chosen.type === 'TPairSplitter') {
      const sides = form.components.filter(c => c.parentId === chosen.id && c.type === 'TPairSplitterSide');
      for (const side of sides) {
        const sRect = layoutMap.get(side.id);
        if (
          sRect &&
          canvasX >= sRect.absLeft &&
          canvasX <= sRect.absLeft + sRect.width &&
          canvasY >= sRect.absTop &&
          canvasY <= sRect.absTop + sRect.height
        ) {
          return side;
        }
      }
      if (sides[0]) return sides[0];
    }

    return chosen;
  }, [form.components, layoutMap]);

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

    const container = findContainerAtPoint(x, y);
    if (container) {
      const contRect = layoutMap.get(container.id) || {
        absLeft: container.left,
        absTop: container.top,
        width: container.width,
        height: container.height
      };
      const pad = getContainerPadding(container);
      const innerAbsLeft = contRect.absLeft + pad.left;
      const innerAbsTop = contRect.absTop + pad.top;
      const relX = Math.max(0, snap(x - innerAbsLeft));
      const relY = Math.max(0, snap(y - innerAbsTop));
      onAddComponent(compType, relX, relY, container.id);
    } else {
      onAddComponent(compType, x, y);
    }
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

      const container = findContainerAtPoint(x, y);
      if (container) {
        const contRect = layoutMap.get(container.id) || {
          absLeft: container.left,
          absTop: container.top,
          width: container.width,
          height: container.height
        };
        const pad = getContainerPadding(container);
        const innerAbsLeft = contRect.absLeft + pad.left;
        const innerAbsTop = contRect.absTop + pad.top;
        const relX = Math.max(0, snap(x - innerAbsLeft));
        const relY = Math.max(0, snap(y - innerAbsTop));
        onAddComponent(selectedPaletteComponent, relX, relY, container.id);
      } else {
        onAddComponent(selectedPaletteComponent, x, y);
      }
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

    // Pages / tab sheets / splitter sides are fixed to their owner: select only, never drag or reparent
    if (PAGE_PARENT_TYPE[comp.type]) return;

    const currentSelectedIds = isAlreadySelected
      ? selectedComponentIds
      : (isMulti ? [...selectedComponentIds, comp.id] : [comp.id]);

    const initialComps = form.components
      .filter(c => currentSelectedIds.includes(c.id) && !PAGE_PARENT_TYPE[c.type])
      .map(c => ({
        id: c.id,
        left: c.left,
        top: c.top,
        width: c.width,
        height: c.height,
        parentId: c.parentId
      }));

    setDragState({
      type: 'move',
      startX: e.clientX,
      startY: e.clientY,
      initialComponents: initialComps
    });
  };

  // Auto-repair tab sheets/pages wrongly nested inside each other (older projects / bad drops)
  useEffect(() => {
    const repaired = repairPageHierarchy(form.components);
    if (repaired !== form.components) {
      repaired.forEach((c, i) => {
        if (c.parentId !== form.components[i].parentId) {
          onUpdateComponent(c.id, { parentId: c.parentId });
        }
      });
    }
  }, [form.components, onUpdateComponent]);

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
    e.preventDefault();
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
    e.preventDefault();
    e.stopPropagation();
    if (e.button !== 0) return;
    onSelectForm();

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

      if (e.buttons === 0) {
        setDragState(null);
        return;
      }

      const deltaX = e.clientX - dragState.startX;
      const deltaY = e.clientY - dragState.startY;

      if (dragState.type === 'move') {
        dragState.initialComponents.forEach(init => {
          const comp = form.components.find(c => c.id === init.id);
          // If aligned, position is controlled by layout engine, do not move unless alNone
          if (comp?.align && comp.align !== 'alNone') return;

          // If this component's parent container is also in dragState.initialComponents, skip it
          // to avoid double delta translation
          const isParentAlsoBeingMoved = dragState.initialComponents.some(other => other.id === comp?.parentId);
          if (isParentAlsoBeingMoved) return;

          const newLeft = Math.max(0, snap(init.left + deltaX));
          const newTop = Math.max(0, snap(init.top + deltaY));
          onUpdateComponent(init.id, { left: newLeft, top: newTop });
        });
      } else if (dragState.type === 'resize' && dragState.activeHandle) {
        const init = dragState.initialComponents[0];
        if (!init) return;

        const comp = form.components.find(c => c.id === init.id);
        const compAlign = comp?.align || 'alNone';
        if (compAlign === 'alClient') return;

        let newLeft = init.left;
        let newTop = init.top;
        let newWidth = init.width;
        let newHeight = init.height;

        const handle = dragState.activeHandle;

        if (compAlign === 'alTop' || compAlign === 'alBottom') {
          if (handle.includes('s')) {
            newHeight = Math.max(20, snap(init.height + deltaY));
          } else if (handle.includes('n')) {
            newHeight = Math.max(20, snap(init.height - deltaY));
          }
        } else if (compAlign === 'alLeft' || compAlign === 'alRight') {
          if (handle.includes('e')) {
            newWidth = Math.max(20, snap(init.width + deltaX));
          } else if (handle.includes('w')) {
            newWidth = Math.max(20, snap(init.width - deltaX));
          }
        } else {
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
      if (dragState && dragState.type === 'move' && dragState.initialComponents.length === 1) {
        const init = dragState.initialComponents[0];
        const comp = form.components.find(c => c.id === init.id);

        if (comp && (!comp.align || comp.align === 'alNone')) {
          const currentRect = layoutMap.get(comp.id) || {
            absLeft: comp.left,
            absTop: comp.top,
            width: comp.width,
            height: comp.height
          };
          const centerX = currentRect.absLeft + comp.width / 2;
          const centerY = currentRect.absTop + comp.height / 2;

          const targetContainer = findContainerAtPoint(centerX, centerY, comp.id);

          if (targetContainer && targetContainer.id !== comp.parentId) {
            if (canAdoptChild(targetContainer.id, comp.id, form.components)) {
              // setParent() recalcula as coordenadas locais a partir da posição absoluta
              const reparented = setParent(form.components, comp.id, targetContainer.id, layoutMap);
              const moved = reparented.find(c => c.id === comp.id);
              if (moved) {
                onUpdateComponent(comp.id, {
                  parentId: targetContainer.id,
                  left: Math.max(0, snap(moved.left)),
                  top: Math.max(0, snap(moved.top))
                });
              }
            }
          } else if (!targetContainer && comp.parentId) {
            onUpdateComponent(comp.id, {
              parentId: undefined,
              left: Math.max(0, snap(currentRect.absLeft)),
              top: Math.max(0, snap(currentRect.absTop))
            });
          }
        }
      }
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
  }, [dragState, snap, onUpdateComponent, onUpdateForm, form.components, layoutMap, findContainerAtPoint]);

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
            if (comp && (!comp.align || comp.align === 'alNone')) {
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
      {/* Visual Form Window (Delphi / Lazarus Desktop Form or DataModule) */}
      <div
        className={`lazarus-form-window ${form.isDataModule ? 'datamodule-window' : ''}`}
        style={{
          left: `${form.left}px`,
          top: `${form.top}px`,
          width: `${form.width + 2}px`,
          height: `${form.height + 30}px`
        }}
      >
        {/* Form Title Bar */}
        <div
          className="form-window-titlebar"
          onMouseDown={handleFormHeaderMouseDown}
          onDoubleClick={onToggleFormCode}
        >
          <div className="titlebar-caption">
            <span className="window-icon">{form.isDataModule ? '🗄️' : '🗂️'}</span>
            <span className="window-title-text">
              {form.isDataModule ? `${form.name}: T${form.name} [DataModule]` : form.caption}
            </span>
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
            width: `${form.width}px`,
            height: `${form.height}px`,
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
            if (!isComponentVisibleInHierarchy(comp, form.components)) return null;

            const isSelected = selectedComponentIds.includes(comp.id);
            const rect = layoutMap.get(comp.id) || {
              left: comp.left,
              top: comp.top,
              width: comp.width,
              height: comp.height,
              absLeft: comp.left,
              absTop: comp.top
            };
            const displayLeft = rect.absLeft;
            const displayTop = rect.absTop;
            const isContainer = isContainerComponent(comp.type);
            const depth = getHierarchyDepth(comp.id, form.components);

            return (
              <div
                key={comp.id}
                id={`comp-${comp.id}`}
                data-comp-name={comp.name}
                data-parent-id={comp.parentId || ''}
                data-is-container={isContainer ? 'true' : 'false'}
                data-children={getChildrenIds(form.components, comp.id).join(',')}
                className={`designer-component-wrapper ${isSelected ? 'selected' : ''} ${isContainer ? 'is-container' : ''}`}
                style={{
                  left: `${displayLeft}px`,
                  top: `${displayTop}px`,
                  width: `${rect.width}px`,
                  height: `${rect.height}px`,
                  zIndex: isSelected ? 100 : (10 + depth * 2)
                }}
                onMouseDown={(e) => handleComponentMouseDown(e, comp)}
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  onDoubleClickComponent(comp);
                }}
                onContextMenu={(e) => handleContextMenu(e, comp.id)}
              >
                {/* Component Render */}
                <ComponentRenderer
                  comp={comp}
                  form={form}
                  onUpdateComponent={onUpdateComponent}
                  onAddComponent={onAddComponent}
                  onSelectComponent={onSelectComponent}
                />

                {/* Selection Handles if selected */}
                {isSelected && (
                  <div className="selection-handles-layer">
                    {comp.align !== 'alClient' && (
                      <>
                        {(!comp.align || comp.align === 'alNone') && (
                          <>
                            <div className="sel-handle nw" onMouseDown={(e) => handleResizeMouseDown(e, 'nw', comp)} />
                            <div className="sel-handle ne" onMouseDown={(e) => handleResizeMouseDown(e, 'ne', comp)} />
                            <div className="sel-handle sw" onMouseDown={(e) => handleResizeMouseDown(e, 'sw', comp)} />
                            <div className="sel-handle se" onMouseDown={(e) => handleResizeMouseDown(e, 'se', comp)} />
                          </>
                        )}
                        {(!comp.align || comp.align === 'alNone' || comp.align === 'alTop' || comp.align === 'alBottom') && (
                          <>
                            <div className="sel-handle n" onMouseDown={(e) => handleResizeMouseDown(e, 'n', comp)} />
                            <div className="sel-handle s" onMouseDown={(e) => handleResizeMouseDown(e, 's', comp)} />
                          </>
                        )}
                        {(!comp.align || comp.align === 'alNone' || comp.align === 'alLeft' || comp.align === 'alRight') && (
                          <>
                            <div className="sel-handle w" onMouseDown={(e) => handleResizeMouseDown(e, 'w', comp)} />
                            <div className="sel-handle e" onMouseDown={(e) => handleResizeMouseDown(e, 'e', comp)} />
                          </>
                        )}
                      </>
                    )}

                    {/* Dimensions & coordinates tooltip */}
                    <div className="component-dimensions-badge">
                      {comp.name} [{Math.round(rect.left)}, {Math.round(rect.top)} - {Math.round(rect.width)}x{Math.round(rect.height)}]
                      {comp.align && comp.align !== 'alNone' ? ` • ${comp.align}` : ''}
                      {comp.parentId ? ` • Parent: ${form.components.find(c => c.id === comp.parentId)?.name || 'Panel'}` : ''}
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
const ComponentRenderer: React.FC<{
  comp: LComponent;
  form?: LForm;
  onUpdateComponent?: (id: string, updates: Partial<LComponent>) => void;
  onAddComponent?: (type: LComponentType, x: number, y: number, parentId?: string) => void;
  onSelectComponent?: (id: string, isMulti?: boolean) => void;
}> = ({ comp, form, onUpdateComponent, onAddComponent, onSelectComponent }) => {
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
          <fieldset className="groupbox-fieldset">
            <legend className="groupbox-legend">{comp.caption || comp.name}</legend>
            <div className="container-inner-area" />
          </fieldset>
        </div>
      );

    case 'TRadioGroup': {
      const items = comp.items && comp.items.length > 0 ? comp.items : ['Opção 1', 'Opção 2', 'Opção 3'];
      const activeIdx = comp.itemIndex ?? 0;
      return (
        <div className="lcl-widget lcl-radiogroup" style={fontStyle}>
          <fieldset className="radiogroup-fieldset">
            <legend className="radiogroup-legend">{comp.caption || comp.name}</legend>
            <div className="radiogroup-items-list">
              {items.map((op, i) => (
                <label
                  key={i}
                  className={`radiogroup-item-label ${i === activeIdx ? 'active-radio' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onUpdateComponent) {
                      onUpdateComponent(comp.id, { itemIndex: i });
                    }
                  }}
                >
                  <input
                    type="radio"
                    name={`rg_${comp.id}`}
                    checked={i === activeIdx}
                    onChange={() => {}}
                  />
                  <span>{op}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      );
    }

    case 'TPanel': {
      const outer = comp.bevelOuter || 'bvRaised';
      const inner = comp.bevelInner || 'bvNone';
      const bw = comp.bevelWidth ?? 1;
      const borderSingle = comp.borderStyle === 'bsSingle';

      return (
        <div
          className={`lcl-widget lcl-panel bevel-outer-${outer.replace('bv', '').toLowerCase()} ${borderSingle ? 'border-single' : ''}`}
          style={{
            ...fontStyle,
            backgroundColor: comp.color || '#ece9d8',
            borderWidth: outer !== 'bvNone' ? `${bw}px` : undefined
          }}
        >
          <div
            className={`panel-inner-container bevel-inner-${inner.replace('bv', '').toLowerCase()}`}
            style={{ borderWidth: inner !== 'bvNone' ? `${bw}px` : undefined }}
          >
            {comp.caption && <span className="panel-caption">{comp.caption}</span>}
          </div>
        </div>
      );
    }

    case 'TFrame':
      return (
        <div className="lcl-widget lcl-frame" style={fontStyle}>
          <div className="frame-header-tag">
            <span className="frame-icon">🗔</span>
            <span>TFrame: {comp.name}</span>
          </div>
        </div>
      );

    case 'TPageControl': {
      const tabSheets = form
        ? form.components.filter(c => c.parentId === comp.id && c.type === 'TTabSheet')
        : [];
      const tabNames = tabSheets.length > 0
        ? tabSheets.map(s => s.caption || s.name)
        : (comp.tabs && comp.tabs.length > 0 ? comp.tabs : ['Página 1', 'Página 2']);
      const activeIdx = Math.min(tabNames.length - 1, Math.max(0, comp.activeTab ?? comp.activePageIndex ?? 0));

      return (
        <div className="lcl-widget lcl-pagecontrol">
          <div className="page-tabs-header">
            {tabNames.map((tb, idx) => (
              <div
                key={idx}
                className={`page-tab ${idx === activeIdx ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onUpdateComponent) {
                    onUpdateComponent(comp.id, { activeTab: idx, activePageIndex: idx });
                  }
                  // Keep the PageControl selected so its Pages manager stays available in the inspector
                  onSelectComponent?.(comp.id);
                }}
              >
                {tb}
              </div>
            ))}
            {onAddComponent && (
              <button
                className="add-tab-btn"
                title="Adicionar Nova Aba (TTabSheet)"
                onClick={(e) => {
                  e.stopPropagation();
                  // App.handleAddComponent creates the sheet, names it and activates the new tab
                  onAddComponent('TTabSheet', 0, 0, comp.id);
                }}
              >
                +
              </button>
            )}
          </div>
          <div className="page-tab-content-area" />
        </div>
      );
    }

    case 'TTabSheet':
      return (
        <div className="lcl-widget lcl-tabsheet" style={fontStyle}>
          <div className="tabsheet-designer-indicator">
            📄 {comp.caption || comp.name}
          </div>
        </div>
      );

    case 'TNotebook': {
      const pages = form
        ? form.components.filter(c => c.parentId === comp.id && c.type === 'TPage')
        : [];
      const totalPages = Math.max(1, pages.length > 0 ? pages.length : (comp.tabs?.length || 2));
      const activeIdx = Math.min(totalPages - 1, Math.max(0, comp.pageIndex ?? comp.activePageIndex ?? 0));

      return (
        <div className="lcl-widget lcl-notebook" style={fontStyle}>
          <div className="notebook-designer-bar">
            <span className="notebook-title">📖 TNotebook: {comp.name}</span>
            <div className="notebook-nav">
              <button
                className="nb-nav-btn"
                disabled={activeIdx === 0}
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateComponent?.(comp.id, { pageIndex: Math.max(0, activeIdx - 1) });
                }}
              >
                ◄
              </button>
              <span className="nb-page-text">{activeIdx + 1} / {totalPages}</span>
              <button
                className="nb-nav-btn"
                disabled={activeIdx >= totalPages - 1}
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateComponent?.(comp.id, { pageIndex: Math.min(totalPages - 1, activeIdx + 1) });
                }}
              >
                ►
              </button>
              {onAddComponent && (
                <button
                  className="add-page-btn"
                  title="Nova Página (TPage)"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddComponent('TPage', 4, 4, comp.id);
                    onUpdateComponent?.(comp.id, { pageIndex: totalPages });
                  }}
                >
                  + Página
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    case 'TPage':
      return (
        <div className="lcl-widget lcl-page" style={fontStyle}>
          <div className="page-designer-indicator">
            📑 {comp.caption || comp.name}
          </div>
        </div>
      );

    case 'TScrollBox':
      return (
        <div className="lcl-widget lcl-scrollbox" style={fontStyle}>
          <div className="scrollbox-header-badge">
            <span>📜 TScrollBox (AutoScroll)</span>
          </div>
        </div>
      );

    case 'TFlowPanel':
      return (
        <div className="lcl-widget lcl-flowpanel" style={fontStyle}>
          <div className="flowpanel-header-badge">
            <span>🌊 TFlowPanel [{comp.flowLayout || 'tlLeftToRight'}]</span>
          </div>
        </div>
      );

    case 'TGridPanel': {
      const cols = comp.gridColumns ?? 2;
      const rows = comp.gridRows ?? 2;
      return (
        <div className="lcl-widget lcl-gridpanel" style={fontStyle}>
          <div className="gridpanel-header-badge">
            <span>⊞ TGridPanel [{cols} col x {rows} lin]</span>
          </div>
          <div
            className="gridpanel-cells-overlay"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${cols}, 1fr)`,
              gridTemplateRows: `repeat(${rows}, 1fr)`
            }}
          >
            {Array.from({ length: cols * rows }).map((_, i) => (
              <div key={i} className="gridpanel-cell-guideline" />
            ))}
          </div>
        </div>
      );
    }

    case 'TPairSplitter': {
      const splitPos = Math.max(20, Math.min(comp.width - 20, comp.splitterPosition ?? Math.round(comp.width / 2)));
      return (
        <div className="lcl-widget lcl-pairsplitter" style={fontStyle}>
          <div
            className="pairsplitter-bar"
            style={{ left: `${splitPos - 3}px` }}
            title="Arrastar divisor (Splitter)"
            onMouseDown={(e) => {
              e.stopPropagation();
              const startX = e.clientX;
              const startPos = splitPos;

              const onMove = (me: MouseEvent) => {
                const delta = me.clientX - startX;
                const newPos = Math.max(20, Math.min(comp.width - 20, Math.round(startPos + delta)));
                onUpdateComponent?.(comp.id, { splitterPosition: newPos });
              };

              const onUp = () => {
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
              };

              window.addEventListener('mousemove', onMove);
              window.addEventListener('mouseup', onUp);
            }}
          >
            <div className="splitter-grip-dots" />
          </div>
        </div>
      );
    }

    case 'TPairSplitterSide':
      return (
        <div className="lcl-widget lcl-pairsplitterside" style={fontStyle}>
          <div className="splitterside-header-badge">
            <span>◧ {comp.caption || comp.name}</span>
          </div>
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

    case 'TImage': {
      const src = comp.picture || comp.imageUrl;
      const objectFit = comp.stretch
        ? comp.proportional ? 'contain' : 'fill'
        : 'none';
      const objectPosition = comp.center ? 'center' : 'top left';

      return (
        <div
          className="lcl-widget lcl-image"
          style={{
            width: '100%',
            height: '100%',
            overflow: 'hidden',
            display: 'flex',
            alignItems: comp.center ? 'center' : 'flex-start',
            justifyContent: comp.center ? 'center' : 'flex-start',
            backgroundColor: comp.color || 'transparent'
          }}
        >
          {src ? (
            <img
              src={src}
              alt={comp.name}
              style={{
                width: comp.stretch ? '100%' : 'auto',
                height: comp.stretch ? '100%' : 'auto',
                objectFit,
                objectPosition,
                pointerEvents: 'none',
                userSelect: 'none'
              }}
            />
          ) : (
            <div className="image-placeholder">
              <span>🖼️ {comp.name}</span>
            </div>
          )}
        </div>
      );
    }

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

    case 'TProgressBar': {
      const pct = Math.min(100, Math.max(0, comp.progress ?? 45));
      return (
        <div className="lcl-widget lcl-progressbar">
          <div className="progress-fill" style={{ width: `${pct}%`, backgroundColor: comp.color || '#1677ff' }} />
        </div>
      );
    }

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

    case 'TDBNavigator':
      return (
        <div className="lcl-widget lcl-dbnavigator">
          <button className="nav-btn" title="Primeiro">|◄</button>
          <button className="nav-btn" title="Anterior">◄</button>
          <button className="nav-btn" title="Próximo">►</button>
          <button className="nav-btn" title="Último">►|</button>
          <button className="nav-btn" title="Inserir">+</button>
          <button className="nav-btn" title="Excluir">-</button>
          <button className="nav-btn" title="Editar">✎</button>
          <button className="nav-btn" title="Gravar">✔</button>
          <button className="nav-btn" title="Cancelar">✖</button>
          <button className="nav-btn" title="Atualizar">↻</button>
        </div>
      );

    case 'TDBEdit':
      return (
        <div
          className="lcl-widget lcl-dbedit"
          style={{ ...fontStyle, backgroundColor: comp.color || '#ffffff' }}
        >
          <span className="dbedit-field">{comp.dataField ? `[${comp.dataField}]` : (comp.text || comp.name)}</span>
          <span className="dbedit-tag">DB</span>
        </div>
      );

    case 'TZConnection':
      return (
        <div className="lcl-widget lcl-zeos-component zconnection-widget" title={`${comp.name} - Firebird 5.0`}>
          <div className="zeos-icon-box fb-badge">
            {renderComponentIcon('Database', 20)}
          </div>
          <span className="zeos-comp-name">{comp.name}</span>
          <span className="zeos-proto-tag">{comp.protocol || 'firebird-5.0'}</span>
        </div>
      );

    case 'TZTransaction':
      return (
        <div className="lcl-widget lcl-zeos-component ztransaction-widget" title={`${comp.name} - Transação Firebird 5.0 (Zeos DBO)`}>
          <div className="zeos-icon-box trans-badge" style={{ backgroundColor: '#10b981' }}>
            {renderComponentIcon('ShieldCheck', 20)}
          </div>
          <span className="zeos-comp-name">{comp.name}</span>
          <span className="zeos-proto-tag">{comp.transactIsolationLevel || 'tiReadCommitted'}</span>
        </div>
      );

    case 'TZQuery':
      return (
        <div className="lcl-widget lcl-zeos-component zquery-widget" title={`${comp.name} - Consulta SQL`}>
          <div className="zeos-icon-box query-badge">
            {renderComponentIcon('TableProperties', 20)}
          </div>
          <span className="zeos-comp-name">{comp.name}</span>
          <span className="zeos-proto-tag">{comp.active ? 'Active' : (comp.connectionName || 'ZQuery')}</span>
        </div>
      );

    case 'TZTable':
      return (
        <div className="lcl-widget lcl-zeos-component ztable-widget" title={comp.name}>
          <div className="zeos-icon-box table-badge">
            {renderComponentIcon('Table', 20)}
          </div>
          <span className="zeos-comp-name">{comp.name}</span>
          <span className="zeos-proto-tag">Table</span>
        </div>
      );

    case 'TZMemTable':
      return (
        <div className="lcl-widget lcl-zeos-component zmemtable-widget" title={`${comp.name} - Dataset em memória (ZMemTable)`}>
          <div className="zeos-icon-box table-badge" style={{ backgroundColor: '#8b5cf6' }}>
            {renderComponentIcon('MemoryStick', 20)}
          </div>
          <span className="zeos-comp-name">{comp.name}</span>
          <span className="zeos-proto-tag">{comp.active ? 'Active' : 'Memory'}</span>
        </div>
      );

    case 'TDataSource':
      return (
        <div className="lcl-widget lcl-zeos-component datasource-widget" title={`${comp.name} -> ${comp.datasetName || 'DataSet'}`}>
          <div className="zeos-icon-box ds-badge">
            {renderComponentIcon('Link2', 20)}
          </div>
          <span className="zeos-comp-name">{comp.name}</span>
          <span className="zeos-proto-tag">{comp.datasetName || 'ds'}</span>
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
