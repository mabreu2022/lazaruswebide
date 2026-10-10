import type { LForm } from '../types/lazarus';

/**
 * Generates an authentic Object Pascal Unit (.pas) for Lazarus/Free Pascal
 */
export function generateUnitPas(form: LForm): string {
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

  return `unit Unit1;

{$mode objfpc}{$H+}

interface

uses
  Classes, SysUtils, Forms, Controls, Graphics, Dialogs, StdCtrls,
  ExtCtrls, ComCtrls, Grids;

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

    if (comp.caption !== undefined) {
      lines.push(`    Caption = '${comp.caption.replace(/'/g, "''")}'`);
    }

    if (comp.text !== undefined && comp.text !== '') {
      lines.push(`    Text = '${comp.text.replace(/'/g, "''")}'`);
    }

    if (!comp.enabled) {
      lines.push(`    Enabled = False`);
    }

    if (!comp.visible) {
      lines.push(`    Visible = False`);
    }

    if (comp.color) {
      lines.push(`    Color = ${comp.color}`);
    }

    if (comp.align && comp.align !== 'alNone') {
      lines.push(`    Align = ${comp.align}`);
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
  Forms, Unit1;

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
