import type { LComponent, LForm } from '../types/lazarus';
import { isContainerComponent } from './layoutEngine';

/**
 * Generates an authentic Object Pascal Unit (.pas) for Lazarus/Free Pascal
 */
export function generateUnitPas(form: LForm): string {
  const unitName = form.unitName || 'Unit1';

  // Check if database / Zeos components exist
  const hasZeos = form.components.some(c => c.type.startsWith('TZ'));
  const hasDB = form.components.some(c => c.type.startsWith('TDB') || c.type === 'TDataSource');

  const extraUses = [];
  if (hasDB) extraUses.push('DB');
  if (hasZeos) extraUses.push('ZConnection', 'ZDataset', 'ZAbstractRODataset');

  // Collect event procedures
  const eventSignatures: string[] = [];
  const eventImplementations: string[] = [];

  // Form events
  Object.entries(form.events || {}).forEach(([eventName, procName]) => {
    if (procName) {
      eventSignatures.push(`    procedure ${procName}(Sender: TObject);`);
      const body = form.eventCode?.[eventName] || `begin\n  // TODO: Implementar ${eventName}\nend;`;
      eventImplementations.push(`procedure T${form.name}.${procName}(Sender: TObject);\n${body}\n`);
    }
  });

  // Component events
  form.components.forEach(comp => {
    Object.entries(comp.events || {}).forEach(([eventName, procName]) => {
      if (procName) {
        if (!eventSignatures.some(s => s.includes(`procedure ${procName}(`))) {
          eventSignatures.push(`    procedure ${procName}(Sender: TObject);`);
          const body = comp.eventCode?.[eventName] || `begin\n  ShowMessage('Executado ${comp.name}.${eventName}');\nend;`;
          eventImplementations.push(`procedure T${form.name}.${procName}(Sender: TObject);\n${body}\n`);
        }
      }
    });
  });

  // Component variable declarations
  const componentDecls = form.components
    .map(comp => `    ${comp.name}: ${comp.type};`)
    .join('\n');

  const usesLine = [
    'Classes, SysUtils, Forms, Controls, Graphics, Dialogs, StdCtrls,',
    'ExtCtrls, ComCtrls, Grids',
    ...extraUses
  ].join(', ');

  return `unit ${unitName};

{$mode objfpc}{$H+}

interface

uses
  ${usesLine};

type

  { T${form.name} }

  T${form.name} = class(TForm)
${componentDecls ? componentDecls + '\n' : ''}${eventSignatures.join('\n')}
  private

  public

  end;

var
  ${form.name}: T${form.name};

implementation

{$R *.lfm}

{ T${form.name} }

${eventImplementations.join('\n')}
end.
`;
}

/**
 * Generates LFM block for a single component, including recursively nested child components
 */
function generateSingleComponentLFM(comp: LComponent, form: LForm, indent: string): string {
  const lines: string[] = [
    `${indent}object ${comp.name}: ${comp.type}`,
    `${indent}  Left = ${Math.round(comp.left)}`,
    `${indent}  Height = ${Math.round(comp.height)}`,
    `${indent}  Top = ${Math.round(comp.top)}`,
    `${indent}  Width = ${Math.round(comp.width)}`
  ];

  if (comp.caption !== undefined && !comp.type.startsWith('TZ') && comp.type !== 'TDataSource') {
    lines.push(`${indent}  Caption = '${comp.caption.replace(/'/g, "''")}'`);
  }

  if (comp.text !== undefined && comp.text !== '' && !comp.type.startsWith('TZ')) {
    lines.push(`${indent}  Text = '${comp.text.replace(/'/g, "''")}'`);
  }

  if (!comp.enabled) {
    lines.push(`${indent}  Enabled = False`);
  }

  if (!comp.visible && !comp.isNonVisual) {
    lines.push(`${indent}  Visible = False`);
  }

  if (comp.color) {
    lines.push(`${indent}  Color = ${comp.color}`);
  }

  if (comp.align && comp.align !== 'alNone') {
    lines.push(`${indent}  Align = ${comp.align}`);
  }

  // Zeos TZConnection properties
  if (comp.type === 'TZConnection') {
    lines.push(`${indent}  Protocol = '${comp.protocol || 'firebird-5.0'}'`);
    lines.push(`${indent}  HostName = '${comp.hostName || 'localhost'}'`);
    lines.push(`${indent}  Port = ${comp.port || 3050}`);
    lines.push(`${indent}  Database = '${(comp.database || 'C:\\Bancos\\meubanco.fdb').replace(/'/g, "''")}'`);
    lines.push(`${indent}  User = '${comp.user || 'SYSDBA'}'`);
    lines.push(`${indent}  Password = '${comp.password || 'masterkey'}'`);
    if (comp.connected) lines.push(`${indent}  Connected = True`);
    if (comp.charSet) lines.push(`${indent}  CharSet = '${comp.charSet}'`);
  }

  // Zeos TZQuery properties
  if (comp.type === 'TZQuery') {
    if (comp.connectionName) lines.push(`${indent}  Connection = ${comp.connectionName}`);
    if (comp.sql) {
      lines.push(`${indent}  SQL.Strings = (`);
      lines.push(`${indent}    '${comp.sql.replace(/'/g, "''")}'`);
      lines.push(`${indent}  )`);
    }
    if (comp.active) lines.push(`${indent}  Active = True`);
  }

  // Zeos TZTable properties
  if (comp.type === 'TZTable') {
    if (comp.connectionName) lines.push(`${indent}  Connection = ${comp.connectionName}`);
    if (comp.text) lines.push(`${indent}  TableName = '${comp.text}'`);
    if (comp.active) lines.push(`${indent}  Active = True`);
  }

  // TDataSource properties
  if (comp.type === 'TDataSource') {
    if (comp.datasetName) lines.push(`${indent}  DataSet = ${comp.datasetName}`);
  }

  // TDBGrid, TDBNavigator, TDBEdit
  if (['TDBGrid', 'TDBNavigator', 'TDBEdit'].includes(comp.type)) {
    if (comp.dataSourceName) lines.push(`${indent}  DataSource = ${comp.dataSourceName}`);
    if (comp.type === 'TDBEdit' && comp.dataField) {
      lines.push(`${indent}  DataField = '${comp.dataField}'`);
    }
  }

  // Events in LFM
  Object.entries(comp.events || {}).forEach(([eventName, procName]) => {
    if (procName) {
      lines.push(`${indent}  ${eventName} = ${procName}`);
    }
  });

  // If component is a container, serialize its direct children recursively!
  if (isContainerComponent(comp.type)) {
    const children = form.components.filter(c => c.parentId === comp.id);
    for (const child of children) {
      lines.push(generateSingleComponentLFM(child, form, indent + '  '));
    }
  }

  lines.push(`${indent}end`);
  return lines.join('\n');
}

/**
 * Generates authentic Lazarus Form (.lfm) file content
 */
export function generateLFM(form: LForm): string {
  // Only render root-level components (children will be recursively nested inside their parent containers)
  const rootComponents = form.components.filter(c => !c.parentId);
  const compLfm = rootComponents
    .map(comp => generateSingleComponentLFM(comp, form, '  '))
    .join('\n');

  return `object ${form.name}: T${form.name}
  Left = ${Math.round(form.left)}
  Height = ${Math.round(form.height)}
  Top = ${Math.round(form.top)}
  Width = ${Math.round(form.width)}
  Caption = '${form.caption.replace(/'/g, "''")}'
  ClientHeight = ${Math.round(form.height)}
  ClientWidth = ${Math.round(form.width)}
  LCLVersion = '3.0.0.3'
${compLfm ? compLfm + '\n' : ''}end
`;
}

/**
 * Generates main Lazarus Project (.lpr) file supporting single or multiple forms
 */
export function generateProjectLpr(formsOrMainName: LForm[] | string): string {
  const forms: { name: string; unitName: string }[] = Array.isArray(formsOrMainName)
    ? formsOrMainName.map(f => ({ name: f.name, unitName: f.unitName || 'Unit1' }))
    : [{ name: formsOrMainName, unitName: 'Unit1' }];

  const unitList = Array.from(new Set(forms.map(f => f.unitName))).join(', ');
  const createFormCalls = forms
    .map(f => `  Application.CreateForm(T${f.name}, ${f.name});`)
    .join('\n');

  return `program Project1;

{$mode objfpc}{$H+}

uses
  {$IFDEF UNIX}
  cthreads,
  {$ENDIF}
  Interfaces, // LCL Widgetset
  Forms, ${unitList}, zcore;

{$R *.res}

begin
  RequireDerivedFormResource := True;
  Application.Scaled := True;
  Application.Initialize;
${createFormCalls}
  Application.Run;
end.
`;
}

/**
 * Generates Lazarus Project Information (.lpi) XML file
 */
export function generateLPI(projectName: string, forms: LForm[]): string {
  const unitsXml = forms.map((f, idx) => `      <Unit${idx + 1}>
        <Filename Value="${f.unitName || 'Unit1'}.pas"/>
        <IsPartOfProject Value="True"/>
        <ComponentName Value="${f.name}"/>
        <HasResources Value="True"/>
        <ResourceBaseClass Value="Form"/>
      </Unit${idx + 1}>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<CONFIG>
  <ProjectOptions>
    <Version Value="12"/>
    <General>
      <Flags>
        <CompatibilityMode Value="True"/>
      </Flags>
      <SessionStorage Value="InProjectDir"/>
      <Title Value="${projectName}"/>
      <ResourceType Value="res"/>
      <UseXPManifest Value="True"/>
      <Icon Value="0"/>
    </General>
    <Units Count="${forms.length + 1}">
      <Unit0>
        <Filename Value="${projectName}.lpr"/>
        <IsPartOfProject Value="True"/>
      </Unit0>
${unitsXml}
    </Units>
  </ProjectOptions>
</CONFIG>
`;
}

