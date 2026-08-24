import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { composeWeather, describeWeatherCode, FALLBACK_LOCATION } from './weather.mjs';

describe('weather', () => {
  it('maps WMO overcast', () => {
    assert.deepEqual(describeWeatherCode(3), { label: 'Overcast', icon: 'cloud' });
  });

  it('keeps the sky label separate from the city', () => {
    const composed = composeWeather(
      { label: 'Overcast', icon: 'cloud', temperature: 91 },
      FALLBACK_LOCATION,
    );
    assert.equal(composed.label, 'Overcast');
    assert.equal(composed.place, 'Florence, SC');
    assert.equal(composed.latitude, 34.19);
  });
});
