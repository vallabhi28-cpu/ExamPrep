// Google Gemini AI integration
// Get your FREE API key from: https://aistudio.google.com/app/apikey

const getGeminiApiKey = (): string => {
  const key = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      'EXPO_PUBLIC_GEMINI_API_KEY is not set. Add it to your .env file.\n' +
      'Get a FREE key from: https://aistudio.google.com/app/apikey'
    );
  }
  return key;
};

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`;

async function callGemini(prompt: string): Promise<string> {
  const apiKey = getGeminiApiKey();

  const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4000,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err?.error?.message || `Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

export async function generateQuizFromText(text: string, numQuestions = 10): Promise<any[]> {
  const prompt = `You are an expert quiz generator. Based on the following text from a study document, generate ${numQuestions} multiple choice quiz questions.

Each question must have exactly 4 options (A, B, C, D) and one correct answer.

Text:
${text.substring(0, 8000)}

Return ONLY a JSON array in this exact format, no markdown, no backticks, no other text:
[
  {
    "id": 1,
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct": 0,
    "explanation": "Brief explanation of why this is correct"
  }
]

The "correct" field is the 0-based index of the correct option.`;

  const raw = await callGemini(prompt);
  const cleaned = raw.replace(/```json|```/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Failed to parse quiz response from Gemini');
  }
}

export async function generateStudySchedule(
  exams: { name: string; date: string }[],
  hoursPerDay = 4
): Promise<any> {
  const today = new Date().toISOString().split('T')[0];
  const examList = exams.map(e => `${e.name} on ${e.date}`).join('\n');

  const prompt = `You are an expert study planner. Create a detailed day-by-day study schedule for these upcoming exams:

${examList}

Today's date: ${today}
Available study hours per day: ${hoursPerDay} hours

Rules:
- Distribute study time proportionally based on days remaining for each exam
- Prioritize exams that are sooner
- Include breaks and revision days
- The last 2 days before each exam should be revision only

Return ONLY a JSON object in this exact format, no markdown, no backticks, no other text:
{
  "schedule": [
    {
      "date": "YYYY-MM-DD",
      "day": "Monday",
      "tasks": [
        {
          "subject": "Exam name",
          "topic": "What to study",
          "hours": 2,
          "type": "new_content"
        }
      ],
      "totalHours": 4,
      "tip": "A motivational or study tip for the day"
    }
  ],
  "summary": "Brief overview of the schedule strategy"
}

The type field can be: new_content, revision, practice, or rest`;

  const raw = await callGemini(prompt);
  const cleaned = raw.replace(/```json|```/g, '').trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Failed to parse schedule response from Gemini');
  }
}

