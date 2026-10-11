'use client';

/** The source's supportAttachment endpoint has no approved Storage backend yet. */
export function useV2SupportUpload() {
  return {
    isUploading: false,
    startUpload: async (_files: File[]): Promise<{ url: string; ufsUrl?: string; name: string; size: number; type: string }[]> => {
      throw new Error('Support attachments are awaiting Supabase Storage integration.');
    },
  };
}
