/**
 * @file Axios HTTP client configuration for the FairAI backend API.
 * @module api/client
 * @description
 * Provides a pre-configured Axios instance with:
 * - Base URL from VITE_API_BASE environment variable (default: http://localhost:8000)
 * - Automatic JWT token injection from localStorage
 * - Standardized error handling
 * - Helper methods for file uploads and downloads
 * 
 * @example
 * // Basic usage
 * import apiClient, { postEvaluate, downloadBlob } from './api/client';
 * 
 * // Make authenticated requests
 * const response = await apiClient.get('/api/some-endpoint');
 * 
 * // Upload model for evaluation
 * const formData = new FormData();
 * formData.append('file', file);
 * const result = await postEvaluate(formData);
 */

import axios from 'axios';

// Use environment variable if available, otherwise default to localhost:8000
const API_BASE = (import.meta && import.meta.env && import.meta.env.VITE_API_BASE) || 'http://localhost:8000';

console.log('API Base URL:', API_BASE); // For debugging
const DEFAULT_TIMEOUT = 120000; // ms

/**
 * Configured Axios instance with base settings
 * @type {import('axios').AxiosInstance}
 */
const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: DEFAULT_TIMEOUT,
  headers: {
    'Accept': 'application/json',
  },
});

// Request interceptor: attach bearer token (if present)
apiClient.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch (e) {
      // ignore localStorage errors in some environments
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: normalize errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      return Promise.reject({
        status: error.response.status,
        data: error.response.data,
        message: error.response.data?.error || error.response.statusText || error.message,
      });
    }
    return Promise.reject({ message: error.message });
  }
);

/**
 * Uploads a model file for fairness evaluation
 * @async
 * @param {FormData} formData - Form data containing the model file and any additional parameters
 * @param {import('axios').AxiosRequestConfig['onUploadProgress']} [onUploadProgress] - Optional progress callback
 * @returns {Promise<import('axios').AxiosResponse<Blob>>} Response containing the evaluation results as a Blob
 * @throws {Object} Error object with status, data, and message properties
 * 
 * @example
 * const formData = new FormData();
 * formData.append('file', fileInput.files[0]);
 * formData.append('modelType', 'loan');
 * 
 * try {
 *   const response = await postEvaluate(formData, (progressEvent) => {
 *     const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
 *     console.log(`Upload Progress: ${percentCompleted}%`);
 *   });
 *   // Handle successful response
 * } catch (error) {
 *   console.error('Evaluation failed:', error.message);
 * }
 */
/**
 * Uploads a face recognition model for bias evaluation
 * @async
 * @param {FormData} formData - Form data containing the model file, config file, and optional dataset
 * @param {number} [threshold=0.5] - Confidence threshold for face recognition
 * @param {import('axios').AxiosRequestConfig['onUploadProgress']} [onUploadProgress] - Optional progress callback
 * @returns {Promise<Object>} Response containing the evaluation results
 * @throws {Object} Error object with status, data, and message properties
 */
export async function postFaceEvaluate(formData, threshold = 0.5, onUploadProgress) {
  formData.append('threshold', threshold);
  
  const resp = await apiClient.post('/api/face/evaluate', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress,
  });
  
  return resp.data;
}

/**
 * Uploads a model file for loan approval evaluation
 * @async
 * @param {FormData} formData - Form data containing the model file and any additional parameters
 * @param {import('axios').AxiosRequestConfig['onUploadProgress']} [onUploadProgress] - Optional progress callback
 * @returns {Promise<import('axios').AxiosResponse<Blob>>} Response containing the evaluation results as a Blob
 * @throws {Object} Error object with status, data, and message properties
 */
export async function postEvaluate(formData, onUploadProgress) {
  const resp = await apiClient.post('/api/loan/evaluate', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    responseType: 'blob',
    onUploadProgress,
  });
  return resp; // caller can access resp.data (Blob) and resp.headers
}

/**
 * Triggers a file download in the browser for the given Blob
 * @param {Blob} blob - The Blob object to download
 * @param {string} [filename='fairness_results.zip'] - The default filename for the downloaded file
 * 
 * @example
 * // After receiving a blob from postEvaluate
 * downloadBlob(response.data, 'evaluation_results.zip');
 */
export function downloadBlob(blob, filename = 'fairness_results.zip') {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default apiClient;
