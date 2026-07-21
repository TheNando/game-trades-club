import { useState, useMemo, useEffect } from 'preact/hooks';
import { shuffle } from '@game-trades-club/shared';

type MiniCard = {
  title: string;
  meta: string;
  accent: (typeof ACCENTS)[number];
  emoji: string;
};

const ACCENTS = [
  '#dfe3d4', // green
  '#f8e8cc', // yellow
  '#f8dfd6', // pink
  '#ebdce6', // purple
  '#d1ddeb', // blue
];

const HERO_CARDS: Array<Partial<MiniCard>> = [
  {
    title: 'Wingspan',
    meta: 'Like new · $42',
    emoji: '🐦',
  },
  {
    title: 'Brass: Birmingham',
    meta: 'Good · trade',
    emoji: '🏭',
  },
  { title: 'Catan', meta: 'Open box · $25', emoji: '🐑' },
  {
    title: 'Ticket to Ride',
    meta: 'Good · $30',
    emoji: '🚂',
  },
  {
    title: 'Carcassonne',
    meta: 'Like new · trade',
    emoji: '🏰',
  },
  { title: 'Pandemic', meta: 'Good · $20', emoji: '🦠' },
  {
    title: '7 Wonders',
    meta: 'Like new · $28',
    emoji: '🏛️',
  },
  { title: 'Azul', meta: 'Open box · $24', emoji: '🎨' },
  { title: 'Splendor', meta: 'Good · trade', emoji: '💎' },
  {
    title: 'Terraforming Mars',
    meta: 'Like new · $48',
    emoji: '🚀',
  },
  { title: 'Root', meta: 'Good · $40', emoji: '🦝' },
  {
    title: 'Everdell',
    meta: 'Like new · $55',
    emoji: '🌳',
  },
  { title: 'Gloomhaven', meta: 'Good · trade', emoji: '⚔️' },
];

const HERO_SLOTS = 3;

function getRandomCards(cards: typeof HERO_CARDS, count: number): typeof HERO_CARDS {
  const shuffled = shuffle(cards);
  const colors = shuffle(ACCENTS);
  return shuffled
    .slice(0, count)
    .map((card, index) => ({ ...card, accent: colors[index % colors.length] }));
}

const d6Icon = (
  <svg
    viewBox="0 0 24 24"
    class="w-5 h-5"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="9" cy="8" r="1" fill="currentColor" />
    <circle cx="9" cy="12" r="1" fill="currentColor" />
    <circle cx="9" cy="16" r="1" fill="currentColor" />
    <circle cx="15" cy="8" r="1" fill="currentColor" />
    <circle cx="15" cy="12" r="1" fill="currentColor" />
    <circle cx="15" cy="16" r="1" fill="currentColor" />
  </svg>
);

type MiniCardProps = {
  card: (typeof HERO_CARDS)[number];
  className?: string;
  order: number;
};

function MiniCard({ card, className, order }: MiniCardProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [newCard, setNewCard] = useState(card);
  const { emoji, meta, title } = newCard;

  useEffect(() => {
    return () => {
      setIsSpinning(true);
      setTimeout(() => {
        setNewCard(card);
        setIsSpinning(false);
      }, 400);
    };
  }, [card]);

  return (
    <div
      class={`absolute w-56 sm:w-64 rounded-2xl border border-base-300 bg-base-100 shadow-lg
        ${className} ${isSpinning ? 'spin' : ''}`}
      style={
        {
          'justify-self': order === 0 ? 'flex-start' : order === 2 ? 'center' : 'flex-end',
          'top': order ? `${order * 20}%` : undefined,
          'transition': 'all 500ms ease-in-out',
        } as any
      }
    >
      <div className="p-4">
        <div
          class="aspect-4/3 rounded-xl grid place-items-center text-5xl card-accent-transition"
          style={{
            backgroundColor: card.accent,
          }}
        >
          <span aria-hidden="true">{emoji}</span>
        </div>
        <div class="mt-3 flex items-baseline justify-between gap-2">
          <p class="font-display text-lg leading-tight truncate transition-opacity">{title}</p>
          <span class="text-[10px] uppercase tracking-wider text-base-content/55">Listing</span>
        </div>
        <p class="text-sm text-base-content/65 mt-0.5">{meta}</p>
      </div>
    </div>
  );
}

/** Renders the interactive stack of listing cards in the homepage hero. */
export function HeroStack() {
  const [seed, setSeed] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);

  const [card1, card2, card3] = useMemo(() => {
    return getRandomCards(HERO_CARDS, HERO_SLOTS);
  }, [seed]);

  const rollDie = () => {
    setIsSpinning(true);
    setSeed(Math.random());
    setTimeout(() => setIsSpinning(false), 500);
  };

  return (
    <div
      class="absolute inset-0 hover px-32 lg:p-0 float-y"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <MiniCard card={card1} className="-rotate-6" order={0} />
      <MiniCard card={card2} className="rotate-6" order={1} />
      <MiniCard card={card3} className="-rotate-2" order={2} />

      {/* Dice randomize button */}
      <button
        aria-label="Randomize cards"
        disabled={isSpinning}
        class={`absolute flex items-center justify-center rounded-xl cursor-pointer
          top-4 right-4 w-10 h-10 z-10 border-2
          text-base-content/70 bg-base-100 border-base-300
          disabled:cursor-not-allowed disabled:opacity-60 disabled:border-base-300
          transition-all
          hover:shadow-xl hover:border-primary/60 hover:text-primary ${isHovered ? 'hover-float opacity-100' : 'opacity-0'}
          ${isSpinning ? 'spin' : 'shadow-lg'}`}
        onClick={rollDie}
        title="Shuffle cards"
      >
        {d6Icon}
      </button>
    </div>
  );
}
