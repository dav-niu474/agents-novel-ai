/**
 * Custom error hierarchy for the CLI.
 *
 * Convention: throw a NovelError subclass anywhere in core/. The CLI entrypoint
 * (bin/novel.ts) catches NovelError, prints `error.message` (chalk red), and
 * exits with `error.exitCode` (defaults to 1). Anything else is treated as a
 * programmer error and printed with full stack.
 */

export class NovelError extends Error {
  /** Process exit code; commands can override per error class. */
  public readonly exitCode: number;

  /** Optional remediation hint shown after the error message. */
  public readonly hint?: string;

  constructor(message: string, opts: { exitCode?: number; hint?: string } = {}) {
    super(message);
    this.name = this.constructor.name;
    this.exitCode = opts.exitCode ?? 1;
    if (opts.hint !== undefined) {
      this.hint = opts.hint;
    }
  }
}

/** User asked the CLI to do something that requires a project but cwd has no novel.json. */
export class NotInProjectError extends NovelError {
  constructor(cwd: string) {
    super(`当前目录不是一个 Novel Studio 项目：${cwd}`, {
      exitCode: 2,
      hint: '运行 `novel init <name>` 在当前目录创建项目骨架。',
    });
  }
}

/** Schema validation failure (Zod). */
export class SchemaError extends NovelError {
  constructor(target: string, details: string) {
    super(`Schema 校验失败 (${target})：\n${details}`, { exitCode: 3 });
  }
}

/** Upstream asset is missing — the user must run an earlier skill first. */
export class UpstreamMissingError extends NovelError {
  constructor(skill: string, missing: string[]) {
    super(`无法继续 ${skill}：缺少上游资产 ${missing.join(', ')}`, {
      exitCode: 4,
      hint: '先去补齐上游资产，或运行 `novel status` 查看推荐下一步。',
    });
  }
}

/** Configuration is missing or invalid. */
export class ConfigError extends NovelError {
  constructor(message: string, hint?: string) {
    super(message, { exitCode: 5, ...(hint !== undefined ? { hint } : {}) });
  }
}

/** Generic file system error wrapper for friendly messages. */
export class FileSystemError extends NovelError {
  constructor(operation: string, path: string, cause: unknown) {
    const reason = cause instanceof Error ? cause.message : String(cause);
    super(`文件操作失败 (${operation} ${path})：${reason}`, { exitCode: 6 });
  }
}
