import axios, { AxiosInstance } from 'axios';
import * as functions from 'firebase-functions';
import {ScrapedArticle} from '../scrapers/baseScraper';

export interface WebflowBlogPost {
  _id?: string;
  name: string;
  slug: string;
  _archived?: boolean;
  _draft?: boolean;
  url?: string;
  postSummary?: string;
  externalUrl?: string;
  createdOn?: string;
  lastEdited?: string;
}

export interface SyncStats {
  totalArticles: number;
  created: number;
  skipped: number;
  failed: number;
  errors: string[];
}

export interface WebflowCollection {
  _id: string;
  name: string;
  slug: string;
}

export interface WebflowCollectionResponse {
  items: WebflowBlogPost[];
  count: number;
  limit: number;
  offset: number;
  total: number;
}

/**
 * Webflow API client utility class
 */
export class WebflowAPI {
  private api: AxiosInstance;
  private siteId: string;
  private blogCollectionId: string;

  constructor() {
    const apiToken = functions.config().webflow?.api_token;
    this.siteId = functions.config().webflow?.site_id;
    this.blogCollectionId = functions.config().webflow?.blog_collection_id;

    if (!apiToken) {
      throw new Error('Webflow API token not configured');
    }
    if (!this.siteId) {
      throw new Error('Webflow site ID not configured');
    }
    if (!this.blogCollectionId) {
      throw new Error('Webflow blog collection ID not configured');
    }

    console.log('🔧 Initializing Webflow API client v2');
    console.log(`📊 Site ID: ${this.siteId}`);
    console.log(`📝 Blog Collection ID: ${this.blogCollectionId}`);

    this.api = axios.create({
      baseURL: 'https://api.webflow.com',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    // Add request/response interceptors for logging
    this.api.interceptors.request.use((config) => {
      console.log(`🌐 Webflow API Request: ${config.method?.toUpperCase()} ${config.url}`);
      return config;
    });

    this.api.interceptors.response.use(
      (response) => {
        console.log(`✅ Webflow API Response: ${response.status} ${response.statusText}`);
        return response;
      },
      (error) => {
        console.error(`❌ Webflow API Error: ${error.response?.status} ${error.response?.statusText}`);
        console.error(`📥 Error Message:`, error.response?.data?.message || error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get all blog posts from the Webflow collection
   */
  async getAllBlogPosts(): Promise<WebflowBlogPost[]> {
    try {
      console.log('🔍 Fetching all blog posts from Webflow collection...');

      const response = await this.api.get(
        `/v2/collections/${this.blogCollectionId}/items`
      );

      const items = response.data?.items || [];
      console.log(`📊 Found ${items.length} blog posts in Webflow collection`);

      // Map items to blog posts
      const blogPosts = items.map((item: any) => {
        const post: WebflowBlogPost = {
          _id: item.id,
          name: item.fieldData.name || item.fieldData.title || '',
          slug: item.fieldData.slug || '',
          _archived: item.isArchived || false,
          _draft: item.isDraft || false,
          url: item.fieldData.url || item.fieldData['external-url'] || ''
        };

        return post;
      });

      return blogPosts;
    } catch (error) {
      console.error('❌ Error fetching blog posts from Webflow:', error);
      throw error;
    }
  }

  /**
   * Check if a URL exists in the blog posts collection
   */
  async urlExists(url: string): Promise<boolean> {
    try {
      console.log(`🔍 Checking if URL exists in Webflow: ${url}`);

      const blogPosts = await this.getAllBlogPosts();

      // Check if URL exists in any of the posts (you might want to adjust this logic based on your URL field)
      const exists = blogPosts.some(post =>
        post.url === url ||
        post.name === url ||
        post.slug === url
      );

      console.log(`🎯 URL ${url} exists in Webflow: ${exists}`);
      return exists;
    } catch (error) {
      console.error(`❌ Error checking URL existence: ${url}`, error);
      throw error;
    }
  }

  /**
   * Create a new blog post in Webflow
   */
  async createBlogPost(blogPost: Omit<WebflowBlogPost, '_id'>): Promise<WebflowBlogPost> {
    try {
      console.log('🆕 Creating new blog post in Webflow:', blogPost.name);

      const postData = {
        fieldData: {
          name: blogPost.name,
          slug: blogPost.slug,
          url: blogPost.url || '',
          'meta-description': blogPost.postSummary || '',
          'main-image': 'https://via.placeholder.com/400x300'
        },
        isDraft: true,
        isArchived: blogPost._archived === true
      };

      const response = await this.api.post(
        `/v2/collections/${this.blogCollectionId}/items`,
        postData
      );

      const createdItem = response.data;
      console.log('✅ Successfully created blog post in Webflow as draft:', {
        id: createdItem.id,
        name: createdItem.fieldData.name,
        slug: createdItem.fieldData.slug
      });

      // Convert back to our interface format
      const createdPost: WebflowBlogPost = {
        _id: createdItem.id,
        name: createdItem.fieldData.name,
        slug: createdItem.fieldData.slug,
        url: createdItem.fieldData.url,
        _archived: createdItem.isArchived,
        _draft: createdItem.isDraft
      };

      return createdPost;
    } catch (error) {
      console.error('❌ Error creating blog post in Webflow:', error);
      throw error;
    }
  }

  /**
   * Publish a blog post in Webflow
   */
  async publishBlogPost(itemId: string): Promise<void> {
    try {
      console.log(`📤 Publishing blog post ${itemId}...`);

      await this.api.post(
        `/v2/collections/${this.blogCollectionId}/items/${itemId}/publish`
      );

      console.log('✅ Successfully published blog post');
    } catch (error) {
      console.error('❌ Error publishing blog post:', error);
      throw error;
    }
  }

  /**
   * Get site information for debugging
   */
  async getSiteInfo() {
    try {
      console.log('🏢 Fetching site information...');
      const response = await this.api.get(`/v2/sites/${this.siteId}`);
      console.log('🏢 Site info retrieved successfully');
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching site info:', error);
      throw error;
    }
  }

  /**
   * Get collection information for debugging
   */
  async getCollectionInfo() {
    try {
      console.log('📋 Fetching collection information...');
      const response = await this.api.get(`/v2/sites/${this.siteId}/collections`);
      const collections = response.data?.collections || [];
      const blogCollection = collections.find((c: any) => c.id === this.blogCollectionId);
      console.log('📋 Blog collection info retrieved successfully');
      return blogCollection;
    } catch (error) {
      console.error('❌ Error fetching collection info:', error);
      throw error;
    }
  }

  /**
   * Fetch all blog categories and create a name → ID mapping
   * NEW METHOD - For dynamic category assignment from spreadsheet
   */
  async getCategoryMapping(): Promise<Map<string, string>> {
    try {
      // Blog Categories collection ID
      const categoriesCollectionId = '68ee616f267332a8b301b95b';
      console.log('🔍 Fetching blog categories from Webflow...');

      const response = await this.api.get(
        `/v2/collections/${categoriesCollectionId}/items`
      );

      const items = response.data?.items || [];
      console.log(`📊 Found ${items.length} category items`);

      // Create mapping: category name → item ID
      const mapping = new Map<string, string>();
      items.forEach((item: any) => {
        const categoryName = item.fieldData.name;
        const itemId = item.id;
        mapping.set(categoryName, itemId);
        console.log(`  ✓ ${categoryName} → ${itemId}`);
      });

      return mapping;
    } catch (error) {
      console.error('❌ Error fetching category mapping:', error);
      throw error;
    }
  }

  /**
   * Check if an article exists by slug
   * NEW METHOD - For profile scraper deduplication
   */
  async checkArticleExists(slug: string): Promise<boolean> {
    try {
      console.log(`🔍 Checking if article with slug "${slug}" exists...`);

      const blogPosts = await this.getAllBlogPosts();
      const exists = blogPosts.some(post => post.slug === slug);

      console.log(`🎯 Article with slug "${slug}" exists: ${exists}`);
      return exists;
    } catch (error) {
      console.error(`❌ Error checking article existence by slug: ${slug}`, error);
      throw error;
    }
  }

  /**
   * Create article post from ScrapedArticle data
   * NEW METHOD - Maps scraped data to Webflow fields
   */
  async createArticlePost(
    article: ScrapedArticle,
    categoryMapping?: Map<string, string>
  ): Promise<WebflowBlogPost> {
    try {
      console.log(`🆕 Creating article post: ${article.name}`);

      // Look up blog category ID from mapping
      let blogCategoryId = '68ee616f267332a8b301ba59'; // Default to W&B
      if (categoryMapping && article.blogCategory) {
        const mappedId = categoryMapping.get(article.blogCategory);
        if (mappedId) {
          blogCategoryId = mappedId;
          console.log(`  ✓ Using category "${article.blogCategory}" → ${mappedId}`);
        } else {
          console.warn(`  ⚠ Category "${article.blogCategory}" not found in mapping. Available categories: ${Array.from(categoryMapping.keys()).join(', ')}`);
          console.warn(`  ⚠ Falling back to W&B category`);
        }
      }

      const postData = {
        fieldData: {
          name: article.name,
          slug: article.slug,
          'blog-external-link': article.externalUrl,
          'blog-main-image': article.imageUrl || '',
          'category': article.category || 'Case Studies & Tutorials', // Auto-detected content category (PlainText)
          'blog-category-name': blogCategoryId, // Blog source category (Reference/ItemRef)
          'publish-date': new Date().toISOString(),
          // Note: blog-details is RichText - would need article.description in rich text format
          // You can add more fields as needed based on your Webflow collection schema
        },
        isDraft: true, // Always create as draft for review
        isArchived: false,
      };

      const response = await this.api.post(
        `/v2/collections/${this.blogCollectionId}/items`,
        postData
      );

      const createdItem = response.data;
      console.log(`✅ Successfully created article: ${createdItem.fieldData.name}`);

      const createdPost: WebflowBlogPost = {
        _id: createdItem.id,
        name: createdItem.fieldData.name,
        slug: createdItem.fieldData.slug,
        externalUrl: createdItem.fieldData['external-url'],
        postSummary: createdItem.fieldData['post-summary'],
        createdOn: createdItem.fieldData['created-on'],
        lastEdited: createdItem.fieldData['last-edited'],
        _draft: createdItem.isDraft,
        _archived: createdItem.isArchived,
      };

      return createdPost;
    } catch (error) {
      console.error(`❌ Error creating article post: ${article.name}`, error);
      throw error;
    }
  }

  /**
   * Sync multiple articles from CSV data
   * NEW METHOD - Batch sync with deduplication
   */
  async syncFromCSV(articles: ScrapedArticle[]): Promise<SyncStats> {
    const stats: SyncStats = {
      totalArticles: articles.length,
      created: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };

    console.log(`🔄 Starting sync of ${articles.length} articles from CSV...`);

    // Get all existing posts for deduplication
    let existingSlugs: Set<string>;
    try {
      const existingPosts = await this.getAllBlogPosts();
      existingSlugs = new Set(existingPosts.map(post => post.slug));
      console.log(`📊 Found ${existingSlugs.size} existing articles in Webflow`);
    } catch (error) {
      console.error('❌ Failed to fetch existing posts, aborting sync');
      stats.errors.push(`Failed to fetch existing posts: ${(error as Error).message}`);
      return stats;
    }

    // Process each article
    for (const article of articles) {
      try {
        // Check if already exists
        if (existingSlugs.has(article.slug)) {
          console.log(`⏭️  Skipping existing article: ${article.name}`);
          stats.skipped++;
          continue;
        }

        // Create new article
        await this.createArticlePost(article);
        stats.created++;

        // Rate limiting: wait 500ms between requests to avoid API throttling
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.error(`❌ Failed to sync article: ${article.name}`, error);
        stats.failed++;
        stats.errors.push(`${article.name}: ${(error as Error).message}`);
      }
    }

    console.log(`✅ Sync completed:`, {
      total: stats.totalArticles,
      created: stats.created,
      skipped: stats.skipped,
      failed: stats.failed,
    });

    return stats;
  }

  /**
   * Get blog posts from a specific collection ID
   * NEW METHOD - For supporting multiple collections
   */
  async getBlogPostsFromCollection(collectionId: string): Promise<WebflowBlogPost[]> {
    try {
      console.log(`🔍 Fetching blog posts from collection: ${collectionId}...`);

      const response = await this.api.get(
        `/v2/collections/${collectionId}/items`
      );

      const items = response.data?.items || [];
      console.log(`📊 Found ${items.length} blog posts in collection ${collectionId}`);

      const blogPosts = items.map((item: any) => ({
        _id: item.id,
        name: item.fieldData.name || item.fieldData.title || '',
        slug: item.fieldData.slug || '',
        _archived: item.isArchived || false,
        _draft: item.isDraft || false,
        url: item.fieldData.url || item.fieldData['external-url'] || '',
        externalUrl: item.fieldData['external-url'] || '',
      }));

      return blogPosts;
    } catch (error) {
      console.error(`❌ Error fetching blog posts from collection ${collectionId}:`, error);
      throw error;
    }
  }
}

/**
 * Create a Webflow API instance
 */
export function createWebflowAPI(): WebflowAPI {
  return new WebflowAPI();
}