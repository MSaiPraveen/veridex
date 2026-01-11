"use client";

import { useState, useRef } from "react";
import { Modal } from "@/components/ui/modal";
import { Select, FormActions } from "@/components/ui/form";
import { Icons } from "@/components/ui/icons";
import { uploadDocument, Document } from "@/lib/hooks";

interface DocumentUploadProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  organizationId: string;
  productId?: string;
  batchId?: string;
}

const documentTypeOptions = [
  { value: "LAB_REPORT", label: "Lab Report / COA" },
  { value: "LICENSE", label: "License" },
  { value: "INSURANCE", label: "Insurance Certificate" },
  { value: "CERTIFICATE", label: "Certificate (GMP, ISO, etc.)" },
  { value: "INVOICE", label: "Invoice" },
  { value: "COA", label: "Certificate of Analysis" },
  { value: "OTHER", label: "Other" },
];

export function DocumentUploadModal({
  isOpen,
  onClose,
  onSuccess,
  organizationId,
  productId,
  batchId,
}: DocumentUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<Document["type"]>("LAB_REPORT");
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (selectedFile: File) => {
    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      setError("Invalid file type. Please upload PDF, images, or Word documents.");
      return;
    }

    // Validate file size (max 10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("File too large. Maximum size is 10MB.");
      return;
    }

    setFile(selectedFile);
    setError(null);
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Simulate progress for UX
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      await uploadDocument(file, {
        type: documentType,
        organizationId,
        productId,
        batchId,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      setTimeout(() => {
        onSuccess();
        handleReset();
        onClose();
      }, 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setDocumentType("LAB_REPORT");
    setUploadProgress(0);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upload Document"
      description="Upload compliance documents for verification"
      size="md"
    >
      <div className="space-y-6">
        {error && (
          <div className="p-4 bg-error-500/10 border border-error-500/20 rounded-lg text-error-500 text-sm">
            {error}
          </div>
        )}

        {/* Document Type Selection */}
        <Select
          name="documentType"
          label="Document Type"
          value={documentType}
          onChange={(e) => setDocumentType(e.target.value as Document["type"])}
          options={documentTypeOptions}
          required
        />

        {/* Drop Zone */}
        <div
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
            dragActive
              ? "border-primary-500 bg-primary-500/5"
              : file
              ? "border-success-500 bg-success-500/5"
              : "border-[var(--border)] hover:border-primary-500/50"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={handleChange}
            accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
          />

          {file ? (
            <div className="space-y-3">
              <Icons.fileText size={48} className="mx-auto text-success-500" />
              <div>
                <p className="font-medium text-[var(--foreground)]">{file.name}</p>
                <p className="text-sm text-[var(--foreground-muted)]">
                  {formatFileSize(file.size)}
                </p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleReset();
                }}
                className="text-sm text-error-500 hover:underline"
              >
                Remove file
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <Icons.upload size={48} className="mx-auto text-[var(--foreground-muted)]" />
              <div>
                <p className="font-medium text-[var(--foreground)]">
                  Drop your file here, or{" "}
                  <span className="text-primary-500">browse</span>
                </p>
                <p className="text-sm text-[var(--foreground-muted)]">
                  PDF, Images, or Word documents up to 10MB
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Upload Progress */}
        {isUploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-[var(--foreground-muted)]">Uploading...</span>
              <span className="text-[var(--foreground)]">{uploadProgress}%</span>
            </div>
            <div className="h-2 bg-[var(--background)] rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-500 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        <FormActions>
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="btn btn-primary"
          >
            {isUploading ? (
              <>
                <Icons.loader size={16} className="mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Icons.upload size={16} className="mr-2" />
                Upload Document
              </>
            )}
          </button>
        </FormActions>
      </div>
    </Modal>
  );
}
