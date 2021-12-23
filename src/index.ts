addEventListener('scheduled', (event) => {
  event.waitUntil(handleSchedule(event.scheduledTime));
});

function sendMessage(chat_id: string, text: string, options: any = {}) {
  return fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(Object.assign(options, { chat_id, text }))
  }).then((res) => {
    if (!res.ok) {
      throw new Error('Failed to send message, status=' + res.status + ' ' + res.statusText);
    }
  });
}

function fetchWithTimeout(url: string, timeout = 3000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  return fetch(url, { signal: controller.signal })
    .catch((err) => {
      if (err instanceof DOMException) {
        return { ok: false, status: 408, statusText: 'Request Timeout' };
      } else throw err;
    })
    .finally(() => clearTimeout(id));
}

// Send to channel
function broadcast(text: string, options?: any) {
  return sendMessage(CHANNEL_ID, text, options);
}

function plural(n: number, word: string) {
  return n + ' ' + (n > 1 ? word + 's' : word);
}

// https://stackoverflow.com/a/11486026/4111143
function fancyTimeFormat(duration: number) {
  // Hours, minutes and seconds
  const hrs = ~~(duration / 3600);
  const mins = ~~((duration % 3600) / 60);
  const secs = ~~duration % 60;

  if (hrs > 0) {
    return plural(hrs, 'hour') + (mins ? ' and ' + plural(mins, 'minute') : '');
  }

  if (mins > 0) {
    return plural(mins, 'minute') + (secs ? ' and ' + plural(secs, 'second') : '');
  }

  return plural(secs, 'second');
}

async function getText(date: number, key: string, response: Pick<Response, 'ok' | 'status' | 'statusText'>) {
  const prev = await kv.get(key);

  if (response.ok) {
    if (!prev) {
      return null;
    }

    await kv.delete(key);

    const downtime = fancyTimeFormat((date - parseInt(prev)) / 1000);
    return `✅ ${key} is up. It was down for ${downtime}`;
  }

  // Still down no need to remind it.
  if (prev) {
    return null;
  }

  await kv.put(key, String(date));

  return `⚠️ ${key} is down: ${response.statusText} (${response.status})`;
}

const targets = [
  { name: 'Angular', url: 'https://kiwidiag.arq.pw/sitemap.xml' },
  { name: 'API', url: 'https://kiwidiag.arq.pw/api/status' }
];

async function handleSchedule(date: number) {
  const results = await Promise.all(targets.map((target) => fetchWithTimeout(target.url)));

  const texts = await Promise.all(results.map((result, i) => getText(date, targets[i].name, result)));

  const txts = texts.filter((e) => !!e);

  if (txts.length) {
    await broadcast(txts.join('\n'));
  }
}
