/**
 * Publication Gate State Machine
 *
 * Enforces editorial state transitions:
 * idea -> candidate -> draft -> validation -> review -> approved -> published
 *
 * Side exits:
 * candidate -> rejected
 * draft -> rejected
 * review -> rejected
 * published -> archived
 *
 * Rule: Direct automatic publishing is strictly allowed for 'update' type only.
 * Journal/Essay/Note types MUST stop at 'review' and require human approval.
 */

import { validateAntiSlop, validateLengthClass } from './voice-validator.js';

export const ALLOWED_TRANSITIONS = {
  idea: ['candidate', 'rejected', 'archived'],
  candidate: ['draft', 'idea', 'rejected', 'archived'],
  draft: ['validation', 'candidate', 'rejected', 'archived'],
  validation: ['review', 'draft', 'rejected'],
  review: ['approved', 'draft', 'rejected'],
  approved: ['published', 'review', 'rejected'],
  published: ['archived'], // published -> draft is explicitly disallowed; edit creates revision
  rejected: ['idea', 'archived'],
  archived: ['idea']
};

export function canTransition(currentStatus, nextStatus) {
  if (currentStatus === nextStatus) return true;
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
  return allowed.includes(nextStatus);
}

/**
 * Detects actual unfinished scaffolding while permitting legitimate
 * technical/editorial prose discussing placeholder or filler concepts.
 */
export function detectUnfinishedScaffolding(contentMarkdown = '', title = '') {
  const cleanTitle = String(title || '').trim();
  const cleanContent = String(contentMarkdown || '').trim();

  // 1. Placeholder or dummy titles
  const placeholderTitlePattern = /^\s*(?:placeholder(?:\s+title)?|tbd(?:\s+title)?|untitled(?:\s+draft)?|draft(?:\s+content)?|test\s+title)\s*$/i;
  const bracketedTitlePattern = /(?:\[|<|\{\{)\s*(?:placeholder|tbd|insert\s+title|title\s+goes\s+here)\s*(?:\]|>|\}\})/i;
  if (placeholderTitlePattern.test(cleanTitle) || bracketedTitlePattern.test(cleanTitle)) {
    return {
      isScaffolding: true,
      reason: `Title "${cleanTitle}" contains placeholder scaffolding`
    };
  }

  // 2. Explicit template scaffolding tags (bracketed or fenced)
  const templateTagPattern = /(?:\[|<|\{\{)\s*(?:insert\s+text(?:\s+here)?|text\s+goes\s+here|content\s+tbd|body\s+placeholder|to\s+be\s+added|to\s+be\s+written|insert\s+content|draft\s+content)\s*(?:\]|>|\}\})/i;
  if (templateTagPattern.test(cleanContent)) {
    return {
      isScaffolding: true,
      reason: 'Content contains explicit template scaffolding markers (e.g. [insert text here])'
    };
  }

  // 3. Standalone TODO / FIXME drafting directives
  const todoDirectivePattern = /(?:^|\n)\s*(?:TODO|FIXME|XXX):\s*(?:write|finish|add|flesh\s+out|complete|expand|draft)\b/i;
  if (todoDirectivePattern.test(cleanContent)) {
    return {
      isScaffolding: true,
      reason: 'Content contains unfinished TODO drafting directives'
    };
  }

  // 4. Standalone placeholder headings
  const placeholderHeadingPattern = /(?:^|\n)\s*#+\s*(?:placeholder|tbd|todo|to\s+be\s+written|coming\s+soon)\s*(?:\n|$)/i;
  if (placeholderHeadingPattern.test(cleanContent)) {
    return {
      isScaffolding: true,
      reason: 'Content contains standalone placeholder headings'
    };
  }

  // 5. Standalone single-word or isolated placeholder lines
  const isolatedPlaceholderLine = /(?:^|\n)\s*(?:\[?(?:placeholder|tbd|to\s+be\s+added|to\s+be\s+written|insert\s+content)\]?)\s*(?:\n|$)/i;
  if (isolatedPlaceholderLine.test(cleanContent)) {
    return {
      isScaffolding: true,
      reason: 'Content contains standalone placeholder line'
    };
  }

  // 6. Latin dummy filler block
  if (/\blorem\s+ipsum\s+dolor\s+sit\s+amet\b/i.test(cleanContent)) {
    return {
      isScaffolding: true,
      reason: 'Content contains dummy Latin filler block (Lorem Ipsum)'
    };
  }

  return { isScaffolding: false };
}

export function validateGateTransition({
  post,
  targetStatus,
  isAutomated = false
}) {
  if (!canTransition(post.status, targetStatus)) {
    return {
      allowed: false,
      reason: `Illegal state transition from "${post.status}" to "${targetStatus}"`
    };
  }

  // Content requirements for drafting and publishing
  if (['draft', 'validation', 'review', 'approved', 'published'].includes(targetStatus)) {
    if (!post.content_markdown || String(post.content_markdown).trim().length === 0) {
      return {
        allowed: false,
        reason: `Transition to "${targetStatus}" requires non-empty content_markdown`
      };
    }
  }

  // Scaffolding / Placeholder protection on publication
  if (targetStatus === 'published') {
    const scaffoldingCheck = detectUnfinishedScaffolding(post.content_markdown, post.title);
    if (scaffoldingCheck.isScaffolding) {
      return {
        allowed: false,
        reason: `Transition to "published" blocked: ${scaffoldingCheck.reason}`
      };
    }
  }

  // Distinguish machine approval from mandatory human approval on automated publishing
  if (isAutomated && targetStatus === 'published') {
    const requiresHuman = post.requires_human_approval === true ||
      post.approval_mode === 'human_required' ||
      post.approval_mode === 'mandatory_human_review' ||
      post.escalated_to_human === true;

    if (requiresHuman) {
      return {
        allowed: false,
        reason: `Automated publishing rejected: post "${post.title}" requires mandatory human approval before publication.`
      };
    }

    // Automated quality checks for eligible automatic content
    const slopCheck = validateAntiSlop(post.content_markdown);
    if (!slopCheck.valid) {
      return {
        allowed: false,
        reason: `Automated quality gate rejected: ${slopCheck.reason}`
      };
    }

    // Length class validation applies to editorial prose types (excluding factual release bulletins)
    if (post.type !== 'update') {
      const lengthCheck = validateLengthClass(post.type, post.content_markdown);
      if (!lengthCheck.valid) {
        return {
          allowed: false,
          reason: `Automated quality gate rejected: ${lengthCheck.reason}`
        };
      }
    }
  }

  return { allowed: true };
}
