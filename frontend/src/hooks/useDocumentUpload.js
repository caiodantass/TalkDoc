import { useState } from 'react';
import { documentService } from '../services/api';

export const useDocumentUpload = () => {
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle, uploading, success, error
  const [uploadError, setUploadError] = useState('');

  const handleUpload = async (selectedFile) => {
    if (!selectedFile) return false;
    
    setFile(selectedFile);
    setUploadStatus('uploading');
    setUploadError('');

    try {
      await documentService.uploadDocument(selectedFile);
      setUploadStatus('success');
      return true;
    } catch (err) {
      setUploadStatus('error');
      setUploadError(err.message);
      return false;
    }
  };

  const resetUpload = () => {
    setFile(null);
    setUploadStatus('idle');
    setUploadError('');
  };

  const setFileDirectly = (fileObj, status = 'success') => {
    setFile(fileObj);
    setUploadStatus(status);
    setUploadError('');
  };

  return {
    file,
    uploadStatus,
    uploadError,
    handleUpload,
    resetUpload,
    setFileDirectly
  };
};
