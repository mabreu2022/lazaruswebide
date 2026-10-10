import React, { useState } from 'react';
import { MousePointer2, Search, X } from 'lucide-react';
import type { ComponentCategory, LComponentType } from '../types/lazarus';
import { COMPONENT_DEFINITIONS } from '../data/componentRegistry';
import { renderComponentIcon } from './componentIcons';

export { renderComponentIcon };

interface ComponentPaletteProps {
  selectedComponentType: LComponentType | null;
  onSelectComponentType: (type: LComponentType | null) => void;
}

const CATEGORIES: ComponentCategory[] = [
  'Standard',
  'Additional',
  'Containers',
  'Common Controls',
  'Dialogs',
  'Data Controls',
  'Zeos / Firebird'
];

export const ComponentPalette: React.FC<ComponentPaletteProps> = ({
  selectedComponentType,
  onSelectComponentType
}) => {
  const [activeCategory, setActiveCategory] = useState<ComponentCategory>('Standard');
  const [searchQuery, setSearchQuery] = useState('');

  const allComponents = Object.values(COMPONENT_DEFINITIONS);

  const filteredComponents = allComponents.filter(c => {
    if (searchQuery.trim()) {
      return (
        c.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (activeCategory === 'Containers') {
      return [
        'TPanel',
        'TScrollBox',
        'TGroupBox',
        'TRadioGroup',
        'TPageControl',
        'TNotebook',
        'TFlowPanel',
        'TGridPanel',
        'TPairSplitter',
        'TFrame'
      ].includes(c.type);
    }
    if (activeCategory === 'Standard') {
      return c.category === 'Standard' || c.type === 'TScrollBox';
    }
    return c.category === activeCategory;
  });

  return (
    <div className="lazarus-palette-bar">
      {/* Category Tabs & Search Bar */}
      <div className="palette-header-row">
        <div className="palette-category-tabs">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              className={`palette-tab ${activeCategory === cat && !searchQuery ? 'active' : ''}`}
              onClick={() => {
                setActiveCategory(cat);
                setSearchQuery('');
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="palette-search">
          <Search size={13} className="search-icon" />
          <input
            type="text"
            placeholder="Filtrar componentes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Component Icons Bar */}
      <div className="palette-items-row">
        {/* Pointer Selection Tool (Default) */}
        <button
          className={`palette-item-btn pointer-tool ${selectedComponentType === null ? 'active' : ''}`}
          onClick={() => onSelectComponentType(null)}
          title="Ferramenta de Seleção / Ponteiro (Esc)"
        >
          <MousePointer2 size={16} />
          <span className="item-label">Ponteiro</span>
        </button>

        <div className="palette-items-divider" />

        {/* Dynamic component buttons */}
        <div className="palette-scroll-container">
          {filteredComponents.map(comp => {
            const isSelected = selectedComponentType === comp.type;

            return (
              <button
                key={comp.type}
                className={`palette-item-btn ${isSelected ? 'active' : ''}`}
                onClick={() => {
                  onSelectComponentType(isSelected ? null : comp.type);
                }}
                draggable={true}
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/lazarus-component', comp.type);
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                title={`${comp.type} - ${comp.description}\n(Clique para posicionar ou arraste para o formulário)`}
              >
                <div className="item-icon-wrapper">
                  {renderComponentIcon(comp.iconName)}
                </div>
                <span className="item-label">{comp.type.replace(/^T/, '')}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
