import MT5CredentialsPage from "../../../../components/accounts/MT5CredentialsPage";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Next.js Calender | TailAdmin - Next.js Dashboard Template",
  description:
    "This is Next.jspage for TailAdmin  Tailwind CSS Admin Dashboard Template",
  // other metadata
};
export default function Page() {
  return (
    <div>
      <MT5CredentialsPage />
    </div>
  );
}
