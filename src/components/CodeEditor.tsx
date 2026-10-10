import React, { useState, useEffect, useRef } from 'react';
import type { LForm } from '../types/lazarus';
import { generateUnitPas, generateLFM, generateProjectLpr } from '../utils/pascalGenerator';
import {
  FileCode,
  Layout,
  Copy,
  Check,
  FolderOpen
} from 'lucide-react';

interface CodeEditorProps {
  form: LForm;
  activeFile: 'unit1.pas' | 'unit1.lfm' | 'project1.lpr';
  activeEventToEdit?: { componentId: string; eventName: string; procedureName: string };
  onChangeActiveFile: (file: 'unit1.pas' | 'unit1.lfm' | 'project1.lpr') => void;
  onToggleFormCode: () => void;
  onUpdateEventCode?: (componentId: string | null, eventName: string, code: string) => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  form,
  activeFile,
  activeEventToEdit,
  onChangeActiveFile,
  onToggleFormCode
}) => {
  const [copied, setCopied] = useState(false);
  const [pascalCode, setPascalCode] = useState('');
  const [lfmCode, setLfmCode] = useState('');
  const [lprCode, setLprCode] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLPreElement>(null);

  // Sync code whenever form changes
  useEffect(() => {
    setPascalCode(generateUnitPas(form));
    setLfmCode(generateLFM(form));
    setLprCode(generateProjectLpr(form.name));
  }, [form]);

  // When activeEventToEdit is set, highlight/scroll to it
  useEffect(() => {
    if (activeEventToEdit && activeFile === 'unit1.pas' && textareaRef.current) {
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

  const getCurrentCode = () => {
    if (activeFile === 'unit1.lfm') return lfmCode;
    if (activeFile === 'project1.lpr') return lprCode;
    return pascalCode;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getCurrentCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsertSnippet = (snippet: string) => {
    if (!textareaRef.current || activeFile !== 'unit1.pas') return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const updated = pascalCode.substring(0, start) + snippet + pascalCode.substring(end);
    setPascalCode(updated);
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

  const lines = getCurrentCode().split('\n');

  return (
    <div className="lazarus-code-editor-view">
      {/* File Tabs & Actions Header */}
      <div className="code-editor-header">
        <div className="code-files-tabs">
          <button
            className={`file-tab ${activeFile === 'unit1.pas' ? 'active' : ''}`}
            onClick={() => onChangeActiveFile('unit1.pas')}
          >
            <FileCode size={14} className="icon-pascal" />
            <span>Unit1.pas</span>
          </button>
          <button
            className={`file-tab ${activeFile === 'unit1.lfm' ? 'active' : ''}`}
            onClick={() => onChangeActiveFile('unit1.lfm')}
          >
            <FolderOpen size={14} className="icon-lfm" />
            <span>Unit1.lfm</span>
          </button>
          <button
            className={`file-tab ${activeFile === 'project1.lpr' ? 'active' : ''}`}
            onClick={() => onChangeActiveFile('project1.lpr')}
          >
            <FileCode size={14} className="icon-lpr" />
            <span>Project1.lpr</span>
          </button>
        </div>

        <div className="code-editor-actions">
          {activeFile === 'unit1.pas' && (
            <div className="quick-snippets">
              <button
                className="snippet-btn"
                onClick={() => handleInsertSnippet("  ShowMessage('Olá do Lazarus Web!');\n")}
                title="Inserir ShowMessage"
              >
                + ShowMessage
              </button>
              {form.components[0] && (
                <button
                  className="snippet-btn"
                  onClick={() => handleInsertSnippet(`  ${form.components[0].name}.Caption := 'Atualizado!';\n`)}
                  title="Inserir modificação de propriedade"
                >
                  + {form.components[0].name}.Caption
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

      {/* Editor Main Canvas with Synchronized Scrolling & Syntax Coloring */}
      <div className="code-editor-body">
        {/* Line Numbers Gutter (Scrolled in sync with textarea) */}
        <div ref={lineNumbersRef} className="code-line-numbers">
          <div className="line-numbers-inner">
            {lines.map((_, i) => (
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
              if (activeFile === 'unit1.pas') setPascalCode(e.target.value);
              else if (activeFile === 'unit1.lfm') setLfmCode(e.target.value);
              else setLprCode(e.target.value);
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
