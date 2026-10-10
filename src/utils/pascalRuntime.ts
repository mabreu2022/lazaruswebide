import type { LComponent, LForm } from '../types/lazarus';

export interface RuntimeContext {
  form: LForm;
  components: Record<string, LComponent>;
  showMessage: (msg: string) => void;
  log: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  updateComponent: (id: string, updates: Partial<LComponent>) => void;
}

/**
 * Executes a simulated Pascal event handler procedure
 */
export function executePascalEvent(
  code: string,
  context: RuntimeContext,
  senderName: string
): void {
  if (!code || code.trim() === '') {
    // If the procedure body is empty, do nothing, exactly as in Object Pascal (begin end)
    return;
  }

  context.log(`[Executando Evento] Disparado por: ${senderName}`, 'info');

  // Normalize code: remove 'begin' and 'end;' wrappers if present
  let cleanCode = code.trim();
  if (cleanCode.toLowerCase().startsWith('begin')) {
    cleanCode = cleanCode.substring(5).trim();
  }
  if (cleanCode.toLowerCase().endsWith('end;')) {
    cleanCode = cleanCode.substring(0, cleanCode.length - 4).trim();
  } else if (cleanCode.toLowerCase().endsWith('end')) {
    cleanCode = cleanCode.substring(0, cleanCode.length - 3).trim();
  }

  // Split lines / statements separated by semicolons
  const statements = cleanCode
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('//'));

  for (const stmt of statements) {
    executeSingleStatement(stmt, context);
  }
}

function executeSingleStatement(stmt: string, context: {
  components: Record<string, LComponent>;
  showMessage: (msg: string) => void;
  log: (msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  updateComponent: (id: string, updates: Partial<LComponent>) => void;
}): void {
  // 1. ShowMessage('...') or ShowMessage("...")
  const showMessageMatch = stmt.match(/^ShowMessage\s*\(\s*(.*)\s*\)$/i);
  if (showMessageMatch) {
    const rawArg = showMessageMatch[1].trim();
    const evaluated = evaluatePascalExpression(rawArg, context.components);
    context.showMessage(evaluated);
    context.log(`ShowMessage: "${evaluated}"`, 'success');
    return;
  }

  // 2. Assignment: Component.Property := Value
  const assignMatch = stmt.match(/^([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)\s*:=\s*(.*)$/);
  if (assignMatch) {
    const compName = assignMatch[1];
    const propName = assignMatch[2].toLowerCase();
    const valExpr = assignMatch[3].trim();

    // Find component by name
    const comp = Object.values(context.components).find(c => c.name.toLowerCase() === compName.toLowerCase());
    if (!comp) {
      context.log(`Aviso: Componente '${compName}' não encontrado no formulário.`, 'warning');
      return;
    }

    const evalVal = evaluatePascalExpression(valExpr, context.components);

    if (propName === 'caption') {
      context.updateComponent(comp.id, { caption: evalVal });
      context.log(`${comp.name}.Caption := '${evalVal}'`, 'info');
    } else if (propName === 'text') {
      context.updateComponent(comp.id, { text: evalVal });
      context.log(`${comp.name}.Text := '${evalVal}'`, 'info');
    } else if (propName === 'enabled') {
      const boolVal = evalVal.toLowerCase() === 'true';
      context.updateComponent(comp.id, { enabled: boolVal });
      context.log(`${comp.name}.Enabled := ${boolVal}`, 'info');
    } else if (propName === 'visible') {
      const boolVal = evalVal.toLowerCase() === 'true';
      context.updateComponent(comp.id, { visible: boolVal });
      context.log(`${comp.name}.Visible := ${boolVal}`, 'info');
    } else if (propName === 'checked') {
      const boolVal = evalVal.toLowerCase() === 'true';
      context.updateComponent(comp.id, { checked: boolVal });
      context.log(`${comp.name}.Checked := ${boolVal}`, 'info');
    } else if (propName === 'progress' || propName === 'position') {
      const numVal = parseInt(evalVal, 10) || 0;
      context.updateComponent(comp.id, { progress: numVal, value: numVal });
      context.log(`${comp.name}.Position := ${numVal}`, 'info');
    } else if (propName === 'color') {
      context.updateComponent(comp.id, { color: evalVal });
      context.log(`${comp.name}.Color := '${evalVal}'`, 'info');
    }
    return;
  }

  // If not parsed, check if it's a comment or fallback notification
  if (!stmt.startsWith('//')) {
    context.log(`Executado comando Pascal: ${stmt}`, 'info');
  }
}

function evaluatePascalExpression(expr: string, components: Record<string, LComponent>): string {
  // String literal 'Text' or "Text"
  if ((expr.startsWith("'") && expr.endsWith("'")) || (expr.startsWith('"') && expr.endsWith('"'))) {
    return expr.slice(1, -1);
  }

  // Component property lookup, e.g., Edit1.Text
  const propLookup = expr.match(/^([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)$/);
  if (propLookup) {
    const compName = propLookup[1];
    const propName = propLookup[2].toLowerCase();
    const comp = Object.values(components).find(c => c.name.toLowerCase() === compName.toLowerCase());
    if (comp) {
      if (propName === 'text') return comp.text || '';
      if (propName === 'caption') return comp.caption || '';
      if (propName === 'name') return comp.name;
    }
  }

  return expr;
}
