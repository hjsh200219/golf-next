type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogFields = Record<string, unknown>;

interface Logger {
  debug(msg: string, fields?: LogFields): void;
  info(msg: string, fields?: LogFields): void;
  warn(msg: string, fields?: LogFields): void;
  error(msg: string, fields?: LogFields): void;
}

const isDev = process.env.NODE_ENV !== 'production';

function log(level: LogLevel, tag: string, msg: string, fields?: LogFields): void {
  if (isDev) {
    const extra = fields && Object.keys(fields).length > 0 ? ` ${JSON.stringify(fields)}` : '';
    console[level](`[${level}] [${tag}] ${msg}${extra}`);
  } else {
    const entry = {
      ts: new Date().toISOString(),
      level,
      tag,
      msg,
      ...fields,
    };
    console[level](JSON.stringify(entry));
  }
}

export function createLogger(tag: string): Logger {
  return {
    debug: (msg, fields) => log('debug', tag, msg, fields),
    info:  (msg, fields) => log('info',  tag, msg, fields),
    warn:  (msg, fields) => log('warn',  tag, msg, fields),
    error: (msg, fields) => log('error', tag, msg, fields),
  };
}
