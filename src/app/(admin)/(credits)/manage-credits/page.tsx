import { Metadata } from "next";
import ManageCreditsPage from "./ManageCredits";

export const metadata: Metadata = {
  title: "Next.js ManageCreditsPage | TailAdmin - Next.js Dashboard Template",
  description:
    "This is Next.js ManageCreditsPage page for TailAdmin - Next.js Tailwind CSS Admin Dashboard Template",
};

export default function Page() {
  return <ManageCreditsPage />;
}