import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("define a experiência de atendimento Zasso", async () => {
  const [page, layout, component] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("app/components/ChatExperience.tsx", root), "utf8"),
  ]);

  assert.match(page, /ChatExperience/);
  assert.match(layout, /Atendimento Zasso/);
  assert.match(component, /Digite sua mensagem/);
  assert.match(component, /Reiniciar conversa/);
  assert.doesNotMatch(page + layout, /codex-preview|Your site is taking shape/);
});

test("mantém segredos fora do bundle cliente", async () => {
  const component = await readFile(
    new URL("app/components/ChatExperience.tsx", root),
    "utf8",
  );
  assert.doesNotMatch(component, /CHATBOT_API_TOKEN|Bearer\s+/);
  assert.match(component, /\/api\/chat/);
});

test("usa integração privada no servidor", async () => {
  const route = await readFile(new URL("app/api/chat/route.ts", root), "utf8");
  assert.match(route, /process\.env\.CHATBOT_API_TOKEN/);
  assert.match(route, /httpOnly:\s*true/);
  assert.match(route, /channel:\s*"web"/);
});
