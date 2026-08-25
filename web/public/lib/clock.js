export function greeting(name) {
  const hour = new Date().getHours();
  const when = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return name ? `${when}, ${name}` : when;
}

export function clockParts(now = new Date()) {
  return {
    time: new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(now),
    date: new Intl.DateTimeFormat(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    }).format(now),
  };
}
