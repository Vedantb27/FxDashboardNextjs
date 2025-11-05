import { Metadata } from "next";
import TradeManager from "./TradeManager";

export const metadata: Metadata = {
  title: "Next.js TradeManager | TailAdmin - Next.js Dashboard Template",
  description:
    "This is Next.js TradeManager page for TailAdmin - Next.js Tailwind CSS Admin Dashboard Template",
};

export default function Page() {
  return <TradeManager />;
}