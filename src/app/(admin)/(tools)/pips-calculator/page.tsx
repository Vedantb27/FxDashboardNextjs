import { Metadata } from "next";
import PipsCalculator from "./PipsCalculator";

export const metadata: Metadata = {
  title: "Next.js PipsCalculator | TailAdmin - Next.js Dashboard Template",
  description:
    "This is Next.js PipsCalculator page for TailAdmin - Next.js Tailwind CSS Admin Dashboard Template",
};

export default function Page() {
  return <PipsCalculator />;
}