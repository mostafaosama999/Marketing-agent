import { createWebflowAPI, WebflowBlogPost } from '../utils/webflowUtils';
import { readSheetData, extractSheetId } from '../utils/sheetsUtils';
import { extractContentFromUrl, ExtractedContent } from '../utils/contentExtractionUtils';
import { generateLinkedInPostsWithRetry, LinkedInPostGeneration } from '../utils/linkedinPostUtils';
import { updateLinkedInDoc, DocUpdateResult } from '../utils/linkedinDocUtils';

export interface ExcelRowData {
  url: string;
  postSummary?: string;
  published?: string;
}

export interface UrlProcessingResult {
  url: string;
  exists: boolean;
  created: boolean;
  error?: string;
  blogPost?: WebflowBlogPost;
  // New pipeline results
  contentExtracted?: boolean;
  extractedContent?: ExtractedContent;
  linkedinGenerated?: boolean;
  linkedinPosts?: LinkedInPostGeneration;
  docUpdated?: boolean;
  docResult?: DocUpdateResult;
}

export interface ProcessingStats {
  totalUrls: number;
  existingUrls: number;
  newlyCreated: number;
  errors: number;
  results: UrlProcessingResult[];
  // New pipeline stats
  contentExtractionSuccesses: number;
  contentExtractionFailures: number;
  linkedinGenerationSuccesses: number;
  linkedinGenerationFailures: number;
  docUpdateSuccesses: number;
  docUpdateFailures: number;
}

/**
 * Process URLs from Google Sheet and sync with Webflow
 */
export class UrlProcessor {
  private webflowAPI = createWebflowAPI();

  /**
   * Read data from Google Sheet including URLs, Post Summary, and Published status
   */
  async readDataFromSheet(sheetUrl: string): Promise<ExcelRowData[]> {
    try {
      console.log('📊 Reading data from Google Sheet...');
      console.log(`🔗 Sheet URL: ${sheetUrl}`);

      const sheetId = extractSheetId(sheetUrl);
      console.log(`📋 Sheet ID: ${sheetId}`);

      // Read all columns to capture URL, Post Summary, and Published columns
      const sheetData = await readSheetData(sheetId, 'A:Z');
      console.log(`📥 Read ${sheetData.values.length} rows from sheet`);

      if (sheetData.values.length === 0) {
        console.warn('⚠️ No data found in sheet');
        return [];
      }

      const rows: ExcelRowData[] = [];

      // Find header row to identify column positions
      let headerRow: string[] = [];
      let dataStartIndex = 0;

      if (sheetData.values.length > 0) {
        const rawHeaders = sheetData.values[0].map(cell => (cell || '').toString().trim());
        console.log(`🔍 RAW HEADERS (before lowercase):`, rawHeaders);

        headerRow = rawHeaders.map(header => header.toLowerCase());
        console.log(`🔍 PROCESSED HEADERS (after lowercase):`, headerRow);
        dataStartIndex = 1;
      }

      // Find column indices
      const urlColumnIndex = Math.max(
        headerRow.indexOf('url'),
        headerRow.indexOf('urls'),
        0 // Default to column A if no header found
      );

      // Debug post summary column detection
      console.log(`🔍 SEARCHING FOR POST SUMMARY COLUMN...`);
      headerRow.forEach((header, index) => {
        const matches = {
          'post summary': header.includes('post summary'),
          'post_summary': header.includes('post_summary'),
          'postsummary': header.includes('postsummary'),
          'summary': header === 'summary'
        };
        console.log(`   Column ${index}: "${header}" - matches:`, matches);
      });

      const postSummaryColumnIndex = headerRow.findIndex(header =>
        header.includes('post summary') ||
        header.includes('post_summary') ||
        header.includes('postsummary') ||
        header === 'summary'
      );

      console.log(`🎯 POST SUMMARY COLUMN DETECTION RESULT: Index ${postSummaryColumnIndex}`);

      const publishedColumnIndex = headerRow.findIndex(header =>
        header.includes('published') ||
        header.includes('publish')
      );

      console.log(`📍 Headers found:`, headerRow);
      console.log(`📍 Column mapping - URL: ${urlColumnIndex}, Post Summary: ${postSummaryColumnIndex}, Published: ${publishedColumnIndex}`);

      // Process data rows
      for (let i = dataStartIndex; i < sheetData.values.length; i++) {
        const row = sheetData.values[i];
        if (row && row[urlColumnIndex]) {
          const url = row[urlColumnIndex].toString().trim();
          if (url && url.toLowerCase() !== 'url') { // Skip empty or header values
            // Debug data extraction
            console.log(`🔍 ROW ${i + 1} DEBUG:`);
            console.log(`   📊 Full row data:`, row);
            console.log(`   📍 URL (col ${urlColumnIndex}):`, row[urlColumnIndex]);

            let postSummaryValue = undefined;
            if (postSummaryColumnIndex >= 0) {
              const rawValue = row[postSummaryColumnIndex];
              console.log(`   📍 Post Summary Raw (col ${postSummaryColumnIndex}):`, rawValue);
              postSummaryValue = rawValue ? rawValue.toString().trim() : undefined;
              console.log(`   📍 Post Summary Processed:`, postSummaryValue);
            } else {
              console.log(`   ❌ Post Summary column not found (index: ${postSummaryColumnIndex})`);
            }

            const rowData: ExcelRowData = {
              url: url,
              postSummary: postSummaryValue,
              published: publishedColumnIndex >= 0 && row[publishedColumnIndex] ?
                row[publishedColumnIndex].toString().trim().toLowerCase() : undefined
            };

            rows.push(rowData);
            console.log(`📌 FINAL Row ${i + 1} Data:`, {
              url: rowData.url,
              summary: rowData.postSummary || 'Not provided',
              published: rowData.published || 'Not specified'
            });
          }
        }
      }

      console.log(`✅ Found ${rows.length} valid data rows in sheet`);
      return rows;
    } catch (error) {
      console.error('❌ Error reading data from sheet:', error);
      throw error;
    }
  }

  /**
   * Generate a title from URL
   */
  private generateTitleFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.replace('www.', '');
      const pathname = urlObj.pathname.replace(/^\/+|\/+$/g, ''); // Remove leading/trailing slashes

      if (pathname) {
        // Try to extract meaningful title from pathname
        const segments = pathname.split('/');
        const lastSegment = segments[segments.length - 1];

        // Convert URL-like strings to readable titles
        const title = lastSegment
          .replace(/[-_]/g, ' ')
          .replace(/\.[^/.]+$/, '') // Remove file extension
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');

        return title || `Article from ${hostname}`;
      }

      return `Article from ${hostname}`;
    } catch (error) {
      return `Imported Article ${Date.now()}`;
    }
  }

  /**
   * Generate a URL-safe slug
   */
  private generateSlugFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.replace('www.', '').replace(/\./g, '-');
      const pathname = urlObj.pathname.replace(/^\/+|\/+$/g, '');

      let slug = '';
      if (pathname) {
        const segments = pathname.split('/');
        const lastSegment = segments[segments.length - 1];
        slug = lastSegment
          .toLowerCase()
          .replace(/[^a-z0-9-_]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-+|-+$/g, '');
      }

      if (!slug) {
        slug = hostname.toLowerCase();
      }

      // Add timestamp to ensure uniqueness
      return `${slug}-${Date.now()}`;
    } catch (error) {
      return `imported-article-${Date.now()}`;
    }
  }

  /**
   * Process a single row of data with full pipeline
   */
  async processSingleRow(rowData: ExcelRowData): Promise<UrlProcessingResult> {
    const result: UrlProcessingResult = {
      url: rowData.url,
      exists: false,
      created: false,
      contentExtracted: false,
      linkedinGenerated: false,
      docUpdated: false
    };

    try {
      console.log(`\n🔄 Processing row data with full pipeline:`, {
        url: rowData.url,
        summary: rowData.postSummary || 'Not provided',
        published: rowData.published || 'Not specified'
      });

      // Skip if already published
      if (rowData.published === 'yes') {
        console.log(`⏭️ Skipping URL (already published): ${rowData.url}`);
        result.exists = true; // Mark as exists to skip processing
        return result;
      }

      // Check if URL exists in Webflow
      console.log('🔍 Checking if URL exists in Webflow...');
      const exists = await this.webflowAPI.urlExists(rowData.url);
      result.exists = exists;

      if (exists) {
        console.log(`✅ URL already exists in Webflow: ${rowData.url}`);
        // Even if it exists in Webflow, we can still extract content and generate LinkedIn posts
        console.log(`🔄 Continuing with content extraction and LinkedIn generation...`);
      }

      // STEP 1: Extract content from URL
      console.log(`\n📖 Step 1: Extracting content from URL...`);
      try {
        result.extractedContent = await extractContentFromUrl(rowData.url);
        result.contentExtracted = true;
        console.log(`✅ Content extracted: ${result.extractedContent.wordCount} words`);
      } catch (error) {
        console.error(`❌ Content extraction failed:`, error);
        result.contentExtracted = false;
        // Don't return here - we can still create the Webflow post without LinkedIn generation
      }

      // STEP 2: Generate LinkedIn posts (only if content extraction succeeded)
      if (result.contentExtracted && result.extractedContent) {
        console.log(`\n🤖 Step 2: Generating LinkedIn posts...`);
        try {
          result.linkedinPosts = await generateLinkedInPostsWithRetry(result.extractedContent);
          result.linkedinGenerated = true;
          console.log(`✅ LinkedIn posts generated successfully`);
        } catch (error) {
          console.error(`❌ LinkedIn post generation failed:`, error);
          result.linkedinGenerated = false;
        }
      } else {
        console.log(`⏭️ Skipping LinkedIn generation (content extraction failed)`);
      }

      // STEP 3: Update Google Doc (only if LinkedIn posts were generated)
      if (result.linkedinGenerated && result.linkedinPosts) {
        console.log(`\n📝 Step 3: Updating Google Doc...`);
        try {
          result.docResult = await updateLinkedInDoc(rowData, result.linkedinPosts);
          result.docUpdated = result.docResult.success;
          if (result.docUpdated) {
            console.log(`✅ Google Doc updated successfully`);
          } else {
            console.error(`❌ Google Doc update failed: ${result.docResult.error}`);
          }
        } catch (error) {
          console.error(`❌ Google Doc update failed:`, error);
          result.docUpdated = false;
        }
      } else {
        console.log(`⏭️ Skipping Google Doc update (LinkedIn generation failed)`);
      }

      // STEP 4: Create Webflow post (only if it doesn't exist)
      if (!result.exists) {
        console.log(`\n📚 Step 4: Creating Webflow blog post...`);

        // Generate meaningful title and slug from URL
        const title = this.generateTitleFromUrl(rowData.url);
        const slug = this.generateSlugFromUrl(rowData.url);

        // Create new blog post with Excel data
        const newBlogPost: Omit<WebflowBlogPost, '_id'> = {
          name: title,
          slug: slug,
          _archived: false,
          _draft: true, // Keep as draft
          url: rowData.url,
          postSummary: rowData.postSummary
        };

        console.log('📝 Creating blog post with data:', {
          name: newBlogPost.name,
          slug: newBlogPost.slug,
          url: newBlogPost.url,
          postSummary: newBlogPost.postSummary
        });

        try {
          const createdPost = await this.webflowAPI.createBlogPost(newBlogPost);
          result.created = true;
          result.blogPost = createdPost;

          console.log(`✅ Successfully created blog post for URL: ${rowData.url}`);
          console.log(`📝 Created post ID: ${createdPost._id}`);
        } catch (error) {
          console.error(`❌ Webflow post creation failed:`, error);
          result.created = false;
          // Don't throw here - other pipeline steps may have succeeded
        }
      } else {
        console.log(`⏭️ Skipping Webflow post creation (already exists)`);
      }

      // Log pipeline summary
      console.log(`\n📊 Pipeline Summary for ${rowData.url}:`);
      console.log(`   🔍 Webflow exists: ${result.exists}`);
      console.log(`   📖 Content extracted: ${result.contentExtracted}`);
      console.log(`   🤖 LinkedIn generated: ${result.linkedinGenerated}`);
      console.log(`   📝 Doc updated: ${result.docUpdated}`);
      console.log(`   📚 Webflow created: ${result.created}`);

      return result;
    } catch (error) {
      console.error(`❌ Error in processing pipeline for URL ${rowData.url}:`, error);
      result.error = error instanceof Error ? error.message : String(error);
      return result;
    }
  }

  /**
   * Process all data from the Google Sheet with full pipeline
   */
  async processAllUrls(sheetUrl: string): Promise<ProcessingStats> {
    console.log('\n🚀 Starting enhanced data processing with content extraction & LinkedIn generation...');
    console.log(`📊 Sheet URL: ${sheetUrl}`);

    const stats: ProcessingStats = {
      totalUrls: 0,
      existingUrls: 0,
      newlyCreated: 0,
      errors: 0,
      results: [],
      // New pipeline stats
      contentExtractionSuccesses: 0,
      contentExtractionFailures: 0,
      linkedinGenerationSuccesses: 0,
      linkedinGenerationFailures: 0,
      docUpdateSuccesses: 0,
      docUpdateFailures: 0
    };

    try {
      // Read data from sheet
      const rowsData = await this.readDataFromSheet(sheetUrl);
      stats.totalUrls = rowsData.length;

      if (rowsData.length === 0) {
        console.log('📭 No data to process');
        return stats;
      }

      console.log(`\n📋 Processing ${rowsData.length} rows with full pipeline...`);
      console.log(`🔧 Pipeline: Content Extraction → LinkedIn Generation → Google Doc Update → Webflow Creation`);

      // Process each row
      for (let i = 0; i < rowsData.length; i++) {
        const rowData = rowsData[i];
        console.log(`\n⏳ Processing ${i + 1}/${rowsData.length}: ${rowData.url}`);

        const result = await this.processSingleRow(rowData);
        stats.results.push(result);

        // Update traditional stats
        if (result.error) {
          stats.errors++;
          console.log(`❌ Pipeline error for URL ${rowData.url}: ${result.error}`);
        } else if (result.exists && !result.created) {
          stats.existingUrls++;
          console.log(`✅ URL ${rowData.url} already exists or was skipped`);
        } else if (result.created) {
          stats.newlyCreated++;
          console.log(`🆕 Created new blog post for URL ${rowData.url}`);
        }

        // Update new pipeline stats
        if (result.contentExtracted) {
          stats.contentExtractionSuccesses++;
        } else {
          stats.contentExtractionFailures++;
        }

        if (result.linkedinGenerated) {
          stats.linkedinGenerationSuccesses++;
        } else {
          stats.linkedinGenerationFailures++;
        }

        if (result.docUpdated) {
          stats.docUpdateSuccesses++;
        } else {
          stats.docUpdateFailures++;
        }

        // Add delay between requests to avoid rate limiting
        if (i < rowsData.length - 1) {
          console.log('⏱️ Waiting 3 seconds before next request (longer delay for AI processing)...');
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }

      // Log comprehensive final stats
      console.log('\n📊 ENHANCED PROCESSING COMPLETED!');
      console.log('='.repeat(60));
      console.log(`📈 Total rows processed: ${stats.totalUrls}`);
      console.log(`✅ Existing/Skipped URLs: ${stats.existingUrls}`);
      console.log(`🆕 New Webflow posts created: ${stats.newlyCreated}`);
      console.log(`❌ General errors: ${stats.errors}`);
      console.log('');
      console.log('🔧 PIPELINE STATISTICS:');
      console.log(`📖 Content extraction - Success: ${stats.contentExtractionSuccesses}, Failed: ${stats.contentExtractionFailures}`);
      console.log(`🤖 LinkedIn generation - Success: ${stats.linkedinGenerationSuccesses}, Failed: ${stats.linkedinGenerationFailures}`);
      console.log(`📝 Google Doc updates - Success: ${stats.docUpdateSuccesses}, Failed: ${stats.docUpdateFailures}`);
      console.log('');
      console.log('📊 SUCCESS RATES:');
      if (stats.totalUrls > 0) {
        console.log(`📖 Content extraction: ${((stats.contentExtractionSuccesses / stats.totalUrls) * 100).toFixed(1)}%`);
        console.log(`🤖 LinkedIn generation: ${((stats.linkedinGenerationSuccesses / stats.totalUrls) * 100).toFixed(1)}%`);
        console.log(`📝 Google Doc updates: ${((stats.docUpdateSuccesses / stats.totalUrls) * 100).toFixed(1)}%`);
        console.log(`📚 Webflow creation: ${((stats.newlyCreated / (stats.totalUrls - stats.existingUrls)) * 100).toFixed(1)}%`);
      }
      console.log('='.repeat(60));

      return stats;
    } catch (error) {
      console.error('❌ Error in enhanced data processing:', error);
      throw error;
    }
  }

}

/**
 * Create URL processor instance
 */
export function createUrlProcessor(): UrlProcessor {
  return new UrlProcessor();
}