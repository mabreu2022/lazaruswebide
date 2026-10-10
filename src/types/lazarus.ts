export type ComponentCategory =
  | 'Standard'
  | 'Additional'
  | 'Common Controls'
  | 'Dialogs'
  | 'Data Controls'
  | 'Zeos / Firebird';

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
  | 'TFrame'
  // Additional
  | 'TBitBtn'
  | 'TSpeedButton'
  | 'TImage'
  | 'TShape'
  | 'TBevel'
  | 'TScrollBox'
  | 'TFlowPanel'
  | 'TGridPanel'
  | 'TPairSplitter'
  | 'TPairSplitterSide'
  // Common Controls
  | 'TProgressBar'
  | 'TTrackBar'
  | 'TStatusBar'
  | 'TPageControl'
  | 'TTabSheet'
  | 'TNotebook'
  | 'TPage'
  // Dialogs
  | 'TOpenDialog'
  | 'TSaveDialog'
  // Data Controls
  | 'TDBGrid'
  | 'TDBNavigator'
  | 'TDBEdit'
  // Zeos / Firebird 5.0 Database Access
  | 'TZConnection'
  | 'TZQuery'
  | 'TZTable'
  | 'TDataSource';

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
export type AnchorType = 'akLeft' | 'akTop' | 'akRight' | 'akBottom';
export type BevelStyle = 'bvNone' | 'bvLowered' | 'bvRaised' | 'bvSpace';
export type BorderStyle = 'bsNone' | 'bsSingle';

export interface ChildSizingConfig {
  layout?: 'cslChoose' | 'cslHomogenous';
  controlsPerLine?: number;
  horizontalSpacing?: number;
  verticalSpacing?: number;
}

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
  anchors?: AnchorType[];
  parentId?: string; // Container component ID (e.g. TPanel, TTabSheet, TFrame)
  // Container & Bevel properties
  bevelInner?: BevelStyle;
  bevelOuter?: BevelStyle;
  bevelWidth?: number;
  borderStyle?: BorderStyle;
  autoScroll?: boolean;
  flowLayout?: 'tlLeftToRight' | 'tlTopToBottom';
  gridRows?: number;
  gridColumns?: number;
  splitterPosition?: number;
  splitterOrientation?: 'poVertical' | 'poHorizontal';
  childSizing?: ChildSizingConfig;
  // Specific properties
  checked?: boolean;
  items?: string[];
  selectedIndex?: number;
  itemIndex?: number;
  progress?: number;
  min?: number;
  max?: number;
  value?: number;
  shapeType?: 'rectangle' | 'circle' | 'roundRect';
  imageUrl?: string;
  tabs?: string[];
  activeTab?: number;
  activePageIndex?: number;
  pageIndex?: number;
  isNonVisual?: boolean;
  // Database Properties (Firebird 5.0 & Zeos DBO)
  protocol?: string;         // 'firebird-5.0', 'firebird-4.0', 'sqlite-3', etc.
  hostName?: string;         // 'localhost'
  port?: number;             // 3050
  database?: string;         // 'C:\Bancos\banco.fdb'
  user?: string;             // 'SYSDBA'
  password?: string;         // 'masterkey'
  connected?: boolean;       // True / False
  charSet?: string;          // 'UTF8'
  autoCommit?: boolean;      // True / False
  connectionName?: string;   // Reference to TZConnection
  sql?: string;              // 'SELECT * FROM CLIENTES'
  active?: boolean;          // True / False
  datasetName?: string;      // Reference to TZQuery / TZTable
  dataSourceName?: string;   // Reference to TDataSource
  dataField?: string;        // 'NOME', 'EMAIL', etc.
  // Events mapping: event name -> method name
  events: Record<string, string>;
  // Custom code inside the event procedure
  eventCode: Record<string, string>;
}

export interface LForm {
  id: string;
  name: string;
  unitName?: string; // 'Unit1', 'Unit2', etc.
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
  forms?: LForm[];
  activeFormId?: string;
  selectedComponentIds: string[];
  activeTab: 'form' | 'code' | 'lfm' | 'project';
  activeCodeFile: string; // 'Unit1.pas' | 'Unit1.lfm' | 'Unit2.pas' | 'Unit2.lfm' | 'Project1.lpr'
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
