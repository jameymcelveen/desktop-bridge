import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  expectedCheckDigit,
  formatSweepText,
  modelYearFromVin,
  rememberSweep,
  specFromDecode,
  topComplaintComponents,
  validateVin,
} from './public/lib/vin.js';

describe('validateVin', () => {
  it('accepts a checksum-valid VIN and reads the model year', () => {
    const honda = validateVin('1hgcm82633a004352');
    assert.equal(honda.ok, true);
    assert.equal(honda.vin, '1HGCM82633A004352');
    assert.equal(honda.year, 2003);
    assert.equal(expectedCheckDigit('1HGCM82633A004352'), '3');
  });

  it('reports length, I/O/Q, and a bad check digit', () => {
    assert.match(validateVin('1HG').errors[0], /17 characters/);
    assert.match(validateVin('1HGCM82633A00435I').errors.join(' '), /I, O, and Q/);
    const bad = validateVin('1HGCM82630A004352');
    assert.equal(bad.ok, false);
    assert.match(bad.errors.join(' '), /Check digit/);
  });
});

describe('modelYearFromVin', () => {
  it('uses position 7 to pick the 1980 or 2010 cycle', () => {
    assert.equal(modelYearFromVin('1HGCM82633A004352'), 2003);
    assert.equal(modelYearFromVin('1FTFW1E50KFA00000'.slice(0, 10) + 'XXXXXXX'), 2019);
  });
});

describe('spec and complaints', () => {
  it('maps a vPIC result and groups complaint components', () => {
    const spec = specFromDecode({
      Results: [
        {
          Make: 'HONDA',
          Model: 'Accord',
          ModelYear: '2003',
          Trim: 'EX-V6',
          BodyClass: 'Coupe',
          DriveType: '',
          EngineCylinders: '6',
          DisplacementL: '2.998832712',
          FuelTypePrimary: 'Gasoline',
          PlantCity: 'MARYSVILLE',
          PlantCountry: 'UNITED STATES (USA)',
        },
      ],
    });
    assert.equal(spec.displacement, '3.0L');
    assert.equal(spec.plantCity, 'Marysville');
    const top = topComplaintComponents([
      { components: 'AIR BAGS' },
      { components: 'POWER TRAIN' },
      { components: 'AIR BAGS' },
      { components: 'STEERING' },
      { components: 'POWER TRAIN' },
      { components: 'POWER TRAIN' },
    ]);
    assert.deepEqual(
      top.map((row) => `${row.name}:${row.count}`),
      ['POWER TRAIN:3', 'AIR BAGS:2', 'STEERING:1'],
    );
  });

  it('rejects a decode with no make', () => {
    assert.throws(() => specFromDecode({ Results: [{ Make: '', ErrorText: 'Invalid VIN' }] }), /Invalid VIN/);
  });
});

describe('rememberSweep', () => {
  it('keeps the last 10 VINs and a copy block', () => {
    let state = { history: [], taps: {} };
    for (let i = 0; i < 12; i += 1) {
      state = rememberSweep(state, { vin: `VIN${i}`, year: '2020', make: 'FORD', model: 'F-150' });
    }
    assert.equal(state.history.length, 10);
    assert.equal(state.history[0].vin, 'VIN11');
    const text = formatSweepText({
      vin: '1HGCM82633A004352',
      spec: { year: '2003', make: 'HONDA', model: 'Accord', trim: 'EX-V6', drive: '', body: 'Coupe', cylinders: '6', displacement: '3.0L', fuel: 'Gasoline', plantCity: 'Marysville', plantCountry: 'USA' },
      recalls: [],
      complaints: [{ components: 'AIR BAGS' }],
      taps: { nicb: true, fl: false, iseecars: false },
    });
    assert.match(text, /no open recalls/);
    assert.match(text, /\[x\] NICB VINCheck/);
    assert.match(text, /AIR BAGS \(1\)/);
  });
});
