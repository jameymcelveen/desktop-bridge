import type { CallToolResult } from '@modelcontextprotocol/server';
import { errorMessage } from '../errors.js';

export function textResult(text: string, isError = false): CallToolResult {
  return {
    content: [{ type: 'text', text }],
    isError,
  };
}

export function jsonResult(value: unknown, isError = false): CallToolResult {
  return textResult(JSON.stringify(value, null, 2), isError);
}

export function toolError(err: unknown): CallToolResult {
  return textResult(errorMessage(err), true);
}
