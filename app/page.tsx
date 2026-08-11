import type { Metadata } from "next";
import { ChatExperience } from "./components/ChatExperience";

export const metadata: Metadata = {
  title: "Atendimento Zasso",
  description:
    "Converse com o atendimento virtual da Zasso e encontre a melhor solução para sua operação.",
};

export default function Home() {
  return <ChatExperience />;
}
