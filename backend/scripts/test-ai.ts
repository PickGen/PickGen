/**
 * Validate the configured AI provider with a single real generation.
 * Usage:  npm run test:ai --workspace backend -- "your prompt"
 * Reads backend/.env — set AI_PROVIDER=fal and FAL_KEY first.
 */
import { config, MODES, FORMATS } from '../src/config.js';
import { getImageProvider } from '../src/providers/image/index.js';
import { buildFinalPrompt } from '../src/services/prompt.js';

const prompt = process.argv.slice(2).join(' ') || 'рыжий кот в очках на закате, уютно';

async function main() {
  console.log(`Provider: ${config.aiProvider}`);
  if (config.aiProvider === 'fal') {
    console.log(`FAL_KEY: ${config.falKey ? config.falKey.slice(0, 6) + '…(set)' : 'MISSING ❌'}`);
    console.log(`Draft model: ${config.falModels['flux-schnell']}`);
  }
  console.log(`Prompt: ${prompt}\n`);

  const mode = MODES.draft; // cheapest to test
  const fmt = FORMATS.square;
  const { finalPrompt, negativePrompt } = await buildFinalPrompt({ prompt, style: 'photo' });
  console.log(`Final prompt → ${finalPrompt}\n`);

  const t0 = Date.now();
  try {
    const res = await getImageProvider().generate({
      prompt,
      finalPrompt,
      negativePrompt,
      mode: mode.id,
      model: mode.model,
      style: 'photo',
      format: 'square',
      width: fmt.width,
      height: fmt.height,
    });
    const ms = Date.now() - t0;
    const preview = res.imageUrl.slice(0, 90);
    console.log(`✅ OK in ${ms}ms`);
    console.log(`Image: ${preview}${res.imageUrl.length > 90 ? '…' : ''}`);
  } catch (err) {
    console.error(`❌ FAILED: ${(err as Error).message}`);
    process.exit(1);
  }
}

main();
