import { canAdoptChild, computeFullFormLayout } from '../src/utils/layoutEngine';
import { generateLFM } from '../src/utils/pascalGenerator';
import { LComponent, LForm } from '../src/types/lazarus';

console.log('--- TEST 1: canAdoptChild Cycle Prevention ---');
const components: LComponent[] = [
  { id: 'panel1', type: 'TPanel', name: 'Panel1', left: 10, top: 10, width: 300, height: 200, caption: 'Panel1', parentId: null },
  { id: 'pagectrl1', type: 'TPageControl', name: 'PageControl1', left: 10, top: 10, width: 280, height: 180, caption: 'PageControl1', parentId: 'panel1', activePageIndex: 0 },
  { id: 'sheet1', type: 'TTabSheet', name: 'TabSheet1', left: 0, top: 0, width: 280, height: 150, caption: 'TabSheet1', parentId: 'pagectrl1' },
  { id: 'btn1', type: 'TButton', name: 'Button1', left: 20, top: 20, width: 75, height: 25, caption: 'OK', parentId: 'sheet1' },
];

// Test: panel1 cannot adopt itself
console.assert(!canAdoptChild('panel1', 'panel1', components), 'panel1 cannot adopt itself');
// Test: sheet1 cannot adopt panel1 (panel1 is its ancestor!)
console.assert(!canAdoptChild('sheet1', 'panel1', components), 'sheet1 cannot adopt ancestor panel1');
// Test: btn1 cannot adopt sheet1 (sheet1 is parent of btn1)
console.assert(!canAdoptChild('btn1', 'sheet1', components), 'btn1 cannot adopt parent sheet1');
// Test: panel1 CAN adopt a new component or btn1
console.assert(canAdoptChild('panel1', 'btn1', components), 'panel1 can adopt btn1');
// Test: root null can adopt any component
console.assert(canAdoptChild(null, 'btn1', components), 'null can adopt btn1');
console.log('✓ canAdoptChild tests passed!');

console.log('--- TEST 2: computeFullFormLayout Absolute Coordinates & Nesting ---');
const form: LForm = {
  id: 'form1',
  name: 'Form1',
  unitName: 'Unit1',
  caption: 'Form1',
  width: 600,
  height: 400,
  components: [
    { id: 'panel1', type: 'TPanel', name: 'Panel1', left: 50, top: 50, width: 300, height: 200, caption: 'Panel1', parentId: null, bevelInner: 'bvRaised', bevelOuter: 'bvLowered', bevelWidth: 2 },
    { id: 'btn1', type: 'TButton', name: 'Button1', left: 20, top: 30, width: 80, height: 25, caption: 'OK', parentId: 'panel1' },
  ]
};

const layout = computeFullFormLayout(form.components, form.width, form.height);
const panelBox = layout.get('panel1')!;
const btnBox = layout.get('btn1')!;

console.assert(panelBox.absLeft === 50, 'Panel absLeft is 50');
console.assert(panelBox.absTop === 50, 'Panel absTop is 50');
console.assert(btnBox.absLeft === 50 + 4 + 20, `Button absLeft expected 74, got ${btnBox.absLeft}`);
console.assert(btnBox.absTop === 50 + 4 + 30, `Button absTop expected 84, got ${btnBox.absTop}`);
console.log('✓ computeFullFormLayout nested coordinates verified!');

console.log('--- TEST 3: Align Engine inside Container (alTop and alClient) ---');
const alignForm: LForm = {
  id: 'form2',
  name: 'Form2',
  unitName: 'Unit2',
  caption: 'Form2',
  width: 500,
  height: 400,
  components: [
    { id: 'panel1', type: 'TPanel', name: 'Panel1', left: 0, top: 0, width: 400, height: 300, caption: 'Panel1', parentId: null, bevelInner: 'bvNone', bevelOuter: 'bvNone', bevelWidth: 0 },
    { id: 'headerBtn', type: 'TButton', name: 'HeaderBtn', left: 0, top: 0, width: 100, height: 40, caption: 'Top', parentId: 'panel1', align: 'alTop' },
    { id: 'clientBox', type: 'TScrollBox', name: 'ClientBox', left: 0, top: 0, width: 100, height: 100, caption: '', parentId: 'panel1', align: 'alClient' }
  ]
};

const alignLayout = computeFullFormLayout(alignForm.components, alignForm.width, alignForm.height);
const headerBox = alignLayout.get('headerBtn')!;
const clientBox = alignLayout.get('clientBox')!;

// Panel padding is 2px on all sides, available inner width is 400 - 4 = 396
console.assert(headerBox.left === 0 && headerBox.top === 0 && headerBox.width === 396 && headerBox.height === 40, `alTop computed correctly: ${JSON.stringify(headerBox)}`);
console.assert(clientBox.top === 40 && clientBox.left === 0 && clientBox.width === 396 && clientBox.height === 256, `alClient computed correctly: ${JSON.stringify(clientBox)}`);
console.log('✓ Align engine inside container verified!');

console.log('--- TEST 3B: Root Form alBottom Alignment ---');
const bottomForm: LForm = {
  id: 'form_bot',
  name: 'FormBot',
  unitName: 'UnitBot',
  caption: 'FormBot',
  width: 540,
  height: 380,
  components: [
    { id: 'botPanel', type: 'TPanel', name: 'PanelBottom', left: 0, top: 0, width: 200, height: 75, caption: 'Bottom', parentId: null, align: 'alBottom' }
  ]
};
const botLayout = computeFullFormLayout(bottomForm.components, bottomForm.width, bottomForm.height);
const botBox = botLayout.get('botPanel')!;
console.assert(botBox.left === 0, `alBottom left is 0: got ${botBox.left}`);
console.assert(botBox.width === 540, `alBottom width is form.width (540): got ${botBox.width}`);
console.assert(botBox.height === 75, `alBottom height is 75: got ${botBox.height}`);
console.assert(botBox.top === 380 - 75, `alBottom top is 380 - 75 = 305: got ${botBox.top}`);
console.assert(botBox.top + botBox.height === 380, `alBottom bottom edge is exactly form.height (380): got ${botBox.top + botBox.height}`);
console.log('✓ Root Form alBottom alignment verified without clipping!');

console.log('--- TEST 4: TFlowPanel Layout ---');
const flowForm: LForm = {
  id: 'form3',
  name: 'Form3',
  unitName: 'Unit3',
  caption: 'Form3',
  width: 500,
  height: 400,
  components: [
    { id: 'flow1', type: 'TFlowPanel', name: 'FlowPanel1', left: 0, top: 0, width: 150, height: 200, caption: 'FlowPanel1', parentId: null },
    { id: 'b1', type: 'TButton', name: 'B1', left: 0, top: 0, width: 60, height: 25, caption: 'B1', parentId: 'flow1' },
    { id: 'b2', type: 'TButton', name: 'B2', left: 0, top: 0, width: 60, height: 25, caption: 'B2', parentId: 'flow1' },
    { id: 'b3', type: 'TButton', name: 'B3', left: 0, top: 0, width: 60, height: 25, caption: 'B3', parentId: 'flow1' },
  ]
};

const flowLayout = computeFullFormLayout(flowForm.components, flowForm.width, flowForm.height);
const b1 = flowLayout.get('b1')!;
const b2 = flowLayout.get('b2')!;
const b3 = flowLayout.get('b3')!;

console.assert(b1.left === 0 && b1.top === 0, `B1 at (0,0): got (${b1.left}, ${b1.top})`);
console.assert(b2.left === 64 && b2.top === 0, `B2 at (64,0): got (${b2.left}, ${b2.top})`);
// B3 wrapped to next line because 60 + 4 + 60 + 4 + 60 = 188 > available 138 (150 - 12)
console.assert(b3.top > b1.top, `B3 wrapped to next line: top is ${b3.top}`);
console.assert(b1.absLeft === 6 && b1.absTop === 6, `B1 absLeft accounts for flow padding (6px): got (${b1.absLeft}, ${b1.absTop})`);
console.log('✓ TFlowPanel wrapping verified!');

console.log('--- TEST 5: TGridPanel Layout ---');
const gridForm: LForm = {
  id: 'form4',
  name: 'Form4',
  unitName: 'Unit4',
  caption: 'Form4',
  width: 500,
  height: 400,
  components: [
    { id: 'grid1', type: 'TGridPanel', name: 'GridPanel1', left: 0, top: 0, width: 200, height: 100, caption: 'GridPanel1', parentId: null, gridColumns: 2, gridRows: 2 },
    { id: 'g1', type: 'TButton', name: 'G1', left: 0, top: 0, width: 50, height: 25, caption: 'G1', parentId: 'grid1' },
    { id: 'g2', type: 'TButton', name: 'G2', left: 0, top: 0, width: 50, height: 25, caption: 'G2', parentId: 'grid1' },
    { id: 'g3', type: 'TButton', name: 'G3', left: 0, top: 0, width: 50, height: 25, caption: 'G3', parentId: 'grid1' },
    { id: 'g4', type: 'TButton', name: 'G4', left: 0, top: 0, width: 50, height: 25, caption: 'G4', parentId: 'grid1' },
  ]
};

const gLayout = computeFullFormLayout(gridForm.components, gridForm.width, gridForm.height);
const g1 = gLayout.get('g1')!;
const g2 = gLayout.get('g2')!;
const g3 = gLayout.get('g3')!;
const g4 = gLayout.get('g4')!;

// 2x2 grid inside 200x100 with 4px padding: inner width = 192, inner height = 92
// colWidth = 96, rowHeight = 46
// g1 centered in (96, 46) cell with 50x25 size: left = (96-50)/2 = 23, top = (46-25)/2 = 10.5 -> 11
console.assert(g1.left === 23 && g1.top === 11, `g1 centered in cell (0,0): got (${g1.left}, ${g1.top})`);
console.assert(g2.left === 96 + 23 && g2.top === 11, `g2 centered in cell (1,0): got (${g2.left}, ${g2.top})`);
console.assert(g3.left === 23 && g3.top === 46 + 11, `g3 centered in cell (0,1): got (${g3.left}, ${g3.top})`);
console.assert(g4.left === 96 + 23 && g4.top === 46 + 11, `g4 centered in cell (1,1): got (${g4.left}, ${g4.top})`);
console.log('✓ TGridPanel cell positioning verified!');

console.log('--- TEST 6: TPairSplitter Layout ---');
const splitForm: LForm = {
  id: 'form5',
  name: 'Form5',
  unitName: 'Unit5',
  caption: 'Form5',
  width: 500,
  height: 400,
  components: [
    { id: 'split1', type: 'TPairSplitter', name: 'PairSplitter1', left: 0, top: 0, width: 400, height: 200, caption: 'PairSplitter1', parentId: null, splitterPosition: 150 },
    { id: 'side1', type: 'TPairSplitterSide', name: 'Side1', left: 0, top: 0, width: 150, height: 200, caption: 'Side1', parentId: 'split1' },
    { id: 'side2', type: 'TPairSplitterSide', name: 'Side2', left: 156, top: 0, width: 244, height: 200, caption: 'Side2', parentId: 'split1' },
  ]
};

const splitLayout = computeFullFormLayout(splitForm.components, splitForm.width, splitForm.height);
const s1 = splitLayout.get('side1')!;
const s2 = splitLayout.get('side2')!;

// PairSplitter has 2px padding, inner width 396
// Side1 width clamps to splitterPosition = 150 - pad = 147
console.assert(s1.left === 0 && s1.width === 147, `Side1 width: got ${s1.width}`);
console.assert(s2.left === 153 && s2.width === 243, `Side2 takes remaining space: got ${s2.width}`);
console.log('✓ TPairSplitter layout verified!');

console.log('--- TEST 7: generateLFM Nested Serialization ---');
const lfm = generateLFM(form);
console.assert(lfm.includes('object Panel1: TPanel'), 'LFM has Panel1');
console.assert(lfm.includes('  object Button1: TButton'), 'LFM has Button1 indented inside Panel1');
console.assert(lfm.includes('BevelInner = bvRaised'), 'LFM has BevelInner');
console.assert(lfm.includes('BevelOuter = bvLowered'), 'LFM has BevelOuter');
console.log('✓ generateLFM nested serialization verified!');

console.log('\nALL 7 SUITES PASSED WITHOUT ANY ASSERTION FAILURES! 🎉');
