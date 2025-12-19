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
 */
export const openEmailReply = (options: EmailReplyOptions): void => {
  const { to, subject, body = '', cc, bcc } = options;

  // Build the mailto link with all parameters
  let mailtoLink = `mailto:${encodeURIComponent(to)}`;

  const params = new URLSearchParams();
  params.append('subject', subject);
  if (body) {
    params.append('body', body);
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

  // Open the mailto link
  window.location.href = mailtoLink;
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
