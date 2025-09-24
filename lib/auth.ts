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
      "SELECT id, email, password_hash FROM users WHERE email = $1",
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
       RETURNING id, email, first_name, last_name`,
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
  refreshToken?: string
) {
  const client = await pool.connect();
  try {
    await client.query(
      `UPDATE users
       SET access_token = $1,
           refresh_token = COALESCE($2, refresh_token)
       WHERE id = $3`,
      [accessToken, refreshToken ?? null, userId]
    );
  } finally {
    client.release();
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    // ✅ Local credentials login
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

        return { id: user.id, email: user.email };
      },
    }),

    // ✅ Google login with Drive access
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope:
            "openid email profile https://www.googleapis.com/auth/drive.readonly",
          access_type: "offline", // get refresh_token
          prompt: "consent", // force refresh_token on first login
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Always go to home page after login
      return baseUrl + "/";
    },
    async jwt({ token, user, account, profile }) {
      // Case: First login with Google
      let dbUser
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

        // Update tokens in DB
        await updateGoogleTokens(
          dbUser.id,
          account.access_token!,
          account.refresh_token
        );

        token.id = dbUser.id;
        token.email = dbUser.email;
        token.accessToken = account.access_token;
      }
     
      // Case: Credentials login
      if (dbUser) {
        token.id = (dbUser as any).id;
        token.email = dbUser.email;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.accessToken = token.accessToken;
      }
      return session;
    },
  },
  pages: {
    signIn: "/", // your custom login page
  },
  secret: process.env.JWT_SECRET,
};
