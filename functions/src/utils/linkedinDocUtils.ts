import { getGoogleDocsAPI } from "./auth";
import { LinkedInPostGeneration } from "./linkedinPostUtils";
import { ExcelRowData } from "../webflow/urlProcessor";

// The target Google Doc ID provided by the user
const LINKEDIN_DOC_ID = "1qodmdOerChXLDMBHne2OYPUvk8QeMOm9FAuoYP2Nkn4";

export interface DocUpdateResult {
  success: boolean;
  docId: string;
  url: string;
  error?: string;
}

/**
 * Update the LinkedIn Google Doc with new content
 */
export async function updateLinkedInDoc(
  rowData: ExcelRowData,
  linkedinGeneration: LinkedInPostGeneration
): Promise<DocUpdateResult> {
  try {
    console.log(`📝 Updating LinkedIn Google Doc for: ${linkedinGeneration.url}`);

    const docs = await getGoogleDocsAPI();

    // Get current document to find where to append
    const doc = await docs.documents.get({
      documentId: LINKEDIN_DOC_ID,
    });

    if (!doc.data.body || !doc.data.body.content) {
      throw new Error("Could not access document content");
    }

    // Find the end of the document
    const endIndex = doc.data.body.content[doc.data.body.content.length - 1].endIndex! - 1;

    // Format the content according to the user's specification
    const formattedContent = formatDocContent(rowData, linkedinGeneration);

    // Insert the new content at the end of the document
    await docs.documents.batchUpdate({
      documentId: LINKEDIN_DOC_ID,
      requestBody: {
        requests: [
          {
            insertText: {
              location: {
                index: endIndex,
              },
              text: formattedContent,
            },
          },
        ],
      },
    });

    console.log(`✅ Successfully updated LinkedIn Google Doc`);

    return {
      success: true,
      docId: LINKEDIN_DOC_ID,
      url: `https://docs.google.com/document/d/${LINKEDIN_DOC_ID}/edit`,
    };

  } catch (error) {
    console.error(`❌ Error updating LinkedIn Google Doc:`, error);
    return {
      success: false,
      docId: LINKEDIN_DOC_ID,
      url: `https://docs.google.com/document/d/${LINKEDIN_DOC_ID}/edit`,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Format content according to the specified structure
 */
function formatDocContent(
  rowData: ExcelRowData,
  linkedinGeneration: LinkedInPostGeneration
): string {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Extract name from URL or use title
  const articleName = linkedinGeneration.title || extractNameFromUrl(rowData.url);

  const content = `
Date: ${currentDate}
URL: ${rowData.url}
Name: ${articleName}
Post Summary: ${rowData.postSummary || 'Generated from article content'}

LinkedIn Posts (ChatGPT output):

=== POST VERSION 1 ===
${linkedinGeneration.post1.content}

=== POST VERSION 2 ===
${linkedinGeneration.post2.content}

=====================================

`;

  return content;
}

/**
 * Extract a readable name from URL
 */
function extractNameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;

    // Remove leading/trailing slashes and split by '/'
    const segments = pathname.replace(/^\/+|\/+$/g, '').split('/');

    // Get the last segment (usually the article slug)
    const lastSegment = segments[segments.length - 1];

    if (lastSegment && lastSegment !== '') {
      // Convert slug to readable title
      return lastSegment
        .replace(/[-_]/g, ' ')
        .replace(/\.[^/.]+$/, '') // Remove file extension
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
    }

    // Fallback to hostname
    return urlObj.hostname.replace('www.', '');
  } catch {
    return 'Article';
  }
}

/**
 * Update multiple entries in the LinkedIn doc
 */
export async function updateLinkedInDocBatch(
  entries: Array<{
    rowData: ExcelRowData;
    linkedinGeneration: LinkedInPostGeneration;
  }>
): Promise<DocUpdateResult[]> {
  console.log(`📝 Batch updating LinkedIn Google Doc with ${entries.length} entries`);

  const results: DocUpdateResult[] = [];

  try {
    const docs = await getGoogleDocsAPI();

    // Get current document to find where to append
    const doc = await docs.documents.get({
      documentId: LINKEDIN_DOC_ID,
    });

    if (!doc.data.body || !doc.data.body.content) {
      throw new Error("Could not access document content");
    }

    // Prepare all content at once
    let allContent = "";
    for (const entry of entries) {
      allContent += formatDocContent(entry.rowData, entry.linkedinGeneration);
    }

    // Find the end of the document
    const endIndex = doc.data.body.content[doc.data.body.content.length - 1].endIndex! - 1;

    // Insert all content at once for efficiency
    await docs.documents.batchUpdate({
      documentId: LINKEDIN_DOC_ID,
      requestBody: {
        requests: [
          {
            insertText: {
              location: {
                index: endIndex,
              },
              text: allContent,
            },
          },
        ],
      },
    });

    console.log(`✅ Successfully batch updated LinkedIn Google Doc with ${entries.length} entries`);

    // Create success results for all entries
    for (let i = 0; i < entries.length; i++) {
      results.push({
        success: true,
        docId: LINKEDIN_DOC_ID,
        url: `https://docs.google.com/document/d/${LINKEDIN_DOC_ID}/edit`,
      });
    }

  } catch (error) {
    console.error(`❌ Error batch updating LinkedIn Google Doc:`, error);

    // Create error results for all entries
    for (let i = 0; i < entries.length; i++) {
      results.push({
        success: false,
        docId: LINKEDIN_DOC_ID,
        url: `https://docs.google.com/document/d/${LINKEDIN_DOC_ID}/edit`,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}

/**
 * Test the Google Doc connection and permissions
 */
export async function testLinkedInDocAccess(): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`🔍 Testing access to LinkedIn Google Doc: ${LINKEDIN_DOC_ID}`);

    const docs = await getGoogleDocsAPI();

    // Try to read the document
    const doc = await docs.documents.get({
      documentId: LINKEDIN_DOC_ID,
    });

    if (!doc.data) {
      throw new Error("Could not access document data");
    }

    console.log(`✅ LinkedIn Google Doc access test successful`);
    console.log(`📄 Document title: ${doc.data.title}`);

    return { success: true };

  } catch (error) {
    console.error(`❌ LinkedIn Google Doc access test failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Get the current content length of the LinkedIn doc
 */
export async function getLinkedInDocInfo(): Promise<{
  title: string;
  wordCount: number;
  lastModified: string;
  url: string;
}> {
  try {
    const docs = await getGoogleDocsAPI();

    const doc = await docs.documents.get({
      documentId: LINKEDIN_DOC_ID,
    });

    if (!doc.data.body || !doc.data.body.content) {
      throw new Error("Could not access document content");
    }

    // Extract text content for word count
    let textContent = "";
    for (const element of doc.data.body.content) {
      if (element.paragraph && element.paragraph.elements) {
        for (const textElement of element.paragraph.elements) {
          if (textElement.textRun && textElement.textRun.content) {
            textContent += textElement.textRun.content;
          }
        }
      }
    }

    const wordCount = textContent.split(/\s+/).filter(word => word.length > 0).length;

    return {
      title: doc.data.title || "LinkedIn Content Document",
      wordCount,
      lastModified: doc.data.revisionId || new Date().toISOString(),
      url: `https://docs.google.com/document/d/${LINKEDIN_DOC_ID}/edit`,
    };

  } catch (error) {
    console.error(`❌ Error getting LinkedIn doc info:`, error);
    throw error;
  }
}