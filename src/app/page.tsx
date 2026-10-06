import { Schibsted_Grotesk, JetBrains_Mono } from "next/font/google";
import { Hub } from "@/components/hub/Hub";

const sans = Schibsted_Grotesk({ variable: "--hub-sans", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const mono = JetBrains_Mono({ variable: "--hub-mono", subsets: ["latin"], weight: ["400", "500"] });

export default function HubPage() {
  return (
    <div className={`${sans.variable} ${mono.variable}`}>
      <Hub />
    </div>
  );
}