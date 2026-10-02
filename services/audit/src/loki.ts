import { log } from "./log";

/**
 * Отправка событий в Loki пачками раз в секунду. Loki недоступен — событие уже лежит в БД,
 * поэтому пачку не копим бесконечно: держим не больше MAX_QUEUE строк и выбрасываем старые.
 */
type Labels = Record<string, string>;
type Line = { labels: Labels; ts: bigint; line: string };

const MAX_QUEUE = 5000;
const queue: Line[] = [];
let timer: NodeJS.Timeout | null = null;
let warned = false;

const url = () => process.env.LOKI_URL?.replace(/\/$/, "");

export function lokiPush(labels: Labels, payload: Record<string, unknown>, at = new Date()) {
  if (!url()) return;
  queue.push({ labels, ts: BigInt(at.getTime()) * 1_000_000n, line: JSON.stringify(payload) });
  if (queue.length > MAX_QUEUE) queue.splice(0, queue.length - MAX_QUEUE);
  timer ??= setTimeout(flush, 1000);
}

async function flush() {
  timer = null;
  const batch = queue.splice(0, queue.length);
  if (!batch.length) return;
  const streams = new Map<string, { stream: Labels; values: [string, string][] }>();
  for (const l of batch) {
    const key = JSON.stringify(l.labels);
    const s = streams.get(key) ?? { stream: l.labels, values: [] };
    s.values.push([l.ts.toString(), l.line]);
    streams.set(key, s);
  }
  try {
    const res = await fetch(`${url()}/loki/api/v1/push`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ streams: [...streams.values()] }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`loki ${res.status}: ${(await res.text()).slice(0, 200)}`);
    warned = false;
  } catch (err) {
    // вернём пачку в начало очереди и попробуем позже; в лог — один раз за серию сбоев
    queue.unshift(...batch.slice(-MAX_QUEUE));
    if (queue.length > MAX_QUEUE) queue.splice(MAX_QUEUE);
    if (!warned) log("warn", "loki push failed", { error: String(err) });
    warned = true;
    timer ??= setTimeout(flush, 5000);
  }
}
