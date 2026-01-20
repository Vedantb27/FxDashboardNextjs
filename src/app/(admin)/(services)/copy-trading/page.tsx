import { Metadata } from "next";
import CopyTradeManager from "./CopyTradeManager";

export const metadata: Metadata = {
  title: "Next.js CopyTradeManager | TailAdmin - Next.js Dashboard Template",
  description:
    "This is Next.js CopyTradeManager page for TailAdmin - Next.js Tailwind CSS Admin Dashboard Template",
};

export default function Page() {
  return <CopyTradeManager />;
}