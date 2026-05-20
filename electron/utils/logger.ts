import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';

const LOG_DIR = path.join(app.getPath('userData'), 'logs');

function ensureLogDir(): void {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function getLogFilePath(): string {
  const date = new Date().toISOString().slice(0, 10);
  return path.join(LOG_DIR, `main-${date}.log`);
}

function formatMessage(level: string, ...args: unknown[]): string {
  const timestamp = new Date().toISOString();
  const message = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
  return `[${timestamp}] [${level}] ${message}\n`;
}

export const logger = {
  info: (...args: unknown[]) => {
    const msg = formatMessage('INFO', ...args);
    console.log(msg.trimEnd());
    if (app.isPackaged) {
      ensureLogDir();
      fs.appendFileSync(getLogFilePath(), msg);
    }
  },
  error: (...args: unknown[]) => {
    const msg = formatMessage('ERROR', ...args);
    console.error(msg.trimEnd());
    if (app.isPackaged) {
      ensureLogDir();
      fs.appendFileSync(getLogFilePath(), msg);
    }
  },
  warn: (...args: unknown[]) => {
    const msg = formatMessage('WARN', ...args);
    console.warn(msg.trimEnd());
    if (app.isPackaged) {
      ensureLogDir();
      fs.appendFileSync(getLogFilePath(), msg);
    }
  },
};
