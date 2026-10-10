export type ComponentCategory = 'Standard' | 'Additional' | 'Common Controls' | 'Dialogs' | 'Data Controls';

export type LComponentType =
  // Standard
  | 'TButton'
  | 'TLabel'
  | 'TEdit'
  | 'TMemo'
  | 'TCheckBox'
  | 'TRadioButton'
  | 'TListBox'
  | 'TComboBox'
  | 'TScrollBar'
  | 'TGroupBox'
  | 'TRadioGroup'
  | 'TPanel'
  // Additional
  | 'TBitBtn'
  | 'TSpeedButton'
  | 'TImage'
  | 'TShape'
  | 'TBevel'
  // Common Controls
  | 'TProgressBar'
  | 'TTrackBar'
  | 'TStatusBar'
  | 'TPageControl'
  // Dialogs
  | 'TOpenDialog'
  | 'TSaveDialog'
  // Data Controls
  | 'TDBGrid';

export interface LComponentDefinition {
  type: LComponentType;
  category: ComponentCategory;
  defaultName: string;
  defaultCaption?: string;
  defaultWidth: number;
  defaultHeight: number;
  iconName: string;
  description: string;
  isNonVisual?: boolean;
}

export type AlignType = 'alNone' | 'alTop' | 'alBottom' | 'alLeft' | 'alRight' | 'alClient';

export interface LComponent {
  id: string;
  type: LComponentType;
  name: string;
  left: number;
  top: number;
  width: number;
  height: number;
  caption?: string;
  text?: string;
  placeholder?: string;
  enabled: boolean;
  visible: boolean;
  color?: string;
  fontColor?: string;
  fontSize?: number;
  fontBold?: boolean;
  fontItalic?: boolean;
  fontFamily?: string;
  hint?: string;
  showHint?: boolean;
  tabOrder?: number;
  align?: AlignType;
  // Specific properties
  checked?: boolean;
  items?: string[];
  selectedIndex?: number;
  progress?: number;
  min?: number;
  max?: number;
  value?: number;
  shapeType?: 'rectangle' | 'circle' | 'roundRect';
  imageUrl?: string;
  tabs?: string[];
  activeTab?: number;
  isNonVisual?: boolean;
  // Events mapping: event name -> method name
  events: Record<string, string>;
  // Custom code inside the event procedure
  eventCode: Record<string, string>;
}

export interface LForm {
  id: string;
  name: string;
  caption: string;
  left: number;
  top: number;
  width: number;
  height: number;
  color: string;
  fontFamily: string;
  fontSize: number;
  components: LComponent[];
  events: Record<string, string>;
  eventCode: Record<string, string>;
}

export interface IDEState {
  form: LForm;
  selectedComponentIds: string[];
  activeTab: 'form' | 'code' | 'lfm' | 'project';
  activeCodeFile: 'unit1.pas' | 'unit1.lfm' | 'project1.lpr';
  theme: 'lazarus-dark' | 'lazarus-classic';
  gridSize: number;
  snapToGrid: boolean;
  showGrid: boolean;
  selectedPaletteComponent: LComponentType | null;
  isRunning: boolean;
  activeEventToEdit?: { componentId: string; eventName: string; procedureName: string };
  consoleLogs: ConsoleMessage[];
}

export interface ConsoleMessage {
  id: string;
  time: string;
  type: 'info' | 'success' | 'warning' | 'error';
  text: string;
}
