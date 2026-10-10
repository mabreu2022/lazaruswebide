import React, { useState } from 'react';
import type { ConsoleMessage } from '../types/lazarus';
import {
  Terminal,
  AlertCircle,
  CheckCircle2,
  Info,
  Trash2,
  Keyboard,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

interface BottomConsoleProps {
  logs: ConsoleMessage[];
  onClearLogs: () => void;
}

export const BottomConsole: React.FC<BottomConsoleProps> = ({ logs, onClearLogs }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'messages' | 'shortcuts'>('messages');

  return (
    <div className={`lazarus-bottom-dock ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Dock Header Tabs */}
      <div className="bottom-dock-header">
        <div className="dock-tabs">
          <button
            className={`dock-tab ${activeTab === 'messages' ? 'active' : ''}`}
            onClick={() => { setActiveTab('messages'); setIsCollapsed(false); }}
          >
            <Terminal size={13} className="tab-icon" />
            <span>Mensagens ({logs.length})</span>
          </button>
          <button
            className={`dock-tab ${activeTab === 'shortcuts' ? 'active' : ''}`}
            onClick={() => { setActiveTab('shortcuts'); setIsCollapsed(false); }}
          >
            <Keyboard size={13} className="tab-icon" />
            <span>Guia de Atalhos</span>
          </button>
        </div>

        <div className="dock-controls">
          <span className="compiler-status-indicator">
            <CheckCircle2 size={12} className="icon-green" /> FPC 3.2.2 [LCL Web Target: OK]
          </span>
          <button className="dock-btn" onClick={onClearLogs} title="Limpar Mensagens">
            <Trash2 size={13} />
          </button>
          <button
            className="dock-btn collapse-btn"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expandir' : 'Recolher'}
          >
            {isCollapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Dock Content */}
      {!isCollapsed && (
        <div className="bottom-dock-body">
          {activeTab === 'messages' ? (
            <div className="messages-log-list">
              {logs.length === 0 ? (
                <div className="empty-logs">Nenhuma mensagem do compilador no momento.</div>
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
                <span>Executar Aplicação (Abrir simulador interativo)</span>
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
