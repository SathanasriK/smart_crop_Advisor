import React from 'react';

interface FormattedContentProps {
  content: string;
  className?: string;
}

// Clean up content by removing unnecessary asterisks and formatting
const cleanContent = (text: string): string => {
  // Remove standalone asterisks that are not part of bold/italic formatting
  let cleaned = text
    // Remove asterisks at start of lines that aren't bullet points (like "* " or "*   ")
    .replace(/^\*\s+/gm, '• ')
    // Remove asterisks used as separators or decoration (like "***" or "* * *")
    .replace(/\*{3,}/g, '')
    .replace(/\*\s*\*\s*\*/g, '')
    // Clean up multiple spaces
    .replace(/\s{3,}/g, '  ')
    // Remove asterisks around colons (like "**:" or ":**")
    .replace(/\*+:/g, ':')
    .replace(/:\*+/g, ':');
  
  return cleaned;
};

// Parse markdown-like content and render it neatly
export const FormattedContent: React.FC<FormattedContentProps> = ({ content, className = '' }) => {
  if (!content) return null;

  // Clean the content first
  const cleanedContent = cleanContent(content);

  // Split content into lines and process
  const lines = cleanedContent.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: { text: string; subItems?: string[] }[] = [];
  let isInList = false;
  let listType: 'bullet' | 'numbered' = 'bullet';

  const flushList = () => {
    if (listItems.length > 0) {
      if (listType === 'numbered') {
        elements.push(
          <ol key={elements.length} className="list-decimal list-inside space-y-2 my-3 ml-1">
            {listItems.map((item, i) => (
              <li key={i} className="text-sm leading-relaxed">
                {formatInlineText(item.text)}
              </li>
            ))}
          </ol>
        );
      } else {
        elements.push(
          <ul key={elements.length} className="space-y-2 my-3">
            {listItems.map((item, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                <span>{formatInlineText(item.text)}</span>
              </li>
            ))}
          </ul>
        );
      }
      listItems = [];
      isInList = false;
    }
  };

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();

    // Skip empty lines but flush list
    if (!trimmedLine) {
      flushList();
      return;
    }

    // Check for headers (## or ### or **)
    const h2Match = trimmedLine.match(/^##\s+(.+)$/);
    const h3Match = trimmedLine.match(/^###\s+(.+)$/);
    // Match bold headers like "**Header:**" or "**Header**"
    const boldHeaderMatch = trimmedLine.match(/^\*\*([^*]+)\*\*:?\s*$/);

    if (h2Match) {
      flushList();
      elements.push(
        <h3 key={index} className="font-semibold text-base text-foreground mt-4 mb-2 first:mt-0">
          {formatInlineText(h2Match[1])}
        </h3>
      );
      return;
    }

    if (h3Match) {
      flushList();
      elements.push(
        <h4 key={index} className="font-medium text-sm text-foreground mt-3 mb-1.5 first:mt-0">
          {formatInlineText(h3Match[1])}
        </h4>
      );
      return;
    }

    if (boldHeaderMatch) {
      flushList();
      elements.push(
        <h4 key={index} className="font-semibold text-sm text-foreground mt-3 mb-1.5 first:mt-0">
          {boldHeaderMatch[1].replace(/\*+/g, '')}
        </h4>
      );
      return;
    }

    // Check for bullet points (-, *, •)
    const bulletMatch = trimmedLine.match(/^[-•]\s+(.+)$/);
    // Also match lines starting with just * and content
    const asteriskBulletMatch = trimmedLine.match(/^\*\s+(.+)$/);
    const matchedBullet = bulletMatch || asteriskBulletMatch;
    
    if (matchedBullet) {
      if (!isInList) {
        flushList();
        isInList = true;
        listType = 'bullet';
      }
      // Clean up any remaining asterisks in the bullet text
      const bulletText = matchedBullet[1].replace(/^\*+\s*/, '').replace(/\*+$/, '');
      listItems.push({ text: bulletText });
      return;
    }

    // Check for numbered lists (1., 2., etc.)
    const numberedMatch = trimmedLine.match(/^\d+[.)]\s+(.+)$/);
    if (numberedMatch) {
      if (!isInList) {
        flushList();
        isInList = true;
        listType = 'numbered';
      }
      listItems.push({ text: numberedMatch[1] });
      return;
    }

    // Regular paragraph - clean up asterisks
    flushList();
    const cleanedLine = trimmedLine
      .replace(/^\*+\s*/, '')
      .replace(/\s*\*+$/, '');
    
    if (cleanedLine) {
      elements.push(
        <p key={index} className="text-sm leading-relaxed my-2">
          {formatInlineText(cleanedLine)}
        </p>
      );
    }
  });

  // Flush any remaining list
  flushList();

  return <div className={`formatted-content space-y-1 ${className}`}>{elements}</div>;
};

// Format inline text (bold, italic, etc.)
function formatInlineText(text: string): React.ReactNode {
  // Clean up any stray asterisks first
  let cleanedText = text
    // Convert **text** to bold markers
    .replace(/\*\*\*+/g, '**')
    // Remove single asterisks that aren't part of formatting
    .replace(/(?<!\*)\*(?!\*)/g, '');

  const parts: React.ReactNode[] = [];
  const boldRegex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match;
  let keyIndex = 0;

  while ((match = boldRegex.exec(cleanedText)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(cleanedText.slice(lastIndex, match.index));
    }
    // Add the bold text
    parts.push(<strong key={keyIndex++} className="font-semibold">{match[1]}</strong>);
    lastIndex = boldRegex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < cleanedText.length) {
    parts.push(cleanedText.slice(lastIndex));
  }

  return parts.length > 0 ? parts : cleanedText;
}

export default FormattedContent;
