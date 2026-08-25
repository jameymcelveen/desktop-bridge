const LETTERS = {
  A: 1,
  B: 2,
  C: 3,
  D: 4,
  E: 5,
  F: 6,
  G: 7,
  H: 8,
  J: 1,
  K: 2,
  L: 3,
  M: 4,
  N: 5,
  P: 7,
  R: 9,
  S: 2,
  T: 3,
  U: 4,
  V: 5,
  W: 6,
  X: 7,
  Y: 8,
  Z: 9,
};

const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

/** Position-10 year codes, 30-year cycle starting 1980 / 2010. Skips I, O, Q, U, Z. */
const YEAR_CODES = 'ABCDEFGHJKLMNPRSTVWXY123456789';

export const STORAGE_KEY = 'jm-vin-sweep-v1';

export const TAPS = [
  {
    id: 'nicb',
    label: 'NICB VINCheck',
    href: () => 'https://www.nicb.org/vincheck',
    hint: 'theft/salvage db; any hit = walk',
  },
  {
    id: 'fl',
    label: 'FL Title Check',
    href: () => 'https://services.flhsmv.gov/MVCheckWeb/',
    hint: 'look for brands: Rebuilt/Salvage/Flood = walk; lien listed = need lien release',
  },
  {
    id: 'iseecars',
    label: 'iSeeCars report',
    href: (vin) => `https://www.iseecars.com/vin/${encodeURIComponent(vin)}`,
    hint: 'price + days-on-lot leverage',
  },
];

export function normalizeVin(raw) {
  return String(raw || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

export function expectedCheckDigit(vin) {
  const chars = normalizeVin(vin);
  if (chars.length !== 17) {
    return null;
  }
  let sum = 0;
  for (let i = 0; i < 17; i += 1) {
    const ch = chars[i];
    const value = /[0-9]/.test(ch) ? Number(ch) : LETTERS[ch];
    if (value === undefined) {
      return null;
    }
    sum += value * WEIGHTS[i];
  }
  const mod = sum % 11;
  return mod === 10 ? 'X' : String(mod);
}

/**
 * Live model-year hint from positions 7 and 10.
 * Position 7 letter => 2010+ cycle; digit => 1980–2009.
 */
export function modelYearFromVin(raw) {
  const vin = normalizeVin(raw);
  if (vin.length < 10) {
    return null;
  }
  const code = vin[9];
  const idx = YEAR_CODES.indexOf(code);
  if (idx < 0) {
    return null;
  }
  const newer = /[A-Z]/.test(vin[6]);
  return (newer ? 2010 : 1980) + idx;
}

export function validateVin(raw) {
  const vin = normalizeVin(raw);
  const errors = [];
  if (vin.length !== 17) {
    errors.push(`VIN must be 17 characters (${vin.length} entered)`);
  }
  const forbidden = [...vin].filter((ch) => 'IOQ'.includes(ch));
  if (forbidden.length) {
    errors.push('I, O, and Q are not used in VINs');
  }
  if (vin.length === 17 && !forbidden.length) {
    const expected = expectedCheckDigit(vin);
    if (expected && vin[8] !== expected) {
      errors.push(`Check digit (position 9) should be ${expected}, not ${vin[8]}`);
    }
  }
  return { vin, ok: errors.length === 0, errors, year: modelYearFromVin(vin) };
}

export function blank(value) {
  const text = String(value ?? '').trim();
  if (!text || /^not applicable$/i.test(text) || text === '0') {
    return '';
  }
  return text;
}

export function formatLiters(value) {
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n) || n <= 0) {
    return '';
  }
  return `${n.toFixed(1)}L`;
}

export function specFromDecode(data) {
  const row = data?.Results?.[0] ?? data?.results?.[0];
  if (!row) {
    throw new Error('NHTSA decode returned no results');
  }
  const make = blank(row.Make);
  if (!make) {
    throw new Error(blank(row.ErrorText) || 'NHTSA decode unreachable — retry');
  }
  return {
    year: blank(row.ModelYear),
    make,
    model: blank(row.Model),
    trim: blank(row.Trim),
    body: blank(row.BodyClass),
    drive: blank(row.DriveType),
    cylinders: blank(row.EngineCylinders),
    displacement: formatLiters(row.DisplacementL),
    fuel: blank(row.FuelTypePrimary),
    plantCity: titleCase(blank(row.PlantCity)),
    plantCountry: blank(row.PlantCountry),
  };
}

export function titleCase(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\b([a-z])/g, (ch) => ch.toUpperCase());
}

export function shortSummary(text, max = 160) {
  const t = String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!t) {
    return '';
  }
  const sentence = t.split(/(?<=\.)\s/)[0] || t;
  if (sentence.length <= max) {
    return sentence;
  }
  return `${sentence.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
}

export function recallRows(data) {
  return Array.isArray(data?.results) ? data.results : Array.isArray(data?.Results) ? data.Results : [];
}

export function complaintRows(data) {
  return Array.isArray(data?.results) ? data.results : Array.isArray(data?.Results) ? data.Results : [];
}

export function topComplaintComponents(rows, n = 3) {
  const counts = new Map();
  for (const row of rows) {
    const key = String(row.components || row.Component || 'Unspecified').trim() || 'Unspecified';
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([name, count]) => ({ name, count }));
}

export function emptyState() {
  return { history: [], taps: {} };
}

export function loadState(storage) {
  try {
    const raw = storage?.getItem?.(STORAGE_KEY);
    if (!raw) {
      return emptyState();
    }
    const parsed = JSON.parse(raw);
    return {
      history: Array.isArray(parsed.history) ? parsed.history.slice(0, 10) : [],
      taps: parsed.taps && typeof parsed.taps === 'object' ? parsed.taps : {},
    };
  } catch {
    return emptyState();
  }
}

export function saveState(storage, state) {
  storage?.setItem?.(STORAGE_KEY, JSON.stringify(state));
}

export function rememberSweep(state, entry) {
  const history = [entry, ...(state.history || []).filter((row) => row.vin !== entry.vin)].slice(0, 10);
  const taps = {};
  for (const row of history) {
    taps[row.vin] = state.taps?.[row.vin] || { nicb: false, fl: false, iseecars: false };
  }
  return { history, taps };
}

export function setTap(state, vin, id, checked) {
  const current = state.taps?.[vin] || { nicb: false, fl: false, iseecars: false };
  return {
    ...state,
    taps: { ...state.taps, [vin]: { ...current, [id]: checked } },
  };
}

export function formatSweepText({ vin, spec, recalls, complaints, taps }) {
  const lines = [`VIN ${vin}`];
  if (spec) {
    lines.push(`${spec.year} ${spec.make} ${spec.model}${spec.trim ? ` ${spec.trim}` : ''}`.replace(/\s+/g, ' ').trim());
    const bits = [spec.drive, spec.body, [spec.cylinders && `${spec.cylinders}cyl`, spec.displacement].filter(Boolean).join(' '), spec.fuel].filter(
      Boolean,
    );
    if (bits.length) {
      lines.push(bits.join(' · '));
    }
    const plant = [spec.plantCity, spec.plantCountry].filter(Boolean).join(', ');
    if (plant) {
      lines.push(`Plant: ${plant}`);
    }
  }
  if (recalls) {
    if (!recalls.length) {
      lines.push('', 'Recalls: no open recalls');
    } else {
      lines.push('', `Recalls (${recalls.length})`);
      for (const row of recalls) {
        lines.push(`- ${row.Component || 'Unknown'} — ${shortSummary(row.Summary)}`);
      }
    }
  }
  if (complaints) {
    const top = topComplaintComponents(complaints);
    const total = complaints.length;
    lines.push('', `Complaints (${total})${top.length ? ` top: ${top.map((c) => `${c.name} (${c.count})`).join(', ')}` : ''}`);
  }
  if (taps) {
    lines.push('', 'Taps:');
    for (const tap of TAPS) {
      lines.push(`- [${taps[tap.id] ? 'x' : ' '}] ${tap.label}`);
    }
  }
  return lines.join('\n');
}
