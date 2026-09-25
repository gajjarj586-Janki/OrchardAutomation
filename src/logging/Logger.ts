import chalk from 'chalk';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogFields {
  executionId?: string;
  project?: string;
  environment?: string;
  stage?: string;
  status?: string;
  duration?: number;
  error?: string;
  [key: string]: unknown;
}

export interface StructuredLogRecord extends LogFields {
  timestamp: string;
  level: LogLevel;
  message: string;
}

const LEVEL_COLOR: Record<LogLevel, (text: string) => string> = {
  debug: chalk.gray,
  info: chalk.cyan,
  warn: chalk.yellow,
  error: chalk.red,
};

export interface LoggerOptions {
  /** When true, emit one JSON object per line instead of a human-readable line. */
  json?: boolean;
  /** Fields attached to every record emitted by this logger instance. */
  context?: LogFields;
}

/**
 * Minimal structured logger. Every record carries a timestamp and level and
 * can carry pipeline context (executionId, stage, status) so log output is
 * consistent whether read by a human in a terminal or ingested by a future
 * dashboard from reports/json.
 */
export class Logger {
  private readonly json: boolean;
  private readonly context: LogFields;

  constructor(options: LoggerOptions = {}) {
    this.json = options.json ?? false;
    this.context = options.context ?? {};
  }

  child(context: LogFields): Logger {
    return new Logger({ json: this.json, context: { ...this.context, ...context } });
  }

  debug(message: string, fields: LogFields = {}): void {
    this.write('debug', message, fields);
  }

  info(message: string, fields: LogFields = {}): void {
    this.write('info', message, fields);
  }

  warn(message: string, fields: LogFields = {}): void {
    this.write('warn', message, fields);
  }

  error(message: string, fields: LogFields = {}): void {
    this.write('error', message, fields);
  }

  private write(level: LogLevel, message: string, fields: LogFields): void {
    const record: StructuredLogRecord = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...this.context,
      ...fields,
    };

    if (this.json) {
      process.stdout.write(`${JSON.stringify(record)}\n`);
      return;
    }

    const color = LEVEL_COLOR[level];
    const prefix = `[${record.timestamp}] ${level.toUpperCase()}`;
    const stagePart = record.stage ? ` (${record.stage})` : '';
    const line = `${color(prefix)}${stagePart} ${message}`;
    const target = level === 'error' ? console.error : console.log;
    target(line);

    const extra: Record<string, unknown> = { ...record };
    delete extra.timestamp;
    delete extra.level;
    delete extra.message;
    delete extra.stage;
    if (Object.keys(extra).length > 0) {
      target(chalk.gray(`  ${JSON.stringify(extra)}`));
    }
  }
}

export const rootLogger = new Logger({ json: process.env.LOG_FORMAT === 'json' });
