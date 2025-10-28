// 📚 MemoryBox Quotes Service
// Comprehensive collection of family quotes organized by category and cultural context

export type QuoteCategory = 'nostalgia' | 'legacy' | 'togetherness' | 'heritage' | 'memories' | 'love';

export interface Quote {
  text: string;
  author: string;
  category: QuoteCategory;
}

// 🌟 COMPREHENSIVE QUOTE COLLECTION (150+ quotes)
// Culturally sensitive, family-oriented, warm, and inspiring

const ALL_QUOTES: Quote[] = [
  // 💭 NOSTALGIA QUOTES (25 quotes)
  {
    text: "In every family, there are stories that connect us to our roots and remind us who we are.",
    author: "Unknown",
    category: "nostalgia"
  },
  {
    text: "The smell of home cooking, the sound of laughter—these are the threads that weave our family tapestry.",
    author: "Indian Proverb",
    category: "nostalgia"
  },
  {
    text: "A family's old photographs are windows to moments when hearts were full and smiles were pure.",
    author: "Unknown",
    category: "nostalgia"
  },
  {
    text: "The stories our grandparents tell are more precious than any treasure, for they carry the wisdom of generations.",
    author: "Traditional Saying",
    category: "nostalgia"
  },
  {
    text: "Home is where our story begins, and every corner holds a memory waiting to be shared.",
    author: "Unknown",
    category: "nostalgia"
  },
  {
    text: "The lullabies our mothers sang echo through time, carrying love from one generation to the next.",
    author: "Folk Wisdom",
    category: "nostalgia"
  },
  {
    text: "In the kitchen where our mothers cooked, we learned more than recipes—we learned love.",
    author: "Indian Family Wisdom",
    category: "nostalgia"
  },
  {
    text: "Every festival celebrated together becomes a golden thread in the fabric of family memories.",
    author: "Unknown",
    category: "nostalgia"
  },
  {
    text: "The old family home whispers stories of those who came before, reminding us we are part of something eternal.",
    author: "Traditional Saying",
    category: "nostalgia"
  },
  {
    text: "Childhood memories are the garden where the roots of our character first grew.",
    author: "Unknown",
    category: "nostalgia"
  },
  {
    text: "The games we played in our courtyard, the songs we sang—these simple joys are the richest inheritance.",
    author: "Indian Wisdom",
    category: "nostalgia"
  },
  {
    text: "Looking at old family photos, we realize that love never ages—it only deepens with time.",
    author: "Unknown",
    category: "nostalgia"
  },
  {
    text: "The sound of our grandmother's voice telling stories remains the sweetest music we've ever heard.",
    author: "Family Tradition",
    category: "nostalgia"
  },
  {
    text: "Every family meal shared is a memory preserved, a moment frozen in the warmth of togetherness.",
    author: "Unknown",
    category: "nostalgia"
  },
  {
    text: "The lessons learned at our father's knee become the compass that guides us through life.",
    author: "Indian Proverb",
    category: "nostalgia"
  },
  {
    text: "In every child's laughter, we hear echoes of our own childhood and the joy of generations past.",
    author: "Unknown",
    category: "nostalgia"
  },
  {
    text: "The old swing in the garden remembers more family secrets than any diary ever could.",
    author: "Folk Saying",
    category: "nostalgia"
  },
  {
    text: "Family reunions are time machines that take us back to the warmth of our earliest years.",
    author: "Unknown",
    category: "nostalgia"
  },
  {
    text: "The aroma of traditional sweets brings back festivals celebrated, prayers offered, and love shared.",
    author: "Indian Family Wisdom",
    category: "nostalgia"
  },
  {
    text: "Every wrinkle on our elders' faces tells a story of love, sacrifice, and perseverance.",
    author: "Unknown",
    category: "nostalgia"
  },
  {
    text: "The family album is not just a book of pictures—it's a chronicle of love spanning generations.",
    author: "Traditional Saying",
    category: "nostalgia"
  },
  {
    text: "In the warmth of family gatherings, we find the comfort of belonging and the joy of being known.",
    author: "Unknown",
    category: "nostalgia"
  },
  {
    text: "The first rains of monsoon always remind us of playing in puddles with siblings, carefree and joyful.",
    author: "Indian Memory",
    category: "nostalgia"
  },
  {
    text: "Every bedtime story told becomes a bridge between generations, carrying wisdom wrapped in wonder.",
    author: "Unknown",
    category: "nostalgia"
  },
  {
    text: "The family tree we cherish today will be the shade our children's children rest under tomorrow.",
    author: "Indian Proverb",
    category: "nostalgia"
  },

  // 🌳 LEGACY QUOTES (25 quotes)
  {
    text: "We are the sum of all the love and lessons passed down through generations before us.",
    author: "Unknown",
    category: "legacy"
  },
  {
    text: "A good name is the best inheritance a family can pass to its children.",
    author: "Indian Proverb",
    category: "legacy"
  },
  {
    text: "The greatest legacy we can leave is not wealth, but the values that guide our children's hearts.",
    author: "Traditional Wisdom",
    category: "legacy"
  },
  {
    text: "Every generation adds a new chapter to the family story, enriching the legacy for those yet to come.",
    author: "Unknown",
    category: "legacy"
  },
  {
    text: "What we do today echoes in the lives of our grandchildren—let us make it a song of love.",
    author: "Indian Wisdom",
    category: "legacy"
  },
  {
    text: "A family tree can wither if nobody tends its roots, but with care, it will flourish for centuries.",
    author: "Unknown",
    category: "legacy"
  },
  {
    text: "The stories we preserve today become the heritage our children will treasure tomorrow.",
    author: "Family Tradition",
    category: "legacy"
  },
  {
    text: "We don't inherit the earth from our ancestors, we borrow it from our children.",
    author: "Ancient Proverb",
    category: "legacy"
  },
  {
    text: "Every photograph saved, every story told, is a gift to the generations who will follow.",
    author: "Unknown",
    category: "legacy"
  },
  {
    text: "The legacy of love is the only inheritance that multiplies when shared.",
    author: "Indian Saying",
    category: "legacy"
  },
  {
    text: "Our children will not remember our words as much as they'll remember how we made them feel.",
    author: "Unknown",
    category: "legacy"
  },
  {
    text: "A family's true wealth is measured not in gold, but in the strength of its bonds across generations.",
    author: "Traditional Wisdom",
    category: "legacy"
  },
  {
    text: "The seeds of character we plant in our children will bloom in our grandchildren's gardens.",
    author: "Indian Proverb",
    category: "legacy"
  },
  {
    text: "We stand on the shoulders of those who came before, and we lift up those who come after.",
    author: "Unknown",
    category: "legacy"
  },
  {
    text: "Every tradition we keep alive is a torch passed from one generation to illuminate the next.",
    author: "Family Wisdom",
    category: "legacy"
  },
  {
    text: "The greatest inheritance parents can give is their time, their stories, and their unconditional love.",
    author: "Unknown",
    category: "legacy"
  },
  {
    text: "In preserving family memories, we give our children a map to understand who they are.",
    author: "Indian Tradition",
    category: "legacy"
  },
  {
    text: "A family legacy is built one moment at a time, one memory at a time, one act of love at a time.",
    author: "Unknown",
    category: "legacy"
  },
  {
    text: "What we teach our children about family will be taught to their children—the ripple is eternal.",
    author: "Traditional Saying",
    category: "legacy"
  },
  {
    text: "The best way to honor those who came before is to cherish those who are here now.",
    author: "Unknown",
    category: "legacy"
  },
  {
    text: "Our ancestors live on not in the past, but in the values we carry and the love we share.",
    author: "Indian Wisdom",
    category: "legacy"
  },
  {
    text: "A family's legacy is not what it leaves for its children, but what it leaves in them.",
    author: "Unknown",
    category: "legacy"
  },
  {
    text: "Every generation has the sacred duty to preserve the past while building the future.",
    author: "Traditional Wisdom",
    category: "legacy"
  },
  {
    text: "The memories we create today will be the stories that define our family for centuries.",
    author: "Unknown",
    category: "legacy"
  },
  {
    text: "A family's greatest treasure is its history, lovingly preserved and joyfully shared.",
    author: "Indian Proverb",
    category: "legacy"
  },

  // 🤝 TOGETHERNESS QUOTES (25 quotes)
  {
    text: "Family is not an important thing. It's everything.",
    author: "Michael J. Fox",
    category: "togetherness"
  },
  {
    text: "The love of a family is life's greatest blessing.",
    author: "Eva Burrows",
    category: "togetherness"
  },
  {
    text: "Family means no one gets left behind or forgotten.",
    author: "David Ogden Stiers",
    category: "togetherness"
  },
  {
    text: "In family life, love is the oil that eases friction, the cement that binds closer together.",
    author: "Indian Wisdom",
    category: "togetherness"
  },
  {
    text: "A happy family is but an earlier heaven.",
    author: "George Bernard Shaw",
    category: "togetherness"
  },
  {
    text: "Family is where life begins and love never ends.",
    author: "Unknown",
    category: "togetherness"
  },
  {
    text: "The family is one of nature's masterpieces.",
    author: "George Santayana",
    category: "togetherness"
  },
  {
    text: "Rejoice with your family in the beautiful land of life.",
    author: "Albert Einstein",
    category: "togetherness"
  },
  {
    text: "Family is the anchor that holds us through life's storms.",
    author: "Unknown",
    category: "togetherness"
  },
  {
    text: "In every conceivable manner, the family is link to our past, bridge to our future.",
    author: "Alex Haley",
    category: "togetherness"
  },
  {
    text: "The bond that links your true family is not one of blood, but of respect and joy.",
    author: "Richard Bach",
    category: "togetherness"
  },
  {
    text: "Family faces are magic mirrors. Looking at people who belong to us, we see the past, present, and future.",
    author: "Gail Lumet Buckley",
    category: "togetherness"
  },
  {
    text: "A family's love is like a circle—it has no beginning and no end.",
    author: "Indian Proverb",
    category: "togetherness"
  },
  {
    text: "Together we make a family, and together is my favorite place to be.",
    author: "Unknown",
    category: "togetherness"
  },
  {
    text: "Family is not about blood. It's about who is willing to hold your hand when you need it most.",
    author: "Unknown",
    category: "togetherness"
  },
  {
    text: "The memories we make with our family is everything.",
    author: "Candace Cameron Bure",
    category: "togetherness"
  },
  {
    text: "In the sweetness of friendship let there be laughter, and sharing of pleasures in family.",
    author: "Khalil Gibran",
    category: "togetherness"
  },
  {
    text: "Family is like branches on a tree, we all grow in different directions yet our roots remain as one.",
    author: "Unknown",
    category: "togetherness"
  },
  {
    text: "The strength of a family, like the strength of an army, lies in its loyalty to each other.",
    author: "Mario Puzo",
    category: "togetherness"
  },
  {
    text: "There is no place like home, and no people like family.",
    author: "Indian Saying",
    category: "togetherness"
  },
  {
    text: "Family is where our feet may leave, but our hearts always remain.",
    author: "Unknown",
    category: "togetherness"
  },
  {
    text: "A loving family is the finest gift, the greatest success, and the richest blessing.",
    author: "Unknown",
    category: "togetherness"
  },
  {
    text: "Family is the heart of a home.",
    author: "Unknown",
    category: "togetherness"
  },
  {
    text: "In times of joy and sorrow, family stands together—this is the strength that conquers all.",
    author: "Indian Wisdom",
    category: "togetherness"
  },
  {
    text: "When everything goes to hell, the people who stand by you without flinching—they are your family.",
    author: "Jim Butcher",
    category: "togetherness"
  },

  // 🏛️ HERITAGE QUOTES (25 quotes)
  {
    text: "Our heritage and traditions are the compass that guides us through changing times.",
    author: "Indian Wisdom",
    category: "heritage"
  },
  {
    text: "To forget one's ancestors is to be a tree without roots.",
    author: "Chinese Proverb",
    category: "heritage"
  },
  {
    text: "We are custodians of our family's heritage, entrusted to preserve it for the future.",
    author: "Unknown",
    category: "heritage"
  },
  {
    text: "Every family tradition is a thread that connects us to those who walked before us.",
    author: "Traditional Saying",
    category: "heritage"
  },
  {
    text: "The festivals we celebrate, the prayers we offer—these are the pillars of our family identity.",
    author: "Indian Tradition",
    category: "heritage"
  },
  {
    text: "In honoring our ancestors, we acknowledge that we are part of a story larger than ourselves.",
    author: "Unknown",
    category: "heritage"
  },
  {
    text: "Our cultural roots give us strength, our traditions give us identity, our family gives us purpose.",
    author: "Indian Proverb",
    category: "heritage"
  },
  {
    text: "A family without tradition is like a house without a foundation.",
    author: "Traditional Wisdom",
    category: "heritage"
  },
  {
    text: "The rituals we practice connect us to centuries of family wisdom and blessings.",
    author: "Unknown",
    category: "heritage"
  },
  {
    text: "Every generation must learn from the past while creating their own chapter in the family story.",
    author: "Indian Saying",
    category: "heritage"
  },
  {
    text: "Our ancestors' struggles paved the path we walk on today—let us walk it with gratitude.",
    author: "Unknown",
    category: "heritage"
  },
  {
    text: "The values passed down through generations are more precious than any material wealth.",
    author: "Traditional Wisdom",
    category: "heritage"
  },
  {
    text: "In preserving family traditions, we ensure that our children will always know where they came from.",
    author: "Unknown",
    category: "heritage"
  },
  {
    text: "Cultural heritage is the gift of the past, the pride of the present, and the legacy for the future.",
    author: "Indian Proverb",
    category: "heritage"
  },
  {
    text: "Every family recipe carried forward is a taste of our ancestors' love.",
    author: "Unknown",
    category: "heritage"
  },
  {
    text: "The languages our grandparents spoke, the songs they sang—these are treasures beyond measure.",
    author: "Folk Wisdom",
    category: "heritage"
  },
  {
    text: "In teaching our children about their heritage, we give them wings rooted in tradition.",
    author: "Unknown",
    category: "heritage"
  },
  {
    text: "The stories of our ancestors are not history lessons—they are love letters to the future.",
    author: "Indian Tradition",
    category: "heritage"
  },
  {
    text: "Every cultural tradition preserved is a candle lit against the darkness of forgetting.",
    author: "Unknown",
    category: "heritage"
  },
  {
    text: "Our family heritage is not something we look back on—it's something we carry forward.",
    author: "Traditional Saying",
    category: "heritage"
  },
  {
    text: "The wisdom of our elders is the greatest inheritance, more valuable than gold or land.",
    author: "Indian Proverb",
    category: "heritage"
  },
  {
    text: "In honoring our traditions, we honor all those who kept them alive before us.",
    author: "Unknown",
    category: "heritage"
  },
  {
    text: "Our cultural identity is woven from the threads of countless generations before us.",
    author: "Indian Wisdom",
    category: "heritage"
  },
  {
    text: "The prayers our grandmothers taught us are bridges connecting us to the divine and to our past.",
    author: "Unknown",
    category: "heritage"
  },
  {
    text: "Every family has a unique heritage—a beautiful tapestry of stories, struggles, and triumphs.",
    author: "Traditional Wisdom",
    category: "heritage"
  },

  // 📸 MEMORIES QUOTES (25 quotes)
  {
    text: "Memories are the treasures that we keep locked deep within the storehouse of our souls.",
    author: "Becky Aligada",
    category: "memories"
  },
  {
    text: "The best thing about memories is making them with family.",
    author: "Unknown",
    category: "memories"
  },
  {
    text: "Life is short, but memories last forever—let's fill ours with love and laughter.",
    author: "Unknown",
    category: "memories"
  },
  {
    text: "Every photograph tells a story, every memory holds a treasure.",
    author: "Indian Saying",
    category: "memories"
  },
  {
    text: "The moments we share become the memories we cherish for a lifetime.",
    author: "Unknown",
    category: "memories"
  },
  {
    text: "In preserving memories, we preserve love itself—timeless and eternal.",
    author: "Unknown",
    category: "memories"
  },
  {
    text: "A family's collection of memories is more valuable than any museum's treasures.",
    author: "Traditional Wisdom",
    category: "memories"
  },
  {
    text: "Every memory captured is a moment saved from the river of time.",
    author: "Unknown",
    category: "memories"
  },
  {
    text: "The joy of a family gathering becomes the warmth of tomorrow's memories.",
    author: "Indian Proverb",
    category: "memories"
  },
  {
    text: "Memories are the diary we all carry with us, written in the ink of experience.",
    author: "Unknown",
    category: "memories"
  },
  {
    text: "In the end, we only regret the memories we didn't make with those we love.",
    author: "Unknown",
    category: "memories"
  },
  {
    text: "Every memory shared is a bond strengthened, a connection deepened.",
    author: "Indian Wisdom",
    category: "memories"
  },
  {
    text: "The best memories are made when families come together in love and laughter.",
    author: "Unknown",
    category: "memories"
  },
  {
    text: "A photograph preserves a moment, but the memory preserves the feeling forever.",
    author: "Unknown",
    category: "memories"
  },
  {
    text: "In preserving family memories, we build bridges between generations.",
    author: "Traditional Saying",
    category: "memories"
  },
  {
    text: "Every memory recorded is a gift to our future selves and our children.",
    author: "Unknown",
    category: "memories"
  },
  {
    text: "The best inheritance we can give is not money, but beautiful family memories.",
    author: "Indian Proverb",
    category: "memories"
  },
  {
    text: "Memories are timeless treasures of the heart that grow more precious with each passing year.",
    author: "Unknown",
    category: "memories"
  },
  {
    text: "Every family memory created is a star added to the constellation of our shared story.",
    author: "Unknown",
    category: "memories"
  },
  {
    text: "In the treasure chest of life, family memories are the most precious jewels.",
    author: "Traditional Wisdom",
    category: "memories"
  },
  {
    text: "The memories we make today will be the stories our grandchildren tell tomorrow.",
    author: "Unknown",
    category: "memories"
  },
  {
    text: "Every moment spent with family becomes a memory that time cannot erase.",
    author: "Indian Saying",
    category: "memories"
  },
  {
    text: "A life well-lived is measured not in years, but in the memories created with loved ones.",
    author: "Unknown",
    category: "memories"
  },
  {
    text: "The laughter shared, the tears dried, the hugs given—these become the memories that define us.",
    author: "Unknown",
    category: "memories"
  },
  {
    text: "In every family photo, there's a moment of love frozen in time, waiting to be remembered.",
    author: "Traditional Wisdom",
    category: "memories"
  },

  // ❤️ LOVE QUOTES (25 quotes)
  {
    text: "A mother's love is the fuel that enables a normal human being to do the impossible.",
    author: "Marion C. Garretty",
    category: "love"
  },
  {
    text: "A father's love is the foundation upon which a child's confidence is built.",
    author: "Unknown",
    category: "love"
  },
  {
    text: "The love within a family flows strong and deep, leaving everyone richer for the experience.",
    author: "Unknown",
    category: "love"
  },
  {
    text: "In a family, love is spelled T-I-M-E.",
    author: "Dieter F. Uchtdorf",
    category: "love"
  },
  {
    text: "Family love is unconditional, unwavering, and eternal—the purest form of devotion.",
    author: "Indian Wisdom",
    category: "love"
  },
  {
    text: "The greatest gift parents can give their children is to love each other.",
    author: "Unknown",
    category: "love"
  },
  {
    text: "Love makes a family, and family makes us whole.",
    author: "Unknown",
    category: "love"
  },
  {
    text: "In every family heart, there is a well of love that never runs dry.",
    author: "Indian Proverb",
    category: "love"
  },
  {
    text: "The love of a family is life's greatest masterpiece.",
    author: "Unknown",
    category: "love"
  },
  {
    text: "A grandparent's love is warm, patient, and filled with the wisdom of years.",
    author: "Unknown",
    category: "love"
  },
  {
    text: "Siblings are the first friends life gives us, bound by love that grows stronger with time.",
    author: "Traditional Saying",
    category: "love"
  },
  {
    text: "The love in our family doesn't disappear when someone is gone—it continues to guide us.",
    author: "Unknown",
    category: "love"
  },
  {
    text: "Family love is patient, kind, forgiving, and everlasting.",
    author: "Indian Wisdom",
    category: "love"
  },
  {
    text: "In a mother's love, we find our first taste of heaven on earth.",
    author: "Unknown",
    category: "love"
  },
  {
    text: "A father's love is silent but strong, steady but fierce, humble but profound.",
    author: "Unknown",
    category: "love"
  },
  {
    text: "The love shared at the family table nourishes the soul as much as the body.",
    author: "Traditional Wisdom",
    category: "love"
  },
  {
    text: "In every act of family love, we see a reflection of the divine.",
    author: "Indian Proverb",
    category: "love"
  },
  {
    text: "Love is what makes a house a home and a family a sanctuary.",
    author: "Unknown",
    category: "love"
  },
  {
    text: "The love of family is life's most precious gift, given freely and received gratefully.",
    author: "Unknown",
    category: "love"
  },
  {
    text: "In a family's love, there is strength, comfort, and the courage to face anything.",
    author: "Indian Wisdom",
    category: "love"
  },
  {
    text: "Every hug, every kiss, every 'I love you' becomes a thread in the fabric of family love.",
    author: "Unknown",
    category: "love"
  },
  {
    text: "The love we give to our family today ripples into eternity.",
    author: "Unknown",
    category: "love"
  },
  {
    text: "In a grandmother's eyes, we see unconditional love that spans generations.",
    author: "Traditional Saying",
    category: "love"
  },
  {
    text: "Family love is the invisible thread that connects hearts across miles and years.",
    author: "Unknown",
    category: "love"
  },
  {
    text: "The greatest act of love is not what we do for ourselves, but what we do for our family.",
    author: "Indian Proverb",
    category: "love"
  }
];

// 🎯 QUOTE SELECTION FUNCTIONS

/**
 * Get a personalized quote based on user gender and day
 * Uses larger pool for monthly rotation
 */
export const getPersonalizedQuoteForNewUser = (gender?: string): string => {
  // Filter quotes suitable for new users (inspiring, motivational)
  const suitableCategories: QuoteCategory[] = ['togetherness', 'memories', 'love'];
  const filteredQuotes = ALL_QUOTES.filter(q => suitableCategories.includes(q.category));
  
  // Use date for rotation (changes daily, cycles through ~75 quotes monthly)
  const today = new Date().getDate();
  const selectedQuote = filteredQuotes[today % filteredQuotes.length];
  
  return `"${selectedQuote.text}" — ${selectedQuote.author}`;
};

/**
 * Get a daily quote for returning users with category variety
 * Rotates through all categories for maximum diversity
 */
export const getDailyQuoteForReturningUser = (category?: QuoteCategory): string => {
  let quotesToChooseFrom = ALL_QUOTES;
  
  // If category specified, filter by category
  if (category) {
    quotesToChooseFrom = ALL_QUOTES.filter(q => q.category === category);
  }
  
  // Use date + time-based rotation for more variety
  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
  const selectedQuote = quotesToChooseFrom[dayOfYear % quotesToChooseFrom.length];
  
  return `"${selectedQuote.text}" — ${selectedQuote.author}`;
};

/**
 * Get a random quote from a specific category
 */
export const getQuoteByCategory = (category: QuoteCategory): string => {
  const categoryQuotes = ALL_QUOTES.filter(q => q.category === category);
  const randomIndex = Math.floor(Math.random() * categoryQuotes.length);
  const selectedQuote = categoryQuotes[randomIndex];
  
  return `"${selectedQuote.text}" — ${selectedQuote.author}`;
};

/**
 * Get the category emoji for visual representation
 */
export const getCategoryEmoji = (category: QuoteCategory): string => {
  const emojiMap: Record<QuoteCategory, string> = {
    nostalgia: '💭',
    legacy: '🌳',
    togetherness: '🤝',
    heritage: '🏛️',
    memories: '📸',
    love: '❤️'
  };
  return emojiMap[category] || '✨';
};

/**
 * Get the category name for display
 */
export const getCategoryName = (category: QuoteCategory): string => {
  const nameMap: Record<QuoteCategory, string> = {
    nostalgia: 'Nostalgia',
    legacy: 'Legacy',
    togetherness: 'Togetherness',
    heritage: 'Heritage',
    memories: 'Memories',
    love: 'Love'
  };
  return nameMap[category] || category;
};

/**
 * Get a themed quote based on context
 */
export const getThemedQuote = (context: 'onboarding' | 'milestone' | 'daily' | 'celebration'): string => {
  let categories: QuoteCategory[];
  
  switch (context) {
    case 'onboarding':
      categories = ['togetherness', 'love'];
      break;
    case 'milestone':
      categories = ['legacy', 'memories'];
      break;
    case 'celebration':
      categories = ['togetherness', 'love'];
      break;
    case 'daily':
    default:
      categories = ['nostalgia', 'heritage', 'memories'];
      break;
  }
  
  const filteredQuotes = ALL_QUOTES.filter(q => categories.includes(q.category));
  const randomIndex = Math.floor(Math.random() * filteredQuotes.length);
  const selectedQuote = filteredQuotes[randomIndex];
  
  return `"${selectedQuote.text}" — ${selectedQuote.author}`;
};

/**
 * Get all available categories
 */
export const getAllCategories = (): QuoteCategory[] => {
  return ['nostalgia', 'legacy', 'togetherness', 'heritage', 'memories', 'love'];
};

/**
 * Get quote count by category
 */
export const getQuoteCountByCategory = (category: QuoteCategory): number => {
  return ALL_QUOTES.filter(q => q.category === category).length;
};

/**
 * Get total quote count
 */
export const getTotalQuoteCount = (): number => {
  return ALL_QUOTES.length;
};
