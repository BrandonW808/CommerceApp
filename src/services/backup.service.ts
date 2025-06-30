import mongoose from 'mongoose';
import * as cron from 'node-cron';
import * as zlib from 'zlib';
import { storageService } from './storage.service';
import { config } from '../config';
import logger from '../utils/logger';

export class BackupService {
  private scheduledTask: cron.ScheduledTask | null = null;

  async backupCollection(collectionName: string, dateString: string): Promise<void> {
    if (!mongoose.connection?.db) {
      logger.error('Database not connected for backup');
      return;
    }

    if (!storageService.isConfigured()) {
      logger.warn('Storage service not configured, skipping backup');
      return;
    }

    try {
      const collection = mongoose.connection.db.collection(collectionName);
      const data = await collection.find().toArray();
      const jsonData = JSON.stringify(data);

      // Compress data
      const compressedData = zlib.gzipSync(jsonData);

      // Create a mock file object for storage service
      const mockFile: Express.Multer.File = {
        fieldname: 'backup',
        originalname: `${collectionName}.json.gz`,
        encoding: 'gzip',
        mimetype: 'application/json',
        size: compressedData.length,
        buffer: compressedData,
        stream: null as any,
        destination: '',
        filename: '',
        path: '',
      };

      // Upload to storage
      await storageService.uploadFile(mockFile, `backups/${dateString}/${collectionName}`);

      logger.info(`Backup completed for collection: ${collectionName}`);
    } catch (error) {
      logger.error(`Backup failed for collection ${collectionName}:`, error);
    }
  }

  async deleteOldBackups(): Promise<void> {
    // This would need to be implemented with proper storage API listing
    // For now, we'll just log
    logger.info('Old backup deletion would be performed here');
  }

  async performBackup(collections: string[]): Promise<void> {
    const dateString = new Date().toISOString().split('T')[0];

    for (const collection of collections) {
      await this.backupCollection(collection, dateString);
    }

    await this.deleteOldBackups();
  }

  startScheduledBackups(collections: string[], schedule: string = '0 23 * * *'): void {
    if (this.scheduledTask) {
      this.scheduledTask.stop();
    }

    this.scheduledTask = cron.schedule(schedule, async () => {
      logger.info('Starting scheduled backup');
      await this.performBackup(collections);
    });

    logger.info(`Backup scheduled with cron: ${schedule}`);
  }

  stopScheduledBackups(): void {
    if (this.scheduledTask) {
      this.scheduledTask.stop();
      this.scheduledTask = null;
      logger.info('Scheduled backups stopped');
    }
  }
}

export const backupService = new BackupService();
