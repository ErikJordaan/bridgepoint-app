"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth-client";

export default function SignOutButton() {
  const router = useRouter();
  return (
    <a
      href="#"
      style={{ color: "rgba(255,255,255,0.85)" }}
      onClick={async (e) => {
        e.preventDefault();
        await signOut();
        router.push("/sign-in");
      }}
    >
      Sign out
    </a>
  );
}
