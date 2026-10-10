import assert from 'assert';
import { generateLPG, generateLFM, generateUnitPas } from '../src/utils/pascalGenerator';
import { COMPONENT_DEFINITIONS } from '../src/data/componentRegistry';
import type { LProjectGroup, LForm } from '../src/types/lazarus';

console.log('--- TEST 1: COMPONENT_DEFINITIONS contains TScrollBox and TZTransaction ---');
assert(COMPONENT_DEFINITIONS['TScrollBox'], 'TScrollBox must be in component registry');
assert(COMPONENT_DEFINITIONS['TZTransaction'], 'TZTransaction must be in component registry');
assert.strictEqual(COMPONENT_DEFINITIONS['TZTransaction'].category, 'Zeos / Firebird');
console.log('✓ Component definitions verified!');

console.log('--- TEST 2: generateLPG Project Group Serialization ---');
const sampleGroup: LProjectGroup = {
  id: 'group_test',
  name: 'ProjectGroup1',
  fileName: 'ProjectGroup1.lpg',
  projects: [
    {
      id: 'proj_1',
      name: 'Project1',
      fileName: 'Project1.lpi',
      lprFileName: 'Project1.lpr',
      forms: [],
      pureUnits: [],
      activeFormId: 'form1'
    },
    {
      id: 'proj_2',
      name: 'Project2',
      fileName: 'Project2.lpi',
      lprFileName: 'Project2.lpr',
      forms: [],
      pureUnits: [],
      activeFormId: 'form2'
    }
  ],
  activeProjectId: 'proj_2'
};

const lpgXml = generateLPG(sampleGroup);
assert(lpgXml.includes('<ProjectGroup Version="2">'), 'LPG must contain ProjectGroup Version="2"');
assert(lpgXml.includes('<Group Count="2">'), 'LPG must include Group Count="2"');
assert(lpgXml.includes('<Item0 Path="Project1.lpi"/>'), 'LPG must include Item0');
assert(lpgXml.includes('<Item1 Path="Project2.lpi"/>'), 'LPG must include Item1');
assert(lpgXml.includes('<ActiveTarget Project="Project2.lpi"/>'), 'LPG must set active target project');
console.log('✓ generateLPG verified!');

console.log('--- TEST 3: TZTransaction and TImage in LFM ---');
const testForm: LForm = {
  id: 'form1',
  name: 'Form1',
  caption: 'Form1',
  left: 0,
  top: 0,
  width: 600,
  height: 400,
  events: {},
  eventCode: {},
  components: [
    {
      id: 'img1',
      type: 'TImage',
      name: 'Image1',
      left: 10,
      top: 10,
      width: 100,
      height: 100,
      stretch: true,
      proportional: true,
      center: true,
      enabled: true,
      visible: true,
      events: {},
      eventCode: {}
    },
    {
      id: 'tran1',
      type: 'TZTransaction',
      name: 'ZTransaction1',
      left: 120,
      top: 10,
      width: 36,
      height: 36,
      connectionName: 'ZConnection1',
      autoCommit: false,
      transactIsolationLevel: 'tiReadCommitted',
      active: true,
      isNonVisual: true,
      enabled: true,
      visible: true,
      events: {},
      eventCode: {}
    },
    {
      id: 'qry1',
      type: 'TZQuery',
      name: 'ZQuery1',
      left: 160,
      top: 10,
      width: 36,
      height: 36,
      connectionName: 'ZConnection1',
      transactionName: 'ZTransaction1',
      sql: 'SELECT * FROM CLIENTES',
      active: true,
      isNonVisual: true,
      enabled: true,
      visible: true,
      events: {},
      eventCode: {}
    }
  ]
};

const lfm = generateLFM(testForm);
assert(lfm.includes('Stretch = True'), 'TImage Stretch must be serialized');
assert(lfm.includes('Proportional = True'), 'TImage Proportional must be serialized');
assert(lfm.includes('Center = True'), 'TImage Center must be serialized');
assert(lfm.includes('object ZTransaction1: TZTransaction'), 'TZTransaction must be in LFM');
assert(lfm.includes('Connection = ZConnection1'), 'ZTransaction connection must be serialized');
assert(lfm.includes('AutoCommit = False'), 'ZTransaction autoCommit must be serialized');
assert(lfm.includes('TransactIsolationLevel = tiReadCommitted'), 'ZTransaction isolation must be serialized');
assert(lfm.includes('Transaction = ZTransaction1'), 'ZQuery transaction reference must be serialized');
console.log('✓ LFM serialization for TImage and TZTransaction verified!');

console.log('--- TEST 4: generateUnitPas uses ZTransaction ---');
const pas = generateUnitPas(testForm);
assert(pas.includes('ZTransaction'), 'generateUnitPas must include ZTransaction in extraUses');
assert(pas.includes('ZTransaction1: TZTransaction;'), 'generateUnitPas must declare ZTransaction1');
console.log('✓ generateUnitPas verified!');

console.log('\nALL 4 NEW FEATURE SUITES PASSED! 🎉');
