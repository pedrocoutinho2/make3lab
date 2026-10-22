// whatsapp-webhook · 22/10/2026
// Recebe o webhook da WhatsApp Cloud API (Coexistence) e grava pela fn_wa_registrar (SQL 033).
//
//   GET  verificação da Meta: hub.mode=subscribe, hub.verify_token, hub.challenge
//   POST evento: confere a assinatura X-Hub-Signature-256 com o App Secret e grava
//
// Campos assinados no app da Meta: messages (o que o cliente manda) e
// smb_message_echoes (o que a loja manda pelo WhatsApp Business no celular).
// Status de entrega (statuses) e histórico (history) ficam de fora nesta fase.
//
// Segredos (supabase secrets set, nunca no vault nem no repo):
//   WA_VERIFY_TOKEN  texto combinado com a Meta na configuração do webhook
//   WA_APP_SECRET    App Secret do app da Meta
// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY vêm do próprio Supabase.
// Deploy com verify_jwt desligado: quem chama é a Meta, a prova é a assinatura.

const URL_SB = Deno.env.get("SUPABASE_URL")!;
const CHAVE_SB = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VERIFY = Deno.env.get("WA_VERIFY_TOKEN") ?? "";
const SEGREDO = Deno.env.get("WA_APP_SECRET") ?? "";

const enc = new TextEncoder();

async function assinaturaOk(corpo: string, cabecalho: string | null): Promise<boolean> {
  if (!SEGREDO || !cabecalho || !cabecalho.startsWith("sha256=")) return false;
  const chave = await crypto.subtle.importKey("raw", enc.encode(SEGREDO), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", chave, enc.encode(corpo)));
  const hex = Array.from(mac, (b) => b.toString(16).padStart(2, "0")).join("");
  const veio = cabecalho.slice(7);
  if (veio.length !== hex.length) return false;
  let dif = 0;
  for (let i = 0; i < hex.length; i++) dif |= hex.charCodeAt(i) ^ veio.charCodeAt(i);
  return dif === 0;
}

// texto legível de qualquer tipo de mensagem
function textoDe(m: any): string {
  switch (m?.type) {
    case "text": return m.text?.body ?? "";
    case "image": return m.image?.caption ? `[foto] ${m.image.caption}` : "[foto]";
    case "video": return m.video?.caption ? `[vídeo] ${m.video.caption}` : "[vídeo]";
    case "document": return `[arquivo] ${m.document?.filename ?? m.document?.caption ?? ""}`.trim();
    case "audio": return "[áudio]";
    case "sticker": return "[figurinha]";
    case "location": return `[localização] ${m.location?.name ?? ""}`.trim();
    case "contacts": return "[contato]";
    case "reaction": return m.reaction?.emoji ? `[reação ${m.reaction.emoji}]` : "[reação removida]";
    case "button": return m.button?.text ?? "[botão]";
    case "interactive": return m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title ?? "[resposta]";
    case "order": return "[pedido do catálogo]";
    default: return `[${m?.type ?? "mensagem"}]`;
  }
}

async function registrar(p: Record<string, unknown>): Promise<string> {
  const r = await fetch(`${URL_SB}/rest/v1/rpc/fn_wa_registrar`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: CHAVE_SB, Authorization: `Bearer ${CHAVE_SB}` },
    body: JSON.stringify({ p }),
  });
  if (!r.ok) throw new Error(`fn_wa_registrar ${r.status}: ${await r.text()}`);
  return await r.json();
}

Deno.serve(async (req) => {
  const u = new URL(req.url);

  if (req.method === "GET") {
    const ok = u.searchParams.get("hub.mode") === "subscribe" && VERIFY !== "" && u.searchParams.get("hub.verify_token") === VERIFY;
    return ok ? new Response(u.searchParams.get("hub.challenge") ?? "", { status: 200 }) : new Response("proibido", { status: 403 });
  }
  if (req.method !== "POST") return new Response("método", { status: 405 });

  const corpo = await req.text();
  if (!(await assinaturaOk(corpo, req.headers.get("x-hub-signature-256")))) {
    console.warn("assinatura inválida");
    return new Response("assinatura", { status: 401 });
  }

  let ev: any;
  try { ev = JSON.parse(corpo); } catch { return new Response("ok", { status: 200 }); }

  const tarefas: Promise<unknown>[] = [];
  for (const entrada of ev?.entry ?? []) {
    for (const mud of entrada?.changes ?? []) {
      const v = mud?.value ?? {};
      const pnid = v?.metadata?.phone_number_id;
      if (!pnid) continue;

      if (mud.field === "messages") {
        const nomes = new Map<string, string>((v.contacts ?? []).map((c: any) => [c.wa_id, c.profile?.name ?? ""]));
        for (const m of v.messages ?? []) {
          tarefas.push(registrar({
            phone_number_id: pnid, id: m.id, telefone: m.from, direcao: "in", tipo: m.type,
            texto: textoDe(m), ts: m.timestamp, nome_perfil: nomes.get(m.from) ?? "",
            referral: m.referral ?? null, raw: m,
          }));
        }
      } else if (mud.field === "smb_message_echoes") {
        for (const m of v.message_echoes ?? []) {
          tarefas.push(registrar({
            phone_number_id: pnid, id: m.id, telefone: m.to, direcao: "out", tipo: m.type,
            texto: textoDe(m), ts: m.timestamp, raw: m,
          }));
        }
      }
    }
  }

  // erro de gravação devolve 500: a Meta reenvia depois, e a fn_wa_registrar ignora repetida
  const res = await Promise.allSettled(tarefas);
  const falhas = res.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
  for (const f of falhas) console.error(String(f.reason));
  return new Response(falhas.length ? "erro" : "ok", { status: falhas.length ? 500 : 200 });
});
