import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/server';

export function registerPrompts(server: McpServer): void {
  server.registerPrompt(
    'inspect_desktop',
    {
      title: 'Inspect this Mac',
      description: 'Gather system stats, displays, running apps, and allowed filesystem roots.',
    },
    () => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: [
              'Inspect this Mac using DesktopBridge tools, in order:',
              '1. list_roots',
              '2. get_system_info',
              '3. get_system_stats',
              '4. get_display_info',
              '5. list_applications',
              'Summarize hardware, displays, open apps, and which directories you can read/write.',
            ].join('\n'),
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    'find_file',
    {
      title: 'Find a file',
      description: 'Walk an allowed directory by name glob and optional content regex.',
      argsSchema: z.object({
        directory: z.string().describe('Directory to search, e.g. ~/Desktop'),
        query: z.string().describe('Filename glob or content regex'),
      }),
    },
    ({ directory, query }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Using DesktopBridge, search ${directory} for files matching ${JSON.stringify(query)}. Call list_roots first, then search_files. Return paths, sizes, and a short excerpt for content hits.`,
          },
        },
      ],
    }),
  );
}
