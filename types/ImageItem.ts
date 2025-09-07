export type ImageItem = {
    id: string;
    thumbnail_location: string;
    filename: string;
    compressed_location: string;
    compressed_location_3k: string | null;
    date_taken:string;
size:number;
uploaded_at:string;    
highlight:boolean;
delete_at:string | null;
location_stripped:string | null
};