import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcrypt";
import { Pool } from "pg";

interface GoogleProfile {
  email: string
  given_name?: string
  family_name?: string
}

const pool = new Pool({
  connectionString: process.env.DATABASE!,
});

async function getUserByEmail(email: string) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT id, email, password_hash, is_master, face_image_bytes FROM users WHERE email = $1",
      [email]
    );
    if (result.rowCount === 0) return null;
    return result.rows[0];
  } finally {
    client.release();
  }
}

async function createUserWithGoogle(email: string, firstName: string, lastName: string) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `INSERT INTO users (email, password_hash, first_name, last_name)
       VALUES ($1, 'google_signing', $2, $3)
       RETURNING id, email, first_name, last_name, face_image_bytes`,
      [email, firstName, lastName]
    );
    return result.rows[0];
  } finally {
    client.release();
  }
}

async function updateGoogleTokens(
  userId: string,
  accessToken: string,
  refreshToken?: string,
  expiresAt?: number
) {
  const client = await pool.connect();
  try {
    await client.query(
      `UPDATE users
       SET access_token = $1,
           refresh_token = COALESCE($2, refresh_token),
           token_expires_at = $4
       WHERE id = $3`,
      [accessToken, refreshToken ?? null, userId, expiresAt ? new Date(expiresAt * 1000) : null]
    );
  } finally {
    client.release();
  }
}

async function refreshAccessToken(refreshToken: string) {
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    const tokens = await response.json();

    if (!response.ok) {
      throw new Error(tokens.error_description || tokens.error);
    }

    return {
      accessToken: tokens.access_token,
      expiresAt: Math.floor(Date.now() / 1000) + tokens.expires_in,
      refreshToken: tokens.refresh_token ?? refreshToken,
    };
  } catch (error) {
    console.error("Error refreshing access token:", error);
    throw error;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await getUserByEmail(credentials.email);
        if (!user) return null;

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password_hash
        );
        if (!isPasswordValid) return null;

        return { 
          id: user.id, 
          email: user.email,
          hasFaceImage: !!user.face_image_bytes ,
          is_master:user.is_master
        };
      },
    }),

    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: "openid email profile",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      return baseUrl + "/";
    },
    
    async jwt({ token, user, account, profile, trigger, session }) {
      // CRITICAL: Handle session update trigger
      if (trigger === "update" && session?.hasFaceImage) {
        // Re-fetch user from database to get latest face_image_bytes status
        if (token.email) {
          const dbUser = await getUserByEmail(token.email);
          if (dbUser) {
            token.hasFaceImage = !!dbUser.face_image_bytes;
          }
        }
        return token;
      }

      let dbUser;
      
      // Google OAuth
      if (account?.provider === "google" && profile?.email) {
        dbUser = await getUserByEmail(profile.email);
        const googleProfile = profile as unknown as GoogleProfile;
        
        if (!dbUser) {
          dbUser = await createUserWithGoogle(
            profile.email,
            googleProfile.given_name || "",
            googleProfile.family_name || ""
          );
        }

        const expiresAt = Math.floor(Date.now() / 1000) + (account.expires_at ? account.expires_at : 3600);

        await updateGoogleTokens(
          dbUser.id,
          account.access_token!,
          account.refresh_token,
          expiresAt
        );

        token.id = dbUser.id;
        token.email = dbUser.email;
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.accessTokenExpires = expiresAt;
        token.is_master = dbUser.is_master?true:false;
        token.hasFaceImage = !!dbUser.face_image_bytes;
      }

      // Credentials login
      if (user && account?.provider != "google") {
        token.id = user.id;
        token.email = user.email;
        token.hasFaceImage = (user as any).hasFaceImage;
        token.is_master = user.is_master?true:false;
      }

      // Token refresh logic
      if (token.accessToken && token.refreshToken && token.accessTokenExpires) {
        const shouldRefresh = Math.floor(Date.now() / 1000) > (token.accessTokenExpires as number) - 300;
        
        if (shouldRefresh) {
          try {
            const refreshedTokens = await refreshAccessToken(token.refreshToken as string);
            
            if (token.id) {
              await updateGoogleTokens(
                token.id as string,
                refreshedTokens.accessToken,
                refreshedTokens.refreshToken,
                refreshedTokens.expiresAt
              );
            }

            return {
              ...token,
              accessToken: refreshedTokens.accessToken,
              accessTokenExpires: refreshedTokens.expiresAt,
              refreshToken: refreshedTokens.refreshToken,
            };
          } catch (error) {
            console.error("Error refreshing token:", error);
            return {
              ...token,
              error: "RefreshAccessTokenError",
            };
          }
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.accessToken = token.accessToken;
        session.refreshToken = token.refreshToken;
        session.accessTokenExpires = token.accessTokenExpires;
        session.error = token.error;
        session.is_master = token.is_master;
        session.hasFaceImage = token.hasFaceImage as boolean;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
  secret: process.env.JWT_SECRET,
};