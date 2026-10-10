import type { LComponentDefinition, LComponentType } from '../types/lazarus';

export const COMPONENT_DEFINITIONS: Record<LComponentType, LComponentDefinition> = {
  // Standard
  TButton: {
    type: 'TButton',
    category: 'Standard',
    defaultName: 'Button',
    defaultCaption: 'Button1',
    defaultWidth: 90,
    defaultHeight: 30,
    iconName: 'SquareMousePointer',
    description: 'Botão de clique padrão VCL/LCL'
  },
  TLabel: {
    type: 'TLabel',
    category: 'Standard',
    defaultName: 'Label',
    defaultCaption: 'Label1',
    defaultWidth: 100,
    defaultHeight: 20,
    iconName: 'Type',
    description: 'Rótulo de texto estático'
  },
  TEdit: {
    type: 'TEdit',
    category: 'Standard',
    defaultName: 'Edit',
    defaultCaption: '',
    defaultWidth: 130,
    defaultHeight: 26,
    iconName: 'TextCursorInput',
    description: 'Caixa de entrada de texto de linha única'
  },
  TMemo: {
    type: 'TMemo',
    category: 'Standard',
    defaultName: 'Memo',
    defaultCaption: 'Memo1',
    defaultWidth: 180,
    defaultHeight: 90,
    iconName: 'FileText',
    description: 'Caixa de texto multilinha'
  },
  TCheckBox: {
    type: 'TCheckBox',
    category: 'Standard',
    defaultName: 'CheckBox',
    defaultCaption: 'CheckBox1',
    defaultWidth: 110,
    defaultHeight: 24,
    iconName: 'CheckSquare',
    description: 'Caixa de seleção de marcar/desmarcar'
  },
  TRadioButton: {
    type: 'TRadioButton',
    category: 'Standard',
    defaultName: 'RadioButton',
    defaultCaption: 'RadioButton1',
    defaultWidth: 110,
    defaultHeight: 24,
    iconName: 'CircleDot',
    description: 'Botão de opção exclusivo'
  },
  TListBox: {
    type: 'TListBox',
    category: 'Standard',
    defaultName: 'ListBox',
    defaultCaption: '',
    defaultWidth: 140,
    defaultHeight: 110,
    iconName: 'List',
    description: 'Lista vertical selecionável'
  },
  TComboBox: {
    type: 'TComboBox',
    category: 'Standard',
    defaultName: 'ComboBox',
    defaultCaption: '',
    defaultWidth: 130,
    defaultHeight: 26,
    iconName: 'ChevronDownSquare',
    description: 'Caixa de seleção suspensa (dropdown)'
  },
  TScrollBar: {
    type: 'TScrollBar',
    category: 'Standard',
    defaultName: 'ScrollBar',
    defaultCaption: '',
    defaultWidth: 140,
    defaultHeight: 20,
    iconName: 'SlidersHorizontal',
    description: 'Barra de rolagem manual'
  },
  TGroupBox: {
    type: 'TGroupBox',
    category: 'Standard',
    defaultName: 'GroupBox',
    defaultCaption: 'GroupBox1',
    defaultWidth: 180,
    defaultHeight: 130,
    iconName: 'BoxSelect',
    description: 'Caixa agrupamento com borda e título'
  },
  TRadioGroup: {
    type: 'TRadioGroup',
    category: 'Standard',
    defaultName: 'RadioGroup',
    defaultCaption: 'Opções',
    defaultWidth: 160,
    defaultHeight: 120,
    iconName: 'ListOrdered',
    description: 'Grupo de botões de opção interligados'
  },
  TPanel: {
    type: 'TPanel',
    category: 'Standard',
    defaultName: 'Panel',
    defaultCaption: 'Panel1',
    defaultWidth: 180,
    defaultHeight: 100,
    iconName: 'PanelTop',
    description: 'Painel visual de contenção e alinhamento'
  },

  // Additional
  TBitBtn: {
    type: 'TBitBtn',
    category: 'Additional',
    defaultName: 'BitBtn',
    defaultCaption: 'OK',
    defaultWidth: 90,
    defaultHeight: 32,
    iconName: 'CheckCircle2',
    description: 'Botão com glifo / ícone embutido'
  },
  TSpeedButton: {
    type: 'TSpeedButton',
    category: 'Additional',
    defaultName: 'SpeedButton',
    defaultCaption: 'Speed',
    defaultWidth: 32,
    defaultHeight: 32,
    iconName: 'Zap',
    description: 'Botão rápido plano para barras de ferramentas'
  },
  TImage: {
    type: 'TImage',
    category: 'Additional',
    defaultName: 'Image',
    defaultCaption: '',
    defaultWidth: 120,
    defaultHeight: 100,
    iconName: 'Image',
    description: 'Área para exibição de imagens bitmap/PNG'
  },
  TShape: {
    type: 'TShape',
    category: 'Additional',
    defaultName: 'Shape',
    defaultCaption: '',
    defaultWidth: 80,
    defaultHeight: 80,
    iconName: 'Shapes',
    description: 'Forma geométrica vetorial desenhada'
  },
  TBevel: {
    type: 'TBevel',
    category: 'Additional',
    defaultName: 'Bevel',
    defaultCaption: '',
    defaultWidth: 160,
    defaultHeight: 20,
    iconName: 'Minus',
    description: 'Linha chanfrada ou borda separadora'
  },

  // Common Controls
  TProgressBar: {
    type: 'TProgressBar',
    category: 'Common Controls',
    defaultName: 'ProgressBar',
    defaultCaption: '',
    defaultWidth: 160,
    defaultHeight: 22,
    iconName: 'Percent',
    description: 'Barra de progresso de operação'
  },
  TTrackBar: {
    type: 'TTrackBar',
    category: 'Common Controls',
    defaultName: 'TrackBar',
    defaultCaption: '',
    defaultWidth: 150,
    defaultHeight: 30,
    iconName: 'Sliders',
    description: 'Controle deslizante de valores numéricos'
  },
  TStatusBar: {
    type: 'TStatusBar',
    category: 'Common Controls',
    defaultName: 'StatusBar',
    defaultCaption: 'Pronto.',
    defaultWidth: 300,
    defaultHeight: 24,
    iconName: 'MenuSquare',
    description: 'Barra de status no rodapé do formulário'
  },
  TPageControl: {
    type: 'TPageControl',
    category: 'Common Controls',
    defaultName: 'PageControl',
    defaultCaption: '',
    defaultWidth: 240,
    defaultHeight: 140,
    iconName: 'FolderKanban',
    description: 'Painel com abas navegáveis (Notebook/Tabs)'
  },

  // Dialogs
  TOpenDialog: {
    type: 'TOpenDialog',
    category: 'Dialogs',
    defaultName: 'OpenDialog',
    defaultCaption: 'Abrir Arquivo',
    defaultWidth: 36,
    defaultHeight: 36,
    iconName: 'FolderOpen',
    description: 'Componente não-visual para seleção de arquivo',
    isNonVisual: true
  },
  TSaveDialog: {
    type: 'TSaveDialog',
    category: 'Dialogs',
    defaultName: 'SaveDialog',
    defaultCaption: 'Salvar Arquivo',
    defaultWidth: 36,
    defaultHeight: 36,
    iconName: 'Save',
    description: 'Componente não-visual para salvar arquivo',
    isNonVisual: true
  },

  // Data Controls
  TDBGrid: {
    type: 'TDBGrid',
    category: 'Data Controls',
    defaultName: 'DBGrid',
    defaultCaption: '',
    defaultWidth: 280,
    defaultHeight: 140,
    iconName: 'Table',
    description: 'Grade de dados tabulares (Grid de Banco de Dados)'
  }
};

export const STANDARD_EVENTS: Record<LComponentType, string[]> = {
  TButton: ['OnClick', 'OnMouseEnter', 'OnMouseLeave', 'OnKeyDown'],
  TLabel: ['OnClick', 'OnDblClick', 'OnMouseEnter', 'OnMouseLeave'],
  TEdit: ['OnChange', 'OnClick', 'OnKeyDown', 'OnExit'],
  TMemo: ['OnChange', 'OnClick', 'OnKeyDown'],
  TCheckBox: ['OnChange', 'OnClick'],
  TRadioButton: ['OnClick'],
  TListBox: ['OnClick', 'OnDblClick', 'OnChange'],
  TComboBox: ['OnChange', 'OnClick'],
  TScrollBar: ['OnChange', 'OnScroll'],
  TGroupBox: ['OnClick'],
  TRadioGroup: ['OnClick', 'OnChange'],
  TPanel: ['OnClick', 'OnDblClick', 'OnMouseEnter'],
  TBitBtn: ['OnClick'],
  TSpeedButton: ['OnClick'],
  TImage: ['OnClick', 'OnDblClick'],
  TShape: ['OnClick'],
  TBevel: [],
  TProgressBar: [],
  TTrackBar: ['OnChange'],
  TStatusBar: ['OnClick'],
  TPageControl: ['OnChange'],
  TOpenDialog: ['OnClose'],
  TSaveDialog: ['OnClose'],
  TDBGrid: ['OnCellClick', 'OnDblClick']
};

export const FORM_EVENTS = ['OnCreate', 'OnShow', 'OnClose', 'OnClick', 'OnResize'];
