// src/utils/htmlHelpers.tsx
import React from 'react';
import { Box } from '@mui/material';

/**
 * Strips HTML tags from a string, leaving only plain text
 * Useful for character counting and validation
 */
export const stripHtmlTags = (html: string): string => {
  if (!html) return '';

  // Create a temporary div element to parse HTML
  const temp = document.createElement('div');
  temp.innerHTML = html;

  // Return text content, which automatically strips tags
  return temp.textContent || temp.innerText || '';
};

/**
 * Converts HTML to plain text while preserving structure
 * Preserves line breaks, list bullets, and basic structure
 * Note: This removes ALL formatting (bold, italic, etc.) for plain text output
 */
export const htmlToPlainText = (html: string): string => {
  if (!html) return '';

  let text = html;

  // Replace closing paragraph tags with line breaks
  text = text.replace(/<\/p>/gi, '\n');

  // Replace br tags with line breaks
  text = text.replace(/<br\s*\/?>/gi, '\n');

  // Replace list items with bullets
  text = text.replace(/<li>/gi, '\n• ');
  text = text.replace(/<\/li>/gi, '');

  // Replace headings with content and line breaks
  text = text.replace(/<\/h[1-6]>/gi, '\n');

  // Replace blockquote with indentation
  text = text.replace(/<blockquote>/gi, '\n  ');
  text = text.replace(/<\/blockquote>/gi, '\n');

  // Remove all other HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // Decode HTML entities
  const temp = document.createElement('div');
  temp.innerHTML = text;
  text = temp.textContent || temp.innerText || '';

  // Clean up multiple line breaks
  text = text.replace(/\n{3,}/g, '\n\n');

  // Trim leading/trailing whitespace
  return text.trim();
};

/**
 * Copies HTML content to clipboard with formatting preserved
 * When pasted into rich text editors (LinkedIn, email, etc.), formatting is maintained
 * Includes plain text fallback for compatibility
 */
export const copyHtmlToClipboard = async (html: string): Promise<void> => {
  if (!html) {
    throw new Error('No content to copy');
  }

  try {
    // Check if the modern Clipboard API is available
    if (navigator.clipboard && window.ClipboardItem) {
      // Create both HTML and plain text versions
      const plainText = htmlToPlainText(html);

      // Create a ClipboardItem with both MIME types
      const clipboardItem = new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([plainText], { type: 'text/plain' }),
      });

      // Write to clipboard
      await navigator.clipboard.write([clipboardItem]);
    } else {
      // Fallback for older browsers: copy as plain text
      const plainText = htmlToPlainText(html);
      await navigator.clipboard.writeText(plainText);
      console.warn('Rich text clipboard not supported, copied as plain text');
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    throw error;
  }
};

/**
 * Component for safely rendering HTML content
 * Sanitizes HTML to prevent XSS attacks while preserving formatting
 */
interface SafeHtmlRendererProps {
  html: string;
  sx?: any;
}

export const SafeHtmlRenderer: React.FC<SafeHtmlRendererProps> = ({ html, sx = {} }) => {
  if (!html) return null;

  // Basic sanitization: only allow safe tags
  // For production, consider using DOMPurify library
  const sanitize = (htmlContent: string): string => {
    const allowedTags = [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote'
    ];

    // Create a temporary div
    const temp = document.createElement('div');
    temp.innerHTML = htmlContent;

    // Walk through all elements
    const walk = (node: Node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as Element;
        const tagName = element.tagName.toLowerCase();

        // Remove if not in allowed tags
        if (!allowedTags.includes(tagName)) {
          // But preserve the text content
          const textNode = document.createTextNode(element.textContent || '');
          element.parentNode?.replaceChild(textNode, element);
          return;
        }

        // Remove all attributes except safe ones
        Array.from(element.attributes).forEach(attr => {
          element.removeAttribute(attr.name);
        });
      }

      // Recursively process children
      Array.from(node.childNodes).forEach(child => walk(child));
    };

    walk(temp);
    return temp.innerHTML;
  };

  const sanitizedHtml = sanitize(html);

  return (
    <Box
      sx={{
        '& p': {
          margin: '8px 0',
          lineHeight: 1.6,
        },
        '& h1': {
          fontSize: '24px',
          fontWeight: 700,
          margin: '16px 0 8px 0',
          lineHeight: 1.3,
        },
        '& h2': {
          fontSize: '20px',
          fontWeight: 600,
          margin: '14px 0 6px 0',
          lineHeight: 1.3,
        },
        '& h3': {
          fontSize: '18px',
          fontWeight: 600,
          margin: '12px 0 6px 0',
          lineHeight: 1.3,
        },
        '& h4': {
          fontSize: '16px',
          fontWeight: 600,
          margin: '10px 0 4px 0',
          lineHeight: 1.3,
        },
        '& ul, & ol': {
          margin: '12px 0',
          paddingLeft: '24px',
        },
        '& li': {
          margin: '4px 0',
          lineHeight: 1.5,
        },
        '& blockquote': {
          borderLeft: '4px solid #e0e0e0',
          padding: '12px 16px',
          margin: '16px 0',
          fontStyle: 'italic',
          color: '#666',
          background: '#f9f9f9',
          borderRadius: '0 4px 4px 0',
        },
        '& strong, & b': {
          fontWeight: 600,
        },
        '& em, & i': {
          fontStyle: 'italic',
        },
        '& u': {
          textDecoration: 'underline',
        },
        ...sx,
      }}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
};

/**
 * Validates that HTML content is not empty (ignoring HTML tags)
 */
export const isHtmlEmpty = (html: string): boolean => {
  const text = stripHtmlTags(html);
  return text.trim().length === 0;
};

/**
 * Gets the character count of HTML content (excluding HTML tags)
 */
export const getHtmlCharCount = (html: string): number => {
  return stripHtmlTags(html).length;
};
