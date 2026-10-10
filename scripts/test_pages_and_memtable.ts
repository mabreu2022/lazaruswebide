import assert from 'assert';
import { canAdoptChild, repairPageHierarchy, computeFullFormLayout } from '../src/utils/layoutEngine';
import { generateLFM } from '../src/utils/pascalGenerator';
import { COMPONENT_DEFINITIONS } from '../src/data/componentRegistry';
import type { LComponent, LForm } from '../src/types/lazarus';

const mk = (o: Partial<LComponent> & { id: string; type: LComponent['type']; name: string }): LComponent => ({
  left: 0, top: 0, width: 100, height: 50, enabled: true, visible: true, events: {}, eventCode: {}, ...o
} as LComponent);

console.log('--- TabSheet nunca pode ser adotado por outra TabSheet ---');
const comps = [
  mk({ id: 'pc', type: 'TPageControl', name: 'PageControl1', width: 260, height: 160 }),
  mk({ id: 't1', type: 'TTabSheet', name: 'TabSheet1', parentId: 'pc' }),
  mk({ id: 't2', type: 'TTabSheet', name: 'TabSheet2', parentId: 'pc' }),
  mk({ id: 'b', type: 'TButton', name: 'Button1', parentId: 't1' })
];
assert.strictEqual(canAdoptChild('t2', 't1', comps), false, 't1 dentro de t2 deve ser proibido');
assert.strictEqual(canAdoptChild(undefined, 't1', comps), false, 't1 no form deve ser proibido');
assert.strictEqual(canAdoptChild('pc', 't1', comps), true);
assert.strictEqual(canAdoptChild('t2', 'b', comps), true, 'botão pode ir para outra aba');

console.log('--- Reparo de projeto com abas aninhadas ---');
const broken = comps.map(c => (c.id === 't1' ? { ...c, parentId: 't2' } : c));
const fixed = repairPageHierarchy(broken);
assert.strictEqual(fixed.find(c => c.id === 't1')!.parentId, 'pc');
assert.strictEqual(repairPageHierarchy(comps), comps, 'nada a reparar mantém a referência');

console.log('--- Abas preenchem o PageControl ---');
const map = computeFullFormLayout(comps, 540, 380);
const r1 = map.get('t1')!, r2 = map.get('t2')!;
assert.deepStrictEqual([r1.width, r1.height], [r2.width, r2.height]);
assert(r1.width > 200 && r1.height > 100, 'aba ocupa a área do PageControl');

console.log('--- TZMemTable ---');
assert(COMPONENT_DEFINITIONS['TZMemTable'], 'TZMemTable registrado');
const form: LForm = {
  id: 'f', name: 'Form1', caption: 'Form1', left: 0, top: 0, width: 400, height: 300, events: {}, eventCode: {},
  components: [mk({ id: 'm', type: 'TZMemTable', name: 'ZMemTable1', isNonVisual: true, active: true, memFieldDefs: 'ID:ftInteger\nNOME:ftString:60' })]
};
const lfm = generateLFM(form);
assert(lfm.includes('object ZMemTable1: TZMemTable'));
assert(lfm.includes("Name = 'NOME'") && lfm.includes('DataType = ftString') && lfm.includes('Size = 60'));
assert(lfm.includes('Active = True'));
console.log('TODOS OS TESTES PASSARAM');
