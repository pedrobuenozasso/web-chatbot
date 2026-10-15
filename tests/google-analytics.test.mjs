import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../app/lib/google-analytics.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const analytics = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

function browser(t) {
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  globalThis.window = { location: { href: "https://atendimento.zasso.com/?lang=pt-BR&utm_source=google&utm_medium=cpc&gclid=click-123&phone=private#private" } };
  globalThis.document = { referrer: "https://example.com/private?email=private" };
  t.after(() => {
    if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow;
    if (previousDocument === undefined) delete globalThis.document; else globalThis.document = previousDocument;
  });
  return globalThis.window;
}

test("não inicia a medição fora do navegador", () => {
  assert.equal(analytics.initializeGoogleAnalytics(), false);
});

test("preserva a atribuição Google e remove outros parâmetros e fragmentos", () => {
  assert.equal(
    analytics.googlePageLocation("https://atendimento.zasso.com/?utm_source=google&gclid=123&gbraid=456&wbraid=789&name=private&text=private#private"),
    "https://atendimento.zasso.com/?utm_source=google&gclid=123&gbraid=456&wbraid=789",
  );
});

test("inicialização e visualização não geram lead nem duplicam a configuração", (t) => {
  const target = browser(t);
  analytics.initializeGoogleAnalytics();
  analytics.initializeGoogleAnalytics();
  const commands = target.dataLayer.map((command) => Array.from(command));
  assert.equal(commands.length, 2);
  assert.equal(commands[0][0], "js");
  assert.equal(commands[1][0], "config");
  assert.equal(commands[1][1], "G-2PEL52X12S");
  assert.equal(commands[1][2].page_location, "https://atendimento.zasso.com/?utm_source=google&utm_medium=cpc&gclid=click-123");
  assert.equal(commands[1][2].page_referrer, "https://example.com");
  assert.equal(commands[1][2].allow_google_signals, false);
});

test("somente o clique final gera uma conversão, uma vez por atendimento", (t) => {
  const target = browser(t);
  const track = analytics.createWhatsAppClickTracker();
  assert.equal(target.dataLayer, undefined);
  track({ segment: "agro", language: "pt-BR", name: "private", phone: "private", summary: "private" });
  track({ segment: "agro", language: "pt-BR" });
  const events = target.dataLayer.map((command) => Array.from(command)).filter((command) => command[0] === "event");
  assert.deepEqual(events, [["event", "whatsapp_click", {
    send_to: "G-2PEL52X12S", segment: "agro", ui_language: "pt-BR", transport_type: "beacon",
  }]]);
});

test("normaliza parâmetros e mantém atendimentos distintos independentes", (t) => {
  const target = browser(t);
  analytics.createWhatsAppClickTracker()({ segment: "urban", language: "en" });
  analytics.createWhatsAppClickTracker()({ segment: "private", language: "private" });
  const events = target.dataLayer.map((command) => Array.from(command)).filter((command) => command[0] === "event");
  assert.equal(events.length, 2);
  assert.equal(events[0][2].segment, "urban");
  assert.equal(events[1][2].segment, "unknown");
  assert.equal(events[1][2].ui_language, "pt-BR");
});

test("falhas no Google tag não interrompem o clique e permitem nova tentativa", (t) => {
  const target = browser(t);
  const track = analytics.createWhatsAppClickTracker();
  target.gtag = () => { throw new Error("tag unavailable"); };
  assert.doesNotThrow(() => track({ segment: "agro", language: "pt-BR" }));
  target.gtag = function () { target.dataLayer.push(arguments); };
  track({ segment: "agro", language: "pt-BR" });
  const events = target.dataLayer.map((command) => Array.from(command)).filter((command) => command[0] === "event");
  assert.equal(events.length, 1);
});
