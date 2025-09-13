import fs from 'fs';
import path from 'path';
import { LogLevel, loggerConfig } from '../LoggerConfig';
import { LogEntry } from '../formatters/JsonFormatter';

interface FileTransportConfig {
  filename: string;
  maxSize: number;
  maxFiles: number;
  enableRotation: boolean;
}

export class FileTransport {
  private config: FileTransportConfig;
  private currentSize: number = 0;
  private writeStream: fs.WriteStream | null = null;

  constructor(config: Partial<FileTransportConfig> = {}) {
    this.config = {
      filename: 'app.log',
      maxSize: this.parseSize(loggerConfig.maxFileSize),
      maxFiles: loggerConfig.maxFiles,
      enableRotation: true,
      ...config,
    };

    this.initializeLogFile();
  }

  async write(entry: Partial<LogEntry>, formattedMessage: string): Promise<void> {
    if (!this.writeStream) {
      this.initializeLogFile();
    }

    const logLine = `${formattedMessage}\n`;
    const logSize = Buffer.byteLength(logLine, 'utf8');

    // Check if rotation is needed
    if (this.config.enableRotation && this.currentSize + logSize > this.config.maxSize) {
      await this.rotateLog();
    }

    return new Promise((resolve, reject) => {
      if (!this.writeStream) {
        reject(new Error('Write stream not available'));
        return;
      }

      this.writeStream.write(logLine, 'utf8', (error) => {
        if (error) {
          reject(error);
        } else {
          this.currentSize += logSize;
          resolve();
        }
      });
    });
  }

  async close(): Promise<void> {
    return new Promise((resolve) => {
      if (this.writeStream) {
        this.writeStream.end(() => {
          this.writeStream = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  private initializeLogFile(): void {
    const logDir = path.dirname(this.config.filename);
    
    // Create log directory if it doesn't exist
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    // Check current file size
    if (fs.existsSync(this.config.filename)) {
      const stats = fs.statSync(this.config.filename);
      this.currentSize = stats.size;
    } else {
      this.currentSize = 0;
    }

    // Create write stream
    this.writeStream = fs.createWriteStream(this.config.filename, { flags: 'a' });

    // Handle stream errors
    this.writeStream.on('error', (error) => {
      console.error('File transport error:', error);
    });
  }

  private async rotateLog(): Promise<void> {
    // Close current stream
    await this.close();

    // Rotate existing files
    for (let i = this.config.maxFiles - 1; i >= 1; i--) {
      const oldFile = this.getRotatedFilename(i);
      const newFile = this.getRotatedFilename(i + 1);

      if (fs.existsSync(oldFile)) {
        if (i === this.config.maxFiles - 1) {
          // Delete the oldest file
          fs.unlinkSync(oldFile);
        } else {
          // Rename to next number
          fs.renameSync(oldFile, newFile);
        }
      }
    }

    // Rename current log file to .1
    if (fs.existsSync(this.config.filename)) {
      fs.renameSync(this.config.filename, this.getRotatedFilename(1));
    }

    // Reset size and create new stream
    this.currentSize = 0;
    this.initializeLogFile();
  }

  private getRotatedFilename(index: number): string {
    const ext = path.extname(this.config.filename);
    const base = path.basename(this.config.filename, ext);
    const dir = path.dirname(this.config.filename);
    return path.join(dir, `${base}.${index}${ext}`);
  }

  private parseSize(sizeStr: string): number {
    const units: Record<string, number> = {
      b: 1,
      k: 1024,
      m: 1024 * 1024,
      g: 1024 * 1024 * 1024,
    };

    const match = sizeStr.toLowerCase().match(/^(\d+)([bkmg]?)$/);
    if (!match) {
      throw new Error(`Invalid size format: ${sizeStr}`);
    }

    const [, size, unit] = match;
    const multiplier = units[unit || ''] || 1;
    return parseInt(size || '0', 10) * multiplier;
  }
}

// Specialized transports for different log levels
export class ErrorFileTransport extends FileTransport {
  constructor() {
    super({
      filename: path.join(loggerConfig.logDirectory, 'error.log'),
    });
  }
}

export class AccessFileTransport extends FileTransport {
  constructor() {
    super({
      filename: path.join(loggerConfig.logDirectory, 'access.log'),
    });
  }
}

export class SecurityFileTransport extends FileTransport {
  constructor() {
    super({
      filename: path.join(loggerConfig.logDirectory, 'security.log'),
      maxSize: 50 * 1024 * 1024, // 50MB for security logs
      maxFiles: 10,
    });
  }
}

export class PerformanceFileTransport extends FileTransport {
  constructor() {
    super({
      filename: path.join(loggerConfig.logDirectory, 'performance.log'),
    });
  }
}