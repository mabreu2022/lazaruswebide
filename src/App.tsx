import React, { useState, useCallback, useEffect, useRef } from 'react';
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
import { getSampleProject } from './data/sampleProjects';
import { generateUnitPas, generateLFM, generateProjectLpr } from './utils/pascalGenerator';
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
  const [form, setForm] = useState<LForm>(INITIAL_FORM);
  const [history, setHistory] = useState<LForm[]>([INITIAL_FORM]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const [selectedComponentIds, setSelectedComponentIds] = useState<string[]>([]);
  const [selectedPaletteComponent, setSelectedPaletteComponent] = useState<LComponentType | null>(null);
  const [activeTab, setActiveTab] = useState<'form' | 'code' | 'lfm' | 'project'>('form');
  const [activeCodeFile, setActiveCodeFile] = useState<'unit1.pas' | 'unit1.lfm' | 'project1.lpr'>('unit1.pas');
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
      text: 'LCL (Lazarus Component Library) Web Runtime carregado com 21 componentes nativos.'
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
    setHistory(prev => {
      const trimmed = prev.slice(0, historyIndex + 1);
      return [...trimmed, newForm];
    });
    setHistoryIndex(prev => prev + 1);
    setForm(newForm);
  }, [historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setForm(history[newIndex]);
      addConsoleLog('Desfazer executado com sucesso.', 'info');
    }
  }, [historyIndex, history, addConsoleLog]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setForm(history[newIndex]);
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

  // Add Component to Form
  const handleAddComponent = useCallback((type: LComponentType, x: number, y: number) => {
    const def = COMPONENT_DEFINITIONS[type];
    const name = getNextComponentName(type, form.components);
    const newCompId = `comp_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const newComp: LComponent = {
      id: newCompId,
      type,
      name,
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
    addConsoleLog(`Componente criado: ${name} (${type}) em [${x}, ${y}]`, 'success');
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
  }, []);

  // Update Form
  const handleUpdateForm = useCallback((updates: Partial<LForm>) => {
    setForm(prev => ({ ...prev, ...updates }));
  }, []);

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
    setActiveTab(prev => (prev === 'code' ? 'form' : 'code'));
  }, []);

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
    setActiveTab('code');
    setActiveCodeFile('unit1.pas');
    addConsoleLog(`Navegando para o procedimento: procedure T${form.name}.${procName}`, 'info');
  }, [form.name, handleUpdateComponent, addConsoleLog]);

  // Open event handler from Object Inspector
  const handleOpenEventHandler = useCallback((componentId: string | null, eventName: string, procedureName: string) => {
    setActiveEventToEdit({
      componentId: componentId || '__form__',
      eventName,
      procedureName
    });
    setActiveTab('code');
    setActiveCodeFile('unit1.pas');
  }, []);

  // Export Project Files
  const handleExportProject = useCallback(() => {
    const pasContent = generateUnitPas(form);
    const lfmContent = generateLFM(form);

    const downloadFile = (filename: string, content: string) => {
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    };

    downloadFile('Unit1.pas', pasContent);
    downloadFile('Unit1.lfm', lfmContent);
    downloadFile('Project1.lpr', generateProjectLpr(form.name));
    addConsoleLog(`Projeto exportado: Unit1.pas, Unit1.lfm e Project1.lpr gerados para download.`, 'success');
  }, [form, addConsoleLog]);

  // Open sample project
  const handleOpenSample = useCallback((type: 'calc' | 'login' | 'crud') => {
    const sample = getSampleProject(type);
    pushState(sample);
    setSelectedComponentIds([]);
    addConsoleLog(`Modelo de exemplo carregado: ${sample.caption}`, 'success');
  }, [pushState, addConsoleLog]);

  // Compile and run application in a new browser window (F9)
  const handleRun = useCallback(() => {
    // 1. Expand terminal / messages dock
    setIsConsoleCollapsed(false);

    // 2. Persist current form state for runner
    localStorage.setItem('lazarus_runtime_form', JSON.stringify(form));

    // 3. FPC Compiler logs streamed to Messages dock
    addConsoleLog(`Free Pascal Compiler version 3.2.2 [2026/10/09] for x86_64`, 'info');
    addConsoleLog(`Copyright (c) 1993-2026 by Florian Klaempfl and others`, 'info');
    addConsoleLog(`Compilando ${form.name}.pas ...`, 'info');
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
  }, [form, addConsoleLog]);

  const handleStop = useCallback(() => {
    if (runnerWindowRef.current && !runnerWindowRef.current.closed) {
      runnerWindowRef.current.close();
    }
    setIsRunning(false);
    addConsoleLog('[Execução] Processo finalizado pelo usuário na IDE (Stop).', 'info');
  }, [addConsoleLog]);

  // Global F9 & F12 keyboard shortcuts
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      if (e.key === 'F9') {
        e.preventDefault();
        handleRun();
      } else if (e.key === 'F12') {
        e.preventDefault();
        handleToggleFormCode();
      }
    };
    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [handleRun, handleToggleFormCode]);

  const ideState: IDEState = {
    form,
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
        onNewForm={() => {
          if (confirm('Deseja iniciar um novo formulário limpo?')) {
            const cleanForm: LForm = {
              id: `form_${Date.now()}`,
              name: 'Form1',
              caption: 'Form1',
              left: 60,
              top: 30,
              width: 520,
              height: 380,
              color: '#ece9d8',
              fontFamily: 'Inter, sans-serif',
              fontSize: 13,
              events: {},
              eventCode: {},
              components: []
            };
            pushState(cleanForm);
            setSelectedComponentIds([]);
            addConsoleLog('Novo formulário criado.', 'info');
          }
        }}
        onExportProject={handleExportProject}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onOpenSample={handleOpenSample}
      />

      {/* Component Palette (Categorized Tabs & Controls) */}
      <ComponentPalette
        selectedComponentType={selectedPaletteComponent}
        onSelectComponentType={setSelectedPaletteComponent}
      />

      {/* Main Workspace (Object Inspector on Left, Designer/Code in Center) */}
      <div className="lazarus-workspace-body">
        {/* Left Dock: Object Inspector */}
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
              activeFile={activeCodeFile}
              activeEventToEdit={activeEventToEdit}
              onChangeActiveFile={setActiveCodeFile}
              onToggleFormCode={handleToggleFormCode}
            />
          )}
        </main>
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
