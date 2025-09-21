import axios, { AxiosInstance } from 'axios';
import * as functions from 'firebase-functions';

export interface WebflowBlogPost {
  _id?: string;
  name: string;
  slug: string;
  _archived?: boolean;
  _draft?: boolean;
  url?: string;
  postSummary?: string;
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
          'post-summary': blogPost.postSummary || '',
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
}

/**
 * Create a Webflow API instance
 */
export function createWebflowAPI(): WebflowAPI {
  return new WebflowAPI();
}