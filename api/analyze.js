module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { image, mediaType } = req.body;
    if (!image) return res.status(400).json({ error: 'No image provided' });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: 'API key not configured' });

    const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash-001';
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + apiKey;

    const payload = {
      contents: [{
        parts: [
          {
            inline_data: {
              mime_type: mediaType || 'image/jpeg',
              data: image
            }
          },
          {
            text: '이 음식 사진을 분석해서 JSON으로만 응답하세요. 다른 텍스트 없이 JSON만. 형식: {"food":"음식명","protein":숫자,"calories":숫자,"rating":"good 또는 low_protein 또는 bad","memo":"간단한 설명 1줄"} 단백질과 칼로리는 정수로. 한국 음식 기준으로 추정하세요.'
          }
        ]
      }],
      generationConfig: { maxOutputTokens: 300, temperature: 0.1 }
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Gemini error: ' + responseText });
    }

    const data = JSON.parse(responseText);
    const text = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text) || '';

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(500).json({ error: 'parse error', raw: text });

    const result = JSON.parse(jsonMatch[0]);

    // rating 한글로 변환
    if (result.rating === 'good') result.rating = '\u2705 \uc88b\uc74c';
    else if (result.rating === 'low_protein') result.rating = '\u26a0\ufe0f \ub2e8\ubc31\uc9c8 \ubd80\uc871';
    else if (result.rating === 'bad') result.rating = '\u274c \ubd80\uc871';

    return res.status(200).json(result);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

module.exports.config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb'
    }
  }
};
