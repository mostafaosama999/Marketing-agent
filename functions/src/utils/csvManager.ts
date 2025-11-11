/**
 * CSV Manager
 * Handles CSV file operations with Cloud Storage integration
 */

import {Storage} from '@google-cloud/storage';
import * as Papa from 'papaparse';
import {ScrapedArticle} from '../scrapers/baseScraper';
import * as functions from 'firebase-functions';

export interface CSVRow {
  Name: string;
  Slug: string;
  'Blog External Link': string;
  'Thumbnail Image'?: string;
  Category?: string; // Auto-detected content category
  'Blog Category'?: string; // Source platform (W&B, Medium, etc.)
}

export class CSVManager {
  private storage: Storage;
  private bucketName: string;

  constructor(bucketName?: string) {
    this.storage = new Storage();
    // Use provided bucket name or default to project-id + suffix
    this.bucketName = bucketName || `${process.env.GCLOUD_PROJECT}-webflow-sync`;
  }

  /**
   * Convert ScrapedArticle array to CSV format
   */
  articlesToCsvRows(articles: ScrapedArticle[]): CSVRow[] {
    return articles.map((article) => ({
      Name: article.name,
      Slug: article.slug,
      'Blog External Link': article.externalUrl,
      'Thumbnail Image': article.imageUrl || '',
      Category: article.category || '',
      'Blog Category': article.blogCategory || '',
    }));
  }

  /**
   * Convert CSV rows back to ScrapedArticle array
   */
  csvRowsToArticles(rows: CSVRow[]): ScrapedArticle[] {
    return rows.map((row) => ({
      name: row.Name,
      slug: row.Slug,
      externalUrl: row['Blog External Link'],
      imageUrl: row['Thumbnail Image'] || undefined,
      category: row.Category || undefined,
      blogCategory: row['Blog Category'] || undefined,
    }));
  }

  /**
   * Generate CSV string from articles
   */
  generateCSV(articles: ScrapedArticle[]): string {
    const csvRows = this.articlesToCsvRows(articles);

    const csv = Papa.unparse(csvRows, {
      header: true,
      quotes: true,
      delimiter: ',',
      newline: '\n',
    });

    return csv;
  }

  /**
   * Parse CSV string to articles
   */
  parseCSV(csvString: string): ScrapedArticle[] {
    const parsed = Papa.parse<CSVRow>(csvString, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
    });

    if (parsed.errors.length > 0) {
      console.warn('CSV parsing warnings:', parsed.errors);
    }

    return this.csvRowsToArticles(parsed.data);
  }

  /**
   * Save CSV to Cloud Storage
   */
  async saveToCloudStorage(
    articles: ScrapedArticle[],
    fileName: string,
    metadata?: {[key: string]: string}
  ): Promise<string> {
    try {
      const csv = this.generateCSV(articles);
      const bucket = this.storage.bucket(this.bucketName);

      // Ensure bucket exists
      const [bucketExists] = await bucket.exists();
      if (!bucketExists) {
        console.log(`Creating bucket: ${this.bucketName}`);
        await this.storage.createBucket(this.bucketName, {
          location: 'US',
          storageClass: 'STANDARD',
        });
      }

      const file = bucket.file(fileName);

      await file.save(csv, {
        metadata: {
          contentType: 'text/csv',
          metadata: {
            ...metadata,
            generatedAt: new Date().toISOString(),
            articleCount: articles.length.toString(),
          },
        },
      });

      const publicUrl = `gs://${this.bucketName}/${fileName}`;
      console.log(`CSV saved to Cloud Storage: ${publicUrl}`);

      return publicUrl;
    } catch (error) {
      console.error('Failed to save CSV to Cloud Storage:', error);
      throw new Error(`CSV save failed: ${(error as Error).message}`);
    }
  }

  /**
   * Read CSV from Cloud Storage
   */
  async readFromCloudStorage(fileName: string): Promise<ScrapedArticle[]> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(fileName);

      const [exists] = await file.exists();
      if (!exists) {
        throw new Error(`File not found: ${fileName}`);
      }

      const [contents] = await file.download();
      const csvString = contents.toString('utf-8');

      const articles = this.parseCSV(csvString);
      console.log(`Read ${articles.length} articles from ${fileName}`);

      return articles;
    } catch (error) {
      console.error('Failed to read CSV from Cloud Storage:', error);
      throw new Error(`CSV read failed: ${(error as Error).message}`);
    }
  }

  /**
   * Append articles to existing CSV in Cloud Storage
   */
  async appendToCloudStorage(
    articles: ScrapedArticle[],
    fileName: string
  ): Promise<string> {
    try {
      // Read existing articles
      let existingArticles: ScrapedArticle[] = [];

      try {
        existingArticles = await this.readFromCloudStorage(fileName);
      } catch (error) {
        console.log('No existing file found, creating new one');
      }

      // Deduplicate by slug
      const existingSlugs = new Set(existingArticles.map(a => a.slug));
      const newArticles = articles.filter(a => !existingSlugs.has(a.slug));

      // Combine
      const allArticles = [...existingArticles, ...newArticles];

      // Save combined data
      const url = await this.saveToCloudStorage(allArticles, fileName, {
        appendedCount: newArticles.length.toString(),
        totalCount: allArticles.length.toString(),
      });

      console.log(`Appended ${newArticles.length} new articles (${articles.length - newArticles.length} duplicates skipped)`);

      return url;
    } catch (error) {
      console.error('Failed to append to CSV:', error);
      throw new Error(`CSV append failed: ${(error as Error).message}`);
    }
  }

  /**
   * List all CSV files in the bucket
   */
  async listCSVFiles(): Promise<string[]> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const [files] = await bucket.getFiles({
        prefix: '',
      });

      const csvFiles = files
        .filter(file => file.name.endsWith('.csv'))
        .map(file => file.name);

      return csvFiles;
    } catch (error) {
      console.error('Failed to list CSV files:', error);
      return [];
    }
  }

  /**
   * Delete a CSV file from Cloud Storage
   */
  async deleteFromCloudStorage(fileName: string): Promise<void> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(fileName);

      await file.delete();
      console.log(`Deleted ${fileName} from Cloud Storage`);
    } catch (error) {
      console.error('Failed to delete CSV:', error);
      throw new Error(`CSV delete failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get signed URL for downloading CSV (expires in 1 hour)
   */
  async getDownloadUrl(fileName: string): Promise<string> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(fileName);

      const [url] = await file.getSignedUrl({
        action: 'read',
        expires: Date.now() + 60 * 60 * 1000, // 1 hour
      });

      return url;
    } catch (error) {
      console.error('Failed to generate download URL:', error);
      throw new Error(`URL generation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Save CSV locally (for testing)
   */
  saveToLocal(articles: ScrapedArticle[], filePath: string): void {
    const csv = this.generateCSV(articles);
    const fs = require('fs');
    fs.writeFileSync(filePath, csv, 'utf-8');
    console.log(`CSV saved locally: ${filePath}`);
  }

  /**
   * Read CSV from local file (for testing)
   */
  readFromLocal(filePath: string): ScrapedArticle[] {
    const fs = require('fs');
    const csvString = fs.readFileSync(filePath, 'utf-8');
    return this.parseCSV(csvString);
  }
}

/**
 * Get bucket name from Firebase config or environment
 */
export function getBucketName(): string {
  try {
    const configBucket = functions.config().storage?.csv_bucket;
    if (configBucket) {
      return configBucket;
    }
  } catch (error) {
    console.warn('Could not read Firebase config, using default bucket name');
  }

  return `${process.env.GCLOUD_PROJECT}-webflow-sync`;
}
