import React, { useState } from 'react';
import {
  Terminal,
  Send,
  X,
  RotateCcw,
  Square,
  Copy,
  Check,
  Globe
} from 'lucide-react';
import type { ProjectType } from '../types/lazarus';

interface HorseConsoleRunnerProps {
  projectName: string;
  projectType: ProjectType;
  isOpen: boolean;
  onClose: () => void;
  onStop?: () => void;
  port?: number;
}

export const HorseConsoleRunner: React.FC<HorseConsoleRunnerProps> = ({
  projectName,
  projectType,
  isOpen,
  onClose,
  onStop,
  port = 9000
}) => {
  const isHorse = projectType === 'horse';

  // Terminal logs state
  const [logs, setLogs] = useState<string[]>(() => {
    if (isHorse) {
      return [
        `[Compilação] Free Pascal Compiler 3.2.2 compilando ${projectName}.lpr...`,
        `[Ligador] Vinculando pacotes Horse 3.1.5, Horse-Jhonson e FCL-Net...`,
        `[Sucesso] Executável compilado com 0 erros.`,
        `========================================================`,
        `  🐴 Servidor Horse (HashLoad) - Lazarus Web Runtime   `,
        `========================================================`,
        `[Horse] Servidor HTTP escutando na porta ${port}`,
        `[Horse] URL Base: http://localhost:${port}`,
        `[Horse] Rotas registradas:`,
        `  • GET  /ping`,
        `  • GET  /clientes`,
        `  • POST /clientes`,
        `--------------------------------------------------------`,
        `[Horse] Pronto para receber requisições HTTP.`
      ];
    }
    return [
      `[Compilação] Free Pascal Compiler 3.2.2 compilando ${projectName}.lpr...`,
      `[Sucesso] Executável console gerado com sucesso.`,
      `=============================================`,
      `  Aplicação Console Free Pascal (FPC 3.2.2)  `,
      `=============================================`,
      `Executando processo ${projectName}...`,
      `Data e hora: ${new Date().toLocaleString('pt-BR')}`,
      `Processamento em console finalizado com código de saída 0.`
    ];
  });

  // REST API Tester State
  const [method, setMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>('GET');
  const [path, setPath] = useState('/ping');
  const [requestBody, setRequestBody] = useState('{\n  "nome": "Novo Cliente S/A",\n  "cnpj": "12.345.678/0001-90"\n}');
  const [lastResponse, setLastResponse] = useState<{
    status: number;
    statusText: string;
    timeMs: number;
    body: string;
  }>({
    status: 200,
    statusText: 'OK',
    timeMs: 2,
    body: JSON.stringify({ status: 'online', framework: 'Horse', versao: '3.1.5', timestamp: new Date().toLocaleTimeString('pt-BR') }, null, 2)
  });
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'tester' | 'terminal'>(isHorse ? 'tester' : 'terminal');

  if (!isOpen) return null;

  const handleSendRequest = (overrideMethod?: 'GET' | 'POST', overridePath?: string) => {
    const reqMethod = overrideMethod || method;
    const reqPath = overridePath || path;
    const now = new Date();
    const startTime = performance.now();

    let resStatus = 200;
    let resText = 'OK';
    let resBody = '';

    if (reqPath === '/ping') {
      resStatus = 200;
      resText = 'OK';
      resBody = JSON.stringify({
        status: 'pong',
        framework: 'Horse',
        versao: '3.1.5',
        timestamp: now.toLocaleTimeString('pt-BR')
      }, null, 2);
    } else if (reqPath === '/clientes' && reqMethod === 'GET') {
      resStatus = 200;
      resText = 'OK';
      resBody = JSON.stringify([
        { id: 1, nome: 'Auto Peças Central', cnpj: '12.345.678/0001-90', telefone: '(11) 3214-5500', status: 'Ativo' },
        { id: 2, nome: 'Supermercado Estrela', cnpj: '98.765.432/0001-21', telefone: '(19) 3871-2244', status: 'Ativo' },
        { id: 3, nome: 'Distribuidora Norte', cnpj: '45.678.901/0001-33', telefone: '(81) 3456-7890', status: 'Ativo' }
      ], null, 2);
    } else if (reqPath === '/clientes' && reqMethod === 'POST') {
      resStatus = 201;
      resText = 'Created';
      try {
        const parsed = JSON.parse(requestBody);
        resBody = JSON.stringify({
          sucesso: true,
          id: Math.floor(Math.random() * 900) + 10,
          dados: parsed,
          mensagem: 'Registro cadastrado com sucesso via Horse API!'
        }, null, 2);
      } catch {
        resBody = JSON.stringify({
          sucesso: true,
          id: 4,
          mensagem: 'Registro cadastrado com sucesso via Horse API!'
        }, null, 2);
      }
    } else {
      resStatus = 404;
      resText = 'Not Found';
      resBody = JSON.stringify({
        erro: 'Rota não encontrada',
        path: reqPath,
        metodo: reqMethod
      }, null, 2);
    }

    const elapsed = Math.round(performance.now() - startTime + 1.2);

    setLastResponse({
      status: resStatus,
      statusText: resText,
      timeMs: elapsed,
      body: resBody
    });

    const timeStr = now.toLocaleTimeString('pt-BR');
    const logLine = `[${timeStr}] [HTTP ${resStatus}] ${reqMethod} ${reqPath} (${elapsed} ms)`;
    setLogs(prev => [...prev, logLine]);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(lastResponse.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="horse-runner-modal-backdrop">
      <div className="horse-runner-window">
        {/* Header */}
        <div className="horse-runner-header">
          <div className="horse-runner-title">
            <Terminal size={15} className="horse-icon" />
            <span>
              {isHorse
                ? `🐴 Servidor Horse REST API - ${projectName}.exe (Porta ${port})`
                : `Terminal Console - ${projectName}.exe`}
            </span>
            <span className="horse-status-badge">ONLINE</span>
          </div>
          <div className="horse-runner-actions">
            <button
              className="horse-header-btn stop"
              onClick={onStop}
              title="Parar Processo do Servidor"
            >
              <Square size={12} />
              <span>Parar</span>
            </button>
            <button className="horse-header-btn close" onClick={onClose} title="Fechar Janela">
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        {isHorse && (
          <div className="horse-nav-tabs">
            <button
              className={`horse-tab-btn ${activeTab === 'tester' ? 'active' : ''}`}
              onClick={() => setActiveTab('tester')}
            >
              <Globe size={13} />
              <span>Testador de Rotas REST</span>
            </button>
            <button
              className={`horse-tab-btn ${activeTab === 'terminal' ? 'active' : ''}`}
              onClick={() => setActiveTab('terminal')}
            >
              <Terminal size={13} />
              <span>Console / Saída do Servidor ({logs.length})</span>
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="horse-runner-body">
          {(!isHorse || activeTab === 'terminal') && (
            <div className="horse-terminal-view">
              <div className="horse-terminal-screen">
                {logs.map((log, idx) => (
                  <div
                    key={idx}
                    className={`terminal-line ${
                      log.includes('HTTP 200') || log.includes('HTTP 201')
                        ? 'log-success'
                        : log.includes('HTTP 404')
                        ? 'log-error'
                        : log.includes('====')
                        ? 'log-banner'
                        : ''
                    }`}
                  >
                    {log}
                  </div>
                ))}
              </div>
              <div className="terminal-actions-bar">
                <button
                  className="terminal-action-btn"
                  onClick={() => setLogs([`[Console limpo pelo usuário]`])}
                >
                  <RotateCcw size={12} />
                  <span>Limpar Terminal</span>
                </button>
              </div>
            </div>
          )}

          {isHorse && activeTab === 'tester' && (
            <div className="horse-tester-view">
              {/* Presets Bar */}
              <div className="horse-presets-bar">
                <span className="presets-label">Rotas Rápidas:</span>
                <button
                  className="preset-btn preset-chip"
                  onClick={() => {
                    setMethod('GET');
                    setPath('/ping');
                    handleSendRequest('GET', '/ping');
                  }}
                >
                  GET /ping
                </button>
                <button
                  className="preset-btn preset-chip"
                  onClick={() => {
                    setMethod('GET');
                    setPath('/clientes');
                    handleSendRequest('GET', '/clientes');
                  }}
                >
                  GET /clientes
                </button>
                <button
                  className="preset-btn preset-chip"
                  onClick={() => {
                    setMethod('POST');
                    setPath('/clientes');
                    handleSendRequest('POST', '/clientes');
                  }}
                >
                  POST /clientes
                </button>
              </div>

              {/* Request Bar */}
              <div className="horse-request-bar">
                <select
                  className={`method-select method-${method.toLowerCase()}`}
                  value={method}
                  onChange={(e) => setMethod(e.target.value as any)}
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                </select>
                <div className="url-input-container">
                  <span className="url-prefix">http://localhost:{port}</span>
                  <input
                    type="text"
                    className="url-path-input"
                    value={path}
                    onChange={(e) => setPath(e.target.value)}
                    placeholder="/ping"
                  />
                </div>
                <button
                  className="send-request-btn"
                  onClick={() => handleSendRequest()}
                  title="Disparar requisição HTTP"
                >
                  <Send size={13} />
                  <span>Enviar</span>
                </button>
              </div>

              {/* Request / Response Split */}
              <div className="horse-split-container">
                {/* Request Body (se POST/PUT) */}
                {(method === 'POST' || method === 'PUT') && (
                  <div className="split-panel request-panel">
                    <div className="panel-header">
                      <span>Corpo da Requisição (JSON)</span>
                    </div>
                    <textarea
                      className="json-textarea"
                      value={requestBody}
                      onChange={(e) => setRequestBody(e.target.value)}
                      rows={6}
                    />
                  </div>
                )}

                {/* Response Panel */}
                <div className="split-panel response-panel">
                  <div className="panel-header">
                    <div className="response-status-info">
                      <span>Resposta do Servidor:</span>
                      <span className={`status-pill status-${lastResponse.status < 300 ? '200' : '400'}`}>
                        {lastResponse.status} {lastResponse.statusText}
                      </span>
                      <span className="time-pill">{lastResponse.timeMs} ms</span>
                    </div>
                    <button className="copy-btn" onClick={handleCopy} title="Copiar JSON">
                      {copied ? <Check size={12} className="icon-green" /> : <Copy size={12} />}
                      <span>{copied ? 'Copiado' : 'Copiar'}</span>
                    </button>
                  </div>
                  <pre className="response-body-pre">
                    <code>{lastResponse.body}</code>
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
