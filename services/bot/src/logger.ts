type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  [key: string]: any;
}

class Logger {
  private serviceName: string;

  constructor(serviceName: string = 'finance-bot') {
    this.serviceName = serviceName;
  }

  private log(level: LogLevel, message: string, meta?: Record<string, any>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.serviceName,
      message,
      ...meta,
    };

    const output = JSON.stringify(entry);

    if (level === 'error') {
      console.error(output);
    } else {
      console.log(output);
    }
  }

  info(message: string, meta?: Record<string, any>): void {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: Record<string, any>): void {
    this.log('warn', message, meta);
  }

  error(message: string, meta?: Record<string, any>): void {
    this.log('error', message, meta);
  }
}

// Export singleton instance
export const logger = new Logger();
