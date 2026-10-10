import React, { useState } from 'react';
import {
  Play,
  Square,
  Code2,
  Layout,
  RotateCcw,
  RotateCw,
  Download,
  Plus,
  Grid,
  Sun,
  Moon,
  HelpCircle,
  FileCode,
  Layers,
  Sparkles,
  FolderOpen,
  Save,
  Database
} from 'lucide-react';
import type { IDEState } from '../types/lazarus';

interface TopMenuBarProps {
  state: IDEState;
  onRun: () => void;
  onStop: () => void;
  onToggleFormCode: () => void;
  onToggleTheme: () => void;
  onToggleSnapGrid: () => void;
  onChangeGridSize: (size: number) => void;
  onNewForm: () => void;
  onNewDataModule: () => void;
  onNewPureUnit: () => void;
  onSaveUnit: () => void;
  onSaveProject: () => void;
  onExportProject: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onOpenSample: (sampleType: 'calc' | 'crud' | 'login' | 'firebird') => void;
  onToggleProjectInspector?: () => void;
  isProjectInspectorOpen?: boolean;
}

export const TopMenuBar: React.FC<TopMenuBarProps> = ({
  state,
  onRun,
  onStop,
  onToggleFormCode,
  onToggleTheme,
  onToggleSnapGrid,
  onChangeGridSize,
  onNewForm,
  onNewDataModule,
  onNewPureUnit,
  onSaveUnit,
  onSaveProject,
  onExportProject,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onOpenSample,
  onToggleProjectInspector,
  isProjectInspectorOpen = false
}) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);

  const toggleMenu = (name: string) => {
    setActiveMenu(activeMenu === name ? null : name);
  };

  const closeMenu = () => {
    setActiveMenu(null);
  };

  return (
    <header className="lazarus-topbar">
      {/* Top Bar: Menus positioned at the FAR LEFT like desktop Lazarus */}
      <div className="lazarus-brand-row">
        <div className="topbar-left-zone">
          <div className="brand-mini-icon" title="Lazarus Web IDE">
            <Sparkles size={14} className="badge-icon" />
          </div>

          {/* Top Classic Dropdown Menus */}
          <nav className="classic-menus" onMouseLeave={closeMenu}>
            {/* Arquivo */}
            <div className="menu-item-container">
              <button
                className={`menu-btn ${activeMenu === 'file' ? 'active' : ''}`}
                onClick={() => toggleMenu('file')}
              >
                <u>A</u>rquivo
              </button>
              {activeMenu === 'file' && (
                <div className="menu-dropdown">
                  <div className="dropdown-action" onClick={() => { onNewForm(); closeMenu(); }}>
                    <Plus size={14} /> Novo Formulário <span className="shortcut">Ctrl+N</span>
                  </div>
                  <div className="dropdown-action" onClick={() => { onNewDataModule(); closeMenu(); }}>
                    <Database size={14} /> Novo DataModule (.pas + .lfm)
                  </div>
                  <div className="dropdown-action" onClick={() => { onNewPureUnit(); closeMenu(); }}>
                    <FileCode size={14} /> Nova Unit de Classes (.pas)
                  </div>
                  <div className="dropdown-divider" />
                  <div className="dropdown-action" onClick={() => { onSaveUnit(); closeMenu(); }}>
                    <Save size={14} /> Salvar Unit Atual <span className="shortcut">Ctrl+S</span>
                  </div>
                  <div className="dropdown-action" onClick={() => { onSaveProject(); closeMenu(); }}>
                    <Save size={14} /> Salvar Projeto <span className="shortcut">Ctrl+Shift+S</span>
                  </div>
                  <div className="dropdown-action" onClick={() => { onExportProject(); closeMenu(); }}>
                    <Download size={14} /> Exportar Projeto (.zip)
                  </div>
                  <div className="dropdown-divider" />
                  <div className="dropdown-submenu-header">Modelos de Exemplo:</div>
                  <div className="dropdown-action" onClick={() => { onOpenSample('firebird'); closeMenu(); }}>
                    <Layers size={14} /> Firebird 5.0 + Zeos (CRUD)
                  </div>
                  <div className="dropdown-action" onClick={() => { onOpenSample('calc'); closeMenu(); }}>
                    <Layers size={14} /> Calculadora Visual
                  </div>
                  <div className="dropdown-action" onClick={() => { onOpenSample('login'); closeMenu(); }}>
                    <Layers size={14} /> Tela de Login e Autenticação
                  </div>
                  <div className="dropdown-action" onClick={() => { onOpenSample('crud'); closeMenu(); }}>
                    <Layers size={14} /> Cadastro com TDBGrid
                  </div>
                </div>
              )}
            </div>

          {/* Editar */}
          <div className="menu-item-container">
            <button
              className={`menu-btn ${activeMenu === 'edit' ? 'active' : ''}`}
              onClick={() => toggleMenu('edit')}
            >
              <u>E</u>ditar
            </button>
            {activeMenu === 'edit' && (
              <div className="menu-dropdown">
                <div
                  className={`dropdown-action ${!canUndo ? 'disabled' : ''}`}
                  onClick={() => { if (canUndo) onUndo(); closeMenu(); }}
                >
                  <RotateCcw size={14} /> Desfazer <span className="shortcut">Ctrl+Z</span>
                </div>
                <div
                  className={`dropdown-action ${!canRedo ? 'disabled' : ''}`}
                  onClick={() => { if (canRedo) onRedo(); closeMenu(); }}
                >
                  <RotateCw size={14} /> Refazer <span className="shortcut">Ctrl+Y</span>
                </div>
              </div>
            )}
          </div>

          {/* Exibir */}
          <div className="menu-item-container">
            <button
              className={`menu-btn ${activeMenu === 'view' ? 'active' : ''}`}
              onClick={() => toggleMenu('view')}
            >
              E<u>x</u>ibir
            </button>
            {activeMenu === 'view' && (
              <div className="menu-dropdown">
                <div className="dropdown-action" onClick={() => { onToggleFormCode(); closeMenu(); }}>
                  <FileCode size={14} /> Alternar Formulário/Código <span className="shortcut">F12</span>
                </div>
                <div className="dropdown-action" onClick={() => { onToggleSnapGrid(); closeMenu(); }}>
                  <Grid size={14} /> Alinhar à Grade ({state.snapToGrid ? 'Ligado' : 'Desligado'})
                </div>
                <div className="dropdown-action" onClick={() => { onToggleTheme(); closeMenu(); }}>
                  {state.theme === 'lazarus-dark' ? <Sun size={14} /> : <Moon size={14} />}
                  Mudar Tema ({state.theme === 'lazarus-dark' ? 'Moderno' : 'Clássico Win32'})
                </div>
              </div>
            )}
          </div>

          {/* Projeto */}
          <div className="menu-item-container">
            <button
              className={`menu-btn ${activeMenu === 'project' ? 'active' : ''}`}
              onClick={() => toggleMenu('project')}
            >
              <u>P</u>rojeto
            </button>
            {activeMenu === 'project' && (
              <div className="menu-dropdown">
                <div
                  className="dropdown-action"
                  onClick={() => {
                    onToggleProjectInspector?.();
                    closeMenu();
                  }}
                >
                  <FolderOpen size={14} className="icon-blue" /> Inspetor de Projetos <span className="shortcut">Ctrl+F11</span>
                </div>
                <div className="dropdown-divider" />
                <div
                  className="dropdown-action"
                  onClick={() => {
                    onNewForm();
                    closeMenu();
                  }}
                >
                  <Plus size={14} /> Novo Formulário (.pas + .lfm) <span className="shortcut">Ctrl+N</span>
                </div>
                <div
                  className="dropdown-action"
                  onClick={() => {
                    onNewDataModule();
                    closeMenu();
                  }}
                >
                  <Database size={14} /> Novo DataModule (.pas + .lfm)
                </div>
                <div
                  className="dropdown-action"
                  onClick={() => {
                    onNewPureUnit();
                    closeMenu();
                  }}
                >
                  <FileCode size={14} /> Nova Unit de Classes (.pas)
                </div>
                <div className="dropdown-divider" />
                <div
                  className="dropdown-action"
                  onClick={() => {
                    onSaveProject();
                    closeMenu();
                  }}
                >
                  <Save size={14} /> Salvar Projeto <span className="shortcut">Ctrl+Shift+S</span>
                </div>
                <div
                  className="dropdown-action"
                  onClick={() => {
                    onExportProject();
                    closeMenu();
                  }}
                >
                  <Download size={14} /> Exportar Projeto (.zip)
                </div>
              </div>
            )}
          </div>

          {/* Executar */}
          <div className="menu-item-container">
            <button
              className={`menu-btn ${activeMenu === 'run' ? 'active' : ''}`}
              onClick={() => toggleMenu('run')}
            >
              <u>E</u>xecutar
            </button>
            {activeMenu === 'run' && (
              <div className="menu-dropdown">
                <div className="dropdown-action" onClick={() => { onRun(); closeMenu(); }}>
                  <Play size={14} className="icon-green" /> Executar Projeto <span className="shortcut">F9</span>
                </div>
                <div className="dropdown-action" onClick={() => { onStop(); closeMenu(); }}>
                  <Square size={14} className="icon-red" /> Parar Execução
                </div>
              </div>
            )}
          </div>

          {/* Ajuda */}
          <div className="menu-item-container">
            <button
              className={`menu-btn ${activeMenu === 'help' ? 'active' : ''}`}
              onClick={() => toggleMenu('help')}
            >
              <u>A</u>juda
            </button>
            {activeMenu === 'help' && (
              <div className="menu-dropdown">
                <div className="dropdown-action" onClick={() => {
                  alert('Lazarus Web IDE 3.0\nAmbiente de Desenvolvimento Visual RAD Object Pascal para a Web.\n\nAtalhos Rápidos:\n• F12: Alternar entre Form e Código Pascal\n• F9: Executar aplicação\n• Ctrl+F11: Inspetor de Projetos\n• Del: Excluir componente\n• Setas: Mover componente selecionado');
                  closeMenu();
                }}>
                  <HelpCircle size={14} /> Sobre o Lazarus Web IDE
                </div>
              </div>
            )}
          </div>
        </nav>
      </div>

      {/* Quick info right side */}
      <div className="topbar-right-zone">
        <span className="project-title">
          Project1.lpi - [{state.form.name}: T{state.form.name}]
        </span>
        <div className="cheetah-badge">
          <Sparkles size={13} className="badge-icon" />
          <span>Lazarus Web</span>
        </div>
        <span className="status-badge">FPC 3.2.2 / LCL Web</span>
        <button
          className="theme-toggle-btn"
          onClick={onToggleTheme}
          title={`Alternar tema (Atual: ${state.theme})`}
        >
          {state.theme === 'lazarus-dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </div>
    </div>

      {/* Main Action Toolbars (Run, F12, Save, Undo, Grid) */}
      <div className="lazarus-toolbar-row">
        {/* Project group */}
        <div className="tool-group">
          <button className="tool-btn" onClick={onNewForm} title="Novo Formulário (Ctrl+N)">
            <Plus size={16} />
          </button>
          <button className="tool-btn" onClick={onExportProject} title="Exportar Projeto (.pas e .lfm)">
            <Download size={16} />
          </button>
          <button
            className={`tool-btn ${isProjectInspectorOpen ? 'active' : ''}`}
            onClick={onToggleProjectInspector}
            title="Inspetor de Projetos (Ctrl+F11)"
          >
            <FolderOpen size={16} />
            <span>Inspetor de Projetos</span>
          </button>
        </div>

        <div className="tool-divider" />

        {/* History group */}
        <div className="tool-group">
          <button
            className="tool-btn"
            onClick={onUndo}
            disabled={!canUndo}
            title="Desfazer (Ctrl+Z)"
          >
            <RotateCcw size={16} />
          </button>
          <button
            className="tool-btn"
            onClick={onRedo}
            disabled={!canRedo}
            title="Refazer (Ctrl+Y)"
          >
            <RotateCw size={16} />
          </button>
        </div>

        <div className="tool-divider" />

        {/* Iconic Execution Controls: Green Play Button (F9) and F12 switch */}
        <div className="tool-group">
          <button
            className="tool-btn run-btn"
            onClick={onRun}
            title="Executar Projeto (F9)"
          >
            <Play size={16} className="play-icon" />
            <span>Executar (F9)</span>
          </button>
          {state.isRunning && (
            <button
              className="tool-btn stop-btn"
              onClick={onStop}
              title="Parar Execução"
            >
              <Square size={16} />
            </button>
          )}

          <button
            className={`tool-btn f12-btn ${state.activeTab === 'code' ? 'active' : ''}`}
            onClick={onToggleFormCode}
            title="Alternar entre Form Visual e Código Pascal (F12)"
          >
            {state.activeTab === 'code' ? <Layout size={16} /> : <Code2 size={16} />}
            <span>{state.activeTab === 'code' ? 'Ver Formulário (F12)' : 'Ver Código (F12)'}</span>
          </button>
        </div>

        <div className="tool-divider" />

        {/* Grid settings */}
        <div className="tool-group grid-group">
          <button
            className={`tool-btn ${state.snapToGrid ? 'active' : ''}`}
            onClick={onToggleSnapGrid}
            title="Encaixar na Grade (Snap to Grid)"
          >
            <Grid size={16} />
            <span>Grade {state.snapToGrid ? 'Ativa' : 'Desat.'}</span>
          </button>
          <select
            className="grid-size-select"
            value={state.gridSize}
            onChange={(e) => onChangeGridSize(Number(e.target.value))}
            title="Tamanho dos pontos da grade"
          >
            <option value={4}>4 px</option>
            <option value={8}>8 px</option>
            <option value={12}>12 px</option>
            <option value={16}>16 px</option>
          </select>
        </div>

        <div className="tool-divider" />

        {/* Sample Templates quick buttons */}
        <div className="tool-group samples-group">
          <span className="tool-label">Exemplos:</span>
          <button
            className="sample-quick-btn sample-highlight"
            onClick={() => onOpenSample('firebird')}
            title="Carregar exemplo completo Firebird 5.0 + Zeos DBO"
          >
            🔥 Firebird 5.0
          </button>
          <button
            className="sample-quick-btn"
            onClick={() => onOpenSample('calc')}
            title="Carregar exemplo Calculadora"
          >
            Calculadora
          </button>
          <button
            className="sample-quick-btn"
            onClick={() => onOpenSample('login')}
            title="Carregar exemplo Tela de Login"
          >
            Login
          </button>
          <button
            className="sample-quick-btn"
            onClick={() => onOpenSample('crud')}
            title="Carregar exemplo Grid / Cadastro"
          >
            DBGrid
          </button>
        </div>
      </div>
    </header>
  );
};
