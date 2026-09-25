import React, { useState, useEffect,type ChangeEvent } from "react";
import { supabase } from "../lib/supabase"; // Import your initialized client

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl?: string;
  onUploadComplete: (url: string) => void;
}

const MAX_FILE_SIZE_BYTES = 1024 * 1024; // 1 MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export const AvatarUpload: React.FC<AvatarUploadProps> = ({
  userId,
  currentAvatarUrl,
  onUploadComplete,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentAvatarUrl || null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (currentAvatarUrl) {
      setAvatarUrl(currentAvatarUrl);
    }
  }, [currentAvatarUrl]);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return "Invalid file type. Please select a JPEG, PNG, WebP, or GIF image.";
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `File size exceeds 1 MB limit (${(file.size / (1024 * 1024)).toFixed(2)} MB uploaded).`;
    }
    return null;
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];

    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      setUploading(true);
      setError(null);

      const fileExt = selectedFile.name.split(".").pop();
      const filePath = `${userId}/avatar.${fileExt}`;

      // Upload file with upsert: true to overwrite previous uploads
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, selectedFile, { upsert: true });

      if (uploadError) throw uploadError;

      // Obtain public URL
      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const publicUrl = `${data.publicUrl}?t=${Date.now()}`; // Bust cache for immediate render update

      // Save URL to profiles table
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", userId);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      onUploadComplete(publicUrl);
      setPreviewUrl(null);
      setSelectedFile(null);
    } catch (err: any) {
      setError(err.message || "An error occurred during upload.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4 border rounded-lg bg-white max-w-sm">
      <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-100 border">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Preview"
            width={96}
            height={96}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
        ) : avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Avatar"
            width={96}
            height={96}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
            No Avatar
          </div>
        )}
      </div>

      <input
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="text-xs text-gray-600 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
      />

      {error && <p className="text-xs text-red-600 font-medium text-center">{error}</p>}

      {selectedFile && (
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="px-4 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {uploading ? "Uploading..." : "Save Avatar"}
        </button>
      )}
    </div>
  );
};