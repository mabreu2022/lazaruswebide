import React, { useState } from 'react';
import type {
  LComponent,
  LForm,
  AlignType
} from '../types/lazarus';
import { STANDARD_EVENTS, FORM_EVENTS } from '../data/componentRegistry';
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
  const [showTree, setShowTree] = useState(false);

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

      {/* Component Tree View (Collapsible) */}
      {showTree && (
        <div className="component-tree-view">
          <div
            className={`tree-node form-node ${isFormSelected ? 'active' : ''}`}
            onClick={onSelectForm}
          >
            📁 <strong>{form.name}</strong> (T{form.name})
          </div>
          <div className="tree-children">
            {form.components.map(c => (
              <div
                key={c.id}
                className={`tree-node comp-node ${selectedComponentIds.includes(c.id) ? 'active' : ''}`}
                onClick={() => onSelectComponent(c.id)}
              >
                🧩 <span>{c.name}</span> <span className="tree-type">:{c.type}</span>
              </div>
            ))}
          </div>
        </div>
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
