import type { LForm } from '../types/lazarus';

/**
 * Generates an authentic Object Pascal Unit (.pas) for Lazarus/Free Pascal
 */
export function generateUnitPas(form: LForm): string {
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
  Object.entries(form.events).forEach(([eventName, procName]) => {
    if (procName) {
      eventSignatures.push(`    procedure ${procName}(Sender: TObject);`);
      const body = form.eventCode[eventName] || `begin\n  // TODO: Implementar ${eventName}\nend;`;
      eventImplementations.push(`procedure T${form.name}.${procName}(Sender: TObject);\n${body}\n`);
    }
  });

  // Component events
  form.components.forEach(comp => {
    Object.entries(comp.events).forEach(([eventName, procName]) => {
      if (procName) {
        if (!eventSignatures.some(s => s.includes(`procedure ${procName}(`))) {
          eventSignatures.push(`    procedure ${procName}(Sender: TObject);`);
          const body = comp.eventCode[eventName] || `begin\n  ShowMessage('Executado ${comp.name}.${eventName}');\nend;`;
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

  return `unit Unit1;

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
 * Generates authentic Lazarus Form (.lfm) file content
 */
export function generateLFM(form: LForm): string {
  const compLfm = form.components.map(comp => {
    const lines = [
      `  object ${comp.name}: ${comp.type}`,
      `    Left = ${Math.round(comp.left)}`,
      `    Height = ${Math.round(comp.height)}`,
      `    Top = ${Math.round(comp.top)}`,
      `    Width = ${Math.round(comp.width)}`
    ];

    if (comp.caption !== undefined && !comp.type.startsWith('TZ') && comp.type !== 'TDataSource') {
      lines.push(`    Caption = '${comp.caption.replace(/'/g, "''")}'`);
    }

    if (comp.text !== undefined && comp.text !== '' && !comp.type.startsWith('TZ')) {
      lines.push(`    Text = '${comp.text.replace(/'/g, "''")}'`);
    }

    if (!comp.enabled) {
      lines.push(`    Enabled = False`);
    }

    if (!comp.visible && !comp.isNonVisual) {
      lines.push(`    Visible = False`);
    }

    if (comp.color) {
      lines.push(`    Color = ${comp.color}`);
    }

    if (comp.align && comp.align !== 'alNone') {
      lines.push(`    Align = ${comp.align}`);
    }

    // Zeos TZConnection properties
    if (comp.type === 'TZConnection') {
      lines.push(`    Protocol = '${comp.protocol || 'firebird-5.0'}'`);
      lines.push(`    HostName = '${comp.hostName || 'localhost'}'`);
      lines.push(`    Port = ${comp.port || 3050}`);
      lines.push(`    Database = '${(comp.database || 'C:\\Bancos\\meubanco.fdb').replace(/'/g, "''")}'`);
      lines.push(`    User = '${comp.user || 'SYSDBA'}'`);
      lines.push(`    Password = '${comp.password || 'masterkey'}'`);
      if (comp.connected) lines.push(`    Connected = True`);
      if (comp.charSet) lines.push(`    CharSet = '${comp.charSet}'`);
    }

    // Zeos TZQuery properties
    if (comp.type === 'TZQuery') {
      if (comp.connectionName) lines.push(`    Connection = ${comp.connectionName}`);
      if (comp.sql) {
        lines.push(`    SQL.Strings = (`);
        lines.push(`      '${comp.sql.replace(/'/g, "''")}'`);
        lines.push(`    )`);
      }
      if (comp.active) lines.push(`    Active = True`);
    }

    // Zeos TZTable properties
    if (comp.type === 'TZTable') {
      if (comp.connectionName) lines.push(`    Connection = ${comp.connectionName}`);
      if (comp.text) lines.push(`    TableName = '${comp.text}'`);
      if (comp.active) lines.push(`    Active = True`);
    }

    // TDataSource properties
    if (comp.type === 'TDataSource') {
      if (comp.datasetName) lines.push(`    DataSet = ${comp.datasetName}`);
    }

    // TDBGrid, TDBNavigator, TDBEdit
    if (['TDBGrid', 'TDBNavigator', 'TDBEdit'].includes(comp.type)) {
      if (comp.dataSourceName) lines.push(`    DataSource = ${comp.dataSourceName}`);
      if (comp.type === 'TDBEdit' && comp.dataField) {
        lines.push(`    DataField = '${comp.dataField}'`);
      }
    }

    // Events in LFM
    Object.entries(comp.events).forEach(([eventName, procName]) => {
      if (procName) {
        lines.push(`    ${eventName} = ${procName}`);
      }
    });

    lines.push('  end');
    return lines.join('\n');
  }).join('\n');

  return `object ${form.name}: T${form.name}
  Left = ${Math.round(form.left)}
  Height = ${Math.round(form.height)}
  Top = ${Math.round(form.top)}
  Width = ${Math.round(form.width)}
  Caption = '${form.caption.replace(/'/g, "''")}'
  ClientHeight = ${Math.round(form.height)}
  ClientWidth = ${Math.round(form.width)}
  LCLVersion = '3.0.0.3'
${compLfm}
end
`;
}

/**
 * Generates main Lazarus Project (.lpr) file
 */
export function generateProjectLpr(formName: string): string {
  return `program Project1;

{$mode objfpc}{$H+}

uses
  {$IFDEF UNIX}
  cthreads,
  {$ENDIF}
  Interfaces, // LCL Widgetset
  Forms, Unit1, zcore;

{$R *.res}

begin
  RequireDerivedFormResource := True;
  Application.Scaled := True;
  Application.Initialize;
  Application.CreateForm(T${formName}, ${formName});
  Application.Run;
end.
`;
}
