import React, { useState, useEffect, useRef } from 'react';
import type { LComponent, LForm } from '../types/lazarus';
import { executePascalEvent } from '../utils/pascalRuntime';
import { computeFullFormLayout } from '../utils/layoutEngine';
import { Info, RotateCcw, X } from 'lucide-react';
import '../App.css';

export const StandaloneRunner: React.FC = () => {
  const [form, setForm] = useState<LForm | null>(null);
  const [componentsState, setComponentsState] = useState<Record<string, LComponent>>({});
  const [messageBox, setMessageBox] = useState<{ isOpen: boolean; message: string; title: string }>({
    isOpen: false,
    message: '',
    title: 'Mensagem do Sistema'
  });

  const channelRef = useRef<BroadcastChannel | null>(null);

  // Send log to main IDE console
  const sendLogToIDE = (text: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    if (channelRef.current) {
      channelRef.current.postMessage({ type: 'RUN_LOG', text, logType: type });
    }
    if (window.opener) {
      window.opener.postMessage({ type: 'RUN_LOG', text, logType: type }, '*');
    }
  };

  useEffect(() => {
    // Setup communication channel
    try {
      channelRef.current = new BroadcastChannel('lazarus_runner_bus');
    } catch {
      // Fallback
    }

    // Load form data from localStorage
    const saved = localStorage.getItem('lazarus_runtime_form');
    if (saved) {
      try {
        const parsedForm: LForm = JSON.parse(saved);
        setForm(parsedForm);
        document.title = `${parsedForm.caption} - [Executando]`;

        const map: Record<string, LComponent> = {};
        parsedForm.components.forEach(c => {
          map[c.id] = { ...c };
        });
        setComponentsState(map);

        sendLogToIDE(`[Execução] Janela iniciada: ${parsedForm.name} (T${parsedForm.name})`, 'success');

        // Form OnCreate event - only if explicitly coded
        if (parsedForm.events?.OnCreate && parsedForm.eventCode?.OnCreate?.trim()) {
          const procName = parsedForm.events.OnCreate;
          const code = parsedForm.eventCode.OnCreate;
          sendLogToIDE(`[Evento] Form.OnCreate -> ${procName}`, 'info');
          executePascalEvent(
            code,
            {
              form: parsedForm,
              components: map,
              showMessage: (msg) => setMessageBox({ isOpen: true, message: msg, title: parsedForm.caption }),
              log: (m, type) => sendLogToIDE(m, type),
              updateComponent: (id, updates) => {
                setComponentsState(prev => ({
                  ...prev,
                  [id]: { ...prev[id], ...updates }
                }));
              }
            },
            parsedForm.name
          );
        }
      } catch (err) {
        sendLogToIDE(`[Erro] Falha ao carregar formulário: ${String(err)}`, 'error');
      }
    } else {
      sendLogToIDE(`[Aviso] Nenhum formulário encontrado no armazenamento local.`, 'warning');
    }

    // Cleanup on window close
    const handleUnload = () => {
      sendLogToIDE(`[Execução] Aplicação encerrada pelo usuário. Código de saída: 0`, 'info');
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      channelRef.current?.close();
    };
  }, []);

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
      title: form?.caption || 'Project1'
    });
  };

  const triggerEvent = (comp: LComponent, eventName: string) => {
    if (!form) return;
    const procName = comp.events?.[eventName];
    const code = comp.eventCode?.[eventName];

    // CRITICAL: Only execute if an event procedure was explicitly programmed with code!
    if (!procName || !code || !code.trim()) {
      return;
    }

    sendLogToIDE(`[Evento] ${comp.name}.${eventName} -> ${procName}`, 'info');

    executePascalEvent(
      code,
      {
        form,
        components: componentsState,
        showMessage,
        log: (m, type) => sendLogToIDE(`[Runtime] ${m}`, type),
        updateComponent: handleUpdateComponent
      },
      comp.name
    );
  };

  const handleReset = () => {
    if (!form) return;
    const map: Record<string, LComponent> = {};
    form.components.forEach(c => {
      map[c.id] = { ...c };
    });
    setComponentsState(map);
    sendLogToIDE(`[Execução] Formulário reinicializado pelo usuário.`, 'info');
  };

  if (!form) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0e1117', color: '#f1f5f9' }}>
        <span>Inicializando aplicação Lazarus...</span>
      </div>
    );
  }

  return (
    <div className="standalone-app-root">
      {/* Desktop Window Chrome */}
      <div
        className="standalone-window"
        style={{
          width: '100%',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Title bar */}
        <div className="run-window-titlebar">
          <div className="titlebar-info">
            <span className="live-pulse" />
            <span className="title-text">{form.caption}</span>
            <span className="running-tag">[Em Execução - Processo Ativo]</span>
          </div>
          <div className="window-control-buttons">
            <button className="win-btn win-reset" onClick={handleReset} title="Reinicializar formulário">
              <RotateCcw size={11} />
            </button>
            <button className="win-btn win-close" onClick={() => window.close()} title="Fechar Aplicação">
              <X size={11} />
            </button>
          </div>
        </div>

        {/* Form Canvas */}
        <div
          className="run-form-canvas"
          style={{
            flex: 1,
            position: 'relative',
            backgroundColor: form.color || '#ece9d8',
            fontFamily: form.fontFamily || 'Inter, sans-serif'
          }}
        >
          {(() => {
            const allComps = Object.values(componentsState);
            const layoutMap = computeFullFormLayout(allComps, form.width, form.height);

            return allComps.map(comp => {
              if (!comp.visible && !comp.isNonVisual) return null;
              if (comp.isNonVisual) return null;

              const parentRect = comp.parentId ? layoutMap.get(comp.parentId) : null;
              const rect = layoutMap.get(comp.id) || {
                left: comp.left,
                top: comp.top,
                width: comp.width,
                height: comp.height
              };

              const displayLeft = (parentRect ? parentRect.left : 0) + rect.left;
              const displayTop = (parentRect ? parentRect.top : 0) + rect.top;

              return (
                <div
                  key={comp.id}
                  className="running-component-wrapper"
                  style={{
                    left: `${displayLeft}px`,
                    top: `${displayTop}px`,
                    width: `${rect.width}px`,
                    height: `${rect.height}px`
                  }}
                >
                  <InteractiveWidget
                    comp={comp}
                    onTrigger={(evt) => triggerEvent(comp, evt)}
                    onUpdate={(updates) => handleUpdateComponent(comp.id, updates)}
                  />
                </div>
              );
            });
          })()}
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

// Interactive Widgets
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
          onClick={comp.events?.OnClick ? () => onTrigger('OnClick') : undefined}
          onMouseEnter={comp.events?.OnMouseEnter ? () => onTrigger('OnMouseEnter') : undefined}
          onMouseLeave={comp.events?.OnMouseLeave ? () => onTrigger('OnMouseLeave') : undefined}
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
          onClick={comp.events?.OnClick ? () => onTrigger('OnClick') : undefined}
        >
          ⚡ {comp.caption || ''}
        </button>
      );

    case 'TLabel':
      return (
        <div
          className="run-widget run-label"
          style={fontStyle}
          onClick={comp.events?.OnClick ? () => onTrigger('OnClick') : undefined}
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

    case 'TDBNavigator':
      return (
        <div className="run-widget lcl-dbnavigator">
          <button className="nav-btn" onClick={() => onTrigger('OnClick')} title="Primeiro">|◄</button>
          <button className="nav-btn" onClick={() => onTrigger('OnClick')} title="Anterior">◄</button>
          <button className="nav-btn" onClick={() => onTrigger('OnClick')} title="Próximo">►</button>
          <button className="nav-btn" onClick={() => onTrigger('OnClick')} title="Último">►|</button>
          <button className="nav-btn" onClick={() => onTrigger('OnClick')} title="Inserir">+</button>
          <button className="nav-btn" onClick={() => onTrigger('OnClick')} title="Excluir">-</button>
          <button className="nav-btn" onClick={() => onTrigger('OnClick')} title="Editar">✎</button>
          <button className="nav-btn" onClick={() => onTrigger('OnClick')} title="Gravar">✔</button>
          <button className="nav-btn" onClick={() => onTrigger('OnClick')} title="Cancelar">✖</button>
          <button className="nav-btn" onClick={() => onTrigger('OnClick')} title="Atualizar">↻</button>
        </div>
      );

    case 'TDBEdit':
      return (
        <input
          type="text"
          className="run-widget run-edit"
          style={{ ...fontStyle, backgroundColor: comp.color || '#ffffff' }}
          disabled={!comp.enabled}
          value={comp.text ?? ''}
          placeholder={comp.dataField ? `[${comp.dataField}]` : (comp.placeholder || '')}
          onChange={(e) => {
            onUpdate({ text: e.target.value });
            onTrigger('OnChange');
          }}
        />
      );

    default:
      if (comp.isNonVisual) {
        return null;
      }
      return (
        <div className="run-widget run-generic" onClick={() => onTrigger('OnClick')}>
          {comp.name}
        </div>
      );
  }
};
