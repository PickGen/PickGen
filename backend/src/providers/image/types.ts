import type { Format, Mode, Style } from '../../config.js';

export interface GenerateParams {
  prompt: string;
  finalPrompt: string;
  negativePrompt?: string;
  mode: Mode;
  model: string;
  style: Style;
  format: Format;
  width: number;
  height: number;
  seed?: number;
}

export interface GenerateResult {
  /** URL or data-URI of the generated image */
  imageUrl: string;
}

export interface ImageProvider {
  readonly name: string;
  generate(params: GenerateParams): Promise<GenerateResult>;
}

/** Raised by providers for a failed generation so routes can respond cleanly (FR-1.6). */
export class GenerationError extends Error {
  constructor(
    message: string,
    public readonly retriable = false,
  ) {
    super(message);
    this.name = 'GenerationError';
  }
}
