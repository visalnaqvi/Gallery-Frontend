import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: User;
    accessToken?: string;   // 👈 add this
    refreshToken?: string; 
    
        accessTokenExpires?: number
    error?: string;
    is_master?:boolean;
    hasFaceImage?:boolean;
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
    hasFaceImage?: boolean;
    is_master?:boolean;
    phoneNumber?:string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    accessToken?: string;   // 👈 add this
    refreshToken?: string; 
        accessTokenExpires?: number;
    error?: string;
    is_master?:boolean;
    hasFaceImage?: boolean;
  }
}
