import type { LComponent, LForm, LProjectGroup } from '../types/lazarus';
import { isContainerComponent } from './layoutEngine';

/**
 * Generates an authentic Object Pascal Unit (.pas) for Lazarus/Free Pascal
 */
export function generateUnitPas(form: LForm): string {
  const unitName = form.unitName || 'Unit1';

  // Check if database / Zeos / Container components exist
  const hasZeos = form.components.some(c => c.type.startsWith('TZ'));
  const hasDB = form.components.some(c => c.type.startsWith('TDB') || c.type === 'TDataSource');
  const hasPairSplitter = form.components.some(c => c.type.startsWith('TPairSplitter'));
  const hasImageList = form.components.some(c => c.type === 'TImageList');

  const extraUses = [];
  if (hasDB) extraUses.push('DB');
  if (hasZeos) extraUses.push('ZConnection', 'ZDataset', 'ZAbstractRODataset', 'ZTransaction', 'ZMemTable');
  if (hasPairSplitter) extraUses.push('PairSplitter');
  if (hasImageList) extraUses.push('ImgList');

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

  const baseClass = form.isDataModule ? 'TDataModule' : 'TForm';
  const defaultUses = form.isDataModule
    ? 'Classes, SysUtils, Dialogs'
    : 'Classes, SysUtils, Forms, Controls, Graphics, Dialogs, StdCtrls, ExtCtrls, ComCtrls, Grids';

  const usesLine = [
    defaultUses,
    ...extraUses
  ].join(', ');

  return `unit ${unitName};

{$mode objfpc}{$H+}

interface

uses
  ${usesLine};

type

  { T${form.name} }

  T${form.name} = class(${baseClass})
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

  // Anchors
  if (comp.anchors && comp.anchors.length > 0) {
    lines.push(`${indent}  Anchors = [${comp.anchors.join(', ')}]`);
  }

  // Container Properties (TPanel, TGroupBox, TRadioGroup, TScrollBox, etc.)
  if (comp.bevelInner && comp.bevelInner !== 'bvNone') {
    lines.push(`${indent}  BevelInner = ${comp.bevelInner}`);
  }
  if (comp.bevelOuter && comp.bevelOuter !== 'bvNone') {
    lines.push(`${indent}  BevelOuter = ${comp.bevelOuter}`);
  }
  if (comp.bevelWidth !== undefined && comp.bevelWidth !== 1) {
    lines.push(`${indent}  BevelWidth = ${comp.bevelWidth}`);
  }
  if (comp.borderStyle && comp.borderStyle !== 'bsNone') {
    lines.push(`${indent}  BorderStyle = ${comp.borderStyle}`);
  }
  if (comp.autoScroll !== undefined) {
    lines.push(`${indent}  AutoScroll = ${comp.autoScroll ? 'True' : 'False'}`);
  }
  if (comp.flowLayout) {
    lines.push(`${indent}  FlowLayout = ${comp.flowLayout}`);
  }
  if (comp.gridColumns !== undefined) {
    lines.push(`${indent}  GridColumns = ${comp.gridColumns}`);
  }
  if (comp.gridRows !== undefined) {
    lines.push(`${indent}  GridRows = ${comp.gridRows}`);
  }
  if (comp.splitterPosition !== undefined) {
    lines.push(`${indent}  SplitterPosition = ${comp.splitterPosition}`);
  }
  if (comp.itemIndex !== undefined) {
    lines.push(`${indent}  ItemIndex = ${comp.itemIndex}`);
  }
  if (comp.activePageIndex !== undefined) {
    lines.push(`${indent}  ActivePageIndex = ${comp.activePageIndex}`);
  }
  if (comp.pageIndex !== undefined) {
    lines.push(`${indent}  PageIndex = ${comp.pageIndex}`);
  }

  // Items string collection (TRadioGroup, TListBox, TComboBox)
  if (comp.items && comp.items.length > 0) {
    lines.push(`${indent}  Items.Strings = (`);
    comp.items.forEach(it => {
      lines.push(`${indent}    '${it.replace(/'/g, "''")}'`);
    });
    lines.push(`${indent}  )`);
  }

  // ChildSizing
  if (comp.childSizing) {
    if (comp.childSizing.controlsPerLine) {
      lines.push(`${indent}  ChildSizing.ControlsPerLine = ${comp.childSizing.controlsPerLine}`);
    }
    if (comp.childSizing.horizontalSpacing) {
      lines.push(`${indent}  ChildSizing.HorizontalSpacing = ${comp.childSizing.horizontalSpacing}`);
    }
    if (comp.childSizing.verticalSpacing) {
      lines.push(`${indent}  ChildSizing.VerticalSpacing = ${comp.childSizing.verticalSpacing}`);
    }
  }

  // TImage properties
  if (comp.type === 'TImage') {
    if (comp.stretch) lines.push(`${indent}  Stretch = True`);
    if (comp.proportional) lines.push(`${indent}  Proportional = True`);
    if (comp.center) lines.push(`${indent}  Center = True`);
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

  // Zeos TZTransaction properties
  if (comp.type === 'TZTransaction') {
    if (comp.connectionName) lines.push(`${indent}  Connection = ${comp.connectionName}`);
    if (comp.autoCommit !== undefined) lines.push(`${indent}  AutoCommit = ${comp.autoCommit ? 'True' : 'False'}`);
    if (comp.transactIsolationLevel) lines.push(`${indent}  TransactIsolationLevel = ${comp.transactIsolationLevel}`);
    if (comp.active) lines.push(`${indent}  Active = True`);
  }

  // Zeos TZQuery properties
  if (comp.type === 'TZQuery') {
    if (comp.connectionName) lines.push(`${indent}  Connection = ${comp.connectionName}`);
    if (comp.transactionName) lines.push(`${indent}  Transaction = ${comp.transactionName}`);
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
    if (comp.transactionName) lines.push(`${indent}  Transaction = ${comp.transactionName}`);
    if (comp.text) lines.push(`${indent}  TableName = '${comp.text}'`);
    if (comp.active) lines.push(`${indent}  Active = True`);
  }

  // Zeos TZMemTable properties
  if (comp.type === 'TZMemTable') {
    const defs = (comp.memFieldDefs || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    if (defs.length > 0) {
      lines.push(`${indent}  FieldDefs = <`);
      defs.forEach((d, i) => {
        const [fname, ftype = 'ftString', fsize] = d.split(':');
        lines.push(`${indent}    item`);
        lines.push(`${indent}      Name = '${fname}'`);
        lines.push(`${indent}      DataType = ${ftype}`);
        if (fsize) lines.push(`${indent}      Size = ${fsize}`);
        lines.push(`${indent}    end${i === defs.length - 1 ? '>' : ''}`);
      });
    }
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

  // TImageList properties
  if (comp.type === 'TImageList') {
    const count = comp.imagesList?.length || 0;
    lines.push(`${indent}  AllocBy = ${Math.max(4, count)}`);
    lines.push(`${indent}  Height = ${comp.imageHeight || 16}`);
    lines.push(`${indent}  Width = ${comp.imageWidth || 16}`);
  }

  // Linked TImageList for buttons / controls
  if (comp.images) {
    lines.push(`${indent}  Images = ${comp.images}`);
    if (comp.imageIndex !== undefined) {
      lines.push(`${indent}  ImageIndex = ${comp.imageIndex}`);
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

  if (form.isDataModule) {
    return `object ${form.name}: T${form.name}
  OldCreateOrder = False
  Height = ${Math.round(form.height)}
  HorizontalOffset = ${Math.round(form.left ?? 350)}
  VerticalOffset = ${Math.round(form.top ?? 200)}
  Width = ${Math.round(form.width)}
${compLfm ? compLfm + '\n' : ''}end
`;
  }

  return `object ${form.name}: T${form.name}
  Left = ${Math.round(form.left ?? 350)}
  Height = ${Math.round(form.height)}
  Top = ${Math.round(form.top ?? 200)}
  Width = ${Math.round(form.width)}
  Caption = '${form.caption.replace(/'/g, "''")}'
  ClientHeight = ${Math.round(form.height)}
  ClientWidth = ${Math.round(form.width)}
  LCLVersion = '3.0.0.3'
${compLfm ? compLfm + '\n' : ''}end
`;
}

/**
 * Generates a standalone Object Pascal Unit without form/visual layout
 */
export function generatePureUnitPas(unitName: string, className: string = 'TMinhaClasse'): string {
  return `unit ${unitName};

{$mode objfpc}{$H+}

interface

uses
  Classes, SysUtils;

type

  { ${className} }

  ${className} = class
  private
    FId: Integer;
    FNome: String;
  public
    constructor Create;
    destructor Destroy; override;
    property Id: Integer read FId write FId;
    property Nome: String read FNome write FNome;
  end;

implementation

{ ${className} }

constructor ${className}.Create;
begin
  inherited Create;
  FId := 0;
  FNome := '';
end;

destructor ${className}.Destroy;
begin
  inherited Destroy;
end;

end.
`;
}

/**
 * Generates main Lazarus Project (.lpr) file supporting multiple forms, datamodules, and pure units
 */
export function generateProjectLpr(
  formsOrMainName: LForm[] | string,
  pureUnits: { unitName: string }[] = []
): string {
  const forms: { name: string; unitName: string; isDataModule?: boolean }[] = Array.isArray(formsOrMainName)
    ? formsOrMainName.map(f => ({ name: f.name, unitName: f.unitName || 'Unit1', isDataModule: f.isDataModule }))
    : [{ name: formsOrMainName, unitName: 'Unit1' }];

  const allUnitNames = [
    ...forms.map(f => f.unitName),
    ...pureUnits.map(u => u.unitName)
  ];
  const unitList = Array.from(new Set(allUnitNames)).join(', ');

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
export function generateLPI(
  projectName: string,
  forms: LForm[],
  pureUnits: { unitName: string }[] = []
): string {
  let unitIndex = 1;
  const formsXml = forms.map((f) => {
    const xml = `      <Unit${unitIndex}>
        <Filename Value="${f.unitName || 'Unit1'}.pas"/>
        <IsPartOfProject Value="True"/>
        <ComponentName Value="${f.name}"/>
        <HasResources Value="True"/>
        <ResourceBaseClass Value="${f.isDataModule ? 'DataModule' : 'Form'}"/>
      </Unit${unitIndex}>`;
    unitIndex++;
    return xml;
  }).join('\n');

  const pureUnitsXml = pureUnits.map((u) => {
    const xml = `      <Unit${unitIndex}>
        <Filename Value="${u.unitName}.pas"/>
        <IsPartOfProject Value="True"/>
        <HasResources Value="False"/>
      </Unit${unitIndex}>`;
    unitIndex++;
    return xml;
  }).join('\n');

  const totalUnits = 1 + forms.length + pureUnits.length;

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
    <Units Count="${totalUnits}">
      <Unit0>
        <Filename Value="${projectName}.lpr"/>
        <IsPartOfProject Value="True"/>
      </Unit0>
${formsXml}
${pureUnitsXml ? pureUnitsXml + '\n' : ''}    </Units>
  </ProjectOptions>
</CONFIG>
`;
}

/**
 * Generates Lazarus Project Group (.lpg) XML file
 */
export function generateLPG(group: LProjectGroup): string {
  const itemsXml = group.projects.map((proj, idx) => {
    return `      <Item${idx} Path="${proj.name}.lpi"/>`;
  }).join('\n');

  const activeTargetXml = group.activeProjectId
    ? group.projects.find(p => p.id === group.activeProjectId)?.name || group.projects[0]?.name || 'Project1'
    : group.projects[0]?.name || 'Project1';

  return `<?xml version="1.0" encoding="UTF-8"?>
<CONFIG>
  <ProjectGroup Version="2">
    <Group Count="${group.projects.length}">
${itemsXml}
    </Group>
    <ActiveTarget Project="${activeTargetXml}.lpi"/>
  </ProjectGroup>
</CONFIG>
`;
}

