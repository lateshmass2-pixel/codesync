import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
      // Crucial: Request permission to write to repos
      authorization: {
        params: {
          scope: "read:user repo",
        },
      },
    }),
  ],
  callbacks: {
    // 1. Capture the access token from GitHub when user logs in
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token
      }
      return token
    },
    // 2. Pass that token to the client session so we can use it
    async session({ session, token }) {
      // @ts-ignore // Ignore type error for quick setup
      session.accessToken = token.accessToken
      return session
    },
  },
})
