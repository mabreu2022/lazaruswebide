import assert from 'node:assert/strict';
import { computeFullFormLayout } from '../src/utils/layoutEngine';
import { generateLFM } from '../src/utils/pascalGenerator';
import { getChildrenIds, getDescendantIds, setParent, removeWithDescendants } from '../src/utils/componentTree';
import type { LComponent, LForm } from '../src/types/lazarus';

const mk = (o: Partial<LComponent> & Pick<LComponent, 'id' | 'type'>): LComponent =>
  ({ name: o.id, left: 0, top: 0, width: 75, height: 25, caption: o.id, ...o } as LComponent);

const comps: LComponent[] = [
  mk({ id: 'Panel1', type: 'TPanel', left: 32, top: 24, width: 300, height: 200 }),
  mk({ id: 'Button1', type: 'TButton', left: 16, top: 16, caption: 'OK', parentId: 'Panel1' }),
  mk({ id: 'Panel2', type: 'TPanel', left: 100, top: 100, width: 120, height: 80, parentId: 'Panel1' }),
  mk({ id: 'Edit1', type: 'TEdit', left: 8, top: 8, parentId: 'Panel2' }),
  mk({ id: 'Loose', type: 'TButton', left: 400, top: 10 })
];

// Pilar 1: children derivado, descendentes, ciclos
assert.deepEqual(getChildrenIds(comps, 'Panel1'), ['Button1', 'Panel2']);
assert.deepEqual([...getDescendantIds(comps, ['Panel1'])].sort(), ['Button1', 'Edit1', 'Panel2']);
assert.equal(setParent(comps, 'Panel1', 'Edit1'), comps, 'Edit não é container');
assert.equal(setParent(comps, 'Panel1', 'Panel2'), comps, 'ciclo proibido (pai adotado por descendente)');

// setParent preserva posição absoluta
const layout = computeFullFormLayout(comps, 800, 600);
const before = layout.get('Loose')!;
const moved = setParent(comps, 'Loose', 'Panel2', layout);
const m = moved.find(c => c.id === 'Loose')!;
assert.equal(m.parentId, 'Panel2');
const after = computeFullFormLayout(moved, 800, 600).get('Loose')!;
assert.equal(after.absLeft, before.absLeft, 'absLeft preservado');
assert.equal(after.absTop, before.absTop, 'absTop preservado');
assert.deepEqual(getChildrenIds(moved, 'Panel2'), ['Edit1', 'Loose']);
assert.ok(!getChildrenIds(moved, undefined).includes('Loose'));

// Pilar 3: mover o container move os filhos sem mudar left/top locais
const l1 = computeFullFormLayout(comps, 800, 600);
const shifted = comps.map(c => (c.id === 'Panel1' ? { ...c, left: c.left + 50, top: c.top + 30 } : c));
const l2 = computeFullFormLayout(shifted, 800, 600);
for (const id of ['Button1', 'Panel2', 'Edit1']) {
  assert.equal(l2.get(id)!.absLeft - l1.get(id)!.absLeft, 50, `${id} acompanha o pai (x)`);
  assert.equal(l2.get(id)!.absTop - l1.get(id)!.absTop, 30, `${id} acompanha o pai (y)`);
  assert.equal(l2.get(id)!.left, l1.get(id)!.left, `${id} mantém left local`);
}

// Pilar 3: exclusão em cascata
const del = removeWithDescendants(comps, ['Panel1']);
assert.deepEqual(del.remaining.map(c => c.id), ['Loose']);
assert.equal(del.removed.length, 4);

// Pilar 5: LFM aninhado
const form = { id: 'f', name: 'Form1', caption: 'Form1', left: 0, top: 0, width: 800, height: 600, components: comps } as unknown as LForm;
const lfm = generateLFM(form);
const iPanel = lfm.indexOf('object Panel1: TPanel');
const iBtn = lfm.indexOf('object Button1: TButton');
const iPanel2 = lfm.indexOf('object Panel2: TPanel');
const iEdit = lfm.indexOf('object Edit1: TEdit');
const iLoose = lfm.indexOf('object Loose: TButton');
assert.ok(iPanel >= 0 && iBtn > iPanel && iPanel2 > iBtn && iEdit > iPanel2 && iLoose > iEdit, 'ordem/aninhamento no LFM');
// Button1 deve estar indentado dentro de Panel1 (2 espaços a mais)
const indent = (s: string, i: number) => lfm.slice(lfm.lastIndexOf('\n', i) + 1, i).length;
assert.equal(indent(lfm, iBtn), indent(lfm, iPanel) + 2);
assert.equal(indent(lfm, iEdit), indent(lfm, iPanel2) + 2);
assert.equal(indent(lfm, iLoose), indent(lfm, iPanel));

console.log('OK: componentTree (hierarquia, ciclos, setParent, movimento em bloco, cascata, LFM aninhado)');
