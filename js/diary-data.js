// «Дневник»: справочники. Шкала настроения как в «Состоянии души» Apple (7 уровней, от −3 до +3),
// чувства по уровням, факторы «что влияло». Значения id в записях не меняются никогда: на них держится статистика.

// Шкала. mood хранится целым числом от -3 до 3. tone: имя токена цвета для оформления (подключит сессия дизайна).
export const SCALE = [
  { v: -3, id: 'very-unpleasant', label: 'Очень неприятно', short: 'Очень плохо', tone: 'mood-n3' },
  { v: -2, id: 'unpleasant', label: 'Неприятно', short: 'Плохо', tone: 'mood-n2' },
  { v: -1, id: 'slightly-unpleasant', label: 'Слегка неприятно', short: 'Так себе', tone: 'mood-n1' },
  { v: 0, id: 'neutral', label: 'Нейтрально', short: 'Ровно', tone: 'mood-0' },
  { v: 1, id: 'slightly-pleasant', label: 'Слегка приятно', short: 'Неплохо', tone: 'mood-p1' },
  { v: 2, id: 'pleasant', label: 'Приятно', short: 'Хорошо', tone: 'mood-p2' },
  { v: 3, id: 'very-pleasant', label: 'Очень приятно', short: 'Отлично', tone: 'mood-p3' },
];
export const MOOD_MIN = -3;
export const MOOD_MAX = 3;
export const scaleOf = (v) => SCALE.find((s) => s.v === v) || SCALE[3];

// Вид записи: day — настроение за весь день (одно на дату), moment — эмоция в моменте (сколько угодно).
export const KINDS = [
  { id: 'day', label: 'Весь день', about: 'Как прошёл день в целом' },
  { id: 'moment', label: 'Сейчас', about: 'Что чувствую прямо сейчас' },
];

// Чувства. band: к каким уровням шкалы относится (neg — −3…−1, mid — около нуля, pos — +1…+3).
export const FEELINGS = [
  // приятные
  { id: 'joy', label: 'Радость', band: 'pos' },
  { id: 'happy', label: 'Счастье', band: 'pos' },
  { id: 'proud', label: 'Гордость', band: 'pos' },
  { id: 'grateful', label: 'Благодарность', band: 'pos' },
  { id: 'excited', label: 'Воодушевление', band: 'pos' },
  { id: 'confident', label: 'Уверенность', band: 'pos' },
  { id: 'hopeful', label: 'Надежда', band: 'pos' },
  { id: 'amazed', label: 'Восторг', band: 'pos' },
  { id: 'calm', label: 'Спокойствие', band: 'pos' },
  { id: 'relieved', label: 'Облегчение', band: 'pos' },
  { id: 'satisfied', label: 'Удовлетворение', band: 'pos' },
  { id: 'brave', label: 'Смелость', band: 'pos' },
  { id: 'passionate', label: 'Увлечённость', band: 'pos' },
  { id: 'amused', label: 'Веселье', band: 'pos' },
  { id: 'peaceful', label: 'Умиротворение', band: 'pos' },
  { id: 'loved', label: 'Любовь', band: 'pos' },
  // около нуля
  { id: 'content', label: 'Довольство', band: 'mid' },
  { id: 'focused', label: 'Собранность', band: 'mid' },
  { id: 'indifferent', label: 'Безразличие', band: 'mid' },
  { id: 'tired', label: 'Усталость', band: 'mid' },
  { id: 'surprised', label: 'Удивление', band: 'mid' },
  { id: 'bored', label: 'Скука', band: 'mid' },
  { id: 'drained', label: 'Опустошённость', band: 'mid' },
  { id: 'thoughtful', label: 'Задумчивость', band: 'mid' },
  // неприятные
  { id: 'anxious', label: 'Тревога', band: 'neg' },
  { id: 'stressed', label: 'Стресс', band: 'neg' },
  { id: 'irritated', label: 'Раздражение', band: 'neg' },
  { id: 'angry', label: 'Злость', band: 'neg' },
  { id: 'sad', label: 'Грусть', band: 'neg' },
  { id: 'lonely', label: 'Одиночество', band: 'neg' },
  { id: 'disappointed', label: 'Разочарование', band: 'neg' },
  { id: 'discouraged', label: 'Упадок сил', band: 'neg' },
  { id: 'overwhelmed', label: 'Перегруз', band: 'neg' },
  { id: 'frustrated', label: 'Досада', band: 'neg' },
  { id: 'worried', label: 'Беспокойство', band: 'neg' },
  { id: 'guilty', label: 'Вина', band: 'neg' },
  { id: 'ashamed', label: 'Стыд', band: 'neg' },
  { id: 'jealous', label: 'Зависть', band: 'neg' },
  { id: 'scared', label: 'Страх', band: 'neg' },
  { id: 'hopeless', label: 'Безнадёжность', band: 'neg' },
  { id: 'annoyed', label: 'Недовольство', band: 'neg' },
  { id: 'embarrassed', label: 'Неловкость', band: 'neg' },
];
export const bandOf = (mood) => (mood <= -1 ? 'neg' : mood >= 1 ? 'pos' : 'mid');
// Какие чувства показывать для уровня: свои плюс соседние «около нуля».
export function feelingsFor(mood) {
  const b = bandOf(mood);
  if (b === 'mid') return [...FEELINGS.filter((f) => f.band === 'mid'), ...FEELINGS.filter((f) => f.band !== 'mid')];
  return FEELINGS.filter((f) => f.band === b || f.band === 'mid');
}
export const feelingOf = (id) => FEELINGS.find((f) => f.id === id) || null;

// Что влияло. group нужен для статистики «по сферам».
export const FACTORS = [
  { id: 'health', label: 'Здоровье', group: 'self' },
  { id: 'sleep', label: 'Сон', group: 'self' },
  { id: 'fitness', label: 'Спорт', group: 'self' },
  { id: 'selfcare', label: 'Отдых и забота о себе', group: 'self' },
  { id: 'food', label: 'Еда', group: 'self' },
  { id: 'hobbies', label: 'Хобби', group: 'self' },
  { id: 'games', label: 'Игры', group: 'self' },
  { id: 'music', label: 'Музыка', group: 'self' },
  { id: 'identity', label: 'Я сам', group: 'self' },
  { id: 'family', label: 'Семья', group: 'people' },
  { id: 'friends', label: 'Друзья', group: 'people' },
  { id: 'partner', label: 'Отношения', group: 'people' },
  { id: 'pets', label: 'Питомцы', group: 'people' },
  { id: 'community', label: 'Люди вокруг', group: 'people' },
  { id: 'education', label: 'Учёба', group: 'work' },
  { id: 'work', label: 'Работа', group: 'work' },
  { id: 'projects', label: 'Проекты', group: 'work' },
  { id: 'tasks', label: 'Дела', group: 'work' },
  { id: 'money', label: 'Деньги', group: 'work' },
  { id: 'cars', label: 'Машины', group: 'world' },
  { id: 'tech', label: 'Техника и гаджеты', group: 'world' },
  { id: 'travel', label: 'Поездки', group: 'world' },
  { id: 'weather', label: 'Погода', group: 'world' },
  { id: 'news', label: 'Новости', group: 'world' },
];
export const FACTOR_GROUPS = [
  { id: 'self', label: 'Я и моё' },
  { id: 'people', label: 'Люди' },
  { id: 'work', label: 'Дела и учёба' },
  { id: 'world', label: 'Вокруг' },
];
export const factorOf = (id) => FACTORS.find((f) => f.id === id) || null;
export const factorLabel = (id) => (factorOf(id) || { label: id }).label;
