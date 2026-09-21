"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const session = localStorage.getItem("ctrls-session");

    if (session) {
      router.replace("/home");
    } else {
      router.replace("/login");
    }
  }, [router]);

  return null;
}