/**
 * Structured logging for scripts.
 * Keeps seed output clean and traceable.
 */

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  blue: '\x1b[34m',
};

function timestamp(): string {
  return new Date().toISOString().split('T')[1].slice(0, 12);
}

export const log = {
  /**
   * General info message
   */
  info(message: string): void {
    console.log(`${COLORS.dim}[${timestamp()}]${COLORS.reset} ${COLORS.blue}ℹ${COLORS.reset} ${message}`);
  },

  /**
   * Success message
   */
  success(message: string): void {
    console.log(`${COLORS.dim}[${timestamp()}]${COLORS.reset} ${COLORS.green}✔${COLORS.reset} ${message}`);
  },

  /**
   * Warning message
   */
  warn(message: string): void {
    console.log(`${COLORS.dim}[${timestamp()}]${COLORS.reset} ${COLORS.yellow}⚠${COLORS.reset} ${message}`);
  },

  /**
   * Error message
   */
  error(message: string, err?: unknown): void {
    console.error(`${COLORS.dim}[${timestamp()}]${COLORS.reset} ${COLORS.red}✖${COLORS.reset} ${message}`);
    if (err) {
      console.error(err);
    }
  },

  /**
   * Step indicator for seed progress
   */
  step(message: string): void {
    console.log(`${COLORS.dim}[${timestamp()}]${COLORS.reset} ${COLORS.cyan}→${COLORS.reset} ${message}`);
  },

  /**
   * Section header
   */
  section(title: string): void {
    console.log();
    console.log(`${COLORS.bright}${COLORS.cyan}━━━ ${title} ━━━${COLORS.reset}`);
  },

  /**
   * Data count summary
   */
  count(label: string, count: number): void {
    console.log(`  ${COLORS.dim}${label}:${COLORS.reset} ${count}`);
  },

  /**
   * Blank line for spacing
   */
  blank(): void {
    console.log();
  },
};

/**
 * Legacy exports for compatibility
 */
export function logStep(message: string): void {
  log.step(message);
}

export function logSuccess(message: string): void {
  log.success(message);
}

export function logError(message: string): void {
  log.error(message);
}
