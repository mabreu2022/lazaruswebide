import React, { useState, useCallback, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import type {
  LComponent,
  LComponentType,
  LForm,
  LPureUnit,
  IDEState,
  ConsoleMessage,
  LProject,
  LProjectGroup
} from './types/lazarus';
import { COMPONENT_DEFINITIONS } from './data/componentRegistry';
import { TopMenuBar } from './components/TopMenuBar';
import { ComponentPalette } from './components/ComponentPalette';
import { FormDesigner } from './components/FormDesigner';
import { ObjectInspector } from './components/ObjectInspector';
import { CodeEditor } from './components/CodeEditor';
import { BottomConsole } from './components/BottomConsole';
import { StandaloneRunner } from './components/StandaloneRunner';
import { ProjectInspector } from './components/ProjectInspector';
import { getSampleProject } from './data/sampleProjects';
import {
  generateUnitPas,
  generateLFM,
  generateProjectLpr,
  generateLPI,
  generatePureUnitPas,
  generateLPG
} from './utils/pascalGenerator';
import {
  FileCode,
  FolderOpen,
  Plus,
  X,
  Code2,
  Layout,
  Copy,
  Check,
  Database
} from 'lucide-react';
import { removeWithDescendants } from './utils/componentTree';
import './App.css';

const INITIAL_FORM: LForm = {
  id: 'form1',
  name: 'Form1',
  caption: 'Form1',
  left: 60,
  top: 30,
  width: 540,
  height: 380,
  color: '#ece9d8',
  fontFamily: 'Inter, sans-serif',
  fontSize: 13,
  events: {},
  eventCode: {},
  components: [
    {
      id: 'comp_btn1',
      type: 'TButton',
      name: 'Button1',
      caption: 'Clique Aqui',
      left: 40,
      top: 40,
      width: 110,
      height: 32,
      enabled: true,
      visible: true,
      events: { OnClick: 'Button1Click' },
      eventCode: {
        OnClick: `begin\n  ShowMessage('Olá Mundo do Lazarus Web!');\n  Label1.Caption := 'Botão Pressionado!';\nend;`
      }
    },
    {
      id: 'comp_lbl1',
      type: 'TLabel',
      name: 'Label1',
      caption: 'Exemplo de Formulário Lazarus',
      left: 40,
      top: 90,
      width: 240,
      height: 20,
      fontSize: 14,
      fontBold: true,
      fontColor: '#1e3a8a',
      enabled: true,
      visible: true,
      events: {},
      eventCode: {}
    },
    {
      id: 'comp_edt1',
      type: 'TEdit',
      name: 'Edit1',
      text: 'Texto inicial',
      placeholder: 'Digite algo...',
      left: 40,
      top: 130,
      width: 180,
      height: 28,
      enabled: true,
      visible: true,
      events: {},
      eventCode: {}
    }
  ]
};

const createInitialProject = (name = 'Project1', id = 'proj_1'): LProject => ({
  id,
  name,
  fileName: `${name}.lpi`,
  lprFileName: `${name}.lpr`,
  forms: [{ ...INITIAL_FORM, unitName: 'Unit1' }],
  pureUnits: [],
  activeFormId: INITIAL_FORM.id,
  openFiles: ['unit1.pas', 'unit1.lfm'],
  activeCodeFile: 'unit1.pas'
});

export const App: React.FC = () => {
  // Check if opened as standalone execution window
  const isRunMode = typeof window !== 'undefined' && (
    window.location.search.includes('mode=run') ||
    window.location.hash.includes('run')
  );

  if (isRunMode) {
    return <StandaloneRunner />;
  }

  return <LazarusIDE />;
};

const LazarusIDE: React.FC = () => {
  const [projectGroup, setProjectGroup] = useState<LProjectGroup>({
    id: 'group_1',
    name: 'ProjectGroup1',
    fileName: 'ProjectGroup1.lpg',
    projects: [createInitialProject('Project1', 'proj_1')],
    activeProjectId: 'proj_1'
  });

  const [forms, setForms] = useState<LForm[]>([
    {
      ...INITIAL_FORM,
      unitName: 'Unit1'
    }
  ]);
  const [activeFormId, setActiveFormId] = useState<string>(INITIAL_FORM.id);
  const [history, setHistory] = useState<LForm[]>([
    {
      ...INITIAL_FORM,
      unitName: 'Unit1'
    }
  ]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const form = forms.find(f => f.id === activeFormId) || forms[0];

  const setForm = useCallback((updaterOrNew: LForm | ((prev: LForm) => LForm)) => {
    setForms(prevForms => {
      return prevForms.map(f => {
        if (f.id === activeFormId) {
          return typeof updaterOrNew === 'function' ? updaterOrNew(f) : updaterOrNew;
        }
        return f;
      });
    });
  }, [activeFormId]);

  const [selectedComponentIds, setSelectedComponentIds] = useState<string[]>([]);
  const [selectedPaletteComponent, setSelectedPaletteComponent] = useState<LComponentType | null>(null);
  const [activeTab, setActiveTab] = useState<'form' | 'code' | 'lfm' | 'project'>('form');
  const [activeCodeFile, setActiveCodeFile] = useState<string>('unit1.pas');
  const [openCodeFiles, setOpenCodeFiles] = useState<string[]>([
    'unit1.pas',
    'unit1.lfm'
  ]);
  const [pureUnits, setPureUnits] = useState<LPureUnit[]>([]);
  const [isAddTabOpen, setIsAddTabOpen] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [isProjectInspectorOpen, setIsProjectInspectorOpen] = useState<boolean>(true);
  const [isProjectInspectorFloating, setIsProjectInspectorFloating] = useState<boolean>(false);
  const [theme, setTheme] = useState<'lazarus-dark' | 'lazarus-classic'>('lazarus-dark');
  const [gridSize, setGridSize] = useState<number>(8);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isConsoleCollapsed, setIsConsoleCollapsed] = useState<boolean>(false);

  const [activeEventToEdit, setActiveEventToEdit] = useState<{
    componentId: string;
    eventName: string;
    procedureName: string;
  } | undefined>(undefined);

  const runnerWindowRef = useRef<Window | null>(null);

  const [consoleLogs, setConsoleLogs] = useState<ConsoleMessage[]>([
    {
      id: '1',
      time: new Date().toLocaleTimeString(),
      type: 'info',
      text: 'Lazarus Web IDE inicializado. Sistema pronto para desenvolvimento RAD.'
    },
    {
      id: '2',
      time: new Date().toLocaleTimeString(),
      type: 'success',
      text: 'LCL (Lazarus Component Library) Web Runtime carregado com suporte a múltiplos formulários e alinhamentos.'
    }
  ]);

  const addConsoleLog = useCallback((text: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    setConsoleLogs(prev => [
      ...prev,
      {
        id: Math.random().toString(36).substring(7),
        time: new Date().toLocaleTimeString(),
        type,
        text
      }
    ]);
  }, []);

  // Listen for logs streamed from the standalone execution window
  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('lazarus_runner_bus');
      channel.onmessage = (event) => {
        if (event.data?.type === 'RUN_LOG') {
          addConsoleLog(event.data.text, event.data.logType || 'info');
        }
      };
    } catch {
      // Fallback
    }

    const handleWindowMessage = (event: MessageEvent) => {
      if (event.data?.type === 'RUN_LOG') {
        addConsoleLog(event.data.text, event.data.logType || 'info');
      }
    };
    window.addEventListener('message', handleWindowMessage);

    return () => {
      channel?.close();
      window.removeEventListener('message', handleWindowMessage);
    };
  }, [addConsoleLog]);

  // Push new form state to history for Undo/Redo
  const pushState = useCallback((newForm: LForm) => {
    setForms(prevForms => {
      return prevForms.map(f => f.id === newForm.id ? newForm : f);
    });
    setHistory(prev => {
      const trimmed = prev.slice(0, historyIndex + 1);
      return [...trimmed, newForm];
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const prevForm = history[newIndex];
      setForms(prevForms => prevForms.map(f => f.id === prevForm.id ? prevForm : f));
      addConsoleLog('Desfazer executado com sucesso.', 'info');
    }
  }, [historyIndex, history, addConsoleLog]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const nextForm = history[newIndex];
      setForms(prevForms => prevForms.map(f => f.id === nextForm.id ? nextForm : f));
      addConsoleLog('Refazer executado com sucesso.', 'info');
    }
  }, [historyIndex, history, addConsoleLog]);

  // Generate unique component name (e.g. Button1, Button2)
  const getNextComponentName = useCallback((type: LComponentType, currentComponents: LComponent[]): string => {
    const baseName = COMPONENT_DEFINITIONS[type]?.defaultName || type.replace(/^T/, '');
    let counter = 1;
    while (currentComponents.some(c => c.name.toLowerCase() === `${baseName}${counter}`.toLowerCase())) {
      counter++;
    }
    return `${baseName}${counter}`;
  }, []);

  // Add Component to Form (with optional parentId for container docking)
  const handleAddComponent = useCallback((type: LComponentType, x: number, y: number, parentId?: string) => {
    const def = COMPONENT_DEFINITIONS[type];
    const name = getNextComponentName(type, form.components);
    const newCompId = `comp_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const newComp: LComponent = {
      id: newCompId,
      type,
      name,
      parentId,
      caption: def.defaultCaption !== undefined ? (def.defaultCaption || name) : undefined,
      text: type === 'TEdit' ? '' : undefined,
      placeholder: type === 'TEdit' ? name : undefined,
      left: x,
      top: y,
      width: def.defaultWidth,
      height: def.defaultHeight,
      enabled: true,
      visible: true,
      isNonVisual: def.isNonVisual,
      events: {},
      eventCode: {},
      // Container-specific defaults
      bevelInner: type === 'TPanel' ? 'bvNone' : undefined,
      bevelOuter: type === 'TPanel' ? 'bvRaised' : undefined,
      bevelWidth: type === 'TPanel' ? 1 : undefined,
      borderStyle: (['TFrame', 'TScrollBox', 'TFlowPanel', 'TGridPanel'].includes(type)) ? 'bsSingle' : 'bsNone',
      autoScroll: type === 'TScrollBox' ? true : undefined,
      flowLayout: type === 'TFlowPanel' ? 'tlLeftToRight' : undefined,
      gridColumns: type === 'TGridPanel' ? 2 : undefined,
      gridRows: type === 'TGridPanel' ? 2 : undefined,
      splitterPosition: type === 'TPairSplitter' ? Math.round(def.defaultWidth / 2) : undefined,
      splitterOrientation: type === 'TPairSplitter' ? 'poVertical' : undefined,
      items: type === 'TRadioGroup' ? ['Opção 1', 'Opção 2', 'Opção 3'] : undefined,
      itemIndex: type === 'TRadioGroup' ? 0 : undefined,
      tabs: (type === 'TPageControl' || type === 'TNotebook') ? ['Página 1', 'Página 2'] : undefined,
      activeTab: (type === 'TPageControl' || type === 'TNotebook') ? 0 : undefined,
      activePageIndex: (type === 'TPageControl' || type === 'TNotebook') ? 0 : undefined,
      pageIndex: type === 'TNotebook' ? 0 : undefined
    };

    const extraChildren: LComponent[] = [];

    // Automatically create default sub-pages/sides for composite containers
    if (type === 'TPageControl') {
      const ts1Name = getNextComponentName('TTabSheet', [...form.components, newComp]);
      const ts1: LComponent = {
        id: `comp_${Date.now()}_ts1`,
        type: 'TTabSheet',
        name: ts1Name,
        caption: 'Página 1',
        parentId: newCompId,
        left: 4,
        top: 28,
        width: def.defaultWidth - 8,
        height: def.defaultHeight - 34,
        enabled: true,
        visible: true,
        events: {},
        eventCode: {}
      };
      const ts2Name = getNextComponentName('TTabSheet', [...form.components, newComp, ts1]);
      const ts2: LComponent = {
        id: `comp_${Date.now()}_ts2`,
        type: 'TTabSheet',
        name: ts2Name,
        caption: 'Página 2',
        parentId: newCompId,
        left: 4,
        top: 28,
        width: def.defaultWidth - 8,
        height: def.defaultHeight - 34,
        enabled: true,
        visible: true,
        events: {},
        eventCode: {}
      };
      extraChildren.push(ts1, ts2);
    } else if (type === 'TNotebook') {
      const p1Name = getNextComponentName('TPage', [...form.components, newComp]);
      const p1: LComponent = {
        id: `comp_${Date.now()}_p1`,
        type: 'TPage',
        name: p1Name,
        caption: 'Página 1',
        parentId: newCompId,
        left: 4,
        top: 4,
        width: def.defaultWidth - 8,
        height: def.defaultHeight - 8,
        enabled: true,
        visible: true,
        events: {},
        eventCode: {}
      };
      const p2Name = getNextComponentName('TPage', [...form.components, newComp, p1]);
      const p2: LComponent = {
        id: `comp_${Date.now()}_p2`,
        type: 'TPage',
        name: p2Name,
        caption: 'Página 2',
        parentId: newCompId,
        left: 4,
        top: 4,
        width: def.defaultWidth - 8,
        height: def.defaultHeight - 8,
        enabled: true,
        visible: true,
        events: {},
        eventCode: {}
      };
      extraChildren.push(p1, p2);
    } else if (type === 'TPairSplitter') {
      const s1Name = getNextComponentName('TPairSplitterSide', [...form.components, newComp]);
      const s1: LComponent = {
        id: `comp_${Date.now()}_s1`,
        type: 'TPairSplitterSide',
        name: s1Name,
        caption: 'Lado 1',
        parentId: newCompId,
        left: 0,
        top: 0,
        width: Math.round(def.defaultWidth / 2) - 4,
        height: def.defaultHeight,
        enabled: true,
        visible: true,
        events: {},
        eventCode: {}
      };
      const s2Name = getNextComponentName('TPairSplitterSide', [...form.components, newComp, s1]);
      const s2: LComponent = {
        id: `comp_${Date.now()}_s2`,
        type: 'TPairSplitterSide',
        name: s2Name,
        caption: 'Lado 2',
        parentId: newCompId,
        left: Math.round(def.defaultWidth / 2) + 4,
        top: 0,
        width: Math.round(def.defaultWidth / 2) - 4,
        height: def.defaultHeight,
        enabled: true,
        visible: true,
        events: {},
        eventCode: {}
      };
      extraChildren.push(s1, s2);
    }

    // Adding a new page/tab sheet to a PageControl / Notebook
    let ownerPatch: { id: string; updates: Partial<LComponent> } | null = null;
    if (type === 'TTabSheet' || type === 'TPage') {
      const ownerType = type === 'TTabSheet' ? 'TPageControl' : 'TNotebook';
      // Resolve owner: parent itself, or the owner of the sheet that was targeted
      let owner = form.components.find(c => c.id === parentId);
      if (owner && owner.type === type && owner.parentId) {
        owner = form.components.find(c => c.id === owner!.parentId);
      }
      if (!owner || owner.type !== ownerType) {
        addConsoleLog(`${type} só pode ser adicionado dentro de um ${ownerType}.`, 'warning');
        return;
      }
      const siblings = form.components.filter(c => c.parentId === owner!.id && c.type === type);
      const idx = siblings.length;
      newComp.parentId = owner.id;
      newComp.name = getNextComponentName(type, form.components);
      newComp.caption = `Página ${idx + 1}`;
      newComp.left = 0;
      newComp.top = 0;
      newComp.width = Math.max(20, owner.width - 8);
      newComp.height = Math.max(20, owner.height - 34);
      newComp.visible = true;
      ownerPatch = type === 'TTabSheet'
        ? { id: owner.id, updates: { activeTab: idx, activePageIndex: idx } }
        : { id: owner.id, updates: { pageIndex: idx, activePageIndex: idx } };
    }

    const baseComponents = ownerPatch
      ? form.components.map(c => (c.id === ownerPatch!.id ? { ...c, ...ownerPatch!.updates } : c))
      : form.components;

    const updatedForm: LForm = {
      ...form,
      components: [...baseComponents, newComp, ...extraChildren]
    };

    pushState(updatedForm);
    setSelectedComponentIds([newCompId]);
    setSelectedPaletteComponent(null);
    const parentDesc = parentId ? ` dentro de [${form.components.find(c => c.id === parentId)?.name || 'Container'}]` : '';
    addConsoleLog(`Componente criado: ${name} (${type})${parentDesc} em [${x}, ${y}]`, 'success');
  }, [form, getNextComponentName, pushState, addConsoleLog]);

  // Update Component
  const handleUpdateComponent = useCallback((id: string, updates: Partial<LComponent>) => {
    setForm(prev => {
      const updatedComponents = prev.components.map(c => {
        if (c.id === id) {
          return { ...c, ...updates };
        }
        return c;
      });
      return { ...prev, components: updatedComponents };
    });
  }, [setForm]);

  // Update Form
  const handleUpdateForm = useCallback((updates: Partial<LForm>) => {
    setForms(prevForms =>
      prevForms.map(f => (f.id === activeFormId ? { ...f, ...updates } : f))
    );
  }, [activeFormId]);

  // Delete Components (with recursive cascade deletion of children)
  const handleDeleteComponents = useCallback((ids: string[]) => {
    const { remaining, removed } = removeWithDescendants(form.components, ids);
    const deletedNames = removed.map(c => c.name).join(', ');
    const updatedForm: LForm = { ...form, components: remaining };

    pushState(updatedForm);
    setSelectedComponentIds([]);
    addConsoleLog(`Componente(s) excluído(s): ${deletedNames}`, 'info');
  }, [form, pushState, addConsoleLog]);

  // Duplicate Component
  const handleDuplicateComponent = useCallback((id: string) => {
    const orig = form.components.find(c => c.id === id);
    if (!orig) return;

    const newName = getNextComponentName(orig.type, form.components);
    const dupComp: LComponent = {
      ...orig,
      id: `comp_${Date.now()}`,
      name: newName,
      caption: orig.caption ? `${orig.caption}_copia` : undefined,
      left: orig.left + 16,
      top: orig.top + 16
    };

    const updatedForm: LForm = {
      ...form,
      components: [...form.components, dupComp]
    };

    pushState(updatedForm);
    setSelectedComponentIds([dupComp.id]);
    addConsoleLog(`Componente duplicado: ${newName} (${orig.type})`, 'info');
  }, [form, getNextComponentName, pushState, addConsoleLog]);

  // Bring to front / Send to back
  const handleBringToFront = useCallback((id: string) => {
    const comp = form.components.find(c => c.id === id);
    if (!comp) return;
    const others = form.components.filter(c => c.id !== id);
    const updatedForm = { ...form, components: [...others, comp] };
    pushState(updatedForm);
  }, [form, pushState]);

  const handleSendToBack = useCallback((id: string) => {
    const comp = form.components.find(c => c.id === id);
    if (!comp) return;
    const others = form.components.filter(c => c.id !== id);
    const updatedForm = { ...form, components: [comp, ...others] };
    pushState(updatedForm);
  }, [form, pushState]);

  // Selection handlers
  const handleSelectComponent = useCallback((id: string, isMulti = false) => {
    if (isMulti) {
      setSelectedComponentIds(prev =>
        prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      );
    } else {
      setSelectedComponentIds([id]);
    }
  }, []);

  const handleSelectForm = useCallback(() => {
    setSelectedComponentIds([]);
  }, []);

  // F12 Toggle between Form and Code
  const handleToggleFormCode = useCallback(() => {
    setActiveTab(prev => {
      const next = prev === 'code' ? 'form' : 'code';
      if (next === 'code') {
        const currentPas = `${form.unitName || 'Unit1'}.pas`.toLowerCase();
        setOpenCodeFiles(files => files.includes(currentPas) ? files : [...files, currentPas]);
        setActiveCodeFile(currentPas);
      }
      return next;
    });
  }, [form.unitName]);

  // Double click component: generate/navigate to default event in Code Editor
  const handleDoubleClickComponent = useCallback((comp: LComponent) => {
    const defaultEvent = comp.type === 'TEdit' ? 'OnChange' : 'OnClick';
    const procName = comp.events[defaultEvent] || `${comp.name}${defaultEvent.replace('On', '')}`;

    const updatedEvents = { ...comp.events, [defaultEvent]: procName };
    const updatedCode = {
      ...comp.eventCode,
      [defaultEvent]: comp.eventCode[defaultEvent] || `begin\n  ShowMessage('Executado ${comp.name}.${defaultEvent}');\nend;`
    };

    handleUpdateComponent(comp.id, { events: updatedEvents, eventCode: updatedCode });
    setActiveEventToEdit({
      componentId: comp.id,
      eventName: defaultEvent,
      procedureName: procName
    });
    const pasFile = `${form.unitName || 'Unit1'}.pas`.toLowerCase();
    setOpenCodeFiles(prev => prev.includes(pasFile) ? prev : [...prev, pasFile]);
    setActiveCodeFile(pasFile);
    setActiveTab('code');
    addConsoleLog(`Navegando para o procedimento: procedure T${form.name}.${procName}`, 'info');
  }, [form.name, form.unitName, handleUpdateComponent, addConsoleLog]);

  // Open event handler from Object Inspector
  const handleOpenEventHandler = useCallback((componentId: string | null, eventName: string, procedureName: string) => {
    setActiveEventToEdit({
      componentId: componentId || '__form__',
      eventName,
      procedureName
    });
    const pasFile = `${form.unitName || 'Unit1'}.pas`.toLowerCase();
    setOpenCodeFiles(prev => prev.includes(pasFile) ? prev : [...prev, pasFile]);
    setActiveCodeFile(pasFile);
    setActiveTab('code');
  }, [form.unitName]);

  // Create a new Form in the project (Lazarus Multi-Form support: Form1/Unit1, Form2/Unit2, Form3/Unit3...)
  const handleNewForm = useCallback(() => {
    let nextNum = 1;
    while (
      forms.some(
        f =>
          f.name.toLowerCase() === `form${nextNum}`.toLowerCase() ||
          (f.unitName || '').toLowerCase() === `unit${nextNum}`.toLowerCase()
      )
    ) {
      nextNum++;
    }

    const newId = `form_${Date.now()}`;
    const formName = `Form${nextNum}`;
    const unitName = `Unit${nextNum}`;

    const newForm: LForm = {
      id: newId,
      name: formName,
      unitName: unitName,
      caption: formName,
      left: Math.min(260, 60 + ((nextNum - 1) % 6) * 24),
      top: Math.min(200, 40 + ((nextNum - 1) % 6) * 24),
      width: 580,
      height: 420,
      color: '#ece9d8',
      fontFamily: 'Inter, sans-serif',
      fontSize: 13,
      events: {},
      eventCode: {},
      components: []
    };

    setForms(prev => [...prev, newForm]);
    setActiveFormId(newId);
    setSelectedComponentIds([]);

    // Open unitX.pas and unitX.lfm in code editor tabs
    const pasFile = `${unitName}.pas`.toLowerCase();
    const lfmFile = `${unitName}.lfm`.toLowerCase();
    setOpenCodeFiles(prev => {
      const next = [...prev];
      if (!next.includes(pasFile)) next.push(pasFile);
      if (!next.includes(lfmFile)) next.push(lfmFile);
      return next;
    });
    setActiveCodeFile(pasFile);

    addConsoleLog(
      `[Projeto] Novo formulário criado: ${formName} (${unitName}.pas / ${unitName}.lfm)`,
      'success'
    );
  }, [forms, addConsoleLog]);

  // Switch active form in IDE
  const handleSwitchForm = useCallback((formId: string) => {
    setActiveFormId(formId);
    setSelectedComponentIds([]);
    const target = forms.find(f => f.id === formId);
    if (target) {
      const lfmName = `${target.unitName || 'Unit1'}.lfm`.toLowerCase();
      const pasName = `${target.unitName || 'Unit1'}.pas`.toLowerCase();
      setActiveCodeFile(pasName);
      setOpenCodeFiles(prev => {
        const next = [...prev];
        if (!next.includes(pasName)) next.push(pasName);
        if (!next.includes(lfmName)) next.push(lfmName);
        return next;
      });
      addConsoleLog(`Formulário ativo: ${target.name} (${target.unitName || 'Unit1'})`, 'info');
    }
  }, [forms, addConsoleLog]);

  // Open code file in editor tabs
  const handleOpenCodeFile = useCallback((fileName: string) => {
    const lower = fileName.toLowerCase();
    setOpenCodeFiles(prev => {
      if (!prev.includes(lower)) {
        return [...prev, lower];
      }
      return prev;
    });
    setActiveCodeFile(lower);

    if (lower.endsWith('.lfm')) {
      const matchingForm = forms.find(
        f => (f.unitName || '').toLowerCase() === lower.replace('.lfm', '').toLowerCase()
      );
      if (matchingForm) {
        setActiveFormId(matchingForm.id);
      }
      setActiveTab('form');
    } else {
      setActiveTab('code');
      const matchingForm = forms.find(
        f => (f.unitName || '').toLowerCase() === lower.replace('.pas', '').toLowerCase()
      );
      if (matchingForm) {
        setActiveFormId(matchingForm.id);
      }
    }
  }, [forms]);

  // Select tab from unified top workspace tab header
  const handleSelectTab = useCallback((fileKey: string) => {
    const lower = fileKey.toLowerCase();
    setActiveCodeFile(lower);

    if (lower.endsWith('.lfm')) {
      const unitPrefix = lower.replace('.lfm', '');
      const matchedForm = forms.find(f => (f.unitName || '').toLowerCase() === unitPrefix);
      if (matchedForm) {
        setActiveFormId(matchedForm.id);
      }
      setActiveTab('form');
    } else {
      const unitPrefix = lower.replace('.pas', '');
      const matchedForm = forms.find(f => (f.unitName || '').toLowerCase() === unitPrefix);
      if (matchedForm) {
        setActiveFormId(matchedForm.id);
      }
      setActiveTab('code');
    }
  }, [forms]);

  // Close tab in editor without deleting file from project
  const handleCloseCodeFile = useCallback((fileToClose: string) => {
    const lowerToClose = fileToClose.toLowerCase();
    setOpenCodeFiles(prev => {
      const next = prev.filter(f => f.toLowerCase() !== lowerToClose);
      if (next.length > 0) {
        const closedIdx = prev.findIndex(f => f.toLowerCase() === lowerToClose);
        const newActive = next[Math.min(closedIdx, next.length - 1)];
        setActiveCodeFile(newActive);
        if (newActive.endsWith('.lfm')) {
          const uPrefix = newActive.replace('.lfm', '');
          const matched = forms.find(f => (f.unitName || '').toLowerCase() === uPrefix);
          if (matched) setActiveFormId(matched.id);
          setActiveTab('form');
        } else {
          setActiveTab('code');
        }
      } else {
        setActiveTab('form');
      }
      return next;
    });
  }, [forms]);

  // Create New DataModule
  const handleNewDataModule = useCallback(() => {
    const existingDMs = forms.filter(f => f.isDataModule);
    const nextNum = existingDMs.length + 1;
    const dmName = `DataModule${nextNum}`;
    const unitName = `UnitDM${nextNum}`;
    const newId = `dm_${Date.now()}`;

    const newDM: LForm = {
      id: newId,
      name: dmName,
      unitName: unitName,
      caption: dmName,
      isDataModule: true,
      left: Math.min(260, 80 + ((nextNum - 1) % 5) * 20),
      top: Math.min(200, 60 + ((nextNum - 1) % 5) * 20),
      width: 480,
      height: 340,
      color: '#e5e7eb',
      fontFamily: 'Inter, sans-serif',
      fontSize: 13,
      events: {},
      eventCode: {},
      components: []
    };

    setForms(prev => [...prev, newDM]);
    setActiveFormId(newId);
    setSelectedComponentIds([]);

    const pasFile = `${unitName}.pas`.toLowerCase();
    const lfmFile = `${unitName}.lfm`.toLowerCase();
    setOpenCodeFiles(prev => {
      const next = [...prev];
      if (!next.includes(pasFile)) next.push(pasFile);
      if (!next.includes(lfmFile)) next.push(lfmFile);
      return next;
    });
    setActiveCodeFile(pasFile);
    setActiveTab('form');

    addConsoleLog(
      `[Projeto] Novo DataModule criado: ${dmName} (${unitName}.pas / ${unitName}.lfm)`,
      'success'
    );
  }, [forms, addConsoleLog]);

  // Create New Pure Pascal Unit (Classes / Business logic without form)
  const handleNewPureUnit = useCallback(() => {
    const nextNum = pureUnits.length + 1;
    const unitName = `uClasse${nextNum}`;
    const className = `TMinhaClasse${nextNum}`;
    const fileName = `${unitName}.pas`.toLowerCase();
    const newId = `pure_${Date.now()}`;

    const newUnit: LPureUnit = {
      id: newId,
      name: unitName,
      unitName: unitName,
      fileName: fileName,
      code: generatePureUnitPas(unitName, className)
    };

    setPureUnits(prev => [...prev, newUnit]);
    setOpenCodeFiles(prev => (prev.includes(fileName) ? prev : [...prev, fileName]));
    setActiveCodeFile(fileName);
    setActiveTab('code');

    addConsoleLog(
      `[Projeto] Nova Unit de Classes criada: ${unitName} (${fileName})`,
      'success'
    );
  }, [pureUnits, addConsoleLog]);

  // Remove Pure Unit from project
  const handleRemovePureUnit = useCallback((unitId: string) => {
    const unit = pureUnits.find(u => u.id === unitId);
    if (!unit) return;
    setPureUnits(prev => prev.filter(u => u.id !== unitId));
    setOpenCodeFiles(prev => prev.filter(f => f.toLowerCase() !== unit.fileName.toLowerCase()));
    addConsoleLog(`[Projeto] Unit ${unit.fileName} removida do projeto.`, 'info');
  }, [pureUnits, addConsoleLog]);

  // Remove Form from project (via Project Inspector)
  const handleRemoveForm = useCallback((formId: string) => {
    if (forms.length <= 1) {
      addConsoleLog('[Aviso] O projeto deve conter pelo menos um formulário principal.', 'warning');
      return;
    }
    const formToRemove = forms.find(f => f.id === formId);
    if (!formToRemove) return;

    const uName = (formToRemove.unitName || '').toLowerCase();
    const pasFile = `${uName}.pas`;
    const lfmFile = `${uName}.lfm`;

    setForms(prev => prev.filter(f => f.id !== formId));
    setOpenCodeFiles(prev => prev.filter(f => f.toLowerCase() !== pasFile && f.toLowerCase() !== lfmFile));

    const remaining = forms.filter(f => f.id !== formId);
    if (remaining.length > 0) {
      setActiveFormId(remaining[0].id);
      setActiveCodeFile(`${remaining[0].unitName || 'Unit1'}.pas`.toLowerCase());
    }

    addConsoleLog(`[Projeto] Formulário ${formToRemove.name} (${formToRemove.unitName}.pas) removido do projeto.`, 'info');
  }, [forms, addConsoleLog]);

  // Export Project Files (ZIP with all units, LFMs, project files)
  const handleExportProject = useCallback(async () => {
    try {
      const currentProject = projectGroup.projects.find(p => p.id === projectGroup.activeProjectId) || projectGroup.projects[0];
      const projName = currentProject ? currentProject.name : 'Project1';
      const zip = new JSZip();

      // 1. Project file: e.g. Project1.lpr
      zip.file(`${projName}.lpr`, generateProjectLpr(forms, pureUnits));

      // 2. Project information: e.g. Project1.lpi
      zip.file(`${projName}.lpi`, generateLPI(projName, forms, pureUnits));

      // 3. For each form in project, export both .pas and .lfm
      forms.forEach(f => {
        const uName = f.unitName || 'Unit1';
        zip.file(`${uName}.pas`, generateUnitPas(f));
        zip.file(`${uName}.lfm`, generateLFM(f));
      });

      // 4. For each pure unit, export .pas
      pureUnits.forEach(u => {
        zip.file(u.fileName, u.code);
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projName}.zip`;
      a.click();
      URL.revokeObjectURL(url);

      addConsoleLog(`Projeto '${projName}' exportado com sucesso: ${projName}.zip contendo units (.pas), formulários (.lfm) e arquivos de projeto (.lpr / .lpi).`, 'success');
    } catch (err) {
      addConsoleLog(`Erro ao gerar arquivo zip de exportação: ${String(err)}`, 'error');
    }
  }, [projectGroup, forms, pureUnits, addConsoleLog]);

  // Switch active project in the project group
  const handleSelectProject = useCallback((targetProjectId: string) => {
    setProjectGroup(prevGroup => {
      // 1. Save current state of active project
      const updatedProjects = prevGroup.projects.map(proj => {
        if (proj.id === prevGroup.activeProjectId) {
          return {
            ...proj,
            forms,
            pureUnits,
            activeFormId,
            openFiles: openCodeFiles,
            activeCodeFile
          };
        }
        return proj;
      });

      // 2. Locate target project
      const targetProj = updatedProjects.find(p => p.id === targetProjectId);
      if (!targetProj) return prevGroup;

      // 3. Load target project into working state
      setForms(targetProj.forms);
      setPureUnits(targetProj.pureUnits || []);
      setActiveFormId(targetProj.activeFormId || targetProj.forms[0]?.id || 'form1');
      const targetOpenFiles = targetProj.openFiles && targetProj.openFiles.length > 0
        ? targetProj.openFiles
        : [`${(targetProj.forms[0]?.unitName || 'Unit1').toLowerCase()}.pas`, `${(targetProj.forms[0]?.unitName || 'Unit1').toLowerCase()}.lfm`];
      setOpenCodeFiles(targetOpenFiles);
      setActiveCodeFile(targetProj.activeCodeFile || targetOpenFiles[0]);
      setSelectedComponentIds([]);

      addConsoleLog(`[Grupo de Projetos] Projeto ativo alterado para "${targetProj.name}" (${targetProj.fileName})`, 'info');

      return {
        ...prevGroup,
        projects: updatedProjects,
        activeProjectId: targetProjectId
      };
    });
  }, [forms, pureUnits, activeFormId, openCodeFiles, activeCodeFile, addConsoleLog]);

  // Add a new project to the current project group
  const handleAddProjectToGroup = useCallback(() => {
    setProjectGroup(prevGroup => {
      let nextNum = prevGroup.projects.length + 1;
      while (prevGroup.projects.some(p => p.name.toLowerCase() === `project${nextNum}`.toLowerCase())) {
        nextNum++;
      }
      const projName = `Project${nextNum}`;
      const projId = `proj_${Date.now()}`;

      // Save current project state
      const updatedProjects = prevGroup.projects.map(proj => {
        if (proj.id === prevGroup.activeProjectId) {
          return {
            ...proj,
            forms,
            pureUnits,
            activeFormId,
            openFiles: openCodeFiles,
            activeCodeFile
          };
        }
        return proj;
      });

      const newProj = createInitialProject(projName, projId);
      updatedProjects.push(newProj);

      // Switch immediately to new project
      setForms(newProj.forms);
      setPureUnits(newProj.pureUnits);
      setActiveFormId(newProj.activeFormId);
      setOpenCodeFiles(newProj.openFiles || ['unit1.pas', 'unit1.lfm']);
      setActiveCodeFile(newProj.activeCodeFile || 'unit1.pas');
      setSelectedComponentIds([]);

      addConsoleLog(`[Grupo de Projetos] Novo projeto adicionado ao grupo: ${projName} (${projName}.lpi)`, 'success');

      return {
        ...prevGroup,
        projects: updatedProjects,
        activeProjectId: projId
      };
    });
  }, [forms, pureUnits, activeFormId, openCodeFiles, activeCodeFile, addConsoleLog]);

  // Remove project from current project group
  const handleRemoveProjectFromGroup = useCallback((targetProjectId: string) => {
    setProjectGroup(prevGroup => {
      if (prevGroup.projects.length <= 1) {
        addConsoleLog('[Aviso] O grupo de projetos deve conter pelo menos um projeto.', 'warning');
        return prevGroup;
      }

      const target = prevGroup.projects.find(p => p.id === targetProjectId);
      const remaining = prevGroup.projects.filter(p => p.id !== targetProjectId);
      let newActiveId = prevGroup.activeProjectId;

      if (prevGroup.activeProjectId === targetProjectId) {
        newActiveId = remaining[0].id;
        const nextProj = remaining[0];
        setForms(nextProj.forms);
        setPureUnits(nextProj.pureUnits || []);
        setActiveFormId(nextProj.activeFormId || nextProj.forms[0]?.id || 'form1');
        setOpenCodeFiles(nextProj.openFiles || ['unit1.pas', 'unit1.lfm']);
        setActiveCodeFile(nextProj.activeCodeFile || 'unit1.pas');
        setSelectedComponentIds([]);
      }

      addConsoleLog(`[Grupo de Projetos] Projeto "${target?.name || ''}" removido do grupo.`, 'info');

      return {
        ...prevGroup,
        projects: remaining,
        activeProjectId: newActiveId
      };
    });
  }, [addConsoleLog]);

  // Create a brand new project group (.lpg)
  const handleNewProjectGroup = useCallback(() => {
    const freshProj = createInitialProject('Project1', 'proj_1');
    const newGroup: LProjectGroup = {
      id: `group_${Date.now()}`,
      name: 'ProjectGroup1',
      fileName: 'ProjectGroup1.lpg',
      projects: [freshProj],
      activeProjectId: freshProj.id
    };
    setProjectGroup(newGroup);
    setForms(freshProj.forms);
    setPureUnits(freshProj.pureUnits);
    setActiveFormId(freshProj.activeFormId);
    setOpenCodeFiles(freshProj.openFiles || ['unit1.pas', 'unit1.lfm']);
    setActiveCodeFile(freshProj.activeCodeFile || 'unit1.pas');
    setSelectedComponentIds([]);
    addConsoleLog(`[Grupo de Projetos] Novo grupo de projetos inicializado: ProjectGroup1.lpg`, 'success');
  }, [addConsoleLog]);

  // Save Project Group (.lpg)
  const handleSaveProjectGroup = useCallback(() => {
    try {
      const currentProjects = projectGroup.projects.map(proj => {
        if (proj.id === projectGroup.activeProjectId) {
          return {
            ...proj,
            forms,
            pureUnits,
            activeFormId,
            openFiles: openCodeFiles,
            activeCodeFile
          };
        }
        return proj;
      });

      const updatedGroup: LProjectGroup = {
        ...projectGroup,
        projects: currentProjects
      };

      const lpgXml = generateLPG(updatedGroup);
      const blob = new Blob([lpgXml], { type: 'application/xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = updatedGroup.fileName || `${updatedGroup.name}.lpg`;
      a.click();
      URL.revokeObjectURL(url);

      addConsoleLog(`[Grupo de Projetos] Grupo de projetos salvo: ${updatedGroup.fileName}`, 'success');
    } catch (err) {
      addConsoleLog(`Erro ao salvar grupo de projetos: ${String(err)}`, 'error');
    }
  }, [projectGroup, forms, pureUnits, activeFormId, openCodeFiles, activeCodeFile, addConsoleLog]);

  // Export Complete Project Group (.zip)
  const handleExportProjectGroup = useCallback(async () => {
    try {
      const zip = new JSZip();

      const currentProjects = projectGroup.projects.map(proj => {
        if (proj.id === projectGroup.activeProjectId) {
          return {
            ...proj,
            forms,
            pureUnits,
            activeFormId,
            openFiles: openCodeFiles,
            activeCodeFile
          };
        }
        return proj;
      });

      const updatedGroup: LProjectGroup = {
        ...projectGroup,
        projects: currentProjects
      };

      // 1. Root .lpg file
      zip.file(updatedGroup.fileName || `${updatedGroup.name}.lpg`, generateLPG(updatedGroup));

      // 2. Each project in its own folder
      updatedGroup.projects.forEach(proj => {
        const folder = zip.folder(proj.name) || zip;
        folder.file(`${proj.name}.lpr`, generateProjectLpr(proj.forms, proj.pureUnits));
        folder.file(`${proj.name}.lpi`, generateLPI(proj.name, proj.forms, proj.pureUnits));

        proj.forms.forEach(f => {
          const uName = f.unitName || 'Unit1';
          folder.file(`${uName}.pas`, generateUnitPas(f));
          folder.file(`${uName}.lfm`, generateLFM(f));
        });

        (proj.pureUnits || []).forEach(u => {
          folder.file(u.fileName, u.code);
        });
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${updatedGroup.name}_Group.zip`;
      a.click();
      URL.revokeObjectURL(url);

      addConsoleLog(
        `[Grupo de Projetos] Grupo completo exportado (${updatedGroup.projects.length} projetos): ${updatedGroup.name}_Group.zip`,
        'success'
      );
    } catch (err) {
      addConsoleLog(`Erro ao exportar grupo de projetos: ${String(err)}`, 'error');
    }
  }, [projectGroup, forms, pureUnits, activeFormId, openCodeFiles, activeCodeFile, addConsoleLog]);

  // Save current Unit file
  const handleSaveUnit = useCallback(() => {
    try {
      const fileName = activeCodeFile || `${(form.unitName || 'Unit1').toLowerCase()}.pas`;
      let content = '';

      const pure = pureUnits.find(u => u.fileName.toLowerCase() === fileName.toLowerCase());
      if (pure) {
        content = pure.code;
      } else if (fileName.endsWith('.lpr')) {
        content = generateProjectLpr(forms, pureUnits);
      } else if (fileName.endsWith('.lfm')) {
        const targetForm = forms.find(f => (f.unitName || '').toLowerCase() === fileName.replace('.lfm', '').toLowerCase()) || form;
        content = generateLFM(targetForm);
      } else {
        const targetForm = forms.find(f => (f.unitName || '').toLowerCase() === fileName.replace('.pas', '').toLowerCase()) || form;
        content = generateUnitPas(targetForm);
      }

      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);

      addConsoleLog(`[Arquivo] Arquivo '${fileName}' salvo com sucesso!`, 'success');
    } catch (err) {
      addConsoleLog(`Erro ao salvar arquivo: ${String(err)}`, 'error');
    }
  }, [activeCodeFile, form, forms, pureUnits, addConsoleLog]);

  // Save entire project to localStorage and trigger download
  const handleSaveProject = useCallback(async () => {
    try {
      await handleExportProject();
      try {
        localStorage.setItem('lazarus_web_saved_project', JSON.stringify({
          forms,
          pureUnits,
          activeFormId,
          savedAt: new Date().toISOString()
        }));
      } catch (e) {
        // Ignore quota limits
      }
      addConsoleLog(`[Projeto] Projeto completo salvo com sucesso!`, 'success');
    } catch (err) {
      addConsoleLog(`Erro ao salvar projeto: ${String(err)}`, 'error');
    }
  }, [handleExportProject, forms, pureUnits, activeFormId, addConsoleLog]);

  // Copy current code to clipboard
  const handleCopyCurrentCode = useCallback(() => {
    let code = '';
    const lower = activeCodeFile.toLowerCase();
    const pure = pureUnits.find(u => u.fileName.toLowerCase() === lower);
    if (pure) {
      code = pure.code;
    } else if (lower.endsWith('.lpr')) {
      code = generateProjectLpr(forms, pureUnits);
    } else if (lower.endsWith('.lfm')) {
      code = generateLFM(form);
    } else {
      code = generateUnitPas(form);
    }
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }, [activeCodeFile, form, forms, pureUnits]);

  // Open sample project
  const handleOpenSample = useCallback((type: 'calc' | 'login' | 'crud' | 'firebird') => {
    const sample = getSampleProject(type);
    const sampleForm: LForm = {
      ...sample,
      unitName: 'Unit1'
    };
    setForms([sampleForm]);
    setActiveFormId(sampleForm.id);
    setHistory([sampleForm]);
    setHistoryIndex(0);
    setSelectedComponentIds([]);
    setActiveCodeFile('unit1.pas');
    addConsoleLog(`Modelo de exemplo carregado: ${sample.caption}`, 'success');
  }, [addConsoleLog]);

  // Compile and run application in a new browser window (F9)
  const handleRun = useCallback(() => {
    // 1. Expand terminal / messages dock
    setIsConsoleCollapsed(false);

    // 2. Persist current form state for runner
    localStorage.setItem('lazarus_runtime_form', JSON.stringify(form));

    // 3. FPC Compiler logs streamed to Messages dock
    addConsoleLog(`Free Pascal Compiler version 3.2.2 [2026/10/09] for x86_64`, 'info');
    addConsoleLog(`Copyright (c) 1993-2026 by Florian Klaempfl and others`, 'info');
    forms.forEach(f => {
      addConsoleLog(`Compilando ${f.unitName || 'Unit1'}.pas (${f.name}) ...`, 'info');
    });
    addConsoleLog(`Compilando Project1.lpr ...`, 'info');
    addConsoleLog(`Ligador: Vinculando recursos LCL Widgetset...`, 'info');
    addConsoleLog(`[Sucesso] Compilação finalizada (0 erros, 0 avisos).`, 'success');
    addConsoleLog(`[Execução] Abrindo aplicação em nova janela do navegador...`, 'success');

    // 4. Open in new browser window matching form client dimensions
    const popupWidth = Math.max(form.width, 320);
    const popupHeight = Math.max(form.height + 32, 240);
    const popupLeft = Math.max(40, window.screenX + 120);
    const popupTop = Math.max(40, window.screenY + 100);

    const runUrl = `${window.location.origin}${window.location.pathname}?mode=run`;
    const win = window.open(
      runUrl,
      'LazarusAppWindow',
      `width=${popupWidth},height=${popupHeight},left=${popupLeft},top=${popupTop},resizable=yes,scrollbars=yes`
    );

    if (win) {
      win.focus();
      runnerWindowRef.current = win;
      setIsRunning(true);
    } else {
      addConsoleLog('[Aviso] Popup bloqueado pelo navegador. Por favor permita popups para este site.', 'warning');
    }
  }, [form, forms, addConsoleLog]);

  const handleStop = useCallback(() => {
    if (runnerWindowRef.current && !runnerWindowRef.current.closed) {
      runnerWindowRef.current.close();
    }
    setIsRunning(false);
    addConsoleLog('[Execução] Processo finalizado pelo usuário na IDE (Stop).', 'info');
  }, [addConsoleLog]);

  // Global F9, F12, Ctrl+F11 keyboard shortcuts
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      if (e.key === 'F9') {
        e.preventDefault();
        handleRun();
      } else if (e.key === 'F12') {
        e.preventDefault();
        handleToggleFormCode();
      } else if (e.ctrlKey && e.key === 'F11') {
        e.preventDefault();
        setIsProjectInspectorOpen(open => !open);
      }
    };
    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [handleRun, handleToggleFormCode]);

  const currentProject = projectGroup.projects.find(p => p.id === projectGroup.activeProjectId) || projectGroup.projects[0];
  const activeProjectName = currentProject ? currentProject.name : 'Project1';

  const ideState: IDEState = {
    form,
    forms,
    pureUnits,
    activeFormId,
    projectGroup,
    projects: projectGroup.projects,
    activeProjectId: projectGroup.activeProjectId,
    selectedComponentIds,
    activeTab,
    activeCodeFile,
    theme,
    gridSize,
    snapToGrid,
    showGrid,
    selectedPaletteComponent,
    isRunning,
    activeEventToEdit,
    consoleLogs
  };

  return (
    <div className={`lazarus-app-container theme-${theme}`}>
      {/* Top Menu Bar & Actions */}
      <TopMenuBar
        state={ideState}
        onRun={handleRun}
        onStop={handleStop}
        onToggleFormCode={handleToggleFormCode}
        onToggleTheme={() => setTheme(t => t === 'lazarus-dark' ? 'lazarus-classic' : 'lazarus-dark')}
        onToggleSnapGrid={() => {
          setSnapToGrid(s => !s);
          setShowGrid(g => !g);
        }}
        onChangeGridSize={setGridSize}
        onNewForm={handleNewForm}
        onNewDataModule={handleNewDataModule}
        onNewPureUnit={handleNewPureUnit}
        onSaveUnit={handleSaveUnit}
        onSaveProject={handleSaveProject}
        onExportProject={handleExportProject}
        onNewProjectGroup={handleNewProjectGroup}
        onAddProjectToGroup={handleAddProjectToGroup}
        onSaveProjectGroup={handleSaveProjectGroup}
        onExportProjectGroup={handleExportProjectGroup}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onOpenSample={handleOpenSample}
        onToggleProjectInspector={() => {
          setIsProjectInspectorOpen(open => !open);
        }}
        isProjectInspectorOpen={isProjectInspectorOpen}
      />

      {/* Component Palette (Categorized Tabs & Controls) */}
      <ComponentPalette
        selectedComponentType={selectedPaletteComponent}
        onSelectComponentType={setSelectedPaletteComponent}
      />

      {/* Main Workspace (Left: Object Inspector | Center: Designer/Code | Right: Project Inspector) */}
      <div className="lazarus-workspace-body">
        {/* Left Dock: Object Inspector (Original location & original tabs) */}
        <ObjectInspector
          form={form}
          selectedComponentIds={selectedComponentIds}
          onSelectComponent={handleSelectComponent}
          onSelectForm={handleSelectForm}
          onUpdateComponent={handleUpdateComponent}
          onUpdateForm={handleUpdateForm}
          onOpenEventHandler={handleOpenEventHandler}
          onAddComponent={handleAddComponent}
          onDeleteComponents={handleDeleteComponents}
        />

        {/* Center Dock: Form Designer or Code Editor with Unified Persistent Tabs */}
        <main className="lazarus-main-center">
          {/* Unified Persistent Tabs Bar (Identical to Photo 1, Never changes between forms/code) */}
          <div className="code-editor-header unified-workspace-header">
            <div className="code-files-tabs">
              {openCodeFiles.map(fileKey => {
                const lower = fileKey.toLowerCase();
                const isPas = lower.endsWith('.pas');
                const isLfm = lower.endsWith('.lfm');
                const isLpr = lower.endsWith('.lpr');
                const isFormActive = activeTab === 'form' && lower === `${(form.unitName || 'Unit1').toLowerCase()}.lfm`;
                const isCodeActive = activeTab === 'code' && lower === activeCodeFile.toLowerCase();
                const isActive = isFormActive || isCodeActive;

                return (
                  <div
                    key={fileKey}
                    className={`file-tab ${isActive ? 'active' : ''}`}
                    onClick={() => handleSelectTab(lower)}
                    title={`Arquivo: ${fileKey} (Clique para alternar)`}
                  >
                    {isPas && <FileCode size={13} className="icon-pascal" />}
                    {isLfm && <FolderOpen size={13} className="icon-lfm" />}
                    {isLpr && <FileCode size={13} className="icon-lpr" />}
                    <span className="file-tab-label">{fileKey}</span>
                    <button
                      className="tab-close-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCloseCodeFile(fileKey);
                      }}
                      title={`Fechar aba ${fileKey}`}
                    >
                      <X size={11} />
                    </button>
                  </div>
                );
              })}

              {/* Add New Tab Button & Dropdown */}
              <div className="add-tab-dropdown-container">
                <button
                  className="file-tab-add-btn"
                  onClick={() => setIsAddTabOpen(prev => !prev)}
                  title="Novo Formulário, DataModule ou Unit de Classes"
                >
                  <Plus size={13} />
                </button>
                {isAddTabOpen && (
                  <div className="add-tab-dropdown-menu" onMouseLeave={() => setIsAddTabOpen(false)}>
                    <div className="add-tab-item" onClick={() => { handleNewForm(); setIsAddTabOpen(false); }}>
                      <Layout size={13} /> Novo Formulário (.pas + .lfm)
                    </div>
                    <div className="add-tab-item" onClick={() => { handleNewDataModule(); setIsAddTabOpen(false); }}>
                      <Database size={13} /> Novo DataModule (.pas + .lfm)
                    </div>
                    <div className="add-tab-item" onClick={() => { handleNewPureUnit(); setIsAddTabOpen(false); }}>
                      <FileCode size={13} /> Nova Unit de Classes (.pas)
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions at Right (Consistent with Photo 1) */}
            <div className="code-editor-actions">
              {activeTab === 'code' ? (
                <>
                  <button
                    className="snippet-btn"
                    onClick={() => {
                      addConsoleLog("[Snippets] 'ShowMessage' acionado no editor.", "info");
                    }}
                    title="Inserir comando ShowMessage"
                  >
                    + ShowMessage
                  </button>
                  <button
                    className="snippet-btn"
                    onClick={() => {
                      addConsoleLog("[Snippets] 'ZConnection1.Caption' acionado no editor.", "info");
                    }}
                    title="Inserir comando de banco de dados"
                  >
                    + ZConnection1.Caption
                  </button>
                  <button
                    className="code-action-btn"
                    onClick={handleCopyCurrentCode}
                    title="Copiar código para área de transferência"
                  >
                    {copiedCode ? <Check size={14} className="icon-green" /> : <Copy size={14} />}
                    <span>{copiedCode ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                  <button
                    className="code-action-btn return-form-btn"
                    onClick={handleToggleFormCode}
                    title="Voltar ao Designer Visual (F12)"
                  >
                    <Layout size={14} />
                    <span>Voltar ao Form (F12)</span>
                  </button>
                </>
              ) : (
                <button
                  className="code-action-btn return-form-btn"
                  onClick={handleToggleFormCode}
                  title="Alternar para Código Fonte Pascal (F12)"
                >
                  <Code2 size={14} />
                  <span>Ver Código (F12)</span>
                </button>
              )}
            </div>
          </div>

          {/* Center Workspace (FormDesigner or CodeEditor fills full height directly) */}
          {activeTab === 'form' ? (
            <FormDesigner
              form={form}
              selectedComponentIds={selectedComponentIds}
              selectedPaletteComponent={selectedPaletteComponent}
              gridSize={gridSize}
              snapToGrid={snapToGrid}
              showGrid={showGrid}
              onSelectComponent={handleSelectComponent}
              onSelectForm={handleSelectForm}
              onAddComponent={handleAddComponent}
              onUpdateComponent={handleUpdateComponent}
              onUpdateForm={handleUpdateForm}
              onDeleteComponents={handleDeleteComponents}
              onDuplicateComponent={handleDuplicateComponent}
              onBringToFront={handleBringToFront}
              onSendToBack={handleSendToBack}
              onDoubleClickComponent={handleDoubleClickComponent}
              onToggleFormCode={handleToggleFormCode}
            />
          ) : (
            <CodeEditor
              form={form}
              forms={forms}
              pureUnits={pureUnits}
              activeFile={activeCodeFile}
              openFiles={openCodeFiles}
              hideHeader={true}
              activeEventToEdit={activeEventToEdit}
              onChangeActiveFile={setActiveCodeFile}
              onCloseFile={handleCloseCodeFile}
              onSelectForm={handleSwitchForm}
              onToggleFormCode={handleToggleFormCode}
            />
          )}
        </main>

        {/* Right Dock: Project Inspector (Lado direito como no Lazarus) */}
        {isProjectInspectorOpen && (
          <aside className="lazarus-right-dock-panel">
            <ProjectInspector
              forms={forms}
              pureUnits={pureUnits}
              activeFormId={activeFormId}
              projectName={activeProjectName}
              projectGroup={projectGroup}
              onSelectProject={handleSelectProject}
              onNewProject={handleAddProjectToGroup}
              onRemoveProject={handleRemoveProjectFromGroup}
              onSelectForm={handleSwitchForm}
              onOpenCodeFile={handleOpenCodeFile}
              onNewForm={handleNewForm}
              onNewDataModule={handleNewDataModule}
              onNewPureUnit={handleNewPureUnit}
              onRemoveForm={handleRemoveForm}
              onRemovePureUnit={handleRemovePureUnit}
              onClose={() => setIsProjectInspectorOpen(false)}
              onToggleFloat={() => setIsProjectInspectorFloating(true)}
              isFloating={false}
            />
          </aside>
        )}

        {/* Floating Project Inspector Window (quando desacoplado) */}
        {isProjectInspectorFloating && (
          <div className="floating-inspector-window-overlay" onClick={() => setIsProjectInspectorFloating(false)}>
            <div className="floating-inspector-window-box" onClick={e => e.stopPropagation()}>
              <ProjectInspector
                forms={forms}
                pureUnits={pureUnits}
                activeFormId={activeFormId}
                projectName={activeProjectName}
                projectGroup={projectGroup}
                onSelectProject={handleSelectProject}
                onNewProject={handleAddProjectToGroup}
                onRemoveProject={handleRemoveProjectFromGroup}
                onSelectForm={handleSwitchForm}
                onOpenCodeFile={handleOpenCodeFile}
                onNewForm={handleNewForm}
                onNewDataModule={handleNewDataModule}
                onNewPureUnit={handleNewPureUnit}
                onRemoveForm={handleRemoveForm}
                onRemovePureUnit={handleRemovePureUnit}
                isFloating={true}
                onClose={() => setIsProjectInspectorFloating(false)}
                onToggleFloat={() => setIsProjectInspectorFloating(false)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Dock: Compiler Messages & Terminal with Live Streaming */}
      <BottomConsole
        logs={consoleLogs}
        isRunning={isRunning}
        isCollapsed={isConsoleCollapsed}
        onToggleCollapse={() => setIsConsoleCollapsed(c => !c)}
        onClearLogs={() => setConsoleLogs([])}
        onReopenWindow={handleRun}
      />
    </div>
  );
};

export default App;
