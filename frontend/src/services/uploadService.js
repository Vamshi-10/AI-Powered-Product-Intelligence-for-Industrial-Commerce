/**
 * ADHARRA — Upload Service (Isolated Integration Layer)
 * 
 * This service handles client-side file staging and provides mock hooks
 * for future backend API connectivity (FastAPI / Node / Python AI engine).
 */

export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const validateUrl = (url) => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (err) {
    return false;
  }
};

export const ACCEPTED_FILE_TYPES = {
  'application/pdf': ['.pdf'],
  'text/csv': ['.csv'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/json': ['.json'],
  'text/plain': ['.txt'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp']
};

export const ACCEPTED_FILE_EXTENSIONS = [
  'PDF', 'CSV', 'XLSX', 'XLS', 'JSON', 'TXT', 'PNG', 'JPG', 'JPEG', 'WEBP'
];

/**
 * Staged upload simulation (Frontend Mock)
 */
export const stageProductSources = async (sources) => {
  // In production, this would dispatch to backend API endpoints
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        batchId: `batch_${Date.now()}`,
        stagedCount: sources.length,
        timestamp: new Date().toISOString()
      });
    }, 400);
  });
};
