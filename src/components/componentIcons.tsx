import React from 'react';
import {
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
  Database,
  TableProperties,
  Link2,
  Navigation
} from 'lucide-react';

export const renderComponentIcon = (iconName: string, size = 16): React.ReactElement => {
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
    case 'Database': return <Database size={size} />;
    case 'TableProperties': return <TableProperties size={size} />;
    case 'Link2': return <Link2 size={size} />;
    case 'Navigation': return <Navigation size={size} />;
    default: return <SquareMousePointer size={size} />;
  }
};
