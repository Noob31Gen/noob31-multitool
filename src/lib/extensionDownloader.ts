// Extension Downloader Utility
// Handles direct browser downloading of the MultiTools Helper extension package (.zip)

export interface ExtensionPackageInfo {
  filename: string;
  url: string;
  version: string;
}

export const EXTENSION_PACKAGE_INFO: ExtensionPackageInfo = {
  filename: 'noob31-multitools-extension.zip',
  url: '/multitools-extension.zip',
  version: '1.0.0'
};

/**
 * Triggers a direct browser download of the packaged extension zip
 */
export async function downloadExtensionZip(customFilename?: string): Promise<void> {
  const targetFilename = customFilename || EXTENSION_PACKAGE_INFO.filename;
  const urlsToTry = [
    EXTENSION_PACKAGE_INFO.url,
    '/extension.zip'
  ];

  let blob: Blob | null = null;

  for (const url of urlsToTry) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        blob = await res.blob();
        break;
      }
    } catch {
      // try next URL
    }
  }

  if (!blob) {
    // Fallback: direct anchor link trigger
    const link = document.createElement('a');
    link.href = EXTENSION_PACKAGE_INFO.url;
    link.download = targetFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }

  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = targetFilename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 10000);
}
