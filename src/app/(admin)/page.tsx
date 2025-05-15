import type { Metadata } from "next";
import EcommerceClient from "./EcommerceClient";

export const metadata: Metadata = {
  title: "Trade",
  description: "Trading Analysis",
};

export default function Ecommerce() {
  return <EcommerceClient />;
}