/**
 * Utility functions for email handling
 */

export interface EmailReplyOptions {
  to: string;
  subject: string;
  body?: string;
  cc?: string;
  bcc?: string;
}

/**
 * Opens the default email client with a pre-filled reply
 * Encodes the mailto link with all necessary parameters
 * Works with Outlook if it's set as the default email client on Windows
 * Handles long email bodies by truncating if necessary (URL length limits ~2000 chars)
 */
export const openEmailReply = (options: EmailReplyOptions): void => {
  const { to, subject, body = '', cc, bcc } = options;

  // Build the mailto link with all parameters
  let mailtoLink = `mailto:${encodeURIComponent(to)}`;

  const params = new URLSearchParams();
  params.append('subject', subject);
  
  // Handle body - truncate if too long to avoid URL length limits
  // Most browsers support ~2000 chars for mailto: URLs, so we limit to ~1500 chars for safety
  if (body) {
    const maxBodyLength = 1500;
    let processedBody = body;
    
    // If body is too long, truncate and add a note
    if (processedBody.length > maxBodyLength) {
      processedBody = processedBody.substring(0, maxBodyLength - 100) + 
        '\n\n[Message truncated - full message visible in contact submission details]';
    }
    
    // Properly encode the body to handle special characters and line breaks
    params.append('body', processedBody);
  }
  
  if (cc) {
    params.append('cc', cc);
  }
  if (bcc) {
    params.append('bcc', bcc);
  }

  const queryString = params.toString();
  if (queryString) {
    mailtoLink += `?${queryString}`;
  }

  // Open the mailto link - this will open the default email client
  // On Windows, if Outlook is set as default, it will open Outlook
  try {
    const link = document.createElement('a');
    link.href = mailtoLink;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    
    // Clean up after a short delay to ensure click is processed
    setTimeout(() => {
      document.body.removeChild(link);
    }, 100);
  } catch (error) {
    console.error('Error opening email client:', error);
    // Fallback: try using window.location as last resort
    window.location.href = mailtoLink;
  }
};

/**
 * Creates a reply body with the original message quoted
 */
export const createReplyBody = (
  originalSender: string,
  originalMessage: string,
  submissionDate: string
): string => {
  const replySeparator = '\n\n---\n';
  const quotedMessage = `\n\nOn ${submissionDate}, ${originalSender} wrote:\n> ${originalMessage.split('\n').join('\n> ')}`;
  return `\n\n[Please type your reply above this line]\n${replySeparator}${quotedMessage}`;
};

/**
 * Generates a subject line for a reply, adding "Re:" if not already present
 */
export const generateReplySubject = (originalSubject: string): string => {
  if (originalSubject.toUpperCase().startsWith('RE:')) {
    return originalSubject;
  }
  return `Re: ${originalSubject}`;
};
