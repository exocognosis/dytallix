import React, { useState, useRef } from 'react';

/**
 * UploadCard - File selection for QuantumVault
 */
export default function UploadCard({ onFileSelected }) {
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (selectedFile) => {
    if (!selectedFile) return;

    // Validate file size (10MB limit)
    if (selectedFile.size > 10 * 1024 * 1024) {
      alert('File size must be under 10MB');
      return;
    }

    setFile(selectedFile);
    
    // Notify parent
    if (onFileSelected) {
      onFileSelected(selectedFile);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileChange(files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const reset = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onFileSelected) {
      onFileSelected(null);
    }
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/10 to-transparent p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
          <span className="text-blue-500 text-xl">📁</span>
        </div>
        <div>
          <h3 className="text-lg font-semibold">1. Select File</h3>
          <p className="text-xs text-neutral-400 mt-1">Choose your file (up to 10MB)</p>
        </div>
      </div>

      {/* Drag-drop zone */}
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 transition ${
          dragOver
            ? 'border-blue-500/50 bg-blue-500/10'
            : 'border-white/20 hover:border-white/30'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={fileInputRef}
          type="file"
          onChange={(e) => handleFileChange(e.target.files[0])}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        
        <div className="text-center">
          {file ? (
            <div>
              <div className="text-2xl mb-2">✅</div>
              <div className="font-semibold text-green-400 mb-1">File Selected</div>
              <div className="text-sm text-neutral-300 mb-2">
                {file.name}
              </div>
              <div className="text-xs text-neutral-400 mb-3">
                {(file.size / 1024).toFixed(1)} KB • {file.type || 'Unknown type'}
              </div>
              <button
                onClick={reset}
                className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition text-sm"
              >
                Choose Different File
              </button>
            </div>
          ) : (
            <div>
              <div className="text-4xl mb-3">📁</div>
              <div className="font-semibold mb-2">Drop your file here</div>
              <div className="text-sm text-neutral-400 mb-3">
                or click to browse
              </div>
              <div className="text-xs text-neutral-500">
                Max size: 10MB
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
