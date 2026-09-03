import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("define a experiência de atendimento Zasso", async () => {
  const [page, layout, component, translations, pixel] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL("app/components/ChatExperience.tsx", root), "utf8"),
    readFile(new URL("app/lib/ui-i18n.ts", root), "utf8"),
    readFile(new URL("app/components/MetaPixel.tsx", root), "utf8"),
  ]);

  assert.match(page, /ChatExperience/);
  assert.match(layout, /Atendimento Zasso/);
  assert.match(layout, /MetaPixel/);
  assert.match(pixel, /1361275138339763/);
  assert.match(pixel, /fbq\('track', 'PageView'\)/);
  assert.match(component, /UI_COPY/);
  assert.match(component, /https:\/\/zasso\.com\/politica-de-privacidade\//);
  assert.match(translations, /Política de Privacidade/);
  assert.match(translations, /receber contato da Zasso Brasil pelo WhatsApp/);
  assert.match(translations, /Digite sua mensagem/);
  assert.doesNotMatch(component, /reset-button/);
  assert.match(translations, /Type your message/);
  assert.match(translations, /Nachricht eingeben/);
  assert.match(translations, /Écrivez votre message/);
  assert.match(translations, /Escriba su mensaje/);
  assert.doesNotMatch(page + layout, /codex-preview|Your site is taking shape/);
  assert.match(component, /Chatbot conversation started/);
  assert.match(component, /Chatbot WhatsApp sales handoff/);
  assert.match(component, /Chatbot meeting scheduling/);
  assert.match(component, /eventName: "commercial_click"/);
  assert.match(component, /eventName: "meeting_click"/);
  assert.doesNotMatch(component, /(?:phone|email|summary|text):\s*(?:handoff|draft|message)/i);
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
  const [route, attributionRoute, attribution] = await Promise.all([
    readFile(new URL("app/api/chat/route.ts", root), "utf8"),
    readFile(new URL("app/api/attribution/route.ts", root), "utf8"),
    readFile(new URL("app/lib/campaign-attribution.ts", root), "utf8"),
  ]);
  assert.match(route, /process\.env\.CHATBOT_API_TOKEN/);
  assert.match(route, /httpOnly:\s*true/);
  assert.match(route, /channel:\s*"web"/);
  assert.match(route, /attribution:\s*body\.attribution/);
  assert.match(attributionRoute, /\/v1\/attribution/);
  assert.match(attributionRoute, /meeting_click/);
  assert.match(attributionRoute, /httpOnly:\s*true/);
  assert.match(attribution, /utm_campaign/);
  assert.match(attribution, /campaign_id/);
  assert.doesNotMatch(attribution, /readParam\(parameters, "(?:phone|email|first_name)"/i);
});
