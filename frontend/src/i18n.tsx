import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type Lang = 'en' | 'ru';

function detectLang(): Lang {
  const saved = localStorage.getItem('pg_lang');
  if (saved === 'en' || saved === 'ru') return saved;
  return navigator.language?.toLowerCase().startsWith('ru') ? 'ru' : 'en';
}

type Dict = Record<string, string>;

const en: Dict = {
  // nav / header
  'nav.generator': 'Generator',
  'nav.gallery': 'Gallery',
  'nav.pricing': 'Pricing',
  'nav.account': 'Account',
  'header.credits': 'Buy credits',
  'header.theme': 'Toggle theme',
  'header.lang': 'Switch language',

  // auth
  'auth.tagline': 'Create images from a description in any language',
  'auth.email': 'you@email.com',
  'auth.submit': 'Sign in / Sign up',
  'auth.submitting': 'Signing in…',
  'auth.error': 'Could not sign in',
  'auth.freePaid': 'Access via packages — buy a plan to start generating.',
  'auth.freeDrafts': 'Free — {n} draft/day.',
  'auth.freeDraftsPlural': 'Free — {n} drafts/day.',
  'auth.freeCredits': ' Plus {n} welcome credits.',
  'auth.freeMore': ' More generations — on a plan.',
  'auth.support': 'Support:',

  // generator
  'gen.title': 'Create an image',
  'gen.hint': 'Write in any language — we translate and enhance your prompt.',
  'gen.prompt': 'Description',
  'gen.promptPlaceholder': 'e.g. a ginger cat in glasses at sunset',
  'gen.mode': 'Mode',
  'gen.style': 'Style',
  'gen.format': 'Format',
  'gen.advanced': 'Advanced',
  'gen.negative': 'Negative prompt (what to avoid)',
  'gen.negativePlaceholder': 'e.g. blur, text',
  'gen.seed': 'Seed (for reproducibility)',
  'gen.seedPlaceholder': 'random',
  'gen.generate': 'Generate',
  'gen.generating': 'Generating…',
  'gen.freeDaily': 'Free daily draft',
  'gen.willSpend': 'Costs {n} 💎',
  'gen.balance': 'balance {n} 💎',
  'gen.creating': 'Creating your image…',
  'gen.noCredits': 'Not enough credits',
  'gen.topUp': 'Top up balance',
  'gen.retry': 'Retry',
  'gen.empty': 'Enter a description and press “Generate”',
  'gen.download': '⬇ Download',
  'gen.copyPrompt': '⧉ Copy prompt',
  'gen.repeat': '↻ Repeat',
  'gen.somethingWrong': 'Something went wrong',
  'toast.promptCopied': 'Prompt copied',
  'toast.usedFreeDaily': 'Used the free daily draft',

  // gallery
  'gallery.title': 'Gallery',
  'gallery.clear': 'Clear history',
  'gallery.clearConfirm': 'Clear everything?',
  'gallery.clearYes': 'Yes, clear',
  'gallery.cancel': 'Cancel',
  'gallery.emptyTitle': 'Nothing yet. Generate your first image!',
  'gallery.delete': 'Delete',
  'toast.deleted': 'Deleted',
  'toast.historyCleared': 'History cleared',

  // pricing
  'pricing.title': 'Pricing',
  'pricing.freePaid': 'Access via packages.',
  'pricing.freePaidRest': 'Pick a package below to start generating. Credits per mode: draft 1 · quality 5 · text 10.',
  'pricing.freeNote': 'Free',
  'pricing.freeNoteDraft': 'draft',
  'pricing.freeNoteDrafts': 'drafts',
  'pricing.freeNoteRest': '/day (with ads). Paid packages remove ads and unlock “Quality” and “Text”. Credits per mode: draft 1 · quality 5 · text 10.',
  'pricing.lineStandard': 'Standard',
  'pricing.lineQuality': 'Quality',
  'pricing.noAds': 'ad-free',
  'pricing.subStandard': 'For sketches, ideas and experiments (Flux Schnell / Pro).',
  'pricing.subQuality': 'Maximum quality with Flux 2 Pro — for work and print.',
  'pricing.perGen': 'per generation',
  'pricing.buy': 'Buy',
  'pricing.best': 'best value',
  'pricing.gens': 'generations',
  'toast.paid': 'Payment complete — credits added',
  'toast.testPaid': 'Test payment · {n} credits added',
  'toast.payError': 'Payment error',

  // account
  'account.title': 'Account',
  'account.email': 'Email',
  'account.plan': 'Plan',
  'account.balance': 'Balance',
  'account.registered': 'Registered',
  'account.logout': 'Log out',
  'account.support': 'Support',
  'account.supportText': 'Questions, payment or generation issues — message us, we reply fast.',
  'account.writeTelegram': '✈ Message on Telegram',
  'account.payments': 'Payment history',
  'account.noPayments': 'No payments yet.',

  // app
  'app.ad': 'Ad · free plan. Buy a package to remove ads and unlock “Quality” and “Text”.',
  'app.demo': '🧪 Preview mode — generated images are placeholders. Real AI generation is coming soon.',
  'app.configError': 'Failed to load service configuration.',
  'footer.terms': 'Terms',
  'footer.privacy': 'Privacy',
  'footer.refund': 'Refunds',
  'footer.content': 'Content rules',
  'footer.support': 'Support',

  // modes / styles / formats (by id)
  'mode.draft': 'Draft',
  'mode.quality': 'Quality',
  'mode.text': 'Text on image',
  'style.photo': 'Photorealism',
  'style.anime': 'Anime / art',
  'style.3d': '3D',
  'style.watercolor': 'Watercolor',
  'style.pixel': 'Pixel art',
  'style.logo': 'Logo',
  'format.square': 'Square 1:1',
  'format.portrait': 'Portrait 3:4',
  'format.landscape': 'Landscape 4:3',
};

const ru: Dict = {
  'nav.generator': 'Генератор',
  'nav.gallery': 'Галерея',
  'nav.pricing': 'Тарифы',
  'nav.account': 'Аккаунт',
  'header.credits': 'Купить кредиты',
  'header.theme': 'Сменить тему',
  'header.lang': 'Сменить язык',

  'auth.tagline': 'Генерация изображений по описанию на любом языке',
  'auth.email': 'you@email.com',
  'auth.submit': 'Войти / Зарегистрироваться',
  'auth.submitting': 'Входим…',
  'auth.error': 'Не удалось войти',
  'auth.freePaid': 'Доступ по пакетам — оформите тариф, чтобы начать генерировать.',
  'auth.freeDrafts': 'Бесплатно — {n} черновик в день.',
  'auth.freeDraftsPlural': 'Бесплатно — {n} черновика в день.',
  'auth.freeCredits': ' Плюс {n} приветственных кредитов.',
  'auth.freeMore': ' Больше генераций — по тарифу.',
  'auth.support': 'Поддержка:',

  'gen.title': 'Создать изображение',
  'gen.hint': 'Пишите на любом языке — мы переведём и улучшим запрос.',
  'gen.prompt': 'Описание',
  'gen.promptPlaceholder': 'Например: рыжий кот в очках на закате',
  'gen.mode': 'Режим',
  'gen.style': 'Стиль',
  'gen.format': 'Формат',
  'gen.advanced': 'Дополнительно',
  'gen.negative': 'Негативный промпт (чего быть не должно)',
  'gen.negativePlaceholder': 'напр.: размытие, текст',
  'gen.seed': 'Seed (для повторяемости)',
  'gen.seedPlaceholder': 'случайный',
  'gen.generate': 'Сгенерировать',
  'gen.generating': 'Генерируем…',
  'gen.freeDaily': 'Бесплатный дневной черновик',
  'gen.willSpend': 'Спишется {n} 💎',
  'gen.balance': 'баланс {n} 💎',
  'gen.creating': 'Создаём изображение…',
  'gen.noCredits': 'Недостаточно кредитов',
  'gen.topUp': 'Пополнить баланс',
  'gen.retry': 'Повторить',
  'gen.empty': 'Введите описание и нажмите «Сгенерировать»',
  'gen.download': '⬇ Скачать',
  'gen.copyPrompt': '⧉ Копировать промпт',
  'gen.repeat': '↻ Повторить',
  'gen.somethingWrong': 'Что-то пошло не так',
  'toast.promptCopied': 'Промпт скопирован',
  'toast.usedFreeDaily': 'Использован бесплатный дневной черновик',

  'gallery.title': 'Галерея',
  'gallery.clear': 'Очистить историю',
  'gallery.clearConfirm': 'Очистить всё?',
  'gallery.clearYes': 'Да, очистить',
  'gallery.cancel': 'Отмена',
  'gallery.emptyTitle': 'Пока пусто. Сгенерируйте первое изображение!',
  'gallery.delete': 'Удалить',
  'toast.deleted': 'Удалено',
  'toast.historyCleared': 'История очищена',

  'pricing.title': 'Тарифы',
  'pricing.freePaid': 'Доступ по пакетам.',
  'pricing.freePaidRest': 'Выберите пакет ниже, чтобы начать генерировать. Кредиты по режиму: черновик 1 · качество 5 · текст 10.',
  'pricing.freeNote': 'Бесплатно',
  'pricing.freeNoteDraft': 'черновик',
  'pricing.freeNoteDrafts': 'черновика',
  'pricing.freeNoteRest': 'в день (с рекламой). Платные пакеты отключают рекламу и дают доступ к «Качеству» и «Тексту». Кредиты по режиму: черновик 1 · качество 5 · текст 10.',
  'pricing.lineStandard': 'Стандарт',
  'pricing.lineQuality': 'Качество',
  'pricing.noAds': 'без рекламы',
  'pricing.subStandard': 'Для набросков, идей и экспериментов (Flux Schnell / Pro).',
  'pricing.subQuality': 'Максимальное качество Flux 2 Pro — для работы и печати.',
  'pricing.perGen': 'за генерацию',
  'pricing.buy': 'Купить',
  'pricing.best': 'выгодно',
  'pricing.gens': 'генераций',
  'toast.paid': 'Оплата прошла — кредиты начислены',
  'toast.testPaid': 'Тестовая оплата · начислено {n} кредитов',
  'toast.payError': 'Ошибка оплаты',

  'account.title': 'Аккаунт',
  'account.email': 'Email',
  'account.plan': 'Тариф',
  'account.balance': 'Баланс',
  'account.registered': 'Регистрация',
  'account.logout': 'Выйти',
  'account.support': 'Поддержка',
  'account.supportText': 'Вопросы, проблемы с оплатой или генерацией — напишите нам, ответим быстро.',
  'account.writeTelegram': '✈ Написать в Telegram',
  'account.payments': 'История платежей',
  'account.noPayments': 'Платежей пока нет.',

  'app.ad': 'Реклама · бесплатный тариф. Оформите пакет, чтобы убрать рекламу и открыть «Качество» и «Текст».',
  'app.demo': '🧪 Демо-режим — изображения показаны заглушками. Настоящая ИИ-генерация скоро.',
  'app.configError': 'Не удалось загрузить конфигурацию сервиса.',
  'footer.terms': 'Соглашение',
  'footer.privacy': 'Конфиденциальность',
  'footer.refund': 'Возврат',
  'footer.content': 'Правила контента',
  'footer.support': 'Поддержка',

  'mode.draft': 'Черновик',
  'mode.quality': 'Качество',
  'mode.text': 'Текст на картинке',
  'style.photo': 'Фотореализм',
  'style.anime': 'Аниме / арт',
  'style.3d': '3D',
  'style.watercolor': 'Акварель',
  'style.pixel': 'Пиксель-арт',
  'style.logo': 'Логотип',
  'format.square': 'Квадрат 1:1',
  'format.portrait': 'Портрет 3:4',
  'format.landscape': 'Ландшафт 4:3',
};

const dicts: Record<Lang, Dict> = { en, ru };

export type TFn = (key: string, params?: Record<string, string | number>) => string;

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: TFn;
}

const Ctx = createContext<LangCtx | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLang);

  const value = useMemo<LangCtx>(() => {
    const t: TFn = (key, params) => {
      let s = dicts[lang][key] ?? dicts.en[key] ?? key;
      if (params) for (const [k, v] of Object.entries(params)) s = s.replace(`{${k}}`, String(v));
      return s;
    };
    const setLang = (l: Lang) => {
      localStorage.setItem('pg_lang', l);
      document.documentElement.lang = l;
      setLangState(l);
    };
    return { lang, setLang, t };
  }, [lang]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang(): LangCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useLang must be used within LangProvider');
  return ctx;
}
