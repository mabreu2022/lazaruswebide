import React, { useState } from 'react';
import type { LProject, LForm, LPureUnit, DeployResult, DeployValidationResult } from '../types/lazarus';
import {
  validateProject,
  exportZipBundle,
  deployToIDECloud,
  deployToVercel,
  deployToNetlify
} from '../services/deployService';
import {
  Rocket,
  Download,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  Globe,
  Cloud,
  RefreshCw,
  X,
  FileCode,
  Layers,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

interface DeployModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: LProject;
  forms: LForm[];
  pureUnits?: LPureUnit[];
  onLog?: (msg: string, type: 'info' | 'success' | 'warning' | 'error') => void;
}

export const DeployModal: React.FC<DeployModalProps> = ({
  isOpen,
  onClose,
  project,
  forms,
  pureUnits = [],
  onLog
}) => {
  const [activeTab, setActiveTab] = useState<'cloud' | 'zip' | 'external'>('cloud');
  const [isDeploying, setIsDeploying] = useState<boolean>(false);
  const [deployStep, setDeployStep] = useState<number>(0); // 0: idle, 1: validando, 2: compilando, 3: upload, 4: concluído
  const [deployResult, setDeployResult] = useState<DeployResult | null>(null);
  const [validationResult, setValidationResult] = useState<DeployValidationResult | null>(null);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // External deploy state
  const [externalProvider, setExternalProvider] = useState<'vercel' | 'netlify'>('vercel');
  const [apiToken, setApiToken] = useState<string>('');
  const [externalTeamOrSite, setExternalTeamOrSite] = useState<string>('');
  const [externalError, setExternalError] = useState<string | null>(null);
  const [isExportingZip, setIsExportingZip] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleStartDeploy = async () => {
    setIsDeploying(true);
    setDeployResult(null);
    setValidationResult(null);
    setDeployStep(1);

    onLog?.(`[Deploy] Iniciando validação sintática do projeto '${project.name}'...`, 'info');

    // 1. Validation Step
    const val = validateProject(project, forms, pureUnits);
    setValidationResult(val);

    if (!val.valid) {
      setIsDeploying(false);
      setDeployStep(0);
      onLog?.(`[Deploy] Falha na validação: ${val.errors.length} erro(s) de sintaxe encontrados.`, 'error');
      return;
    }

    setDeployStep(2);
    onLog?.(`[Deploy] Compilando assets, templates HTML5 e runtime Pascal...`, 'info');

    try {
      // 2. Upload / Deploy Step
      setDeployStep(3);
      onLog?.(`[Deploy] Enviando bundles para a rota de publicação da IDE...`, 'info');

      const res = await deployToIDECloud(project, forms, pureUnits);
      setDeployResult(res);
      setDeployStep(4);
      onLog?.(`[Deploy] Aplicação publicada com sucesso! URL pública: ${res.fullUrl || res.deployUrl}`, 'success');
    } catch (err) {
      setValidationResult({
        valid: false,
        errors: [String(err)],
        warnings: []
      });
      setDeployStep(0);
      onLog?.(`[Deploy] Erro durante publicação: ${String(err)}`, 'error');
    } finally {
      setIsDeploying(false);
    }
  };

  const handleDownloadZip = async () => {
    setIsExportingZip(true);
    try {
      onLog?.(`[Export] Empacotando arquivos de deploy da aplicação...`, 'info');
      const { fileName, filesCount } = await exportZipBundle(project, forms, pureUnits);
      onLog?.(`[Export] Pacote ${fileName} (${filesCount} arquivos) exportado com sucesso!`, 'success');
    } catch (err) {
      onLog?.(`[Export] Erro ao exportar pacote ZIP: ${String(err)}`, 'error');
    } finally {
      setIsExportingZip(false);
    }
  };

  const handleCopyLink = () => {
    if (!deployResult) return;
    const link = deployResult.fullUrl || `${window.location.origin}${deployResult.deployUrl}`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(link).catch(() => {});
    }
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleExternalDeploy = async () => {
    if (!apiToken.trim()) {
      setExternalError(`Por favor insira seu token de API do ${externalProvider === 'vercel' ? 'Vercel' : 'Netlify'}.`);
      return;
    }

    setIsDeploying(true);
    setExternalError(null);
    onLog?.(`[Deploy Externo] Enviando bundle para ${externalProvider.toUpperCase()}...`, 'info');

    try {
      let res: DeployResult;
      if (externalProvider === 'vercel') {
        res = await deployToVercel(project, forms, pureUnits, apiToken, externalTeamOrSite);
      } else {
        res = await deployToNetlify(project, forms, pureUnits, apiToken, externalTeamOrSite);
      }
      setDeployResult(res);
      onLog?.(`[Deploy Externo] Sucesso! Disponível em: ${res.deployUrl}`, 'success');
    } catch (err) {
      setExternalError(String(err));
      onLog?.(`[Deploy Externo] Erro: ${String(err)}`, 'error');
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <div className="deploy-modal-overlay" onClick={onClose}>
      <div className="deploy-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="deploy-modal-header">
          <div className="modal-header-left">
            <div className="deploy-badge-icon">
              <Rocket size={18} className="icon-cyan" />
            </div>
            <div>
              <h2 className="deploy-modal-title">Deploy & Publicação da Aplicação</h2>
              <span className="deploy-modal-subtitle">
                Projeto: <strong>{project.name}</strong> •{' '}
                {project.projectType === 'horse' ? 'Servidor REST Horse' : (project.projectType === 'console' ? 'Console App' : 'Aplicação Web GUI')}
              </span>
            </div>
          </div>
          <button className="deploy-close-btn" onClick={onClose} title="Fechar Janela">
            <X size={16} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="deploy-tabs-bar">
          <button
            className={`deploy-tab-btn ${activeTab === 'cloud' ? 'active' : ''}`}
            onClick={() => setActiveTab('cloud')}
          >
            <Globe size={14} />
            <span>Nuvem da IDE (Preview Público)</span>
          </button>
          <button
            className={`deploy-tab-btn ${activeTab === 'zip' ? 'active' : ''}`}
            onClick={() => setActiveTab('zip')}
          >
            <Download size={14} />
            <span>Exportar Pacote (.ZIP)</span>
          </button>
          <button
            className={`deploy-tab-btn ${activeTab === 'external' ? 'active' : ''}`}
            onClick={() => setActiveTab('external')}
          >
            <Cloud size={14} />
            <span>Deploy Externo (Vercel / Netlify)</span>
          </button>
        </div>

        {/* Tab 1: IDE Cloud Hosting */}
        {activeTab === 'cloud' && (
          <div className="deploy-tab-content">
            {/* Stepper Progress */}
            <div className="deploy-stepper">
              <div className={`step-item ${deployStep >= 1 ? 'active' : ''} ${deployStep > 1 ? 'done' : ''}`}>
                <div className="step-circle">{deployStep > 1 ? '✓' : '1'}</div>
                <span className="step-label">Validação Pascal</span>
              </div>
              <div className="step-line" />
              <div className={`step-item ${deployStep >= 2 ? 'active' : ''} ${deployStep > 2 ? 'done' : ''}`}>
                <div className="step-circle">{deployStep > 2 ? '✓' : '2'}</div>
                <span className="step-label">Compilação Web</span>
              </div>
              <div className="step-line" />
              <div className={`step-item ${deployStep >= 3 ? 'active' : ''} ${deployStep > 3 ? 'done' : ''}`}>
                <div className="step-circle">{deployStep > 3 ? '✓' : '3'}</div>
                <span className="step-label">Deploy na Nuvem</span>
              </div>
              <div className="step-line" />
              <div className={`step-item ${deployStep >= 4 ? 'active done' : ''}`}>
                <div className="step-circle">{deployStep >= 4 ? '✓' : '4'}</div>
                <span className="step-label">Publicado</span>
              </div>
            </div>

            {/* Validation Errors Box (if any) */}
            {validationResult && !validationResult.valid && (
              <div className="deploy-alert-box error">
                <div className="alert-header">
                  <AlertCircle size={16} />
                  <strong>Falha na Compilação: Corrija os erros antes de publicar</strong>
                </div>
                <ul className="alert-list">
                  {validationResult.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Warnings Box */}
            {validationResult && validationResult.warnings.length > 0 && (
              <div className="deploy-alert-box warning">
                <div className="alert-header">
                  <ShieldCheck size={16} />
                  <span>Avisos de compilação:</span>
                </div>
                <ul className="alert-list">
                  {validationResult.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Success Card with Link and Preview */}
            {deployResult && (
              <div className="deploy-success-card">
                <div className="success-header">
                  <div className="status-indicator">
                    <span className="pulse-dot online" />
                    <strong>APLICAÇÃO PUBLICADA COM SUCESSO</strong>
                  </div>
                  <span className="deploy-timestamp">Porta Local 5173 • Pronta para Acesso</span>
                </div>

                <div className="deploy-url-box">
                  <span className="url-prefix">URL Pública:</span>
                  <input
                    type="text"
                    readOnly
                    value={deployResult.fullUrl || `${window.location.origin}${deployResult.deployUrl}`}
                    className="deploy-url-input"
                  />
                  <button className="deploy-action-btn copy-btn" onClick={handleCopyLink} title="Copiar Link">
                    {copiedLink ? <Check size={14} className="icon-green" /> : <Copy size={14} />}
                    <span>{copiedLink ? 'Copiado!' : 'Copiar'}</span>
                  </button>
                  <a
                    href={`${deployResult.deployUrl}?v=${deployResult.timestamp || Date.now()}`}
                    target="_blank"
                    rel="noreferrer"
                    className="deploy-action-btn open-btn"
                    title="Abrir em Nova Aba"
                  >
                    <ExternalLink size={14} />
                    <span>Abrir</span>
                  </a>
                </div>

                {/* Live Preview Iframe */}
                <div className="deploy-preview-container">
                  <div className="preview-topbar">
                    <span className="preview-label">Visualização em Tempo Real (Preview ao Vivo):</span>
                    <a href={`${deployResult.deployUrl}?v=${deployResult.timestamp || Date.now()}`} target="_blank" rel="noreferrer" className="preview-link">
                      {deployResult.deployUrl}
                    </a>
                  </div>
                  <iframe
                    src={`${deployResult.deployUrl}?v=${deployResult.timestamp || Date.now()}`}
                    title="Preview da Aplicação"
                    className="deploy-preview-iframe"
                  />
                </div>
              </div>
            )}

            {/* Deploy Trigger Bar */}
            <div className="deploy-footer-actions">
              <button
                className="btn-ide btn-primary start-deploy-btn"
                onClick={handleStartDeploy}
                disabled={isDeploying}
              >
                {isDeploying ? (
                  <>
                    <RefreshCw size={15} className="spin-icon" />
                    <span>Compilando e Publicando...</span>
                  </>
                ) : (
                  <>
                    <Rocket size={15} />
                    <span>{deployResult ? 'Recompilar e Atualizar Deploy' : 'Compilar e Publicar na Nuvem da IDE'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Export ZIP */}
        {activeTab === 'zip' && (
          <div className="deploy-tab-content zip-content">
            <div className="zip-description-card">
              <div className="card-icon-area">
                <Download size={32} className="icon-blue" />
              </div>
              <div className="card-text-area">
                <h3>Pacote de Deploy Completo (.ZIP)</h3>
                <p>
                  O pacote inclui todos os arquivos de build necessários para hospedar sua aplicação web em qualquer
                  servidor estático (Nginx, Apache, Cloudflare Pages, GitHub Pages) ou servidor próprio:
                </p>
                <div className="files-checklist">
                  <div className="file-check-item">
                    <FileCode size={14} className="icon-green" />
                    <span><strong>index.html</strong> (Página web principal responsiva)</span>
                  </div>
                  <div className="file-check-item">
                    <FileCode size={14} className="icon-cyan" />
                    <span><strong>app.js</strong> (Runtime compilado Pascal para JS e bindings)</span>
                  </div>
                  <div className="file-check-item">
                    <Layers size={14} className="icon-orange" />
                    <span><strong>style.css</strong> (Folha de estilos LCL Web autêntica)</span>
                  </div>
                  <div className="file-check-item">
                    <Sparkles size={14} className="icon-blue" />
                    <span><strong>Fontes Object Pascal</strong> (.pas, .lfm, .lpr, boss.json)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="zip-action-area">
              <button
                className="btn-ide btn-success download-zip-btn"
                onClick={handleDownloadZip}
                disabled={isExportingZip}
              >
                {isExportingZip ? (
                  <>
                    <RefreshCw size={15} className="spin-icon" />
                    <span>Gerando Arquivo ZIP...</span>
                  </>
                ) : (
                  <>
                    <Download size={15} />
                    <span>Baixar Pacote de Build ({project.name.toLowerCase()}.zip)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: External Deploy (Vercel / Netlify) */}
        {activeTab === 'external' && (
          <div className="deploy-tab-content external-content">
            <div className="external-intro-card">
              <Cloud size={24} className="icon-cyan" />
              <div>
                <h4>Hospedagem Estática Externa</h4>
                <p>
                  Publique diretamente no seu provedor de nuvem gratuito favorito via API REST oficial.
                </p>
              </div>
            </div>

            <div className="external-form">
              <div className="form-group">
                <label>Provedor de Hospedagem:</label>
                <div className="provider-select-group">
                  <button
                    className={`provider-card-btn ${externalProvider === 'vercel' ? 'active' : ''}`}
                    onClick={() => setExternalProvider('vercel')}
                  >
                    <span className="provider-logo">▲</span>
                    <strong>Vercel</strong>
                  </button>
                  <button
                    className={`provider-card-btn ${externalProvider === 'netlify' ? 'active' : ''}`}
                    onClick={() => setExternalProvider('netlify')}
                  >
                    <span className="provider-logo">💠</span>
                    <strong>Netlify</strong>
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Token de Acesso da API ({externalProvider === 'vercel' ? 'Vercel API Token' : 'Netlify Personal Access Token'}):</label>
                <input
                  type="password"
                  className="ide-text-input"
                  placeholder={externalProvider === 'vercel' ? 'ex: vercel_tok_xxxxxxxxxxxx' : 'ex: nfp_xxxxxxxxxxxx'}
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                />
                <span className="input-hint">
                  {externalProvider === 'vercel'
                    ? 'Obtenha em: vercel.com/account/tokens (Token com escopo de Deployments)'
                    : 'Obtenha em: app.netlify.com/user/applications#personal-access-tokens'}
                </span>
              </div>

              <div className="form-group">
                <label>{externalProvider === 'vercel' ? 'Team ID ou Slug (Opcional):' : 'Site ID (Opcional para atualizar site existente):'}</label>
                <input
                  type="text"
                  className="ide-text-input"
                  placeholder="Deixe em branco para usar conta pessoal padrão"
                  value={externalTeamOrSite}
                  onChange={(e) => setExternalTeamOrSite(e.target.value)}
                />
              </div>

              {externalError && (
                <div className="deploy-alert-box error">
                  <AlertCircle size={15} />
                  <span>{externalError}</span>
                </div>
              )}

              <div className="external-submit-area">
                <button
                  className="btn-ide btn-primary external-deploy-btn"
                  onClick={handleExternalDeploy}
                  disabled={isDeploying || !apiToken.trim()}
                >
                  {isDeploying ? (
                    <>
                      <RefreshCw size={15} className="spin-icon" />
                      <span>Enviando para {externalProvider === 'vercel' ? 'Vercel' : 'Netlify'}...</span>
                    </>
                  ) : (
                    <>
                      <Rocket size={15} />
                      <span>Fazer Deploy no {externalProvider === 'vercel' ? 'Vercel' : 'Netlify'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
