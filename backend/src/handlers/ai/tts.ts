import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';
import { caller } from '../../lib/auth';
import { handler as wrap, HttpError, json, parseBody } from '../../lib/response';
import { ttsSchema } from '../../validators';

const polly = new PollyClient({});

export const handler = wrap(async (event) => {
  caller(event);
  const { text, lang } = parseBody(event, ttsSchema);
  if (process.env.AI_MOCK === '1') return json(501, { error: 'Read aloud is not available in local demo mode' });
  try {
    // Kajal is Polly's bilingual neural voice for hi-IN and en-IN, so LanguageCode picks the language.
    // https://docs.aws.amazon.com/polly/latest/dg/available-voices.html
    const out = await polly.send(
      new SynthesizeSpeechCommand({
        Text: text,
        VoiceId: 'Kajal',
        Engine: 'neural',
        LanguageCode: lang === 'hi' ? 'hi-IN' : 'en-IN',
        OutputFormat: 'mp3',
      }),
    );
    if (!out.AudioStream) throw new Error('empty audio');
    const bytes = await out.AudioStream.transformToByteArray();
    return json(200, { audio: Buffer.from(bytes).toString('base64') });
  } catch (e) {
    console.error('polly error', (e as { name?: string }).name);
    throw new HttpError(503, 'Read aloud is unavailable right now.');
  }
});
