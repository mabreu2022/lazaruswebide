import React, { useState } from 'react';
import {
  MousePointer2,
  SquareMousePointer,
  Type,
  TextCursorInput,
  FileText,
  CheckSquare,
  CircleDot,
  List,
  ChevronDownSquare,
  SlidersHorizontal,
  BoxSelect,
  ListOrdered,
  PanelTop,
  CheckCircle2,
  Zap,
  Image as ImageIcon,
  Shapes,
  Minus,
  Percent,
  Sliders,
  MenuSquare,
  FolderKanban,
  FolderOpen,
  Save,
  Table,
  Search,
  X
} from 'lucide-react';
import type { ComponentCategory, LComponentType } from '../types/lazarus';
import { COMPONENT_DEFINITIONS } from '../data/componentRegistry';

interface ComponentPaletteProps {
  selectedComponentType: LComponentType | null;
  onSelectComponentType: (type: LComponentType | null) => void;
}

const CATEGORIES: ComponentCategory[] = [
  'Standard',
  'Additional',
  'Common Controls',
  'Dialogs',
  'Data Controls'
];

// Helper to map icon names to Lucide icon components
export const renderComponentIcon = (iconName: string, size = 16) => {
  switch (iconName) {
    case 'SquareMousePointer': return <SquareMousePointer size={size} />;
    case 'Type': return <Type size={size} />;
    case 'TextCursorInput': return <TextCursorInput size={size} />;
    case 'FileText': return <FileText size={size} />;
    case 'CheckSquare': return <CheckSquare size={size} />;
    case 'CircleDot': return <CircleDot size={size} />;
    case 'List': return <List size={size} />;
    case 'ChevronDownSquare': return <ChevronDownSquare size={size} />;
    case 'SlidersHorizontal': return <SlidersHorizontal size={size} />;
    case 'BoxSelect': return <BoxSelect size={size} />;
    case 'ListOrdered': return <ListOrdered size={size} />;
    case 'PanelTop': return <PanelTop size={size} />;
    case 'CheckCircle2': return <CheckCircle2 size={size} />;
    case 'Zap': return <Zap size={size} />;
    case 'Image': return <ImageIcon size={size} />;
    case 'Shapes': return <Shapes size={size} />;
    case 'Minus': return <Minus size={size} />;
    case 'Percent': return <Percent size={size} />;
    case 'Sliders': return <Sliders size={size} />;
    case 'MenuSquare': return <MenuSquare size={size} />;
    case 'FolderKanban': return <FolderKanban size={size} />;
    case 'FolderOpen': return <FolderOpen size={size} />;
    case 'Save': return <Save size={size} />;
    case 'Table': return <Table size={size} />;
    default: return <SquareMousePointer size={size} />;
  }
};

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
