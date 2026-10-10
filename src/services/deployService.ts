import JSZip from 'jszip';
import type { LProject, LForm, LPureUnit, DeployValidationResult, DeployBuildResult, DeployResult } from '../types/lazarus';
import { generateUnitPas, generateLFM, generateProjectLpr, generatePureUnitPas, generateBossJson } from '../utils/pascalGenerator';

/**
 * Validates Pascal syntax, identifiers, and unit integrity before building
 */
export function validateProject(
  project: LProject,
  forms: LForm[],
  pureUnits: LPureUnit[] = []
): DeployValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Validate project name
  if (!project.name || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(project.name)) {
    errors.push(`Nome do projeto inválido: '${project.name || ''}'. Deve iniciar com letra e conter apenas letras, números e sublinhados.`);
  }

  // 2. Validate Forms and Component Names
  forms.forEach(form => {
    if (!form.name || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(form.name)) {
      errors.push(`Nome de formulário inválido: '${form.name}'.`);
    }

    const compNames = new Set<string>();
    form.components.forEach(comp => {
      if (!comp.name || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(comp.name)) {
        errors.push(`Nome de componente inválido: '${comp.name}' no formulário ${form.name}.`);
      }
      if (compNames.has(comp.name.toLowerCase())) {
        errors.push(`Nome de componente duplicado: '${comp.name}' em ${form.name}. Cada componente deve ter um identificador único.`);
      }
      compNames.add(comp.name.toLowerCase());

      // Validate Event Procedure Code Syntax (begin/end balance)
      if (comp.eventCode) {
        Object.entries(comp.eventCode).forEach(([evtName, code]) => {
          if (code && code.trim()) {
            validateProcedureSyntax(code, `${form.name}.${comp.name}.${evtName}`, errors, warnings);
          }
        });
      }
    });

    // Form Event Codes
    if (form.eventCode) {
      Object.entries(form.eventCode).forEach(([evtName, code]) => {
        if (code && code.trim()) {
          validateProcedureSyntax(code, `${form.name}.${evtName}`, errors, warnings);
        }
      });
    }
  });

  // 3. Validate Pure Units
  pureUnits.forEach(u => {
    if (!u.name || !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(u.name)) {
      errors.push(`Nome de unit inválido: '${u.name}'.`);
    }
    const clean = u.code.trim();
    if (!clean.toLowerCase().startsWith('unit')) {
      warnings.push(`Unit '${u.name}' não começa com a palavra-chave 'unit'.`);
    }
    if (!clean.toLowerCase().endsWith('end.')) {
      warnings.push(`Unit '${u.name}' deve terminar com 'end.'.`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates basic Pascal procedure block balance (begin/end)
 */
function validateProcedureSyntax(code: string, contextName: string, errors: string[], warnings: string[]): void {
  // Remove string literals and comments to count begin/end tokens cleanly
  const stripped = code
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\{[^}]*\}/g, '')
    .replace(/'(?:''|[^'])*'/g, "''");

  const tokens = stripped.match(/\b(begin|end|case)\b/gi) || [];
  let balance = 0;

  for (const token of tokens) {
    const lower = token.toLowerCase();
    if (lower === 'begin' || lower === 'case') {
      balance++;
    } else if (lower === 'end') {
      balance--;
    }
  }

  if (balance > 0) {
    errors.push(`Erro de sintaxe em ${contextName}: bloco 'begin' sem correspondente 'end;'.`);
  } else if (balance < 0) {
    errors.push(`Erro de sintaxe em ${contextName}: 'end;' inesperado sem 'begin' correspondente.`);
  }

  // Check for lines with missing semicolon (basic sanity check)
  const lines = code.split('\n');
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (
      trimmed &&
      !trimmed.startsWith('//') &&
      !trimmed.startsWith('{') &&
      !trimmed.toLowerCase().startsWith('begin') &&
      !trimmed.toLowerCase().startsWith('try') &&
      !trimmed.toLowerCase().startsWith('finally') &&
      !trimmed.toLowerCase().startsWith('except') &&
      !trimmed.toLowerCase().startsWith('else') &&
      !trimmed.toLowerCase().startsWith('repeat') &&
      !trimmed.toLowerCase().endsWith(';') &&
      !trimmed.toLowerCase().endsWith('begin') &&
      !trimmed.toLowerCase().endsWith('then') &&
      !trimmed.toLowerCase().endsWith('do')
    ) {
      if (trimmed.toLowerCase() !== 'end' && trimmed.toLowerCase() !== 'end.') {
        warnings.push(`Possível ponto e vírgula ausente em ${contextName} (linha ${idx + 1}): "${trimmed.slice(0, 40)}"`);
      }
    }
  });
}

/**
 * Compiles and generates all bundle files for the standalone web application
 */
export function generateBundleFiles(
  project: LProject,
  forms: LForm[],
  pureUnits: LPureUnit[] = []
): DeployBuildResult {
  const validation = validateProject(project, forms, pureUnits);
  if (!validation.valid) {
    return {
      success: false,
      errors: validation.errors,
      warnings: validation.warnings,
      files: {}
    };
  }

  const files: Record<string, string> = {};
  const activeForm = forms[0] || {
    id: 'form1',
    name: 'Form1',
    caption: 'Form1',
    width: 640,
    height: 480,
    components: []
  };

  // 1. Generate standalone index.html
  const indexHtml = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${activeForm.caption || project.name} - Lazarus Web Application</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="style.css" />
  </head>
  <body>
    <div id="lazarus-app-viewport">
      <div id="form-window-container" class="form-window is-maximized">
        <div class="window-titlebar" id="window-titlebar">
          <div class="titlebar-left">
            <span class="window-icon">⚡</span>
            <span class="window-title" id="window-caption">${activeForm.caption || activeForm.name}</span>
          </div>
          <div class="titlebar-controls">
            <button class="win-btn win-fullscreen" id="win-fullscreen-btn" title="Tela Cheia Navegador (F11)">⛶</button>
            <button class="win-btn win-min" id="win-min-btn" title="Minimizar">_</button>
            <button class="win-btn win-max" id="win-max-btn" title="Restaurar / Maximizar Janela">🗗</button>
            <button class="win-btn win-close" id="win-close-btn" title="Fechar">✕</button>
          </div>
        </div>
        <div id="form-canvas" class="window-canvas" data-default-width="${activeForm.width}" data-default-height="${activeForm.height}">
          <!-- Componentes renderizados via app.js -->
        </div>
      </div>
    </div>

    <!-- Modal ShowMessage -->
    <div id="msg-modal" class="modal-overlay" style="display: none;">
      <div class="modal-box">
        <div class="modal-header">
          <span id="msg-title">Mensagem do Sistema</span>
          <button id="msg-close-btn" class="modal-close">✕</button>
        </div>
        <div class="modal-body" id="msg-text"></div>
        <div class="modal-footer">
          <button id="msg-ok-btn" class="btn-primary">OK</button>
        </div>
      </div>
    </div>

    <script>
      window.__LAZARUS_PROJECT__ = ${JSON.stringify({
        project: {
          id: project.id,
          name: project.name,
          projectType: project.projectType || 'gui'
        },
        forms,
        pureUnits
      }, null, 2)};
    </script>
    <script src="app.js"></script>
  </body>
</html>`;

  // 2. Generate standalone style.css
  const styleCss = `/* Lazarus Web Standalone Application Stylesheet */
:root {
  --bg-desktop: #0f172a;
  --bg-window: #1e293b;
  --bg-titlebar: #0f172a;
  --bg-control: #334155;
  --bg-input: #0f172a;
  --border-color: #475569;
  --text-main: #f8fafc;
  --text-secondary: #94a3b8;
  --accent-blue: #2563eb;
  --accent-cyan: #06b6d4;
  --accent-green: #10b981;
  --font-ui: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  --font-code: 'Fira Code', monospace;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body, html {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: var(--bg-desktop);
  font-family: var(--font-ui);
  color: var(--text-main);
}

#lazarus-app-viewport {
  width: 100vw;
  height: 100vh;
  margin: 0;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-desktop);
  overflow: hidden;
}

/* Modo Tela Cheia (Padrão) */
.form-window.is-maximized {
  width: 100vw !important;
  height: 100vh !important;
  border-radius: 0 !important;
  border: none !important;
  box-shadow: none !important;
}

.form-window.is-maximized .window-canvas {
  width: 100% !important;
  height: calc(100vh - 34px) !important;
  border-radius: 0 !important;
}

/* Modo Janela Flutuante (quando restaurado pelo botão 🗗) */
.form-window:not(.is-maximized) {
  border-radius: 8px;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.7);
  border: 1px solid var(--border-color);
  max-width: 98vw;
  max-height: 96vh;
}

.form-window {
  background-color: var(--bg-window);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: width 0.15s ease, height 0.15s ease, border-radius 0.15s ease;
}

.window-titlebar {
  height: 34px;
  background-color: var(--bg-titlebar);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  user-select: none;
}

.titlebar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
}

.titlebar-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}

.win-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  width: 22px;
  height: 22px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
}

.win-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.win-close:hover {
  background-color: #ef4444;
  color: #fff;
}

.window-canvas {
  position: relative;
  background-color: var(--bg-window);
  background-image: radial-gradient(#334155 1px, transparent 1px);
  background-size: 16px 16px;
  overflow: hidden;
}

/* Widgets */
.lcl-widget {
  position: absolute;
  box-sizing: border-box;
  font-size: 12px;
}

.lcl-btn {
  background-color: var(--accent-blue);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  padding: 4px 10px;
}

.lcl-btn:hover {
  filter: brightness(1.15);
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.4);
}

.lcl-btn:active {
  transform: translateY(1px);
}

.lcl-edit {
  background-color: var(--bg-input);
  color: #fff;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 4px 8px;
  font-family: var(--font-ui);
}

.lcl-edit:focus {
  outline: none;
  border-color: var(--accent-cyan);
}

.lcl-memo {
  background-color: var(--bg-input);
  color: #fff;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 6px;
  font-family: var(--font-code);
  resize: none;
}

.lcl-label {
  display: flex;
  align-items: center;
  color: var(--text-main);
  user-select: none;
}

.lcl-panel {
  background-color: rgba(30, 41, 59, 0.85);
  border: 1px solid var(--border-color);
  border-radius: 4px;
}

.lcl-checkbox, .lcl-radio {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  user-select: none;
}

/* Modal Dialog */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-box {
  background: #1e293b;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  width: 380px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.7);
  overflow: hidden;
}

.modal-header {
  height: 36px;
  background: #0f172a;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 14px;
  font-size: 13px;
  font-weight: 600;
}

.modal-close {
  background: transparent;
  border: none;
  color: #94a3b8;
  cursor: pointer;
}

.modal-body {
  padding: 20px;
  font-size: 13.5px;
  line-height: 1.5;
  color: #f1f5f9;
}

.modal-footer {
  padding: 10px 14px;
  background: #0f172a;
  display: flex;
  justify-content: flex-end;
}

.btn-primary {
  background: #2563eb;
  color: #fff;
  border: none;
  border-radius: 4px;
  padding: 6px 18px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}`;

  // 3. Generate standalone app.js (compiled runtime)
  const appJs = `// Lazarus Web Application - Standalone Compiled Runtime
(function() {
  const data = window.__LAZARUS_PROJECT__;
  if (!data || !data.forms || data.forms.length === 0) return;

  const form = data.forms[0];
  const canvas = document.getElementById('form-canvas');
  if (!canvas) return;

  const componentsState = {};
  form.components.forEach(c => {
    componentsState[c.id] = { ...c };
  });

  // Modal Dialog helpers
  const modal = document.getElementById('msg-modal');
  const msgText = document.getElementById('msg-text');
  const msgTitle = document.getElementById('msg-title');
  const msgOk = document.getElementById('msg-ok-btn');
  const msgClose = document.getElementById('msg-close-btn');

  function showMessage(msg, title = 'Mensagem do Sistema') {
    if (msgText) msgText.textContent = msg;
    if (msgTitle) msgTitle.textContent = title;
    if (modal) modal.style.display = 'flex';
  }

  function hideMessage() {
    if (modal) modal.style.display = 'none';
  }

  if (msgOk) msgOk.onclick = hideMessage;
  if (msgClose) msgClose.onclick = hideMessage;

  // Window Controls (Maximize / Fullscreen / Restore / Minimize)
  const winContainer = document.getElementById('form-window-container');
  const winMaxBtn = document.getElementById('win-max-btn');
  const winMinBtn = document.getElementById('win-min-btn');
  const winCloseBtn = document.getElementById('win-close-btn');
  const winFullscreenBtn = document.getElementById('win-fullscreen-btn');
  const winTitlebar = document.getElementById('window-titlebar');
  const defaultWidth = parseInt(canvas.getAttribute('data-default-width') || '640', 10);
  const defaultHeight = parseInt(canvas.getAttribute('data-default-height') || '480', 10);

  function toggleMaximize() {
    if (!winContainer) return;
    const isMax = winContainer.classList.contains('is-maximized');
    if (isMax) {
      winContainer.classList.remove('is-maximized');
      winContainer.style.width = defaultWidth + 'px';
      winContainer.style.height = (defaultHeight + 34) + 'px';
      canvas.style.width = defaultWidth + 'px';
      canvas.style.height = defaultHeight + 'px';
      if (winMaxBtn) winMaxBtn.textContent = '□';
    } else {
      winContainer.classList.add('is-maximized');
      winContainer.style.width = '';
      winContainer.style.height = '';
      canvas.style.width = '';
      canvas.style.height = '';
      if (winMaxBtn) winMaxBtn.textContent = '🗗';
    }
  }

  if (winMaxBtn) winMaxBtn.onclick = toggleMaximize;
  if (winTitlebar) {
    winTitlebar.ondblclick = (e) => {
      if (e.target.closest('.win-btn')) return;
      toggleMaximize();
    };
  }
  if (winFullscreenBtn) {
    winFullscreenBtn.onclick = () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
        winFullscreenBtn.textContent = '✖';
      } else {
        document.exitFullscreen().catch(() => {});
        winFullscreenBtn.textContent = '⛶';
      }
    };
  }
  if (winCloseBtn) {
    winCloseBtn.onclick = () => {
      if (confirm('Deseja fechar a aplicação?')) {
        window.close();
      }
    };
  }
  if (winMinBtn) {
    winMinBtn.onclick = () => {
      toggleMaximize();
    };
  }

  // Pascal expression evaluator
  function evaluateExpression(expr) {
    if (!expr) return '';
    expr = expr.trim();
    if ((expr.startsWith("'") && expr.endsWith("'")) || (expr.startsWith('"') && expr.endsWith('"'))) {
      return expr.slice(1, -1);
    }
    const plusParts = expr.split('+');
    if (plusParts.length > 1) {
      return plusParts.map(p => evaluateExpression(p.trim())).join('');
    }
    const compProp = expr.match(/^([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)$/);
    if (compProp) {
      const comp = Object.values(componentsState).find(c => c.name.toLowerCase() === compProp[1].toLowerCase());
      if (comp) {
        const pName = compProp[2].toLowerCase();
        if (pName === 'text' || pName === 'caption') return comp.text || comp.caption || '';
      }
    }
    return expr;
  }

  // Execute Pascal event statement
  function executePascalCode(code, senderName) {
    if (!code || !code.trim()) return;
    let clean = code.trim();
    if (clean.toLowerCase().startsWith('begin')) clean = clean.substring(5).trim();
    if (clean.toLowerCase().endsWith('end;')) clean = clean.substring(0, clean.length - 4).trim();
    else if (clean.toLowerCase().endsWith('end')) clean = clean.substring(0, clean.length - 3).trim();

    const statements = clean.split(';').map(s => s.trim()).filter(s => s && !s.startsWith('//'));
    statements.forEach(stmt => {
      // 1. ShowMessage('...')
      const smMatch = stmt.match(/^ShowMessage\\s*\\(\\s*(.*)\\s*\\)$/i);
      if (smMatch) {
        const evaluated = evaluateExpression(smMatch[1]);
        showMessage(evaluated, form.caption || form.name);
        return;
      }
      // 2. Assignment: Comp.Prop := Value
      const assign = stmt.match(/^([a-zA-Z0-9_]+)\\.([a-zA-Z0-9_]+)\\s*:=\\s*(.*)$/);
      if (assign) {
        const comp = Object.values(componentsState).find(c => c.name.toLowerCase() === assign[1].toLowerCase());
        if (comp) {
          const prop = assign[2].toLowerCase();
          const val = evaluateExpression(assign[3]);
          if (prop === 'caption') { comp.caption = val; updateDomElement(comp.id, 'caption', val); }
          else if (prop === 'text') { comp.text = val; updateDomElement(comp.id, 'text', val); }
          else if (prop === 'enabled') { const b = val.toLowerCase() === 'true'; comp.enabled = b; updateDomElement(comp.id, 'enabled', b); }
          else if (prop === 'visible') { const b = val.toLowerCase() === 'true'; comp.visible = b; updateDomElement(comp.id, 'visible', b); }
        }
      }
    });
  }

  function updateDomElement(id, prop, val) {
    const el = document.getElementById('comp-' + id);
    if (!el) return;
    if (prop === 'caption') {
      if (el.tagName === 'INPUT' || el.tagName === 'BUTTON') el.innerText = val;
      else el.textContent = val;
    } else if (prop === 'text') {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.value = val;
      else el.textContent = val;
    } else if (prop === 'enabled') {
      el.disabled = !val;
    } else if (prop === 'visible') {
      el.style.display = val ? '' : 'none';
    }
  }

  // Render components
  function renderComponents() {
    canvas.innerHTML = '';
    form.components.forEach(comp => {
      const el = document.createElement(
        comp.type === 'TButton' || comp.type === 'TBitBtn' || comp.type === 'TSpeedButton' ? 'button' :
        comp.type === 'TEdit' ? 'input' :
        comp.type === 'TMemo' ? 'textarea' :
        comp.type === 'TLabel' ? 'span' :
        'div'
      );

      el.id = 'comp-' + comp.id;
      el.className = 'lcl-widget ' + (
        comp.type.includes('Button') || comp.type.includes('Btn') ? 'lcl-btn' :
        comp.type === 'TEdit' ? 'lcl-edit' :
        comp.type === 'TMemo' ? 'lcl-memo' :
        comp.type === 'TLabel' ? 'lcl-label' :
        'lcl-panel'
      );

      el.style.left = (comp.left || 0) + 'px';
      el.style.top = (comp.top || 0) + 'px';
      el.style.width = (comp.width || 80) + 'px';
      el.style.height = (comp.height || 28) + 'px';

      if (comp.color) el.style.backgroundColor = comp.color;
      if (comp.fontColor) el.style.color = comp.fontColor;
      if (comp.caption) {
        if (el.tagName === 'INPUT') el.value = comp.caption;
        else el.innerText = comp.caption;
      }
      if (comp.text && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA')) {
        el.value = comp.text;
      }

      // Click Event
      el.addEventListener('click', function(e) {
        if (comp.events && comp.events.OnClick && comp.eventCode && comp.eventCode.OnClick) {
          executePascalCode(comp.eventCode.OnClick, comp.name);
        }
      });

      canvas.appendChild(el);
    });
  }

  renderComponents();

  // OnCreate Form Event
  if (form.events && form.events.OnCreate && form.eventCode && form.eventCode.OnCreate) {
    executePascalCode(form.eventCode.OnCreate, form.name);
  }
})();`;

  files['index.html'] = indexHtml;
  files['style.css'] = styleCss;
  files['app.js'] = appJs;

  // 4. Also include Pascal source files in the package
  forms.forEach(f => {
    files[`${(f.unitName || 'Unit1').toLowerCase()}.pas`] = generateUnitPas(f);
    files[`${(f.unitName || 'Unit1').toLowerCase()}.lfm`] = generateLFM(f);
  });
  pureUnits.forEach(u => {
    files[u.fileName || `${u.name.toLowerCase()}.pas`] = u.code || generatePureUnitPas(u.name);
  });
  files[`${project.name.toLowerCase()}.lpr`] = generateProjectLpr(forms, pureUnits, project.projectType || 'gui', project.name);

  if (project.projectType === 'horse') {
    files['boss.json'] = generateBossJson(project.name);
  }

  files['metadata.json'] = JSON.stringify({
    projectName: project.name,
    projectType: project.projectType || 'gui',
    buildDate: new Date().toISOString(),
    formsCount: forms.length,
    componentsCount: forms.reduce((acc, f) => acc + f.components.length, 0),
    version: '1.0.0',
    generator: 'Lazarus Web IDE'
  }, null, 2);

  return {
    success: true,
    errors: [],
    warnings: validation.warnings,
    files,
    bundleHtml: indexHtml
  };
}

/**
 * Exports complete compiled application as a ZIP package
 */
export async function exportZipBundle(
  project: LProject,
  forms: LForm[],
  pureUnits: LPureUnit[] = []
): Promise<{ blob: Blob; fileName: string; filesCount: number }> {
  const build = generateBundleFiles(project, forms, pureUnits);
  if (!build.success) {
    throw new Error(`Falha na compilação: ${build.errors.join('; ')}`);
  }

  const zip = new JSZip();
  Object.entries(build.files).forEach(([relPath, content]) => {
    zip.file(relPath, content);
  });

  const blob = await zip.generateAsync({ type: 'blob' });
  const fileName = `${project.name.toLowerCase() || 'projeto'}.zip`;

  // Notify backend API
  try {
    await fetch('/api/project/export-zip', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: project.id,
        projectName: project.name,
        files: Object.keys(build.files)
      })
    });
  } catch {
    // Client-side fallback works seamlessly even if backend offline
  }

  // Trigger browser download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return {
    blob,
    fileName,
    filesCount: Object.keys(build.files).length
  };
}

/**
 * Deploys the built application to IDE Cloud (/apps/:projectId/index.html)
 */
export async function deployToIDECloud(
  project: LProject,
  forms: LForm[],
  pureUnits: LPureUnit[] = []
): Promise<DeployResult> {
  const build = generateBundleFiles(project, forms, pureUnits);
  if (!build.success) {
    throw new Error(`Falha na compilação antes do deploy: ${build.errors.join('; ')}`);
  }

  const response = await fetch('/api/project/deploy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId: project.id,
      projectName: project.name,
      files: build.files
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Falha no servidor ao publicar aplicação: ${errText}`);
  }

  const result = await response.json();
  return {
    success: true,
    projectId: result.projectId || project.id,
    projectName: project.name,
    deployUrl: result.deployUrl || `/apps/${project.id}/index.html`,
    fullUrl: result.fullUrl || `${window.location.origin}/apps/${project.id}/index.html`,
    provider: 'ide',
    message: result.message || 'Aplicação publicada com sucesso na Nuvem da IDE!',
    timestamp: Date.now()
  };
}

/**
 * Modular deploy service for Vercel REST API (https://api.vercel.com/v13/deployments)
 */
export async function deployToVercel(
  project: LProject,
  forms: LForm[],
  pureUnits: LPureUnit[] = [],
  apiToken: string,
  teamId?: string
): Promise<DeployResult> {
  const build = generateBundleFiles(project, forms, pureUnits);
  if (!build.success) {
    throw new Error(`Falha na compilação: ${build.errors.join('; ')}`);
  }

  if (!apiToken || !apiToken.trim()) {
    throw new Error('Token de API da Vercel é obrigatório.');
  }

  const filesPayload = Object.entries(build.files).map(([file, data]) => ({
    file,
    data: btoa(unescape(encodeURIComponent(data))),
    encoding: 'base64'
  }));

  const url = `https://api.vercel.com/v13/deployments${teamId ? `?teamId=${teamId}` : ''}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken.trim()}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: project.name.toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
      files: filesPayload,
      projectSettings: {
        framework: null
      }
    })
  });

  const resJson = await response.json();
  if (!response.ok) {
    throw new Error(resJson.error?.message || 'Falha ao conectar com a API da Vercel.');
  }

  const vercelUrl = `https://${resJson.url}`;
  return {
    success: true,
    projectId: project.id,
    projectName: project.name,
    deployUrl: vercelUrl,
    fullUrl: vercelUrl,
    provider: 'vercel',
    message: 'Deploy na Vercel concluído com sucesso!',
    timestamp: Date.now()
  };
}

/**
 * Modular deploy service for Netlify REST API (https://api.netlify.com/api/v1/sites)
 */
export async function deployToNetlify(
  project: LProject,
  forms: LForm[],
  pureUnits: LPureUnit[] = [],
  apiToken: string,
  siteId?: string
): Promise<DeployResult> {
  const build = generateBundleFiles(project, forms, pureUnits);
  if (!build.success) {
    throw new Error(`Falha na compilação: ${build.errors.join('; ')}`);
  }

  if (!apiToken || !apiToken.trim()) {
    throw new Error('Token de API do Netlify é obrigatório.');
  }

  const zip = new JSZip();
  Object.entries(build.files).forEach(([relPath, content]) => {
    zip.file(relPath, content);
  });
  const zipBlob = await zip.generateAsync({ type: 'blob' });

  const url = siteId
    ? `https://api.netlify.com/api/v1/sites/${siteId}/deploys`
    : `https://api.netlify.com/api/v1/sites`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken.trim()}`,
      'Content-Type': 'application/zip'
    },
    body: zipBlob
  });

  const resJson = await response.json();
  if (!response.ok) {
    throw new Error(resJson.message || 'Falha ao conectar com a API do Netlify.');
  }

  const netlifyUrl = resJson.ssl_url || resJson.url || resJson.deploy_ssl_url;
  return {
    success: true,
    projectId: project.id,
    projectName: project.name,
    deployUrl: netlifyUrl,
    fullUrl: netlifyUrl,
    provider: 'netlify',
    message: 'Deploy no Netlify concluído com sucesso!',
    timestamp: Date.now()
  };
}
