export interface ARExperience {
  id: string;
  name: string;
  description: string;
  marker_image_url: string;
  marker_mind_url: string;
  marker_fset_url: string;
  marker_fset3_url: string;
  content_url: string;
  content_type: 'video' | 'model';
  created_at: string;
  status: 'processing' | 'ready' | 'failed';
}

export interface UploadProgress {
  progress: number;
  status: 'uploading' | 'processing' | 'complete' | 'error';
  message: string;
}

export interface MarkerValidation {
  isValid: boolean;
  quality: number;
  issues: string[];
  recommendations: string[];
}