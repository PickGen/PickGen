import { config } from '../../config.js';
import { GenerationError, type GenerateParams, type GenerateResult, type ImageProvider } from './types.js';

/**
 * FalProvider — real generation via fal.ai (FR-1.2, 3.x).
 * Uses the synchronous REST endpoint directly (no SDK dependency). Requires FAL_KEY.
 * Model endpoints come from config.falModels (env-overridable).
 */
export class FalProvider implements ImageProvider {
  readonly name = 'fal';

  async generate(params: GenerateParams): Promise<GenerateResult> {
    if (!config.falKey) throw new GenerationError('FAL_KEY не задан', false);
    const endpoint = config.falModels[params.model];
    if (!endpoint) throw new GenerationError(`Модель ${params.model} не поддерживается`, false);

    const body: Record<string, unknown> = {
      prompt: params.finalPrompt,
      image_size: { width: params.width, height: params.height },
      num_images: 1,
      enable_safety_checker: true,
    };
    // Flux Schnell is a few-step model — keep it fast/cheap (FR-2.1).
    if (params.model === 'flux-schnell') body.num_inference_steps = 4;
    if (params.negativePrompt) body.negative_prompt = params.negativePrompt;
    if (params.seed != null) body.seed = params.seed;

    let res: Response;
    try {
      res = await fetch(`https://fal.run/${endpoint}`, {
        method: 'POST',
        headers: {
          Authorization: `Key ${config.falKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new GenerationError(`Сеть недоступна: ${(err as Error).message}`, true);
    }

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      // Owner-side billing problems: don't leak details to the end user.
      if (/exhausted balance|user is locked|insufficient/i.test(text) || res.status === 402) {
        console.error(`[fal.ai] billing/account issue: ${res.status} ${text.slice(0, 200)}`);
        throw new GenerationError('Сервис временно недоступен, попробуйте позже', true);
      }
      if (res.status === 401 || res.status === 403) {
        console.error(`[fal.ai] auth issue: ${res.status} ${text.slice(0, 200)}`);
        throw new GenerationError('Сервис временно недоступен, попробуйте позже', false);
      }
      if (res.status === 422) {
        // invalid params for this model — log the real reason for the owner
        console.error(`[fal.ai] 422 invalid request: ${text.slice(0, 300)}`);
        throw new GenerationError('Не удалось обработать запрос для этой модели', false);
      }
      // 429/5xx are retriable; other 4xx usually not
      const retriable = res.status === 429 || res.status >= 500;
      throw new GenerationError(`Ошибка генерации (${res.status})`, retriable);
    }

    const data = (await res.json()) as { images?: { url: string }[] };
    const url = data.images?.[0]?.url;
    if (!url) throw new GenerationError('Провайдер не вернул изображение', true);
    return { imageUrl: url };
  }
}
