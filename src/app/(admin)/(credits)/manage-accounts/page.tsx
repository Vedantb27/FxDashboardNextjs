import { Metadata } from "next";
import ManageAccountsPage from "./ManageAccounts";

export const metadata: Metadata = {
  title: "Next.js ManageAccountsPage | TailAdmin - Next.js Dashboard Template",
  description:
    "This is Next.js ManageAccountsPage page for TailAdmin - Next.js Tailwind CSS Admin Dashboard Template",
};

export default function Page() {
  return <ManageAccountsPage />;
}