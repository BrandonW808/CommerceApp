import { connect, connection } from 'mongoose';
import { Storage } from '@google-cloud/storage';
import * as cron from 'node-cron';
import * as dotenv from 'dotenv';
import * as zlib from 'zlib';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config();

// Google Cloud Storage configuration
const gc = new Storage({
    keyFilename: "cloud-keyfile-path",
});
const bucket = gc.bucket("google-cloud-bucket");

// MongoDB configuration
connect('mongodb://127.0.0.1:27017/invoicing').then(() => {
    // To manually run the backup, you can call the performBackup function. Ensure you call this after the MongoDB connection is established
    // performBackup(['collection1']);
}).catch((err: Error) => {
    console.log(err);
});

const backupRetentionDays = 10;

async function backupCollection(collectionName: string, dateString: string) {
    if (!connection?.db) {
        return;
    }
    const collection = connection.db.collection(collectionName);
    const data = await collection.find().toArray();
    const jsonData = JSON.stringify(data);

    // Compress data
    const compressedData = zlib.gzipSync(jsonData);

    // Upload compressed data to Google Cloud Storage
    const fileName = `${collectionName}.json.gz`;
    const filePath = path.join(dateString, fileName);
    const file = bucket.file(filePath);

    await file.save(compressedData, {
        metadata: {
            contentType: 'application/json',
            contentEncoding: 'gzip',
        },
    });

    console.log(`Backup of collection ${collectionName} completed.`);
}

export async function deleteOldBackups(dateString: string) {
    const [files] = await bucket.getFiles();
    const oldBackups = files.filter((file) => {
        const fileDateString = file.name.split('/')[0];
        const fileDate = new Date(fileDateString);
        const retentionDate = new Date();
        retentionDate.setDate(retentionDate.getDate() - backupRetentionDays);

        return fileDate < retentionDate;
    });

    for (const file of oldBackups) {
        await file.delete();
        console.log(`Deleted old backup: ${file.name}`);
    }
}

export async function performBackup(collections: string[]) {
    const dateString = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    for (const collection of collections) {
        console.log(`Backing up ${collection}`);
        await backupCollection(collection, dateString);
    }

    await deleteOldBackups(dateString);
}

// Schedule the backup to run every night at 11pm
cron.schedule('0 23 * * *', () => {
    const collectionsToBackup = ['collection1', 'collection2']; // Add or remove collections as needed
    performBackup(collectionsToBackup)
});