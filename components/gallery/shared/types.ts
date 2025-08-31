export interface ImageItem {
  id: string;
  filename: string;
  size: number;
  date_taken: string;
  uploaded_at: string;
  compressed_location: string;
  thumbnail_location: string;
  highlight?: boolean;
  delete_at?: string;
}

export interface ApiResponse {
  images: ImageItem[];
  hasMore: boolean;
  hotImages?: number;
}

export interface GalleryState {
  images: ImageItem[];
  currentIndex: number;
  isOpen: boolean;
  page: number;
  hasMore: boolean;
  loading: boolean;
  sorting: string;
  showDeleteConfirm: boolean;
  showIcons: boolean;
  showImageInfo: boolean;
}

export interface Person {
  person_id: string;
  name: string;
  totalImages: number;
  face_thumb_bytes: string;
}

export interface FetchImageParams {
  groupId: string;
  personId?: string;
  page: number;
  sorting: string;
  mode?: string;
}