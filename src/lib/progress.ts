export type ProgressContext = {
  mcpReq?: {
    _meta?: { progressToken?: string | number };
    notify?: (notification: {
      method: string;
      params: {
        progressToken: string | number;
        progress: number;
        total?: number;
        message?: string;
      };
    }) => Promise<void>;
  };
};

export async function reportProgress(
  ctx: ProgressContext | undefined,
  progress: number,
  message?: string,
  total?: number,
): Promise<void> {
  const token = ctx?.mcpReq?._meta?.progressToken;
  const notify = ctx?.mcpReq?.notify;
  if (token === undefined || !notify) {
    return;
  }
  try {
    await notify({
      method: 'notifications/progress',
      params: { progressToken: token, progress, total, message },
    });
  } catch {
    // Hosts that do not subscribe to progress should not fail the tool.
  }
}
