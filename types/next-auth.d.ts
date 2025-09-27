import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
    };
    accessToken?: string;   // 👈 add this
    refreshToken?: string; 
    
        accessTokenExpires?: number
    error?: string
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    image?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    email: string;
    accessToken?: string;   // 👈 add this
    refreshToken?: string; 
        accessTokenExpires?: number
    error?: string
  }
}
