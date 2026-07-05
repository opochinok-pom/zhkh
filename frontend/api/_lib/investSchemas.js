// Схемы для tool-use — Claude обязан вернуть аргументы, валидные по JSON Schema,
// поэтому парсинг через JSON.parse текста больше не нужен (и не может сломаться
// на неэскейпленных кавычках/переводах строк внутри значений).

const SECTION_KEYS = [
  'summary', 'composition', 'allocation', 'sector', 'geography',
  'risk', 'diversification', 'performance', 'news_impact', 'recommendations',
];

const SECTION_TITLES = {
  summary: 'Сводка по портфелю',
  composition: 'Состав активов',
  allocation: 'Аллокация по классам активов',
  sector: 'Отраслевая структура',
  geography: 'Географическая структура',
  risk: 'Риск и волатильность',
  diversification: 'Диверсификация',
  performance: 'Доходность и динамика',
  news_impact: 'Влияние новостей на позиции',
  recommendations: 'Рекомендации по ребалансировке',
};

const nullableString = { type: ['string', 'null'] };
const nullableNumber = { type: ['number', 'null'] };

const PORTFOLIO_TOOL = {
  name: 'extract_portfolio',
  description: 'Сохранить распознанные со скриншотов позиции инвестиционного портфеля.',
  input_schema: {
    type: 'object',
    properties: {
      broker: nullableString,
      currency: nullableString,
      total_value: nullableNumber,
      positions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            ticker: nullableString,
            name: nullableString,
            quantity: nullableNumber,
            avg_price: nullableNumber,
            current_price: nullableNumber,
            value: nullableNumber,
            weight_pct: nullableNumber,
            asset_class: nullableString,
            sector: nullableString,
            country: nullableString,
          },
        },
      },
    },
    required: ['positions'],
  },
};

const sectionSchema = {
  type: 'object',
  properties: { title: { type: 'string' }, text: { type: 'string' } },
  required: ['title', 'text'],
};

const ANALYSIS_TOOL = {
  name: 'submit_analysis',
  description: 'Отправить итоговый анализ портфеля из 10 разделов и список учтённых новостей. Вызывается один раз, после того как весь необходимый веб-поиск завершён.',
  input_schema: {
    type: 'object',
    properties: {
      sections: {
        type: 'object',
        properties: SECTION_KEYS.reduce((acc, k) => ({ ...acc, [k]: sectionSchema }), {}),
        required: SECTION_KEYS,
      },
      news: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            ticker: nullableString,
            title: { type: 'string' },
            url: nullableString,
            date: nullableString,
            sentiment: { type: 'string', enum: ['positive', 'negative', 'neutral'] },
            summary: nullableString,
          },
          required: ['title'],
        },
      },
    },
    required: ['sections', 'news'],
  },
};

module.exports = { SECTION_KEYS, SECTION_TITLES, PORTFOLIO_TOOL, ANALYSIS_TOOL };
