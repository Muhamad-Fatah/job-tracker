"use client";

import { SessionProvider } from "next-auth/react";
import Test from "./test";

export default function Home() {
  return (
    <SessionProvider>
      <Test />
    </SessionProvider>
  );
}
