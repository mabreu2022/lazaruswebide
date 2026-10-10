import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { LForm, LPureUnit } from '../types/lazarus';
import { generateUnitPas, generateLFM, generateProjectLpr } from '../utils/pascalGenerator';
import {
  FileCode,
  Layout,
  Copy,
  Check,
  FolderOpen,
  X
} from 'lucide-react';

interface CodeEditorProps {
  form: LForm;
  forms?: LForm[];
  pureUnits?: LPureUnit[];
  activeFile: string;
  openFiles?: string[];
  hideHeader?: boolean;
  activeEventToEdit?: { componentId: string; eventName: string; procedureName: string };
  onChangeActiveFile: (file: string) => void;
  onCloseFile?: (file: string) => void;
  onSelectForm?: (formId: string) => void;
  onToggleFormCode: () => void;
  onUpdateEventCode?: (componentId: string | null, eventName: string, code: string) => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  form,
  forms,
  pureUnits = [],
  activeFile,
  openFiles,
  hideHeader = false,
  activeEventToEdit,
  onChangeActiveFile,
  onCloseFile,
  onSelectForm,
  onToggleFormCode
}) => {
  const [copied, setCopied] = useState(false);
  const [userEditedCode, setUserEditedCode] = useState<Record<string, string>>({});

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLPreElement>(null);

  const allForms = forms && forms.length > 0 ? forms : [form];

  // Resolve current active form based on activeFile
  const currentEditingForm = React.useMemo(() => {
    const lower = activeFile.toLowerCase();
    for (const f of allForms) {
      const uName = (f.unitName || 'Unit1').toLowerCase();
      if (lower === `${uName}.pas` || lower === `${uName}.lfm`) {
        return f;
      }
    }
    return form;
  }, [activeFile, allForms, form]);

  const getCurrentCode = useCallback(() => {
    if (userEditedCode[activeFile] !== undefined) {
      return userEditedCode[activeFile];
    }
    const lower = activeFile.toLowerCase();

    // Check pure units first
    const matchedPure = pureUnits.find(u => u.fileName.toLowerCase() === lower);
    if (matchedPure) {
      return matchedPure.code;
    }

    if (lower.endsWith('.lpr')) {
      return generateProjectLpr(allForms, pureUnits);
    }
    if (lower.endsWith('.lfm')) {
      return generateLFM(currentEditingForm);
    }
    return generateUnitPas(currentEditingForm);
  }, [activeFile, allForms, currentEditingForm, pureUnits, userEditedCode]);

  const pascalCode = getCurrentCode();

  // When activeEventToEdit is set, highlight/scroll to it
  useEffect(() => {
    if (activeEventToEdit && activeFile.toLowerCase().endsWith('.pas') && textareaRef.current) {
      const searchTarget = `procedure T${form.name}.${activeEventToEdit.procedureName}`;
      const index = pascalCode.indexOf(searchTarget);
      if (index !== -1) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(index, index + searchTarget.length);

        // Approximate line scroll
        const linesBefore = pascalCode.substring(0, index).split('\n').length;
        const targetScrollTop = Math.max(0, (linesBefore - 4) * 20);
        textareaRef.current.scrollTop = targetScrollTop;
        if (lineNumbersRef.current) lineNumbersRef.current.scrollTop = targetScrollTop;
        if (overlayRef.current) overlayRef.current.scrollTop = targetScrollTop;
      }
    }
  }, [activeEventToEdit, activeFile, pascalCode, form.name]);

  const handleCopy = () => {
    navigator.clipboard.writeText(getCurrentCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsertSnippet = (snippet: string) => {
    if (!textareaRef.current || !activeFile.toLowerCase().endsWith('.pas')) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const current = getCurrentCode();
    const updated = current.substring(0, start) + snippet + current.substring(end);
    navigator.clipboard.writeText(updated);
  };

  // Synchronize scrolling between textarea, line numbers gutter and syntax overlay
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const { scrollTop, scrollLeft } = e.currentTarget;
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = scrollTop;
    }
    if (overlayRef.current) {
      overlayRef.current.scrollTop = scrollTop;
      overlayRef.current.scrollLeft = scrollLeft;
    }
  };

  const defaultTabs = React.useMemo(() => {
    const list: string[] = [];
    allForms.forEach(f => {
      const uName = (f.unitName || 'Unit1').toLowerCase();
      list.push(`${uName}.pas`);
      list.push(`${uName}.lfm`);
    });
    list.push('project1.lpr');
    return list;
  }, [allForms]);

  const displayedFiles = openFiles !== undefined ? openFiles : defaultTabs;
  const lines = getCurrentCode().split('\n');

  return (
    <div className="lazarus-code-editor-view">
      {/* File Tabs & Actions Header (Hidden when unified workspace header is used) */}
      {!hideHeader && (
        <div className="code-editor-header">
          <div className="code-files-tabs">
            {displayedFiles.map(fileKey => {
              const lower = fileKey.toLowerCase();
              const isPas = lower.endsWith('.pas');
              const isLfm = lower.endsWith('.lfm');
              const isLpr = lower.endsWith('.lpr');
              const isActive = activeFile.toLowerCase() === lower;

              const matchedForm = allForms.find(f => {
                const uName = (f.unitName || '').toLowerCase();
                return uName && (lower === `${uName}.pas` || lower === `${uName}.lfm`);
              });

              return (
                <div
                  key={fileKey}
                  className={`file-tab ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    onChangeActiveFile(lower);
                    if (matchedForm) {
                      onSelectForm?.(matchedForm.id);
                    }
                  }}
                  title={`Arquivo: ${fileKey}`}
                >
                  {isPas && <FileCode size={13} className="icon-pascal" />}
                  {isLfm && <FolderOpen size={13} className="icon-lfm" />}
                  {isLpr && <FileCode size={13} className="icon-lpr" />}
                  <span className="file-tab-label">{fileKey}</span>
                  {onCloseFile && (
                    <button
                      className="tab-close-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCloseFile(fileKey);
                      }}
                      title={`Fechar aba ${fileKey}`}
                    >
                      <X size={11} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="code-editor-actions">
            {activeFile.toLowerCase().endsWith('.pas') && (
              <div className="quick-snippets">
                <button
                  className="snippet-btn"
                  onClick={() => handleInsertSnippet("  ShowMessage('Olá do Lazarus Web!');\n")}
                  title="Inserir ShowMessage"
                >
                  + ShowMessage
                </button>
                {currentEditingForm.components[0] && (
                  <button
                    className="snippet-btn"
                    onClick={() => handleInsertSnippet(`  ${currentEditingForm.components[0].name}.Caption := 'Atualizado!';\n`)}
                    title="Inserir modificação de propriedade"
                  >
                    + {currentEditingForm.components[0].name}.Caption
                  </button>
                )}
              </div>
            )}

            <button className="code-action-btn" onClick={handleCopy} title="Copiar código">
              {copied ? <Check size={14} className="icon-green" /> : <Copy size={14} />}
              <span>{copied ? 'Copiado!' : 'Copiar'}</span>
            </button>

            <button
              className="code-action-btn return-form-btn"
              onClick={onToggleFormCode}
              title="Voltar ao Designer Visual (F12)"
            >
              <Layout size={14} />
              <span>Voltar ao Form (F12)</span>
            </button>
          </div>
        </div>
      )}

      {/* Editor Main Canvas or Empty State */}
      {displayedFiles.length === 0 ? (
        <div className="code-editor-empty-state">
          <FileCode size={44} className="empty-state-icon" />
          <h3>Nenhum arquivo aberto no editor</h3>
          <p>
            Dê um duplo-clique em qualquer arquivo no <strong>Inspetor de Projetos</strong> para abri-lo aqui,
            ou retorne para a edição visual do formulário.
          </p>
          <button className="code-action-btn return-form-btn empty-return-btn" onClick={onToggleFormCode}>
            <Layout size={14} />
            <span>Voltar ao Form (F12)</span>
          </button>
        </div>
      ) : (
        <div className="code-editor-body">
          {/* Line Numbers Gutter (Scrolled in sync with textarea) */}
          <div ref={lineNumbersRef} className="code-line-numbers">
            <div className="line-numbers-inner">
              {lines.map((_: string, i: number) => (
                <div key={i} className="line-num">{i + 1}</div>
              ))}
              <div className="line-gutter-spacer" />
            </div>
          </div>

          {/* Text Area Code Editor with Native Scroll */}
          <div className="code-text-area-container">
            <textarea
              ref={textareaRef}
              className="code-textarea"
              value={getCurrentCode()}
              onScroll={handleScroll}
              onChange={(e) => {
                setUserEditedCode(prev => ({ ...prev, [activeFile]: e.target.value }));
              }}
              spellCheck={false}
              autoCapitalize="none"
              autoComplete="off"
              wrap="off"
            />

            {/* Syntax Highlight Overlay (Synchronized with textarea scroll) */}
            <pre ref={overlayRef} className="code-syntax-overlay" aria-hidden="true">
              <code dangerouslySetInnerHTML={{ __html: highlightPascal(getCurrentCode(), activeFile) }} />
              <div className="code-overlay-spacer" />
            </pre>
          </div>
        </div>
      )}

      {/* Code Status Footer */}
      <div className="code-footer-bar">
        <span>Object Pascal (Free Pascal Mode ObjFpc)</span>
        <span className="sep">|</span>
        <span>UTF-8</span>
        <span className="sep">|</span>
        <span>Linhas: {lines.length}</span>
        <span className="sep">|</span>
        <span className="footer-hint">Pressione F12 para alternar instantaneamente para o Form Designer</span>
      </div>
    </div>
  );
};

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const PASCAL_KEYWORDS = new Set([
  'unit', 'interface', 'implementation', 'uses', 'type', 'class',
  'var', 'procedure', 'function', 'begin', 'end', 'private',
  'public', 'published', 'protected', 'const', 'if', 'then',
  'else', 'while', 'do', 'for', 'to', 'downto', 'repeat', 'until',
  'try', 'except', 'finally', 'raise', 'program', 'initialization',
  'finalization', 'inherited', 'nil', 'true', 'false', 'constructor',
  'destructor', 'override', 'virtual', 'abstract', 'property',
  'read', 'write', 'default', 'nodefault', 'stored', 'index',
  'packed', 'array', 'of', 'record', 'set', 'file', 'case', 'with', 'as', 'is'
]);

const PASCAL_TYPES = new Set([
  'tform', 'tbutton', 'tlabel', 'tedit', 'tmemo', 'tcheckbox',
  'tradiobutton', 'tlistbox', 'tcombobox', 'tpanel', 'tgroupbox',
  'tradiogroup', 'tbitbtn', 'tspeedbutton', 'timage', 'tshape', 'tbevel',
  'tprogressbar', 'ttrackbar', 'tstatusbar', 'tpagecontrol', 'topendialog',
  'tsavedialog', 'tdbgrid', 'tobject', 'integer', 'string', 'boolean',
  'tcolor', 'tfont', 'tcomponent', 'pointer', 'char', 'byte', 'word',
  'cardinal', 'int64', 'single', 'double', 'extended', 'tstrings',
  'tstringlist', 'tnotifyevent', 'tdatetime', 'real', 'sender'
]);

/**
 * Token-based Pascal Syntax Highlighter
 * Safe against tag injection, never corrupts class attributes.
 */
function highlightPascal(code: string, fileType: string): string {
  if (fileType === 'unit1.lfm') {
    return highlightLFM(code);
  }

  // Token regex order:
  // 1: Directives {$...}
  // 2: Line comments //...
  // 3: Block comments {...} or (*...*)
  // 4: Strings '...'
  // 5: Numbers
  // 6: Identifiers/words
  const tokenRegex = /(\{\$[\s\S]*?\})|(\/\/[^\r\n]*)|(\{[^$][\s\S]*?\})|(\(\*[\s\S]*?\*\))|('(?:''|[^'\r\n])*')|(\b\d+(?:\.\d+)?\b)|(\b[a-zA-Z_][a-zA-Z0-9_]*\b)/g;

  let result = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      result += escapeHtml(code.substring(lastIndex, match.index));
    }

    const [token, directive, lineComment, blockComment1, blockComment2, str, num, word] = match;

    if (directive) {
      result += `<span class="directive-pascal">${escapeHtml(directive)}</span>`;
    } else if (lineComment || blockComment1 || blockComment2) {
      const commentText = lineComment || blockComment1 || blockComment2;
      result += `<span class="comment-pascal">${escapeHtml(commentText)}</span>`;
    } else if (str) {
      result += `<span class="str-pascal">${escapeHtml(str)}</span>`;
    } else if (num) {
      result += `<span class="num-pascal">${escapeHtml(num)}</span>`;
    } else if (word) {
      const lower = word.toLowerCase();
      if (PASCAL_KEYWORDS.has(lower)) {
        result += `<span class="kw-pascal">${escapeHtml(word)}</span>`;
      } else if (PASCAL_TYPES.has(lower) || (word.startsWith('T') && word.length > 1 && word[1] === word[1].toUpperCase())) {
        result += `<span class="type-pascal">${escapeHtml(word)}</span>`;
      } else {
        result += escapeHtml(word);
      }
    } else {
      result += escapeHtml(token);
    }

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < code.length) {
    result += escapeHtml(code.substring(lastIndex));
  }

  return result;
}

function highlightLFM(code: string): string {
  const lfmRegex = /(\bobject\b|\bend\b)|('(?:''|[^'\r\n])*')|(\b\d+\b)|(\b[a-zA-Z_][a-zA-Z0-9_]*\b(?=\s*=))/gi;
  let result = '';
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = lfmRegex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      result += escapeHtml(code.substring(lastIndex, match.index));
    }

    const [token, objEnd, str, num, prop] = match;

    if (objEnd) {
      result += `<span class="kw-lfm">${escapeHtml(objEnd)}</span>`;
    } else if (str) {
      result += `<span class="str-pascal">${escapeHtml(str)}</span>`;
    } else if (num) {
      result += `<span class="num-pascal">${escapeHtml(num)}</span>`;
    } else if (prop) {
      result += `<span class="prop-lfm">${escapeHtml(prop)}</span>`;
    } else {
      result += escapeHtml(token);
    }

    lastIndex = lfmRegex.lastIndex;
  }

  if (lastIndex < code.length) {
    result += escapeHtml(code.substring(lastIndex));
  }

  return result;
}
