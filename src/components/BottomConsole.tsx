import React, { useState, useEffect, useRef } from 'react';
import type { ConsoleMessage } from '../types/lazarus';
import {
  Terminal,
  AlertCircle,
  CheckCircle2,
  Info,
  Trash2,
  Keyboard,
  ChevronUp,
  ChevronDown,
  ExternalLink,
  Maximize2,
  Minimize2
} from 'lucide-react';

interface BottomConsoleProps {
  logs: ConsoleMessage[];
  isRunning: boolean;
  onClearLogs: () => void;
  onReopenWindow?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const BottomConsole: React.FC<BottomConsoleProps> = ({
  logs,
  isRunning,
  onClearLogs,
  onReopenWindow,
  isCollapsed = false,
  onToggleCollapse
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState(isCollapsed);
  const [isMaximized, setIsMaximized] = useState(false);
  const [activeTab, setActiveTab] = useState<'messages' | 'shortcuts'>('messages');
  const [dockHeight, setDockHeight] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('lazarus_bottom_dock_height');
      if (saved) {
        const val = parseInt(saved, 10);
        if (!isNaN(val) && val >= 60 && val <= 1200) return val;
      }
    } catch {
      // ignore
    }
    return 180;
  });
  const [isResizing, setIsResizing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sync collapsed with prop
  useEffect(() => {
    setInternalCollapsed(isCollapsed);
  }, [isCollapsed]);

  // Auto-scroll to bottom as new compiler and execution logs stream in
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const toggleCollapsed = () => {
    const next = !internalCollapsed;
    setInternalCollapsed(next);
    onToggleCollapse?.();
  };

  // Mouse drag handler to stretch/shrink messages panel (Delphi / Lazarus style)
  const handleSplitterMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // If collapsed, uncollapse immediately upon dragging
    if (internalCollapsed) {
      setInternalCollapsed(false);
      onToggleCollapse?.();
    }
    if (isMaximized) {
      setIsMaximized(false);
    }

    setIsResizing(true);
    const startY = e.clientY;
    const startHeight = internalCollapsed ? 28 : dockHeight;

    const onMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
      // Moving mouse upwards (smaller clientY) increases dock height
      const deltaY = startY - moveEvent.clientY;
      const minH = 60;
      const maxH = Math.max(250, window.innerHeight - 100);
      const newHeight = Math.round(Math.max(minH, Math.min(maxH, startHeight + deltaY)));
      setDockHeight(newHeight);
    };

    const onMouseUp = (upEvent: MouseEvent) => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setIsResizing(false);
      const deltaY = startY - upEvent.clientY;
      const minH = 60;
      const maxH = Math.max(250, window.innerHeight - 100);
      const finalH = Math.round(Math.max(minH, Math.min(maxH, startHeight + deltaY)));
      try {
        localStorage.setItem('lazarus_bottom_dock_height', String(finalH));
      } catch {
        // ignore
      }
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleSplitterDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (internalCollapsed) {
      setInternalCollapsed(false);
      onToggleCollapse?.();
      setDockHeight(180);
    } else if (dockHeight !== 180) {
      setDockHeight(180);
      try {
        localStorage.setItem('lazarus_bottom_dock_height', '180');
      } catch {}
    } else {
      const nextH = 320;
      setDockHeight(nextH);
      try {
        localStorage.setItem('lazarus_bottom_dock_height', String(nextH));
      } catch {}
    }
  };

  const handleHeaderDoubleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.dock-btn') || (e.target as HTMLElement).closest('.dock-tab')) {
      return;
    }
    toggleCollapsed();
  };

  return (
    <div
      className={`lazarus-bottom-dock ${internalCollapsed ? 'collapsed' : ''} ${isMaximized ? 'maximized' : ''} ${isResizing ? 'is-resizing' : ''}`}
      style={{
        height: internalCollapsed ? undefined : (isMaximized ? undefined : `${dockHeight}px`),
        maxHeight: internalCollapsed ? undefined : (isMaximized ? undefined : `${dockHeight}px`)
      }}
    >
      {/* Draggable Splitter Bar (Delphi / Lazarus style) */}
      <div
        className={`bottom-dock-splitter ${isResizing ? 'resizing' : ''}`}
        onMouseDown={handleSplitterMouseDown}
        onDoubleClick={handleSplitterDoubleClick}
        title="Arrastar com o mouse para esticar/redimensionar área de mensagens (Duplo clique para redefinir para 180px)"
      >
        <div className="splitter-grip-indicator" />
      </div>

      {/* Dock Header Tabs */}
      <div className="bottom-dock-header" onDoubleClick={handleHeaderDoubleClick}>
        <div className="dock-tabs">
          <button
            className={`dock-tab ${activeTab === 'messages' ? 'active' : ''}`}
            onClick={() => { setActiveTab('messages'); setInternalCollapsed(false); }}
          >
            <Terminal size={13} className="tab-icon" />
            <span>Mensagens do Compilador e Terminal ({logs.length})</span>
          </button>
          <button
            className={`dock-tab ${activeTab === 'shortcuts' ? 'active' : ''}`}
            onClick={() => { setActiveTab('shortcuts'); setInternalCollapsed(false); }}
          >
            <Keyboard size={13} className="tab-icon" />
            <span>Guia de Atalhos</span>
          </button>
        </div>

        <div className="dock-controls">
          {isRunning ? (
            <div className="live-process-status">
              <span className="live-pulse-dot" />
              <span>Processo Ativo (Janela Externa)</span>
              {onReopenWindow && (
                <button
                  className="reopen-window-btn"
                  onClick={onReopenWindow}
                  title="Reabrir / Focar Janela da Aplicação"
                >
                  <ExternalLink size={12} /> Reabrir Janela
                </button>
              )}
            </div>
          ) : (
            <span className="compiler-status-indicator">
              <CheckCircle2 size={12} className="icon-green" /> FPC 3.2.2 [LCL Web Target: OK]
            </span>
          )}

          <button className="dock-btn" onClick={onClearLogs} title="Limpar Mensagens">
            <Trash2 size={13} />
          </button>
          <button
            className="dock-btn"
            onClick={() => setIsMaximized(!isMaximized)}
            title={isMaximized ? 'Restaurar Altura' : 'Maximizar Terminal'}
          >
            {isMaximized ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
          <button
            className="dock-btn collapse-btn"
            onClick={toggleCollapsed}
            title={internalCollapsed ? 'Expandir' : 'Recolher'}
          >
            {internalCollapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Dock Content */}
      {!internalCollapsed && (
        <div ref={scrollRef} className="bottom-dock-body">
          {activeTab === 'messages' ? (
            <div className="messages-log-list">
              {logs.length === 0 ? (
                <div className="empty-logs">Nenhuma mensagem do compilador no momento. Pressione F9 para compilar e executar.</div>
              ) : (
                logs.map(log => (
                  <div key={log.id} className={`message-log-item log-${log.type}`}>
                    <span className="log-time">[{log.time}]</span>
                    {log.type === 'success' && <CheckCircle2 size={13} className="log-icon success" />}
                    {log.type === 'error' && <AlertCircle size={13} className="log-icon error" />}
                    {log.type === 'warning' && <AlertCircle size={13} className="log-icon warning" />}
                    {log.type === 'info' && <Info size={13} className="log-icon info" />}
                    <span className="log-text">{log.text}</span>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="shortcuts-reference-grid">
              <div className="shortcut-card">
                <kbd>F12</kbd>
                <span>Alternar entre Formulário Visual e Código Pascal (Unit1.pas)</span>
              </div>
              <div className="shortcut-card">
                <kbd>F9</kbd>
                <span>Compilar e Executar Aplicação em Nova Janela de Navegador</span>
              </div>
              <div className="shortcut-card">
                <kbd>Del</kbd> / <kbd>Backspace</kbd>
                <span>Excluir componente selecionado</span>
              </div>
              <div className="shortcut-card">
                <kbd>Setas</kbd> / <kbd>Shift + Setas</kbd>
                <span>Mover componente (1px ou passo da grade 8px)</span>
              </div>
              <div className="shortcut-card">
                <kbd>Ctrl + D</kbd>
                <span>Duplicar componente selecionado</span>
              </div>
              <div className="shortcut-card">
                <kbd>Ctrl + Z</kbd> / <kbd>Ctrl + Y</kbd>
                <span>Desfazer / Refazer alterações no formulário</span>
              </div>
              <div className="shortcut-card">
                <kbd>Duplo Clique</kbd>
                <span>No componente: abre evento OnClick no código Pascal</span>
              </div>
              <div className="shortcut-card">
                <kbd>Arrastar da Paleta</kbd>
                <span>Arrastar e soltar componente diretamente na grade</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
