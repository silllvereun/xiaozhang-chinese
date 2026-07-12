/**
 * Cloudflare Worker: 무료 Workers AI를 이용한 중국어 작문 첨삭 프록시.
 * 배포 방법은 저장소의 DEPLOY_AI_PROXY.md 참고.
 *
 * 요청: POST { hanzi, pinyin, meaning, sentence }
 * 응답: { ok: true, natural, feedback, corrected } | { ok: false, error }
 */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }
    if (request.method !== "POST") {
      return json({ ok: false, error: "POST only" }, 405);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ ok: false, error: "invalid JSON" }, 400);
    }

    const sentence = String(body.sentence || "").trim().slice(0, 200);
    const hanzi = String(body.hanzi || "").slice(0, 20);
    const pinyin = String(body.pinyin || "").slice(0, 50);
    const meaning = String(body.meaning || "").slice(0, 100);
    if (!sentence) {
      return json({ ok: false, error: "sentence required" }, 400);
    }

    const prompt = `너는 중국어 선생님이다. 중국어 학습자가 아래 단어를 사용해 만든 문장을 첨삭해라.

목표 단어: ${hanzi} (${pinyin}, 뜻: ${meaning})
학습자 문장: ${sentence}

다음 JSON 형식으로만 답하라. 다른 텍스트를 덧붙이지 마라.
{"natural": true 또는 false, "feedback": "한국어로 1~2문장 설명", "corrected": "자연스러운 중국어 문장(문제 없으면 원문 그대로)"}`;

    try {
      const aiResponse = await env.AI.run("@cf/qwen/qwen1.5-14b-chat-awq", {
        messages: [{ role: "user", content: prompt }],
      });
      const raw = aiResponse.response || "";
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("AI 응답에서 JSON을 찾지 못함");
      const parsed = JSON.parse(match[0]);

      return json({
        ok: true,
        natural: !!parsed.natural,
        feedback: String(parsed.feedback || ""),
        corrected: String(parsed.corrected || ""),
      });
    } catch (err) {
      return json({ ok: false, error: String(err) }, 502);
    }
  },
};
