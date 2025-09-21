import axios from "axios";
import * as cheerio from "cheerio";

export interface ExtractedContent {
  url: string;
  title: string;
  content: string;
  wordCount: number;
  extractedAt: string;
}

/**
 * Extract content from a URL using web scraping
 */
export async function extractContentFromUrl(url: string): Promise<ExtractedContent> {
  try {
    console.log(`🔍 Extracting content from: ${url}`);

    // Normalize URL
    const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;

    // Fetch the webpage
    const response = await axios.get(normalizedUrl, {
      timeout: 30000, // 30 second timeout
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate",
        "Connection": "keep-alive",
      },
    });

    const $ = cheerio.load(response.data);

    // Extract title
    let title = $("title").text().trim();
    if (!title) {
      title = $("h1").first().text().trim();
    }
    if (!title) {
      title = $('meta[property="og:title"]').attr("content") || "";
    }

    // Remove unwanted elements
    $("script, style, nav, header, footer, aside, .nav, .navbar, .sidebar, .menu, .advertisement, .ads, .social-share, .comments, .related-posts").remove();

    // Try different content extraction strategies
    let content = "";

    // Strategy 1: Look for article content selectors
    const articleSelectors = [
      'article',
      '[role="main"]',
      '.article-content',
      '.post-content',
      '.entry-content',
      '.content',
      '.post-body',
      '.article-body',
      '.story-body',
      '.text-content',
      'main',
    ];

    for (const selector of articleSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        content = element.text().trim();
        if (content.length > 500) { // Minimum content length threshold
          console.log(`✅ Content extracted using selector: ${selector}`);
          break;
        }
      }
    }

    // Strategy 2: If no good content found, try paragraph extraction
    if (content.length < 500) {
      console.log("📝 Trying paragraph extraction strategy...");
      const paragraphs = $("p").map((_, el) => $(el).text().trim()).get();
      content = paragraphs.filter(p => p.length > 50).join("\n\n");
    }

    // Strategy 3: Last resort - body content with better filtering
    if (content.length < 500) {
      console.log("📄 Using body content as fallback...");
      $("header, footer, nav, aside, .header, .footer, .nav, .sidebar").remove();
      content = $("body").text().trim();
    }

    // Clean up the content
    content = cleanContent(content);

    // Calculate word count
    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;

    if (content.length < 200) {
      throw new Error(`Insufficient content extracted (${content.length} characters, ${wordCount} words)`);
    }

    const result: ExtractedContent = {
      url: normalizedUrl,
      title: title || "Untitled Article",
      content,
      wordCount,
      extractedAt: new Date().toISOString(),
    };

    console.log(`✅ Content extraction successful:`, {
      url: result.url,
      title: result.title,
      contentLength: result.content.length,
      wordCount: result.wordCount,
    });

    return result;

  } catch (error) {
    console.error(`❌ Error extracting content from ${url}:`, error);
    throw new Error(`Failed to extract content from ${url}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Clean and normalize extracted content
 */
function cleanContent(content: string): string {
  return content
    // Normalize whitespace
    .replace(/\s+/g, " ")
    // Remove multiple consecutive newlines
    .replace(/\n\s*\n\s*\n/g, "\n\n")
    // Remove extra spaces around newlines
    .replace(/\s*\n\s*/g, "\n")
    // Remove leading/trailing whitespace
    .trim()
    // Remove common unwanted phrases
    .replace(/\b(click here|read more|subscribe|newsletter|cookie policy|privacy policy|terms of service)\b/gi, "")
    // Remove URLs from content
    .replace(/https?:\/\/[^\s]+/g, "")
    // Remove email addresses
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, "")
    // Clean up punctuation spacing
    .replace(/\s+([,.!?;:])/g, "$1")
    .replace(/([,.!?;:])\s*([,.!?;:])/g, "$1 $2")
    // Final cleanup
    .trim();
}

/**
 * Extract content from multiple URLs
 */
export async function extractContentFromUrls(urls: string[]): Promise<(ExtractedContent | null)[]> {
  console.log(`🔍 Extracting content from ${urls.length} URLs...`);

  const results: (ExtractedContent | null)[] = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    console.log(`\n⏳ Processing ${i + 1}/${urls.length}: ${url}`);

    try {
      const content = await extractContentFromUrl(url);
      results.push(content);
      console.log(`✅ Success: ${content.wordCount} words extracted`);
    } catch (error) {
      console.error(`❌ Failed to extract content from ${url}:`, error);
      results.push(null);
    }

    // Add delay between requests to be respectful
    if (i < urls.length - 1) {
      console.log("⏱️ Waiting 2 seconds before next request...");
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  const successCount = results.filter(r => r !== null).length;
  console.log(`\n📊 Content extraction completed: ${successCount}/${urls.length} successful`);

  return results;
}