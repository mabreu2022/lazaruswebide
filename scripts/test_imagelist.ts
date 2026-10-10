import assert from 'node:assert/strict';
import { COMPONENT_DEFINITIONS } from '../src/data/componentRegistry';
import { generateLFM, generateUnitPas } from '../src/utils/pascalGenerator';
import type { LComponent, LForm } from '../src/types/lazarus';

console.log('--- TEST 1: COMPONENT_DEFINITIONS tem TImageList ---');
const def = COMPONENT_DEFINITIONS.TImageList;
assert.ok(def, 'TImageList deve existir no COMPONENT_DEFINITIONS');
assert.equal(def.category, 'Common Controls');
assert.equal(def.type, 'TImageList');
assert.equal(def.isNonVisual, true);
assert.equal(def.iconName, 'Images');

console.log('--- TEST 2: LFM e Pascal Unit generation para TImageList ---');
const imgList: LComponent = {
  id: 'il1',
  type: 'TImageList',
  name: 'ImageList1',
  left: 30,
  top: 40,
  width: 36,
  height: 36,
  enabled: true,
  visible: true,
  imageWidth: 24,
  imageHeight: 24,
  imagesList: ['data:image/png;base64,AAA', 'data:image/png;base64,BBB'],
  events: {},
  eventCode: {}
};

const btn: LComponent = {
  id: 'btn1',
  type: 'TButton',
  name: 'Button1',
  caption: 'Salvar',
  left: 100,
  top: 100,
  width: 90,
  height: 30,
  enabled: true,
  visible: true,
  images: 'ImageList1',
  imageIndex: 0,
  events: {},
  eventCode: {}
};

const form = {
  id: 'form1',
  name: 'Form1',
  caption: 'Form1',
  left: 0,
  top: 0,
  width: 600,
  height: 400,
  color: '#ffffff',
  fontFamily: 'Inter',
  fontSize: 12,
  components: [imgList, btn],
  events: {},
  eventCode: {}
} as unknown as LForm;

const lfm = generateLFM(form);
assert.ok(lfm.includes('object ImageList1: TImageList'), 'LFM deve declarar ImageList1: TImageList');
assert.ok(lfm.includes('Width = 24'), 'LFM deve ter Width = 24');
assert.ok(lfm.includes('Height = 24'), 'LFM deve ter Height = 24');
assert.ok(lfm.includes('AllocBy = 4'), 'LFM deve ter AllocBy = 4');
assert.ok(lfm.includes('Images = ImageList1'), 'Button deve ter Images = ImageList1');
assert.ok(lfm.includes('ImageIndex = 0'), 'Button deve ter ImageIndex = 0');

const pas = generateUnitPas(form);
assert.ok(pas.includes('ImageList1: TImageList;'), 'Declaração da variável ImageList1: TImageList na classe');
assert.ok(pas.includes('ImgList'), 'ImgList deve estar no uses');

console.log('✓ Todos os testes de TImageList passaram com sucesso!');
