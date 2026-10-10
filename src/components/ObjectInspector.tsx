import React, { useState } from 'react';
import type {
  LComponent,
  LForm,
  AlignType
} from '../types/lazarus';
import { STANDARD_EVENTS, FORM_EVENTS } from '../data/componentRegistry';
import { isContainerComponent, canAdoptChild } from '../utils/layoutEngine';
import {
  ListFilter,
  Zap,
  Sliders,
  ChevronDown,
  Layers,
  Code
} from 'lucide-react';

interface ObjectInspectorProps {
  form: LForm;
  selectedComponentIds: string[];
  onSelectComponent: (id: string) => void;
  onSelectForm: () => void;
  onUpdateComponent: (id: string, updates: Partial<LComponent>) => void;
  onUpdateForm: (updates: Partial<LForm>) => void;
  onOpenEventHandler: (componentId: string | null, eventName: string, procedureName: string) => void;
}

export const ObjectInspector: React.FC<ObjectInspectorProps> = ({
  form,
  selectedComponentIds,
  onSelectComponent,
  onSelectForm,
  onUpdateComponent,
  onUpdateForm,
  onOpenEventHandler
}) => {
  const [activeTab, setActiveTab] = useState<'properties' | 'events'>('properties');
  const [filterQuery, setFilterQuery] = useState('');
  const [showTree, setShowTree] = useState(true);
  const [treeHeight, setTreeHeight] = useState<number>(150);
  const [isDraggingSplitter, setIsDraggingSplitter] = useState<boolean>(false);

  const handleSplitterMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDraggingSplitter(true);
    const startY = e.clientY;
    const startHeight = treeHeight;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientY - startY;
      const newHeight = Math.max(60, Math.min(500, startHeight + delta));
      setTreeHeight(newHeight);
    };

    const onMouseUp = () => {
      setIsDraggingSplitter(false);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Identify selected object (either a component or the form itself)
  const isFormSelected = selectedComponentIds.length === 0;
  const selectedComp = selectedComponentIds.length === 1
    ? form.components.find(c => c.id === selectedComponentIds[0])
    : null;

  // Events list depending on selection
  const availableEvents: string[] = isFormSelected
    ? FORM_EVENTS
    : selectedComp
      ? (STANDARD_EVENTS[selectedComp.type] || ['OnClick'])
      : [];

  const handleEventDoubleClick = (eventName: string) => {
    if (isFormSelected) {
      const existing = form.events[eventName] || `Form${eventName.replace(/^On/, '')}`;
      onUpdateForm({
        events: { ...form.events, [eventName]: existing },
        eventCode: {
          ...form.eventCode,
          [eventName]: form.eventCode[eventName] || `begin\n  // Ação ao disparar ${eventName} do formulário\nend;`
        }
      });
      onOpenEventHandler(null, eventName, existing);
    } else if (selectedComp) {
      const existing = selectedComp.events[eventName] || `${selectedComp.name}${eventName.replace(/^On/, '')}`;
      onUpdateComponent(selectedComp.id, {
        events: { ...selectedComp.events, [eventName]: existing },
        eventCode: {
          ...selectedComp.eventCode,
          [eventName]: selectedComp.eventCode[eventName] || `begin\n  ShowMessage('Evento ${eventName} de ${selectedComp.name} disparado!');\nend;`
        }
      });
      onOpenEventHandler(selectedComp.id, eventName, existing);
    }
  };

  return (
    <aside className="lazarus-object-inspector">
      {/* Title Header */}
      <div className="inspector-header">
        <div className="header-title">
          <Sliders size={14} className="icon-blue" />
          <span>Inspetor de Objetos</span>
        </div>
        <button
          className={`tree-toggle-btn ${showTree ? 'active' : ''}`}
          onClick={() => setShowTree(!showTree)}
          title="Alternar Árvore de Componentes"
        >
          <Layers size={13} />
        </button>
      </div>

      {/* Component Selector Dropdown */}
      <div className="component-selector-box">
        <select
          className="component-select-dropdown"
          value={isFormSelected ? '__form__' : (selectedComp?.id || '')}
          onChange={(e) => {
            if (e.target.value === '__form__') {
              onSelectForm();
            } else {
              onSelectComponent(e.target.value);
            }
          }}
        >
          <option value="__form__">{form.name}: T{form.name}</option>
          {form.components.map(comp => (
            <option key={comp.id} value={comp.id}>
              {comp.name}: {comp.type}
            </option>
          ))}
        </select>
        <ChevronDown size={14} className="dropdown-arrow" />
      </div>

      {/* Component Tree View (Collapsible, Hierarchical, Resizable with Mouse) */}
      {showTree && (
        <>
          <div
            className="component-tree-view"
            style={{ height: `${treeHeight}px`, maxHeight: 'none', minHeight: '60px' }}
          >
            <div
              className={`tree-node form-node ${isFormSelected ? 'active' : ''}`}
              onClick={onSelectForm}
            >
              {form.isDataModule ? '🗄️' : '📁'} <strong>{form.name}</strong> (T{form.name})
            </div>
            <div className="tree-children">
              {(() => {
                const visited = new Set<string>();

                const renderBranch = (parentId: string | undefined, depth: number): React.ReactNode => {
                  const branchComps = form.components.filter(c =>
                    parentId ? c.parentId === parentId : !c.parentId
                  );

                  return branchComps.map(c => {
                    visited.add(c.id);
                    const isSelected = selectedComponentIds.includes(c.id);
                    const isContainer = isContainerComponent(c.type);
                    const childrenCount = form.components.filter(sub => sub.parentId === c.id).length;

                    return (
                      <React.Fragment key={c.id}>
                        <div
                          className={`tree-node comp-node ${isSelected ? 'active' : ''} ${depth > 1 ? 'is-child-node' : ''}`}
                          style={{ paddingLeft: `${12 + (depth - 1) * 16}px` }}
                          onClick={() => onSelectComponent(c.id)}
                        >
                          <span className="tree-node-icon">
                            {isContainer ? (childrenCount > 0 ? '📂' : '📁') : '🧩'}
                          </span>
                          <span className="tree-node-name">{c.name}</span>
                          <span className="tree-type">:{c.type}</span>
                          {childrenCount > 0 && (
                            <span className="tree-child-count">[{childrenCount}]</span>
                          )}
                        </div>
                        {isContainer && renderBranch(c.id, depth + 1)}
                      </React.Fragment>
                    );
                  });
                };

                const renderedRoot = renderBranch(undefined, 1);

                // Guard for any orphaned components whose parent was deleted or missing
                const orphaned = form.components.filter(c => c.parentId && !visited.has(c.id));
                const renderedOrphans = orphaned.map(c => (
                  <div
                    key={c.id}
                    className={`tree-node comp-node ${selectedComponentIds.includes(c.id) ? 'active' : ''}`}
                    style={{ paddingLeft: '16px' }}
                    onClick={() => onSelectComponent(c.id)}
                  >
                    <span>⚠️ {c.name}</span>
                    <span className="tree-type">:{c.type}</span>
                  </div>
                ));

                return (
                  <>
                    {renderedRoot}
                    {renderedOrphans}
                  </>
                );
              })()}
            </div>
          </div>

          {/* Draggable Splitter between Tree and Properties */}
          <div
            className={`inspector-tree-splitter ${isDraggingSplitter ? 'dragging' : ''}`}
            onMouseDown={handleSplitterMouseDown}
            title="Arraste para redimensionar a divisão da árvore de componentes e propriedades"
          >
            <div className="inspector-splitter-grip" />
          </div>
        </>
      )}

      {/* Tabs Switcher: Propriedades / Eventos */}
      <div className="inspector-tabs">
        <button
          className={`inspector-tab ${activeTab === 'properties' ? 'active' : ''}`}
          onClick={() => setActiveTab('properties')}
        >
          Propriedades
        </button>
        <button
          className={`inspector-tab ${activeTab === 'events' ? 'active' : ''}`}
          onClick={() => setActiveTab('events')}
        >
          <Zap size={12} className="tab-icon" />
          Eventos
        </button>
      </div>

      {/* Search / Filter for properties */}
      <div className="inspector-filter">
        <ListFilter size={12} className="filter-icon" />
        <input
          type="text"
          placeholder="Filtrar..."
          value={filterQuery}
          onChange={(e) => setFilterQuery(e.target.value.toLowerCase())}
        />
      </div>

      {/* Main Properties/Events Grid */}
      <div className="inspector-grid-scroll">
        {activeTab === 'properties' ? (
          <div className="property-grid">
            {/* If Form is selected */}
            {isFormSelected && (
              <>
                {filterMatch('Name', filterQuery) && (
                  <PropertyRow label="Name" readOnly value={form.name} />
                )}
                {filterMatch('Caption', filterQuery) && (
                  <PropertyRow
                    label="Caption"
                    value={form.caption}
                    onChange={(val) => onUpdateForm({ caption: String(val) })}
                  />
                )}
                {filterMatch('Width', filterQuery) && (
                  <PropertyRow
                    label="Width"
                    type="number"
                    value={form.width}
                    onChange={(val) => onUpdateForm({ width: Math.max(100, Number(val)) })}
                  />
                )}
                {filterMatch('Height', filterQuery) && (
                  <PropertyRow
                    label="Height"
                    type="number"
                    value={form.height}
                    onChange={(val) => onUpdateForm({ height: Math.max(100, Number(val)) })}
                  />
                )}
                {filterMatch('Color', filterQuery) && (
                  <PropertyRow
                    label="Color"
                    type="color"
                    value={form.color}
                    onChange={(val) => onUpdateForm({ color: String(val) })}
                  />
                )}
                {filterMatch('Font.Size', filterQuery) && (
                  <PropertyRow
                    label="Font.Size"
                    type="number"
                    value={form.fontSize}
                    onChange={(val) => onUpdateForm({ fontSize: Number(val) })}
                  />
                )}
              </>
            )}

            {/* If a Single Component is selected */}
            {selectedComp && (
              <>
                {filterMatch('Name', filterQuery) && (
                  <PropertyRow
                    label="Name"
                    value={selectedComp.name}
                    onChange={(val) => {
                      const cleanName = String(val).replace(/[^a-zA-Z0-9_]/g, '');
                      if (cleanName) onUpdateComponent(selectedComp.id, { name: cleanName });
                    }}
                  />
                )}

                {/* Caption / Text */}
                {selectedComp.caption !== undefined && filterMatch('Caption', filterQuery) && (
                  <PropertyRow
                    label="Caption"
                    value={selectedComp.caption}
                    onChange={(val) => onUpdateComponent(selectedComp.id, { caption: String(val) })}
                  />
                )}

                {selectedComp.text !== undefined && filterMatch('Text', filterQuery) && (
                  <PropertyRow
                    label="Text"
                    value={selectedComp.text}
                    onChange={(val) => onUpdateComponent(selectedComp.id, { text: String(val) })}
                  />
                )}

                {/* Geometry */}
                {filterMatch('Left', filterQuery) && (
                  <PropertyRow
                    label="Left"
                    type="number"
                    value={selectedComp.left}
                    onChange={(val) => onUpdateComponent(selectedComp.id, { left: Number(val) })}
                  />
                )}
                {filterMatch('Top', filterQuery) && (
                  <PropertyRow
                    label="Top"
                    type="number"
                    value={selectedComp.top}
                    onChange={(val) => onUpdateComponent(selectedComp.id, { top: Number(val) })}
                  />
                )}
                {filterMatch('Width', filterQuery) && (
                  <PropertyRow
                    label="Width"
                    type="number"
                    value={selectedComp.width}
                    onChange={(val) => onUpdateComponent(selectedComp.id, { width: Math.max(10, Number(val)) })}
                  />
                )}
                {filterMatch('Height', filterQuery) && (
                  <PropertyRow
                    label="Height"
                    type="number"
                    value={selectedComp.height}
                    onChange={(val) => onUpdateComponent(selectedComp.id, { height: Math.max(10, Number(val)) })}
                  />
                )}

                {/* Common Behavior */}
                {filterMatch('Enabled', filterQuery) && (
                  <PropertyRow
                    label="Enabled"
                    type="boolean"
                    value={selectedComp.enabled}
                    onChange={(val) => onUpdateComponent(selectedComp.id, { enabled: Boolean(val) })}
                  />
                )}
                {filterMatch('Visible', filterQuery) && (
                  <PropertyRow
                    label="Visible"
                    type="boolean"
                    value={selectedComp.visible}
                    onChange={(val) => onUpdateComponent(selectedComp.id, { visible: Boolean(val) })}
                  />
                )}

                {/* Align */}
                {filterMatch('Align', filterQuery) && (
                  <PropertyRow
                    label="Align"
                    type="select"
                    options={['alNone', 'alTop', 'alBottom', 'alLeft', 'alRight', 'alClient']}
                    value={selectedComp.align || 'alNone'}
                    onChange={(val) => onUpdateComponent(selectedComp.id, { align: val as AlignType })}
                  />
                )}

                {/* Parent Container (with cycle prevention) */}
                {filterMatch('Parent', filterQuery) && (
                  <PropertyRow
                    label="Parent"
                    type="select"
                    options={[
                      '(Form)',
                      ...form.components
                        .filter(c => isContainerComponent(c.type) && canAdoptChild(c.id, selectedComp.id, form.components))
                        .map(c => c.name)
                    ]}
                    value={
                      selectedComp.parentId
                        ? (form.components.find(c => c.id === selectedComp.parentId)?.name || '(Form)')
                        : '(Form)'
                    }
                    onChange={(val) => {
                      if (val === '(Form)') {
                        onUpdateComponent(selectedComp.id, { parentId: undefined });
                      } else {
                        const target = form.components.find(c => c.name === val);
                        if (target && canAdoptChild(target.id, selectedComp.id, form.components)) {
                          onUpdateComponent(selectedComp.id, { parentId: target.id });
                        }
                      }
                    }}
                  />
                )}

                {/* BevelInner (TPanel) */}
                {selectedComp.type === 'TPanel' && filterMatch('BevelInner', filterQuery) && (
                  <PropertyRow
                    label="BevelInner"
                    type="select"
                    options={['bvNone', 'bvLowered', 'bvRaised', 'bvSpace']}
                    value={selectedComp.bevelInner || 'bvNone'}
                    onChange={(val) => onUpdateComponent(selectedComp.id, { bevelInner: val as any })}
                  />
                )}

                {/* BevelOuter (TPanel) */}
                {selectedComp.type === 'TPanel' && filterMatch('BevelOuter', filterQuery) && (
                  <PropertyRow
                    label="BevelOuter"
                    type="select"
                    options={['bvNone', 'bvLowered', 'bvRaised', 'bvSpace']}
                    value={selectedComp.bevelOuter || 'bvRaised'}
                    onChange={(val) => onUpdateComponent(selectedComp.id, { bevelOuter: val as any })}
                  />
                )}

                {/* BevelWidth (TPanel) */}
                {selectedComp.type === 'TPanel' && filterMatch('BevelWidth', filterQuery) && (
                  <PropertyRow
                    label="BevelWidth"
                    type="number"
                    value={selectedComp.bevelWidth ?? 1}
                    onChange={(val) => onUpdateComponent(selectedComp.id, { bevelWidth: Number(val) })}
                  />
                )}

                {/* BorderStyle */}
                {['TPanel', 'TFrame', 'TScrollBox', 'TFlowPanel', 'TGridPanel'].includes(selectedComp.type) && filterMatch('BorderStyle', filterQuery) && (
                  <PropertyRow
                    label="BorderStyle"
                    type="select"
                    options={['bsNone', 'bsSingle']}
                    value={selectedComp.borderStyle || 'bsNone'}
                    onChange={(val) => onUpdateComponent(selectedComp.id, { borderStyle: val as any })}
                  />
                )}

                {/* AutoScroll (TScrollBox) */}
                {selectedComp.type === 'TScrollBox' && filterMatch('AutoScroll', filterQuery) && (
                  <PropertyRow
                    label="AutoScroll"
                    type="boolean"
                    value={selectedComp.autoScroll ?? true}
                    onChange={(val) => onUpdateComponent(selectedComp.id, { autoScroll: Boolean(val) })}
                  />
                )}

                {/* FlowLayout (TFlowPanel) */}
                {selectedComp.type === 'TFlowPanel' && filterMatch('FlowLayout', filterQuery) && (
                  <PropertyRow
                    label="FlowLayout"
                    type="select"
                    options={['tlLeftToRight', 'tlTopToBottom']}
                    value={selectedComp.flowLayout || 'tlLeftToRight'}
                    onChange={(val) => onUpdateComponent(selectedComp.id, { flowLayout: val as any })}
                  />
                )}

                {/* GridColumns & GridRows (TGridPanel) */}
                {selectedComp.type === 'TGridPanel' && filterMatch('GridColumns', filterQuery) && (
                  <PropertyRow
                    label="GridColumns"
                    type="number"
                    value={selectedComp.gridColumns ?? 2}
                    onChange={(val) => onUpdateComponent(selectedComp.id, { gridColumns: Math.max(1, Number(val)) })}
                  />
                )}
                {selectedComp.type === 'TGridPanel' && filterMatch('GridRows', filterQuery) && (
                  <PropertyRow
                    label="GridRows"
                    type="number"
                    value={selectedComp.gridRows ?? 2}
                    onChange={(val) => onUpdateComponent(selectedComp.id, { gridRows: Math.max(1, Number(val)) })}
                  />
                )}

                {/* SplitterPosition (TPairSplitter) */}
                {selectedComp.type === 'TPairSplitter' && filterMatch('SplitterPosition', filterQuery) && (
                  <PropertyRow
                    label="SplitterPosition"
                    type="number"
                    value={selectedComp.splitterPosition ?? Math.round(selectedComp.width / 2)}
                    onChange={(val) => onUpdateComponent(selectedComp.id, { splitterPosition: Number(val) })}
                  />
                )}

                {/* ItemIndex (TRadioGroup) */}
                {selectedComp.type === 'TRadioGroup' && filterMatch('ItemIndex', filterQuery) && (
                  <PropertyRow
                    label="ItemIndex"
                    type="number"
                    value={selectedComp.itemIndex ?? 0}
                    onChange={(val) => onUpdateComponent(selectedComp.id, { itemIndex: Number(val) })}
                  />
                )}

                {/* ActivePageIndex (TPageControl, TNotebook) */}
                {['TPageControl', 'TNotebook'].includes(selectedComp.type) && filterMatch('ActivePageIndex', filterQuery) && (
                  <PropertyRow
                    label="ActivePageIndex"
                    type="number"
                    value={selectedComp.activePageIndex ?? selectedComp.activeTab ?? 0}
                    onChange={(val) => onUpdateComponent(selectedComp.id, { activePageIndex: Number(val), activeTab: Number(val) })}
                  />
                )}

                {/* Colors & Font */}
                {filterMatch('Color', filterQuery) && (
                  <PropertyRow
                    label="Color"
                    type="color"
                    value={selectedComp.color || '#ece9d8'}
                    onChange={(val) => onUpdateComponent(selectedComp.id, { color: String(val) })}
                  />
                )}
                {filterMatch('Font.Color', filterQuery) && (
                  <PropertyRow
                    label="Font.Color"
                    type="color"
                    value={selectedComp.fontColor || '#000000'}
                    onChange={(val) => onUpdateComponent(selectedComp.id, { fontColor: String(val) })}
                  />
                )}
                {filterMatch('Font.Size', filterQuery) && (
                  <PropertyRow
                    label="Font.Size"
                    type="number"
                    value={selectedComp.fontSize || 13}
                    onChange={(val) => onUpdateComponent(selectedComp.id, { fontSize: Number(val) })}
                  />
                )}
                {filterMatch('Font.Bold', filterQuery) && (
                  <PropertyRow
                    label="Font.Bold"
                    type="boolean"
                    value={selectedComp.fontBold || false}
                    onChange={(val) => onUpdateComponent(selectedComp.id, { fontBold: Boolean(val) })}
                  />
                )}

                {/* Component specific properties */}
                {selectedComp.checked !== undefined && filterMatch('Checked', filterQuery) && (
                  <PropertyRow
                    label="Checked"
                    type="boolean"
                    value={selectedComp.checked}
                    onChange={(val) => onUpdateComponent(selectedComp.id, { checked: Boolean(val) })}
                  />
                )}

                {selectedComp.progress !== undefined && filterMatch('Progress', filterQuery) && (
                  <PropertyRow
                    label="Position"
                    type="number"
                    value={selectedComp.progress}
                    onChange={(val) => onUpdateComponent(selectedComp.id, { progress: Number(val) })}
                  />
                )}

                {selectedComp.shapeType !== undefined && filterMatch('Shape', filterQuery) && (
                  <PropertyRow
                    label="Shape"
                    type="select"
                    options={['rectangle', 'circle', 'roundRect']}
                    value={selectedComp.shapeType}
                    onChange={(val) => onUpdateComponent(selectedComp.id, { shapeType: val as any })}
                  />
                )}

                {selectedComp.hint !== undefined && filterMatch('Hint', filterQuery) && (
                  <PropertyRow
                    label="Hint"
                    value={selectedComp.hint}
                    onChange={(val) => onUpdateComponent(selectedComp.id, { hint: String(val) })}
                  />
                )}

                {/* Picture & Image properties (TImage) */}
                {selectedComp.type === 'TImage' && (
                  <>
                    {filterMatch('Picture', filterQuery) && (
                      <div className="property-row prop-picture-row">
                        <div className="prop-label-col" title="Picture">
                          <span>Picture</span>
                        </div>
                        <div className="prop-value-col picture-value-col">
                          {(selectedComp.picture || selectedComp.imageUrl) ? (
                            <div className="picture-preview-thumb-box">
                              <img
                                src={selectedComp.picture || selectedComp.imageUrl}
                                alt="preview"
                                className="picture-preview-thumb"
                              />
                              <span className="picture-info-tag">Carregada</span>
                              <button
                                type="button"
                                className="prop-btn-clear"
                                title="Remover Imagem"
                                onClick={() => onUpdateComponent(selectedComp.id, { picture: undefined, imageUrl: undefined })}
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <span className="prop-readonly-val">(Nenhuma)</span>
                          )}
                          <label className="prop-file-btn" title="Escolher arquivo de imagem">
                            <span>Carregar...</span>
                            <input
                              type="file"
                              accept="image/*"
                              style={{ display: 'none' }}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onload = (re) => {
                                    const dataUrl = re.target?.result as string;
                                    onUpdateComponent(selectedComp.id, { picture: dataUrl, imageUrl: dataUrl });
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    )}
                    {filterMatch('Stretch', filterQuery) && (
                      <PropertyRow
                        label="Stretch"
                        type="boolean"
                        value={selectedComp.stretch ?? false}
                        onChange={(val) => onUpdateComponent(selectedComp.id, { stretch: Boolean(val) })}
                      />
                    )}
                    {filterMatch('Proportional', filterQuery) && (
                      <PropertyRow
                        label="Proportional"
                        type="boolean"
                        value={selectedComp.proportional ?? false}
                        onChange={(val) => onUpdateComponent(selectedComp.id, { proportional: Boolean(val) })}
                      />
                    )}
                    {filterMatch('Center', filterQuery) && (
                      <PropertyRow
                        label="Center"
                        type="boolean"
                        value={selectedComp.center ?? false}
                        onChange={(val) => onUpdateComponent(selectedComp.id, { center: Boolean(val) })}
                      />
                    )}
                  </>
                )}

                {/* Zeos / Firebird: TZConnection Properties */}
                {selectedComp.type === 'TZConnection' && (
                  <>
                    {filterMatch('Protocol', filterQuery) && (
                      <PropertyRow
                        label="Protocol"
                        type="select"
                        options={['firebird-5.0', 'firebird-4.0', 'firebird-3.0', 'sqlite-3', 'postgresql', 'mysql']}
                        value={selectedComp.protocol || 'firebird-5.0'}
                        onChange={(val) => onUpdateComponent(selectedComp.id, { protocol: String(val) })}
                      />
                    )}
                    {filterMatch('HostName', filterQuery) && (
                      <PropertyRow
                        label="HostName"
                        value={selectedComp.hostName ?? 'localhost'}
                        onChange={(val) => onUpdateComponent(selectedComp.id, { hostName: String(val) })}
                      />
                    )}
                    {filterMatch('Port', filterQuery) && (
                      <PropertyRow
                        label="Port"
                        type="number"
                        value={selectedComp.port ?? 3050}
                        onChange={(val) => onUpdateComponent(selectedComp.id, { port: Number(val) })}
                      />
                    )}
                    {filterMatch('Database', filterQuery) && (
                      <PropertyRow
                        label="Database"
                        value={selectedComp.database ?? 'C:\\Bancos\\meubanco.fdb'}
                        onChange={(val) => onUpdateComponent(selectedComp.id, { database: String(val) })}
                      />
                    )}
                    {filterMatch('User', filterQuery) && (
                      <PropertyRow
                        label="User"
                        value={selectedComp.user ?? 'SYSDBA'}
                        onChange={(val) => onUpdateComponent(selectedComp.id, { user: String(val) })}
                      />
                    )}
                    {filterMatch('Password', filterQuery) && (
                      <PropertyRow
                        label="Password"
                        value={selectedComp.password ?? 'masterkey'}
                        onChange={(val) => onUpdateComponent(selectedComp.id, { password: String(val) })}
                      />
                    )}
                    {filterMatch('Connected', filterQuery) && (
                      <PropertyRow
                        label="Connected"
                        type="boolean"
                        value={selectedComp.connected ?? false}
                        onChange={(val) => onUpdateComponent(selectedComp.id, { connected: Boolean(val) })}
                      />
                    )}
                    {filterMatch('CharSet', filterQuery) && (
                      <PropertyRow
                        label="CharSet"
                        value={selectedComp.charSet ?? 'UTF8'}
                        onChange={(val) => onUpdateComponent(selectedComp.id, { charSet: String(val) })}
                      />
                    )}
                    {filterMatch('AutoCommit', filterQuery) && (
                      <PropertyRow
                        label="AutoCommit"
                        type="boolean"
                        value={selectedComp.autoCommit ?? true}
                        onChange={(val) => onUpdateComponent(selectedComp.id, { autoCommit: Boolean(val) })}
                      />
                    )}
                  </>
                )}

                {/* Zeos / Firebird: TZTransaction Properties */}
                {selectedComp.type === 'TZTransaction' && (
                  <>
                    {filterMatch('Connection', filterQuery) && (
                      <PropertyRow
                        label="Connection"
                        type="select"
                        options={['(Nenhum)', ...form.components.filter(c => c.type === 'TZConnection').map(c => c.name)]}
                        value={selectedComp.connectionName || (form.components.find(c => c.type === 'TZConnection')?.name || '')}
                        onChange={(val) => onUpdateComponent(selectedComp.id, { connectionName: String(val) })}
                      />
                    )}
                    {filterMatch('AutoCommit', filterQuery) && (
                      <PropertyRow
                        label="AutoCommit"
                        type="boolean"
                        value={selectedComp.autoCommit ?? false}
                        onChange={(val) => onUpdateComponent(selectedComp.id, { autoCommit: Boolean(val) })}
                      />
                    )}
                    {filterMatch('TransactIsolationLevel', filterQuery) && (
                      <PropertyRow
                        label="TransactIsolationLevel"
                        type="select"
                        options={['tiReadCommitted', 'tiSerializable', 'tiRepeatableRead', 'tiNone']}
                        value={selectedComp.transactIsolationLevel || 'tiReadCommitted'}
                        onChange={(val) => onUpdateComponent(selectedComp.id, { transactIsolationLevel: val as any })}
                      />
                    )}
                    {filterMatch('Active', filterQuery) && (
                      <PropertyRow
                        label="Active"
                        type="boolean"
                        value={selectedComp.active ?? false}
                        onChange={(val) => onUpdateComponent(selectedComp.id, { active: Boolean(val) })}
                      />
                    )}
                  </>
                )}

                {/* Zeos / Firebird: TZQuery & TZTable Properties */}
                {(selectedComp.type === 'TZQuery' || selectedComp.type === 'TZTable') && (
                  <>
                    {filterMatch('Connection', filterQuery) && (
                      <PropertyRow
                        label="Connection"
                        type="select"
                        options={['(Nenhum)', ...form.components.filter(c => c.type === 'TZConnection').map(c => c.name)]}
                        value={selectedComp.connectionName || (form.components.find(c => c.type === 'TZConnection')?.name || '')}
                        onChange={(val) => onUpdateComponent(selectedComp.id, { connectionName: String(val) })}
                      />
                    )}
                    {filterMatch('Transaction', filterQuery) && (
                      <PropertyRow
                        label="Transaction"
                        type="select"
                        options={['(Nenhum)', ...form.components.filter(c => c.type === 'TZTransaction').map(c => c.name)]}
                        value={selectedComp.transactionName || (form.components.find(c => c.type === 'TZTransaction')?.name || '')}
                        onChange={(val) => onUpdateComponent(selectedComp.id, { transactionName: String(val) })}
                      />
                    )}
                    {selectedComp.type === 'TZQuery' && filterMatch('SQL', filterQuery) && (
                      <PropertyRow
                        label="SQL"
                        value={selectedComp.sql ?? 'SELECT * FROM CLIENTES'}
                        onChange={(val) => onUpdateComponent(selectedComp.id, { sql: String(val) })}
                      />
                    )}
                    {filterMatch('Active', filterQuery) && (
                      <PropertyRow
                        label="Active"
                        type="boolean"
                        value={selectedComp.active ?? false}
                        onChange={(val) => onUpdateComponent(selectedComp.id, { active: Boolean(val) })}
                      />
                    )}
                  </>
                )}

                {/* Zeos: TDataSource Properties */}
                {selectedComp.type === 'TDataSource' && (
                  <>
                    {filterMatch('DataSet', filterQuery) && (
                      <PropertyRow
                        label="DataSet"
                        type="select"
                        options={['(Nenhum)', ...form.components.filter(c => ['TZQuery', 'TZTable'].includes(c.type)).map(c => c.name)]}
                        value={selectedComp.datasetName || (form.components.find(c => ['TZQuery', 'TZTable'].includes(c.type))?.name || '')}
                        onChange={(val) => onUpdateComponent(selectedComp.id, { datasetName: String(val) })}
                      />
                    )}
                    {filterMatch('AutoEdit', filterQuery) && (
                      <PropertyRow
                        label="AutoEdit"
                        type="boolean"
                        value={selectedComp.checked ?? true}
                        onChange={(val) => onUpdateComponent(selectedComp.id, { checked: Boolean(val) })}
                      />
                    )}
                  </>
                )}

                {/* Data Controls: TDBGrid, TDBNavigator, TDBEdit */}
                {['TDBGrid', 'TDBNavigator', 'TDBEdit'].includes(selectedComp.type) && (
                  <>
                    {filterMatch('DataSource', filterQuery) && (
                      <PropertyRow
                        label="DataSource"
                        type="select"
                        options={['(Nenhum)', ...form.components.filter(c => c.type === 'TDataSource').map(c => c.name)]}
                        value={selectedComp.dataSourceName || (form.components.find(c => c.type === 'TDataSource')?.name || '')}
                        onChange={(val) => onUpdateComponent(selectedComp.id, { dataSourceName: String(val) })}
                      />
                    )}
                    {selectedComp.type === 'TDBEdit' && filterMatch('DataField', filterQuery) && (
                      <PropertyRow
                        label="DataField"
                        value={selectedComp.dataField ?? 'NOME'}
                        onChange={(val) => onUpdateComponent(selectedComp.id, { dataField: String(val) })}
                      />
                    )}
                  </>
                )}
              </>
            )}

            {/* Multiple Selected Components */}
            {selectedComponentIds.length > 1 && (
              <div className="inspector-multi-info">
                <span>{selectedComponentIds.length} componentes selecionados.</span>
                <p>Edição em lote de posição e visibilidade disponível.</p>
              </div>
            )}
          </div>
        ) : (
          /* Events Grid */
          <div className="property-grid events-grid">
            {availableEvents.length === 0 ? (
              <div className="no-events-hint">Nenhum evento para este componente.</div>
            ) : (
              availableEvents.map(evtName => {
                const currentProc = isFormSelected
                  ? (form.events[evtName] || '')
                  : (selectedComp?.events[evtName] || '');

                return (
                  <div key={evtName} className="property-row event-row">
                    <div className="prop-label-col" title={`Evento ${evtName}`}>
                      <Zap size={11} className="event-bolt" />
                      <span>{evtName}</span>
                    </div>
                    <div className="prop-value-col event-action-col">
                      <input
                        type="text"
                        placeholder="(Nenhum)"
                        value={currentProc}
                        readOnly
                        onDoubleClick={() => handleEventDoubleClick(evtName)}
                      />
                      <button
                        className="event-open-btn"
                        onClick={() => handleEventDoubleClick(evtName)}
                        title="Abrir no Editor de Código Pascal (F12)"
                      >
                        <Code size={12} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </aside>
  );
};

// Helper: check if property matches filter query
function filterMatch(label: string, query: string): boolean {
  if (!query) return true;
  return label.toLowerCase().includes(query);
}

// Individual Property Row Renderer
interface PropertyRowProps {
  label: string;
  value?: string | number | boolean;
  type?: 'text' | 'number' | 'boolean' | 'color' | 'select';
  options?: string[];
  readOnly?: boolean;
  onChange?: (val: string | number | boolean) => void;
}

const PropertyRow: React.FC<PropertyRowProps> = ({
  label,
  value,
  type = 'text',
  options = [],
  readOnly = false,
  onChange
}) => {
  return (
    <div className="property-row">
      <div className="prop-label-col" title={label}>
        <span>{label}</span>
      </div>
      <div className="prop-value-col">
        {readOnly ? (
          <span className="prop-readonly-val">{String(value)}</span>
        ) : type === 'boolean' ? (
          <select
            className="prop-select"
            value={value ? 'True' : 'False'}
            onChange={(e) => onChange?.(e.target.value === 'True')}
          >
            <option value="True">True</option>
            <option value="False">False</option>
          </select>
        ) : type === 'select' ? (
          <select
            className="prop-select"
            value={String(value)}
            onChange={(e) => onChange?.(e.target.value)}
          >
            {options.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        ) : type === 'color' ? (
          <div className="color-prop-box">
            <input
              type="color"
              className="color-picker-input"
              value={String(value || '#ffffff')}
              onChange={(e) => onChange?.(e.target.value)}
            />
            <span className="color-hex-text">{String(value)}</span>
          </div>
        ) : type === 'number' ? (
          <input
            type="number"
            className="prop-input"
            value={typeof value === 'number' ? value : 0}
            onChange={(e) => onChange?.(Number(e.target.value))}
          />
        ) : (
          <input
            type="text"
            className="prop-input"
            value={typeof value === 'string' ? value : (typeof value === 'number' ? value : '')}
            onChange={(e) => onChange?.(e.target.value)}
          />
        )}
      </div>
    </div>
  );
};
