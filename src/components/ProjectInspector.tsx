import React, { useState } from 'react';
import type { LForm } from '../types/lazarus';
import {
  Folder,
  FileCode,
  Package,
  Plus,
  Minus,
  Settings,
  HelpCircle,
  ChevronRight,
  ChevronDown,
  X,
  ExternalLink,
  FolderOpen,
  ArrowDownAZ,
  Network,
  Filter,
  Maximize2,
  Minimize2
} from 'lucide-react';

interface ProjectInspectorProps {
  forms: LForm[];
  activeFormId: string;
  onSelectForm: (formId: string) => void;
  onOpenCodeFile: (fileName: string) => void;
  onNewForm: () => void;
  onRemoveForm: (formId: string) => void;
  onClose?: () => void;
  onToggleFloat?: () => void;
  isFloating?: boolean;
}

export const ProjectInspector: React.FC<ProjectInspectorProps> = ({
  forms,
  activeFormId,
  onSelectForm,
  onOpenCodeFile,
  onNewForm,
  onRemoveForm,
  onClose,
  onToggleFloat,
  isFloating = false
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [isFilesExpanded, setIsFilesExpanded] = useState(true);
  const [isPackagesExpanded, setIsPackagesExpanded] = useState(true);
  const [isAlphabetical, setIsAlphabetical] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string | null>('unit1.pas');
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  // Packages list matching Lazarus screenshot (LazDroidControls, LCL, zcomponent, FCL)
  const hasZeos = forms.some(f => f.components.some(c => c.type.startsWith('TZ')));
  const packages = [
    { name: 'LazDroidControls', desc: 'Lazarus Android Controls' },
    { name: 'LCL', desc: 'Lazarus Component Library' },
    ...(hasZeos ? [{ name: 'zcomponent', desc: 'ZeosDBO Firebird 5.0 Database' }] : []),
    { name: 'FCL', desc: 'Free Component Library' }
  ];

  let displayForms = forms.filter(f => {
    const q = filterQuery.toLowerCase();
    if (!q) return true;
    return (
      f.name.toLowerCase().includes(q) ||
      (f.unitName || 'Unit1').toLowerCase().includes(q)
    );
  });

  if (isAlphabetical) {
    displayForms = [...displayForms].sort((a, b) =>
      (a.unitName || a.name).localeCompare(b.unitName || b.name)
    );
  }

  const handleItemClick = (fileId: string, formId?: string) => {
    setSelectedItem(fileId);
    if (formId) {
      onSelectForm(formId);
    }
  };

  const handleItemDoubleClick = (fileName: string, formId?: string) => {
    if (formId) {
      onSelectForm(formId);
    }
    onOpenCodeFile(fileName);
  };

  return (
    <div className={`lazarus-project-inspector ${isFloating ? 'floating-inspector' : ''}`}>
      {/* Title Bar */}
      <div className="inspector-titlebar">
        <div className="title-caption">
          <FolderOpen size={13} className="folder-icon" />
          <span>Inspetor de projetos - project1 [Default]</span>
        </div>
        <div className="titlebar-actions">
          {onToggleFloat && (
            <button
              className="inspector-title-btn"
              onClick={onToggleFloat}
              title={isFloating ? "Acoplar na barra lateral" : "Desacoplar janela flutuante"}
            >
              {isFloating ? <Minimize2 size={11} /> : <Maximize2 size={11} />}
            </button>
          )}
          {onClose && (
            <button className="inspector-close-btn" onClick={onClose} title="Fechar">
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Main Actions Toolbar (Screenshot: Adicionar, Remover, Opções, Ajuda) */}
      <div className="inspector-toolbar">
        <div className="tb-group">
          {/* Adicionar Button with Dropdown */}
          <div className="add-dropdown-container">
            <button
              className="tb-btn tb-add"
              onClick={() => setAddMenuOpen(prev => !prev)}
              title="Adicionar ao projeto"
            >
              <Plus size={13} className="icon-blue" />
              <span>Adicionar</span>
              <span className="arrow">▾</span>
            </button>
            {addMenuOpen && (
              <div className="add-dropdown-menu" onMouseLeave={() => setAddMenuOpen(false)}>
                <div
                  className="add-dropdown-item"
                  onClick={() => {
                    onNewForm();
                    setAddMenuOpen(false);
                  }}
                >
                  <Plus size={12} /> Novo Formulário (.pas + .lfm)
                </div>
              </div>
            )}
          </div>

          {/* Remover Button */}
          <button
            className={`tb-btn tb-remove ${forms.length <= 1 ? 'disabled' : ''}`}
            disabled={forms.length <= 1}
            onClick={() => {
              const target = forms.find(f => (f.unitName || '').toLowerCase() === (selectedItem || '').replace('.pas', '').toLowerCase()) ||
                forms.find(f => f.id === activeFormId);
              if (target && forms.length > 1) {
                if (confirm(`Deseja remover ${target.name} (${target.unitName}.pas) do projeto?`)) {
                  onRemoveForm(target.id);
                }
              }
            }}
            title="Remover arquivo selecionado do projeto"
          >
            <Minus size={13} />
            <span>Remover</span>
          </button>

          {/* Opções Button */}
          <button
            className="tb-btn tb-options"
            onClick={() => setShowOptionsModal(true)}
            title="Opções do Projeto"
          >
            <Settings size={13} className="icon-red" />
            <span>Opções</span>
            <span className="arrow">▾</span>
          </button>

          {/* Ajuda Button */}
          <button
            className="tb-btn tb-help"
            onClick={() => setShowHelpModal(true)}
            title="Ajuda do Inspetor de Projetos"
          >
            <HelpCircle size={13} className="icon-blue" />
            <span>Ajuda</span>
          </button>
        </div>
      </div>

      {/* Sub-toolbar & Filter Bar (Matching Lazarus screenshot: [📁] [🔀] [AZ] (filtro) [🔻]) */}
      <div className="inspector-filter-bar">
        <div className="filter-tools-icons">
          <button className="sub-tb-btn active" title="Arquivos do projeto">
            <Folder size={12} />
          </button>
          <button className="sub-tb-btn" title="Exibir dependências">
            <Network size={12} />
          </button>
          <button
            className={`sub-tb-btn ${isAlphabetical ? 'active' : ''}`}
            onClick={() => setIsAlphabetical(s => !s)}
            title="Ordenar alfabeticamente"
          >
            <ArrowDownAZ size={12} />
          </button>
        </div>
        <div className="filter-input-wrapper">
          <input
            type="text"
            className="filter-input"
            placeholder="(filtro)"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
          />
          {filterQuery && (
            <button className="filter-clear-btn" onClick={() => setFilterQuery('')}>
              <X size={10} />
            </button>
          )}
        </div>
        <button className="sub-tb-btn filter-funnel-btn" title="Filtrar">
          <Filter size={11} />
        </button>
      </div>

      {/* Tree View (Arquivos & Pacotes Requeridos) */}
      <div className="inspector-tree-container">
        {/* Branch: Arquivos */}
        <div className="tree-group">
          <div
            className="tree-group-header"
            onClick={() => setIsFilesExpanded(prev => !prev)}
          >
            {isFilesExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <Folder size={13} className="icon-folder" />
            <span className="group-label">Arquivos</span>
            <span className="count-tag">({forms.length + 1})</span>
          </div>

          {isFilesExpanded && (
            <div className="tree-group-children">
              {/* project1.lpr */}
              <div
                className={`tree-leaf ${selectedItem === 'project1.lpr' ? 'selected' : ''}`}
                onClick={() => handleItemClick('project1.lpr')}
                onDoubleClick={() => handleItemDoubleClick('project1.lpr')}
                title="Arquivo principal do projeto (duplo-clique para abrir)"
              >
                <FileCode size={13} className="icon-lpr" />
                <span className="leaf-name">project1.lpr</span>
                <span className="leaf-badge lpr-badge">Programa</span>
              </div>

              {/* Form Units: unit1.pas, unit2.pas, etc. */}
              {displayForms.map(f => {
                const uName = (f.unitName || 'Unit1').toLowerCase();
                const pasName = `${uName}.pas`;
                const isSelected = selectedItem === pasName || (activeFormId === f.id && !selectedItem?.includes('.lpr'));

                return (
                  <div
                    key={f.id}
                    className={`tree-leaf ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleItemClick(pasName, f.id)}
                    onDoubleClick={() => handleItemDoubleClick(pasName, f.id)}
                    title={`Unit de ${f.name} (duplo-clique para abrir)`}
                  >
                    <FileCode size={13} className="icon-pascal" />
                    <span className="leaf-name">{pasName}</span>
                    <span className="leaf-badge">
                      {f.name} (T{f.name})
                    </span>
                    <button
                      className="leaf-open-code-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectForm(f.id);
                        onOpenCodeFile(pasName);
                      }}
                      title="Abrir no editor"
                    >
                      <ExternalLink size={10} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Branch: Pacotes Requeridos */}
        <div className="tree-group">
          <div
            className="tree-group-header"
            onClick={() => setIsPackagesExpanded(prev => !prev)}
          >
            {isPackagesExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <Package size={13} className="icon-package-group" />
            <span className="group-label">Pacotes Requeridos</span>
            <span className="count-tag">({packages.length})</span>
          </div>

          {isPackagesExpanded && (
            <div className="tree-group-children">
              {packages.map(pkg => (
                <div
                  key={pkg.name}
                  className={`tree-leaf package-leaf ${selectedItem === pkg.name ? 'selected' : ''}`}
                  onClick={() => setSelectedItem(pkg.name)}
                  title={pkg.desc}
                >
                  <Package size={13} className="icon-package" />
                  <span className="leaf-name">{pkg.name}</span>
                  <span className="package-desc">{pkg.desc}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Project Options Modal */}
      {showOptionsModal && (
        <div className="inspector-modal-overlay" onClick={() => setShowOptionsModal(false)}>
          <div className="inspector-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-titlebar">
              <span>Opções do Projeto: Project1</span>
              <button onClick={() => setShowOptionsModal(false)}>
                <X size={12} />
              </button>
            </div>
            <div className="modal-body">
              <div className="modal-info-row">
                <strong>Projeto:</strong> Project1.lpr
              </div>
              <div className="modal-info-row">
                <strong>Formulários no Projeto:</strong> {forms.length}
              </div>
              <div className="modal-info-row">
                <strong>Modo Free Pascal:</strong> {"{$mode objfpc}{$H+}"}
              </div>
              <div className="modal-info-row">
                <strong>Widgetset LCL:</strong> LCL Web RAD Engine
              </div>
              <div className="modal-info-row">
                <strong>Formulário Inicial:</strong> {forms[0]?.name || 'Form1'}
              </div>
            </div>
            <div className="modal-footer">
              <button className="modal-btn" onClick={() => setShowOptionsModal(false)}>OK</button>
            </div>
          </div>
        </div>
      )}

      {/* Help Modal */}
      {showHelpModal && (
        <div className="inspector-modal-overlay" onClick={() => setShowHelpModal(false)}>
          <div className="inspector-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-titlebar">
              <span>Ajuda - Inspetor de Projetos</span>
              <button onClick={() => setShowHelpModal(false)}>
                <X size={12} />
              </button>
            </div>
            <div className="modal-body">
              <p>O <strong>Inspetor de Projetos</strong> gerencia todos os arquivos e pacotes vinculados ao seu projeto Lazarus:</p>
              <ul>
                <li><strong>Duplo-clique</strong> em qualquer unit abre o arquivo correspondente no editor de código.</li>
                <li><strong>Adicionar</strong> cria um novo formulário (ex: Unit2.pas + Unit2.lfm).</li>
                <li><strong>Remover</strong> exclui a unit selecionada do projeto.</li>
              </ul>
            </div>
            <div className="modal-footer">
              <button className="modal-btn" onClick={() => setShowHelpModal(false)}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
