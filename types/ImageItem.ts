export type ImageItem = {
    id: string;
    thumbnail_location: string;
    filename: string;
    compressed_location: string;
    date_taken:string;
size:number;
uploaded_at:string;    
highlight:boolean;
delete_at:string | null;
similar_image_id?: string;
    similar_count?: number;
};