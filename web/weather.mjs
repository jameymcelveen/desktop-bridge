const WMO = {
  0: { label: 'Clear', icon: 'sun' },
  1: { label: 'Mostly clear', icon: 'sun' },
  2: { label: 'Partly cloudy', icon: 'cloud-sun' },
  3: { label: 'Overcast', icon: 'cloud' },
  45: { label: 'Fog', icon: 'fog' },
  48: { label: 'Icy fog', icon: 'fog' },
  51: { label: 'Light drizzle', icon: 'rain' },
  53: { label: 'Drizzle', icon: 'rain' },
  55: { label: 'Heavy drizzle', icon: 'rain' },
  61: { label: 'Light rain', icon: 'rain' },
  63: { label: 'Rain', icon: 'rain' },
  65: { label: 'Heavy rain', icon: 'rain' },
  71: { label: 'Light snow', icon: 'snow' },
  73: { label: 'Snow', icon: 'snow' },
  75: { label: 'Heavy snow', icon: 'snow' },
  80: { label: 'Showers', icon: 'rain' },
  81: { label: 'Showers', icon: 'rain' },
  82: { label: 'Heavy showers', icon: 'rain' },
  95: { label: 'Thunderstorm', icon: 'storm' },
  96: { label: 'Storm + hail', icon: 'storm' },
  99: { label: 'Storm + hail', icon: 'storm' },
};

/** Home turf when IP geo has nothing useful. */
export const FALLBACK_LOCATION = {
  latitude: 34.19,
  longitude: -79.76,
  label: 'Florence, SC',
};

export function describeWeatherCode(code) {
  return WMO[code] ?? { label: 'Unknown', icon: 'cloud' };
}

function placeLabel(...parts) {
  return parts.filter(Boolean).join(', ');
}

function isPublicIp(ip) {
  if (!ip || ip === 'unknown') {
    return false;
  }
  const v4 = ip.startsWith('::ffff:') ? ip.slice(7) : ip;
  if (v4 === '127.0.0.1' || v4 === '::1') {
    return false;
  }
  if (
    v4.startsWith('10.') ||
    v4.startsWith('192.168.') ||
    v4.startsWith('169.254.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(v4)
  ) {
    return false;
  }
  return true;
}

export async function locateByIp(ip, fetcher = fetch) {
  const locators = [];
  if (isPublicIp(ip)) {
    const trimmed = ip.startsWith('::ffff:') ? ip.slice(7) : ip;
    locators.push(async () => {
      const res = await fetcher(`https://ipwho.is/${encodeURIComponent(trimmed)}`, {
        signal: AbortSignal.timeout(4000),
      });
      if (!res.ok) {
        throw new Error(`ipwho.is ${res.status}`);
      }
      const data = await res.json();
      if (!data?.success || typeof data.latitude !== 'number') {
        throw new Error('ipwho.is empty');
      }
      return {
        latitude: data.latitude,
        longitude: data.longitude,
        label: placeLabel(data.city, data.region_code ?? data.region) || 'Current location',
      };
    });
  }
  locators.push(async () => {
    const res = await fetcher('https://ipwho.is/', { signal: AbortSignal.timeout(4000) });
    if (!res.ok) {
      throw new Error(`ipwho.is ${res.status}`);
    }
    const data = await res.json();
    if (!data?.success || typeof data.latitude !== 'number') {
      throw new Error('ipwho.is empty');
    }
    return {
      latitude: data.latitude,
      longitude: data.longitude,
      label: placeLabel(data.city, data.region_code ?? data.region) || 'Current location',
    };
  });

  const errors = [];
  for (const locate of locators) {
    try {
      return await locate();
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }
  throw new Error(`IP geolocation failed (${errors.join('; ')})`);
}

export async function fetchForecast({ latitude, longitude }, fetcher = fetch) {
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set(
    'current',
    'temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m,apparent_temperature',
  );
  url.searchParams.set('daily', 'weather_code,temperature_2m_max,temperature_2m_min');
  url.searchParams.set('timezone', 'auto');
  url.searchParams.set('forecast_days', '1');
  url.searchParams.set('temperature_unit', 'fahrenheit');
  url.searchParams.set('wind_speed_unit', 'mph');
  const res = await fetcher(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) {
    throw new Error(`Weather fetch failed (${res.status})`);
  }
  const data = await res.json();
  const code = data.current?.weather_code;
  const described = describeWeatherCode(code);
  return {
    temperature: data.current?.temperature_2m,
    apparent: data.current?.apparent_temperature,
    humidity: data.current?.relative_humidity_2m,
    wind: data.current?.wind_speed_10m,
    high: data.daily?.temperature_2m_max?.[0],
    low: data.daily?.temperature_2m_min?.[0],
    code,
    ...described,
    units: {
      temperature: data.current_units?.temperature_2m ?? '°F',
      wind: data.current_units?.wind_speed_10m ?? 'mph',
    },
  };
}

export function composeWeather(forecast, location) {
  return {
    ...forecast,
    latitude: location.latitude,
    longitude: location.longitude,
    place: location.label,
  };
}

export async function getWeather(
  { ip, latitude, longitude, label } = {},
  fetcher = fetch,
) {
  let lat = latitude;
  let lon = longitude;
  let place = label;
  if (lat == null || lon == null) {
    try {
      const located = await locateByIp(ip, fetcher);
      lat = located.latitude;
      lon = located.longitude;
      place = place || located.label;
    } catch {
      lat = FALLBACK_LOCATION.latitude;
      lon = FALLBACK_LOCATION.longitude;
      place = place || FALLBACK_LOCATION.label;
    }
  }
  const forecast = await fetchForecast({ latitude: lat, longitude: lon }, fetcher);
  return composeWeather(forecast, { latitude: lat, longitude: lon, label: place || FALLBACK_LOCATION.label });
}
