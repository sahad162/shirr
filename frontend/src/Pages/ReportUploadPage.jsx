import React, { useState, useRef } from 'react';
import { Upload, File, CheckCircle, XCircle, AlertCircle, X } from 'lucide-react';
import baseURL from '../Services/baseURL';
import axios from 'axios'

const ReportUploadPage = () => {
  const [files, setFiles] = useState([]);
  const [uploadStatus, setUploadStatus] = useState('idle'); 
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState('');
  const fileInputRef = useRef(null);

  const allowedFileTypes = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.txt', '.csv'];
  const maxFileSize = 10 * 1024 * 1024; 

  const validateFile = (file) => {
    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
    
    if (!allowedFileTypes.includes(fileExtension)) {
      return `File type ${fileExtension} not allowed. Allowed types: ${allowedFileTypes.join(', ')}`;
    }
    
    if (file.size > maxFileSize) {
      return `File size too large. Maximum size: 10MB`;
    }
    
    return null;
  };

  const handleFileSelect = (event) => {
    const selectedFiles = Array.from(event.target.files);
    const validFiles = [];
    const errors = [];

    selectedFiles.forEach(file => {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push({
          file,
          id: Date.now() + Math.random(),
          name: file.name,
          size: file.size,
          status: 'pending'
        });
      }
    });

    if (errors.length > 0) {
      setMessage(errors.join('\n'));
      setUploadStatus('error');
    } else {
      setMessage('');
      setUploadStatus('idle');
    }

    setFiles(prev => [...prev, ...validFiles]);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files);
  
    const fakeEvent = {
      target: {
        files: droppedFiles
      }
    };
    
    handleFileSelect(fakeEvent);
  };

  const removeFile = (fileId) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

 const uploadFiles = async () => {
  if (files.length === 0) {
    setMessage('Please select files to upload');
    setUploadStatus('error');
    return;
  }

  setUploadStatus('uploading');
  setUploadProgress(0);
  setMessage('');

  try {
    const formData = new FormData();
    files.forEach((fileObj) => {
      formData.append('reports', fileObj.file);
    });
    formData.append('uploadedAt', new Date().toISOString());
    formData.append('userId', 'current-user-id');

    const response = await axios.post(`${baseURL}/api/reports/upload/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        setUploadProgress(percentCompleted);
      },
    });

    console.log(response);
    

    setUploadStatus('success');
    setMessage(`Successfully uploaded ${files.length} file(s)`);

    setTimeout(() => {
      setFiles([]);
      setUploadProgress(0);
      setUploadStatus('idle');
      setMessage('');
    }, 3000);
  } catch (error) {
    console.error('Upload error:', error);
    setUploadStatus('error');
    setMessage(`Upload failed: ${error.response?.data?.message || error.message}`);
    setUploadProgress(0);
  }
};

  const resetUpload = () => {
    setFiles([]);
    setUploadStatus('idle');
    setUploadProgress(0);
    setMessage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Upload Reports
          </h1>
          <p className="text-gray-600 mb-8">
            Upload your reports in PDF, Word, Excel, or text format. Maximum file size: 10MB per file.
          </p>

          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">
              Drop files here or click to browse
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Supported formats: {allowedFileTypes.join(', ')}
            </p>
            
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={allowedFileTypes.join(',')}
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            
            <label
              htmlFor="file-upload"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer transition-colors"
            >
              <Upload className="h-4 w-4 mr-2" />
              Choose Files
            </label>
          </div>


          {files.length > 0 && (
            <div className="mt-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Selected Files ({files.length})
              </h3>
              
              <div className="space-y-3">
                {files.map((fileObj) => (
                  <div
                    key={fileObj.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                  >
                    <div className="flex items-center space-x-3">
                      <File className="h-8 w-8 text-blue-600" />
                      <div>
                        <p className="font-medium text-gray-900">{fileObj.name}</p>
                        <p className="text-sm text-gray-500">
                          {formatFileSize(fileObj.size)}
                        </p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => removeFile(fileObj.id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                      disabled={uploadStatus === 'uploading'}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {uploadStatus === 'uploading' && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Uploading files...
                </span>
                <span className="text-sm text-gray-500">
                  {uploadProgress}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {message && (
            <div className={`mt-6 p-4 rounded-md flex items-start space-x-3 ${
              uploadStatus === 'success' 
                ? 'bg-green-50 text-green-800' 
                : uploadStatus === 'error'
                ? 'bg-red-50 text-red-800'
                : 'bg-blue-50 text-blue-800'
            }`}>
              {uploadStatus === 'success' && <CheckCircle className="h-5 w-5 mt-0.5" />}
              {uploadStatus === 'error' && <XCircle className="h-5 w-5 mt-0.5" />}
              {uploadStatus === 'uploading' && <AlertCircle className="h-5 w-5 mt-0.5" />}
              <div className="whitespace-pre-line">{message}</div>
            </div>
          )}

          <div className="mt-8 flex space-x-4">
            <button
              onClick={uploadFiles}
              disabled={files.length === 0 || uploadStatus === 'uploading'}
              className={`px-6 py-3 rounded-md font-medium transition-colors ${
                files.length === 0 || uploadStatus === 'uploading'
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {uploadStatus === 'uploading' ? 'Uploading...' : 'Upload Reports'}
            </button>
            
            <button
              onClick={resetUpload}
              disabled={uploadStatus === 'uploading'}
              className="px-6 py-3 bg-gray-200 text-gray-700 rounded-md font-medium hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear All
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ReportUploadPage;