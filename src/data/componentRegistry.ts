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
  TFrame: {
    type: 'TFrame',
    category: 'Standard',
    defaultName: 'Frame',
    defaultCaption: '',
    defaultWidth: 220,
    defaultHeight: 140,
    iconName: 'LayoutDashboard',
    description: 'Template / Sub-formulário reaproveitável'
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
  TScrollBox: {
    type: 'TScrollBox',
    category: 'Additional',
    defaultName: 'ScrollBox',
    defaultCaption: '',
    defaultWidth: 200,
    defaultHeight: 140,
    iconName: 'ScrollText',
    description: 'Container com rolagem automática (AutoScroll)'
  },
  TFlowPanel: {
    type: 'TFlowPanel',
    category: 'Additional',
    defaultName: 'FlowPanel',
    defaultCaption: '',
    defaultWidth: 220,
    defaultHeight: 120,
    iconName: 'WrapText',
    description: 'Painel com layout fluido e quebra automática'
  },
  TGridPanel: {
    type: 'TGridPanel',
    category: 'Additional',
    defaultName: 'GridPanel',
    defaultCaption: '',
    defaultWidth: 240,
    defaultHeight: 140,
    iconName: 'LayoutGrid',
    description: 'Painel de grade estruturado por linhas e colunas'
  },
  TPairSplitter: {
    type: 'TPairSplitter',
    category: 'Additional',
    defaultName: 'PairSplitter',
    defaultCaption: '',
    defaultWidth: 260,
    defaultHeight: 160,
    iconName: 'Columns2',
    description: 'Container com divisor duplo redimensionável'
  },
  TPairSplitterSide: {
    type: 'TPairSplitterSide',
    category: 'Additional',
    defaultName: 'PairSplitterSide',
    defaultCaption: '',
    defaultWidth: 120,
    defaultHeight: 150,
    iconName: 'PanelLeftClose',
    description: 'Lado de contenção do TPairSplitter'
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
    defaultWidth: 260,
    defaultHeight: 160,
    iconName: 'FolderKanban',
    description: 'Painel com abas navegáveis (Tabs/TabSheets)'
  },
  TTabSheet: {
    type: 'TTabSheet',
    category: 'Common Controls',
    defaultName: 'TabSheet',
    defaultCaption: 'Aba',
    defaultWidth: 250,
    defaultHeight: 125,
    iconName: 'Layers',
    description: 'Página/Aba individual de um TPageControl'
  },
  TNotebook: {
    type: 'TNotebook',
    category: 'Common Controls',
    defaultName: 'Notebook',
    defaultCaption: '',
    defaultWidth: 240,
    defaultHeight: 140,
    iconName: 'BookOpen',
    description: 'Container multi-páginas sem abas visíveis'
  },
  TPage: {
    type: 'TPage',
    category: 'Common Controls',
    defaultName: 'Page',
    defaultCaption: 'Página',
    defaultWidth: 236,
    defaultHeight: 136,
    iconName: 'FileCode',
    description: 'Página individual de um TNotebook'
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
    defaultWidth: 320,
    defaultHeight: 160,
    iconName: 'Table',
    description: 'Grade de dados tabulares ligada a um DataSource'
  },
  TDBNavigator: {
    type: 'TDBNavigator',
    category: 'Data Controls',
    defaultName: 'DBNavigator',
    defaultCaption: '',
    defaultWidth: 240,
    defaultHeight: 28,
    iconName: 'Navigation',
    description: 'Barra de navegação de registros (Primeiro, Anterior, Próximo, Último, Inserir, Excluir, Gravar)'
  },
  TDBEdit: {
    type: 'TDBEdit',
    category: 'Data Controls',
    defaultName: 'DBEdit',
    defaultCaption: '',
    defaultWidth: 140,
    defaultHeight: 26,
    iconName: 'TextCursorInput',
    description: 'Caixa de entrada de texto vinculada a um campo de banco de dados (DataField)'
  },

  // Zeos / Firebird 5.0 Database Access
  TZConnection: {
    type: 'TZConnection',
    category: 'Zeos / Firebird',
    defaultName: 'ZConnection',
    defaultCaption: 'ZConnection1',
    defaultWidth: 42,
    defaultHeight: 42,
    iconName: 'Database',
    description: 'Conexão nativa com Banco de Dados Firebird 5.0 (Zeos DBO)',
    isNonVisual: true
  },
  TZTransaction: {
    type: 'TZTransaction',
    category: 'Zeos / Firebird',
    defaultName: 'ZTransaction',
    defaultCaption: 'ZTransaction1',
    defaultWidth: 42,
    defaultHeight: 42,
    iconName: 'ShieldCheck',
    description: 'Controle de transação Firebird 5.0 / Zeos DBO (Commit, Rollback, Isolation)',
    isNonVisual: true
  },
  TZQuery: {
    type: 'TZQuery',
    category: 'Zeos / Firebird',
    defaultName: 'ZQuery',
    defaultCaption: 'ZQuery1',
    defaultWidth: 42,
    defaultHeight: 42,
    iconName: 'TableProperties',
    description: 'Dataset de Consulta SQL Firebird 5.0 (Zeos DBO)',
    isNonVisual: true
  },
  TZTable: {
    type: 'TZTable',
    category: 'Zeos / Firebird',
    defaultName: 'ZTable',
    defaultCaption: 'ZTable1',
    defaultWidth: 42,
    defaultHeight: 42,
    iconName: 'Table',
    description: 'Dataset de Tabela Firebird 5.0 (Zeos DBO)',
    isNonVisual: true
  },
  TZMemTable: {
    type: 'TZMemTable',
    category: 'Zeos / Firebird',
    defaultName: 'ZMemTable',
    defaultCaption: 'ZMemTable1',
    defaultWidth: 42,
    defaultHeight: 42,
    iconName: 'MemoryStick',
    description: 'Dataset em memória (Zeos ZMemTable) - FieldDefs e dados sem precisar de banco de dados',
    isNonVisual: true
  },
  TDataSource: {
    type: 'TDataSource',
    category: 'Zeos / Firebird',
    defaultName: 'DataSource',
    defaultCaption: 'DataSource1',
    defaultWidth: 42,
    defaultHeight: 42,
    iconName: 'Link2',
    description: 'Conector de dados entre Datasets (ZQuery) e componentes visuais (DBGrid)',
    isNonVisual: true
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
  TFrame: ['OnClick', 'OnResize'],
  TScrollBox: ['OnClick', 'OnScroll'],
  TFlowPanel: ['OnClick', 'OnResize'],
  TGridPanel: ['OnClick', 'OnResize'],
  TPairSplitter: ['OnChange'],
  TPairSplitterSide: ['OnClick'],
  TTabSheet: ['OnShow', 'OnHide'],
  TNotebook: ['OnChange', 'OnClick'],
  TPage: ['OnShow', 'OnHide'],
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
  TDBGrid: ['OnCellClick', 'OnDblClick'],
  TDBNavigator: ['OnClick'],
  TDBEdit: ['OnChange', 'OnExit'],
  TZConnection: ['AfterConnect', 'BeforeConnect', 'AfterDisconnect'],
  TZTransaction: ['AfterCommit', 'AfterRollback', 'BeforeCommit', 'BeforeRollback'],
  TZQuery: ['AfterOpen', 'BeforeOpen', 'AfterClose', 'AfterPost', 'AfterDelete'],
  TZTable: ['AfterOpen', 'AfterPost'],
  TZMemTable: ['AfterOpen', 'AfterPost', 'AfterDelete', 'OnNewRecord'],
  TDataSource: ['OnDataChange', 'OnUpdateData']
};

export const FORM_EVENTS = ['OnCreate', 'OnShow', 'OnClose', 'OnClick', 'OnResize'];
