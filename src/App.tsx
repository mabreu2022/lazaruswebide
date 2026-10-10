import React, { useState, useCallback, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import type {
  LComponent,
  LComponentType,
  LForm,
  IDEState,
  ConsoleMessage
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
import { generateUnitPas, generateLFM, generateProjectLpr, generateLPI } from './utils/pascalGenerator';
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
      eventCode: {}
    };

    const updatedForm: LForm = {
      ...form,
      components: [...form.components, newComp]
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

  // Delete Components
  const handleDeleteComponents = useCallback((ids: string[]) => {
    const remaining = form.components.filter(c => !ids.includes(c.id));
    const deletedNames = form.components.filter(c => ids.includes(c.id)).map(c => c.name).join(', ');
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
      const pasName = `${target.unitName || 'Unit1'}.pas`.toLowerCase();
      setActiveCodeFile(pasName);
      setOpenCodeFiles(prev => prev.includes(pasName) ? prev : [...prev, pasName]);
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
    setActiveTab('code');

    const matchingForm = forms.find(
      f => (f.unitName || '').toLowerCase() === lower.replace(/\.(pas|lfm)$/i, '').toLowerCase()
    );
    if (matchingForm) {
      setActiveFormId(matchingForm.id);
    }
  }, [forms]);

  // Close tab in editor without deleting file from project
  const handleCloseCodeFile = useCallback((fileToClose: string) => {
    const lowerToClose = fileToClose.toLowerCase();
    setOpenCodeFiles(prev => {
      const next = prev.filter(f => f.toLowerCase() !== lowerToClose);
      if (activeCodeFile.toLowerCase() === lowerToClose) {
        if (next.length > 0) {
          const closedIdx = prev.findIndex(f => f.toLowerCase() === lowerToClose);
          const newActive = next[Math.min(closedIdx, next.length - 1)];
          setActiveCodeFile(newActive);
          const matchingForm = forms.find(
            f => (f.unitName || '').toLowerCase() === newActive.replace(/\.(pas|lfm)$/i, '').toLowerCase()
          );
          if (matchingForm) {
            setActiveFormId(matchingForm.id);
          }
        } else {
          setActiveTab('form');
        }
      }
      return next;
    });
  }, [activeCodeFile, forms]);

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
      const zip = new JSZip();

      // 1. Project file: Project1.lpr
      zip.file('Project1.lpr', generateProjectLpr(forms));

      // 2. Project information: Project1.lpi
      zip.file('Project1.lpi', generateLPI('Project1', forms));

      // 3. For each form in project, export both .pas and .lfm
      forms.forEach(f => {
        const uName = f.unitName || 'Unit1';
        zip.file(`${uName}.pas`, generateUnitPas(f));
        zip.file(`${uName}.lfm`, generateLFM(f));
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'LazarusWebProject.zip';
      a.click();
      URL.revokeObjectURL(url);

      addConsoleLog(`Projeto completo exportado: LazarusWebProject.zip contendo todas as units (.pas), formulários (.lfm) e arquivos de projeto (.lpr / .lpi).`, 'success');
    } catch (err) {
      addConsoleLog(`Erro ao gerar arquivo zip de exportação: ${String(err)}`, 'error');
    }
  }, [forms, addConsoleLog]);

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

    // 4. Open in new browser window
    const popupWidth = Math.max(form.width + 40, 560);
    const popupHeight = Math.max(form.height + 80, 480);
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

  const ideState: IDEState = {
    form,
    forms,
    activeFormId,
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
        onExportProject={handleExportProject}
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
        />

        {/* Center Dock: Form Designer or Code Editor */}
        <main className="lazarus-main-center">
          {activeTab === 'form' ? (
            <FormDesigner
              form={form}
              forms={forms}
              activeFormId={activeFormId}
              onSwitchForm={handleSwitchForm}
              onNewForm={handleNewForm}
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
              activeFile={activeCodeFile}
              openFiles={openCodeFiles}
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
              activeFormId={activeFormId}
              onSelectForm={handleSwitchForm}
              onOpenCodeFile={handleOpenCodeFile}
              onNewForm={handleNewForm}
              onRemoveForm={handleRemoveForm}
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
                activeFormId={activeFormId}
                onSelectForm={handleSwitchForm}
                onOpenCodeFile={handleOpenCodeFile}
                onNewForm={handleNewForm}
                onRemoveForm={handleRemoveForm}
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
