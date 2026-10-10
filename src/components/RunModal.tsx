import React, { useState, useEffect } from 'react';
import type { LComponent, LForm } from '../types/lazarus';
import { executePascalEvent } from '../utils/pascalRuntime';
import {
  X,
  Info,
  Terminal,
  RotateCcw
} from 'lucide-react';

interface RunModalProps {
  form: LForm;
  onClose: () => void;
  onLog: (text: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const RunModal: React.FC<RunModalProps> = ({
  form,
  onClose,
  onLog
}) => {
  // Live state of components during execution
  const [componentsState, setComponentsState] = useState<Record<string, LComponent>>(() => {
    const map: Record<string, LComponent> = {};
    form.components.forEach(c => {
      map[c.id] = { ...c };
    });
    return map;
  });

  // Modal ShowMessage dialog state
  const [messageBox, setMessageBox] = useState<{ isOpen: boolean; message: string; title: string }>({
    isOpen: false,
    message: '',
    title: 'Mensagem do Sistema'
  });

  const [runLogs, setRunLogs] = useState<string[]>([
    `[Compilação] FPC 3.2.2 compilando Project1.lpr...`,
    `[Ligador] Linkando recursos LCL Widgetset...`,
    `[Sucesso] Executável Project1 inicializado com sucesso.`,
    `[Execução] Criando formulário ${form.name}...`
  ]);

  const addRunLog = (msg: string) => {
    setRunLogs(prev => [...prev, msg]);
    onLog(msg);
  };

  const handleUpdateComponent = (id: string, updates: Partial<LComponent>) => {
    setComponentsState(prev => ({
      ...prev,
      [id]: { ...prev[id], ...updates }
    }));
  };

  const showMessage = (msg: string) => {
    setMessageBox({
      isOpen: true,
      message: msg,
      title: form.caption || 'Project1'
    });
  };

  // Trigger component event
  const triggerEvent = (comp: LComponent, eventName: string) => {
    const procName = comp.events[eventName];
    const code = comp.eventCode[eventName] || '';

    addRunLog(`[Evento] ${comp.name}.${eventName} -> ${procName || '(default)'}`);

    executePascalEvent(
      code,
      {
        form,
        components: componentsState,
        showMessage,
        log: (m, type) => {
          addRunLog(`[Log] ${m}`);
          onLog(m, type);
        },
        updateComponent: handleUpdateComponent
      },
      comp.name
    );
  };

  // Reset form state to initial
  const handleReset = () => {
    const map: Record<string, LComponent> = {};
    form.components.forEach(c => {
      map[c.id] = { ...c };
    });
    setComponentsState(map);
    addRunLog(`[Execução] Formulário reinicializado para estado inicial.`);
  };

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !messageBox.isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [messageBox.isOpen, onClose]);

  return (
    <div className="lazarus-run-overlay">
      {/* Simulation Window Container */}
      <div className="run-viewport-wrapper">
        <div
          className="lazarus-run-window"
          style={{
            width: `${Math.max(form.width, 320)}px`,
            height: `${Math.max(form.height + 40, 260)}px`
          }}
        >
          {/* Running Title Bar */}
          <div className="run-window-titlebar">
            <div className="titlebar-info">
              <span className="live-pulse" />
              <span className="title-text">{form.caption}</span>
              <span className="running-tag">[Em Execução]</span>
            </div>
            <div className="window-control-buttons">
              <button className="win-btn win-reset" onClick={handleReset} title="Reinicializar Estado">
                <RotateCcw size={10} />
              </button>
              <button className="win-btn win-close" onClick={onClose} title="Parar Execução (Esc)">
                <X size={10} />
              </button>
            </div>
          </div>

          {/* Running Form Canvas */}
          <div
            className="run-form-canvas"
            style={{
              backgroundColor: form.color || '#ece9d8',
              fontFamily: form.fontFamily || 'Inter, sans-serif'
            }}
          >
            {Object.values(componentsState).map(comp => {
              if (!comp.visible) return null;

              return (
                <div
                  key={comp.id}
                  className="running-component-wrapper"
                  style={{
                    left: `${comp.left}px`,
                    top: `${comp.top}px`,
                    width: `${comp.width}px`,
                    height: `${comp.height}px`
                  }}
                >
                  <InteractiveWidget
                    comp={comp}
                    onTrigger={(evt) => triggerEvent(comp, evt)}
                    onUpdate={(updates) => handleUpdateComponent(comp.id, updates)}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Debug Console Drawer */}
        <div className="run-side-console">
          <div className="console-header">
            <Terminal size={13} />
            <span>Terminal de Execução (LCL Runtime)</span>
          </div>
          <div className="console-lines">
            {runLogs.map((l, idx) => (
              <div key={idx} className="console-line">{l}</div>
            ))}
          </div>
        </div>
      </div>

      {/* ShowMessage Lazarus Dialog Modal */}
      {messageBox.isOpen && (
        <div className="lazarus-msgbox-overlay" onClick={() => setMessageBox({ ...messageBox, isOpen: false })}>
          <div className="lazarus-msgbox" onClick={(e) => e.stopPropagation()}>
            <div className="msgbox-titlebar">
              <span>{messageBox.title}</span>
              <button
                className="msgbox-close"
                onClick={() => setMessageBox({ ...messageBox, isOpen: false })}
              >
                <X size={12} />
              </button>
            </div>
            <div className="msgbox-body">
              <div className="msgbox-icon">
                <Info size={32} className="info-icon" />
              </div>
              <div className="msgbox-text">
                {messageBox.message}
              </div>
            </div>
            <div className="msgbox-actions">
              <button
                className="msgbox-ok-btn"
                autoFocus
                onClick={() => setMessageBox({ ...messageBox, isOpen: false })}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Interactive Components in Run Mode
interface InteractiveWidgetProps {
  comp: LComponent;
  onTrigger: (eventName: string) => void;
  onUpdate: (updates: Partial<LComponent>) => void;
}

const InteractiveWidget: React.FC<InteractiveWidgetProps> = ({ comp, onTrigger, onUpdate }) => {
  const fontStyle: React.CSSProperties = {
    color: comp.fontColor || 'inherit',
    fontSize: comp.fontSize ? `${comp.fontSize}px` : undefined,
    fontWeight: comp.fontBold ? 'bold' : 'normal',
    fontStyle: comp.fontItalic ? 'italic' : 'normal'
  };

  switch (comp.type) {
    case 'TButton':
    case 'TBitBtn':
      return (
        <button
          className="run-widget run-button"
          style={{ ...fontStyle, backgroundColor: comp.color }}
          disabled={!comp.enabled}
          onClick={() => onTrigger('OnClick')}
          onMouseEnter={() => onTrigger('OnMouseEnter')}
          onMouseLeave={() => onTrigger('OnMouseLeave')}
        >
          {comp.type === 'TBitBtn' && <span className="glyph">✔ </span>}
          {comp.caption || comp.name}
        </button>
      );

    case 'TSpeedButton':
      return (
        <button
          className="run-widget run-speedbutton"
          style={fontStyle}
          disabled={!comp.enabled}
          onClick={() => onTrigger('OnClick')}
        >
          ⚡ {comp.caption || ''}
        </button>
      );

    case 'TLabel':
      return (
        <div
          className="run-widget run-label"
          style={fontStyle}
          onClick={() => onTrigger('OnClick')}
        >
          {comp.caption || comp.name}
        </div>
      );

    case 'TEdit':
      return (
        <input
          type="text"
          className="run-widget run-edit"
          style={{ ...fontStyle, backgroundColor: comp.color || '#ffffff' }}
          disabled={!comp.enabled}
          value={comp.text ?? ''}
          placeholder={comp.placeholder || ''}
          onChange={(e) => {
            onUpdate({ text: e.target.value });
            onTrigger('OnChange');
          }}
          onClick={() => onTrigger('OnClick')}
        />
      );

    case 'TMemo':
      return (
        <textarea
          className="run-widget run-memo"
          style={{ ...fontStyle, backgroundColor: comp.color || '#ffffff' }}
          disabled={!comp.enabled}
          value={comp.text ?? comp.caption ?? ''}
          onChange={(e) => {
            onUpdate({ text: e.target.value });
            onTrigger('OnChange');
          }}
        />
      );

    case 'TCheckBox':
      return (
        <label className="run-widget run-checkbox" style={fontStyle}>
          <input
            type="checkbox"
            checked={comp.checked || false}
            disabled={!comp.enabled}
            onChange={(e) => {
              onUpdate({ checked: e.target.checked });
              onTrigger('OnChange');
            }}
          />
          <span>{comp.caption || comp.name}</span>
        </label>
      );

    case 'TRadioButton':
      return (
        <label className="run-widget run-radio" style={fontStyle}>
          <input
            type="radio"
            checked={comp.checked || false}
            disabled={!comp.enabled}
            onChange={(e) => {
              onUpdate({ checked: e.target.checked });
              onTrigger('OnClick');
            }}
          />
          <span>{comp.caption || comp.name}</span>
        </label>
      );

    case 'TComboBox':
      const comboItems = comp.items && comp.items.length > 0 ? comp.items : ['Item 1', 'Item 2', 'Item 3'];
      return (
        <select
          className="run-widget run-combobox"
          style={fontStyle}
          disabled={!comp.enabled}
          value={comp.text || comboItems[0]}
          onChange={(e) => {
            onUpdate({ text: e.target.value });
            onTrigger('OnChange');
          }}
        >
          {comboItems.map((it, idx) => (
            <option key={idx} value={it}>{it}</option>
          ))}
        </select>
      );

    case 'TListBox':
      const listItems = comp.items && comp.items.length > 0 ? comp.items : ['Item 1', 'Item 2', 'Item 3'];
      return (
        <div className="run-widget run-listbox" style={fontStyle}>
          {listItems.map((it, idx) => (
            <div
              key={idx}
              className={`run-list-item ${idx === (comp.selectedIndex ?? 0) ? 'active' : ''}`}
              onClick={() => {
                onUpdate({ selectedIndex: idx, text: it });
                onTrigger('OnClick');
              }}
            >
              {it}
            </div>
          ))}
        </div>
      );

    case 'TProgressBar':
      const pct = Math.min(100, Math.max(0, comp.progress ?? 50));
      return (
        <div className="run-widget run-progressbar">
          <div className="progress-fill" style={{ width: `${pct}%`, backgroundColor: comp.color || '#1677ff' }} />
        </div>
      );

    case 'TTrackBar':
      return (
        <div className="run-widget run-trackbar">
          <input
            type="range"
            min={comp.min ?? 0}
            max={comp.max ?? 100}
            value={comp.value ?? 50}
            onChange={(e) => {
              onUpdate({ value: Number(e.target.value) });
              onTrigger('OnChange');
            }}
          />
        </div>
      );

    case 'TPanel':
      return (
        <div
          className="run-widget run-panel"
          style={{ ...fontStyle, backgroundColor: comp.color || '#ece9d8' }}
          onClick={() => onTrigger('OnClick')}
        >
          <span>{comp.caption || comp.name}</span>
        </div>
      );

    case 'TGroupBox':
      return (
        <fieldset className="run-widget run-groupbox" style={fontStyle}>
          <legend>{comp.caption || comp.name}</legend>
        </fieldset>
      );

    case 'TRadioGroup':
      const groupItems = comp.items && comp.items.length > 0 ? comp.items : ['Opção 1', 'Opção 2'];
      return (
        <fieldset className="run-widget run-radiogroup" style={fontStyle}>
          <legend>{comp.caption || comp.name}</legend>
          {groupItems.map((item, idx) => (
            <label key={idx} className="run-radiogroup-item">
              <input type="radio" name={comp.name} defaultChecked={idx === 0} />
              <span>{item}</span>
            </label>
          ))}
        </fieldset>
      );

    case 'TDBGrid':
      return (
        <div className="run-widget run-dbgrid">
          <div className="grid-header-row">
            <div className="grid-cell col-id">ID</div>
            <div className="grid-cell col-name">Nome</div>
            <div className="grid-cell col-email">E-mail</div>
            <div className="grid-cell col-status">Status</div>
          </div>
          <div className="grid-body-rows">
            <div className="grid-row" onClick={() => onTrigger('OnCellClick')}>
              <div className="grid-cell col-id">1</div>
              <div className="grid-cell col-name">Pascal Brasil</div>
              <div className="grid-cell col-email">dev@pascal.org</div>
              <div className="grid-cell col-status tag-ok">Ativo</div>
            </div>
            <div className="grid-row selected-row" onClick={() => onTrigger('OnCellClick')}>
              <div className="grid-cell col-id">2</div>
              <div className="grid-cell col-name">Lazarus Web</div>
              <div className="grid-cell col-email">web@lazarus.net</div>
              <div className="grid-cell col-status tag-ok">Ativo</div>
            </div>
            <div className="grid-row" onClick={() => onTrigger('OnCellClick')}>
              <div className="grid-cell col-id">3</div>
              <div className="grid-cell col-name">Free Pascal</div>
              <div className="grid-cell col-email">fpc@freepascal.org</div>
              <div className="grid-cell col-status tag-warn">Pendente</div>
            </div>
          </div>
        </div>
      );

    case 'TShape':
      return (
        <div
          className={`run-widget run-shape shape-${comp.shapeType || 'rectangle'}`}
          style={{
            backgroundColor: comp.color || '#4096ff',
            borderColor: comp.fontColor || '#1677ff'
          }}
          onClick={() => onTrigger('OnClick')}
        />
      );

    case 'TStatusBar':
      return (
        <div className="run-widget run-statusbar">
          <div className="status-panel">{comp.caption || 'Pronto'}</div>
          <div className="status-panel small">100%</div>
        </div>
      );

    default:
      return (
        <div className="run-widget run-generic" onClick={() => onTrigger('OnClick')}>
          {comp.name}
        </div>
      );
  }
};
