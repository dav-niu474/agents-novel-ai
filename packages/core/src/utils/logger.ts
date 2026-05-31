/**
 * Console logger built on chalk + ora.
 *
 * Design notes:
 *  - One singleton `log` exported for use across the codebase.
 *  - Quiet mode (`--quiet`) silences info/debug; warn/error always print.
 *  - JSON mode (reserved for v2.x daemon) routes everything to stderr as JSONL.
 */
import chalk from 'chalk';
import ora, { type Ora } from 'ora';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  quiet?: boolean;
  debug?: boolean;
}

class Logger {
  private quiet = false;
  private debugEnabled = false;

  configure(opts: LoggerOptions): void {
    if (opts.quiet !== undefined) this.quiet = opts.quiet;
    if (opts.debug !== undefined) this.debugEnabled = opts.debug;
  }

  debug(msg: string): void {
    if (!this.debugEnabled) return;
    process.stderr.write(`${chalk.gray('[debug]')} ${msg}\n`);
  }

  info(msg: string): void {
    if (this.quiet) return;
    process.stdout.write(`${msg}\n`);
  }

  /** Print plain text without any prefix; use for natural-language output. */
  plain(msg: string): void {
    if (this.quiet) return;
    process.stdout.write(`${msg}\n`);
  }

  success(msg: string): void {
    if (this.quiet) return;
    process.stdout.write(`${chalk.green('✓')} ${msg}\n`);
  }

  warn(msg: string): void {
    process.stderr.write(`${chalk.yellow('⚠')} ${msg}\n`);
  }

  error(msg: string): void {
    process.stderr.write(`${chalk.red('✗')} ${msg}\n`);
  }

  hint(msg: string): void {
    if (this.quiet) return;
    process.stdout.write(`${chalk.dim('  ↪ ' + msg)}\n`);
  }

  /** Print a section heading (used by status / doctor). */
  heading(msg: string): void {
    if (this.quiet) return;
    process.stdout.write(`\n${chalk.bold(msg)}\n`);
  }

  /** Begin an ora spinner; caller must succeed/fail/stop it. */
  spinner(text: string): Ora {
    return ora({ text, isSilent: this.quiet });
  }
}

export const log = new Logger();
export { chalk };
