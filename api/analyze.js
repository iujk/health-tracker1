export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { image, mediaType } = req.body;
    if (!image) return res.status(400).json({ error: 'No image provided' });

    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              inline_data: {
                mime_type: mediaType || 'image/jpeg',
                data: image
              }
            },
            {
              text: '이 음식 사진을 분석해서 JSON으로만 응답하세요. 다른 텍스트 없이 JSON만. 형식: {"food":"음식명","protein":숫자,"calories":숫자,"rating":"\u2705 좋음 또는 \u26a0\ufe0f 단백질 부족 또는 \u274c 부족","memo":"간단한 설명 1줄"} 단백질과 칼로리는 정수로. 한국 음식 기준으로 추정하세요. 사진에 여러 음식이 있으면 전체를 합산하세요.'
            }
          ]
        }],
        generationConfig: { maxOutputTokens: 500, temperature: 0.1 }
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: 'Gemini API error: ' + err });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: '분석 실패', raw: text });

    const result = JSON.parse(jsonMatch[0]);
    return res.status(200).json(result);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb'
    }
  }
};
