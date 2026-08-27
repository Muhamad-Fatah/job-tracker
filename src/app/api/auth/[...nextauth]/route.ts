import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  // Kalau mau custom pages
  // tambah ini di button sign in with googlenya
  // onClick={() => signIn("google", { callbackUrl: "/" })}
  // pages: {
  //   signIn: "/login",
  // },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
