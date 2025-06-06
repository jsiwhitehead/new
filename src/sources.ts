const authorYears = {
  "The Báb": [1844, 1853],
  "Bahá’u’lláh": [1853, 1892],
  "‘Abdu’l-Bahá": [1892, 1921],
  "Shoghi Effendi": [1921, 1957],
} as Record<string, [number, number]>;

const prefix = (
  line: string | RegExp,
  pre: string
): [string | RegExp, (s: string) => string] => [
  line,
  (s: string) => `${pre}${s}`,
];

const escapeForRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const removeAfter = (s: string): [RegExp, string] => [
  new RegExp(`^${escapeForRegex(s)}[\\s\\S]+`, "m"),
  "",
];

const getTitle = (s: string, t: string, translated?: string) => {
  if (!translated) return t;
  if (s.toLowerCase().includes("excerpts")) return `Excerpts from the ${t}`;
  if (s.toLowerCase().includes("excerpt")) return `Excerpt from the ${t}`;
  return t;
};
const title = (
  level: string,
  title: string,
  { translated, prayer, ...config } = {} as {
    author?: string;
    years?: [number, number];
    translated?: string;
    meta?: string;
    prayer?: boolean;
  }
): [RegExp, (s: string) => string] => [
  new RegExp(
    `(${[title, translated]
      .filter((x) => x)
      .map((x) => `^(Excerpt.*|)${escapeForRegex(x!)}.*$`)
      .join("|")})(\n\n^\\(.*\\)$)?`,
    "mi"
  ),
  (s: string) =>
    [
      `${level ? level + " " : ""}${getTitle(s, title, translated)}`,
      ...Object.keys(config).map(
        (k) => `${k}=${JSON.stringify((config as any)[k])}`
      ),
      translated && `translated="${translated}"`,
      prayer && `prayer`,
    ]
      .filter((x) => x)
      .join("\n"),
];

const splitLines = (
  line: RegExp,
  ...splits: string[]
): [RegExp, (s: string) => string] => [
  line,
  (s: string) => {
    const indices = [0, ...splits.map((a) => s.indexOf(a))];
    return `\n\n${indices.map((n, i) => `\n> ${s.slice(n, indices[i + 1]).trim()}`).join("")}`;
  },
];

const obligatory = [
  prefix(/^To be recited once in twenty-four/gm, "* "),
  prefix(/^To be recited daily, in the morning/m, "* "),
  prefix(/^Whoso wisheth to pray, let him wash/m, "* "),
  prefix(/^And while washing his face, let/m, "* "),
  prefix(/^Then let him stand up, and facing the/m, "* "),
  prefix(/^Let him, then/gm, "* "),
  prefix(/^Then, standing with open hands, palms/m, "* "),
  prefix(/^\(If anyone choose to recite instead/m, "* "),
  prefix(/^Whoso wisheth to recite this prayer/m, "* "),
  prefix(/^Let him then/gm, "* "),
  prefix(/^Let him again raise his hands/m, "* "),
  prefix(/^\(If the dead be a woman, let him say/m, "* "),
];

const sources: Record<
  string,
  Record<
    string,
    (
      | [string, string]
      | [RegExp, string]
      | [string | RegExp, (s: string, ...args: any[]) => string]
    )[]
  >
> = {
  bahaullah: {
    "call-divine-beloved": [
      [/^(4|5|6)$/gm, "##"],
      [/^\d+$/gm, "#"],
      removeAfter("Notes"),
      ["Selected Mystical Works of Bahá’u’lláh", ""],
      title("", "The Call of the Divine Beloved", {
        author: "Bahá’u’lláh",
        years: [1852, 1863],
      }),
      title("#", "Preface", {
        meta: "The Universal House of Justice",
        years: [2019, 2019],
      }),
      title("#", "The Clouds of the Realms Above", {
        translated: "Rashḥ-i-‘Amá",
      }),
      title("#", "The Seven Valleys"),
      title("#", "From the Letter Bá’ to the Letter Há’"),
      title("#", "Three Other Tablets"),
      title("#", "The Four Valleys"),
      [
        /’Tis from Our rapture.*Wellspring raining down\./s,
        (s) =>
          s
            .split("\n\n")
            .map((a) =>
              a
                .split("; ")
                .map((b) => `> ${b}`)
                .join(";\n")
            )
            .join("\n\n"),
      ],
      ["heaven’s call— Both", "heaven’s call—\n> Both"],
      ["clouds above, Which", "clouds above,\n> Which"],
      ["beating of the drum, Behold", "beating of the drum,\n> Behold"],
      ["Maid of Paradise! Behold", "Maid of Paradise!\n> Behold"],
      ["chalice-bearer’s charm! Behold", "chalice-bearer’s charm!\n> Behold"],
      splitLines(/For the infidel, error—for.*/m, "For ‘Aṭṭár’s heart"),
      splitLines(/A lover is he who is chill.*/m, "A knower is he who"),
      splitLines(/Ne’er will love allow a.*/m, "Ne’er will the falcon"),
      splitLines(/Love shunneth this world.*/m, "In him are lunacies"),
      splitLines(/Kindle the fire of love.*/m, "Then set thy foot"),
      splitLines(/Split the atom’s heart.*/m, "Within it thou wilt"),
      splitLines(
        /Veiled from this was Moses.*/m,
        "Despite His virtue",
        "Then thou who hast",
        "Abandon any hope"
      ),
      splitLines(/Cleanse thou the rheum.*/m, "And breathe the breath"),
      splitLines(/How can a curtain part.*/m, "When Alexander’s wall"),
      splitLines(/If Khiḍr did wreck the.*/m, "A thousand rights are"),
      splitLines(/In thy soul, of love.*/m, "And burn all thoughts"),
      splitLines(/If I speak forth, many.*/m, "And if I write, many"),
      splitLines(/The bliss of mystic knowers.*/m, "A bliss no"),
      splitLines(/How many are the matters I.*/m, "For my words would"),
      splitLines(/How can feeble reason.*/m, "Or the spider snare"),
      splitLines(/Dost thou deem thyself.*/m, "When thou foldest within"),
      splitLines(/The tale remaineth yet.*/m, "Forgive me, then, for"),
      splitLines(
        /When once shone forth.*/m,
        "Of Him Who is the",
        "All mention Moses",
        "Of every fleeting"
      ),
      splitLines(/The Friend, unveiled, doth.*/m, "Through every door"),
      splitLines(
        /Even as the noontide sun.*/m,
        "Hath the True One",
        "But alas that He",
        "To the city of"
      ),
      splitLines(
        /Shattered was the pen at once.*/m,
        "Rent and torn in",
        "When the pen did",
        "Of depicting such"
      ),
      ["loss and death. Peace be upon", "loss and death.\n\nPeace be upon"],
      splitLines(
        /Live free of love, for.*/m,
        "Is grief and sorrow",
        "It starteth but with",
        "It endeth but with"
      ),
      splitLines(
        /^O thou lion-hearted soul.*/m,
        "Even as a lion",
        "That thy roaring",
        "To the seventh"
      ),
      splitLines(
        /Thy faithlessness I cherish.*/m,
        "Than every gift",
        "To suffer at thy",
        "How much dearer"
      ),
      splitLines(/“O for a drop to drink!”.*/m, "“O for a thirsty"),
      splitLines(
        /^O light of truth and sword.*/m,
        "And soul of generosity",
        "No prince hath sky",
        "Who fain could hope"
      ),
      splitLines(
        /What fault didst thou observe.*/m,
        "That made thee cease",
        "Is it that poverty’s",
        "And wealth and pageantry"
      ),
      splitLines(/I do as bidden and convey.*/m, "Whether it give thee"),
      splitLines(
        /Tell us not the tale of Laylí.*/m,
        "Thy love hath made",
        "When once thy name",
        "And set the speakers"
      ),
      splitLines(
        /Each moon, O my belov’d.*/m,
        "For three days",
        "Today’s the first",
        "’Tis why thou"
      ),
      prefix("that after death the mystery", "\n\n"),
      splitLines(/O Abraham of the Spirit.*/m, "Slay! Slay these four"),
      splitLines(/With renunciation, not.*/m, "Be nothing, then, and"),
      splitLines(
        /(?<!> )How can feeble reason embrace.*/m,
        "Or the spider snare",
        "Wouldst thou that",
        "Seize it and enrol"
      ),
      splitLines(
        /(?<!> )Love shunneth this world.*/m,
        "In him are lunacies",
        "The minstrel of love",
        "Servitude enslaveth"
      ),
      splitLines(
        /The story of Thy beauty.*/m,
        "Crazed, he sought",
        "The love of Thee",
        "The pain of Thee"
      ),
      splitLines(
        /The lovers’ teacher is.*/m,
        "His face their lesson",
        "Learning of wonderment",
        "Not on learned chapters",
        "The chains that bind",
        "The Cyclic Scheme"
      ),
      splitLines(
        /O Lord, O Thou Whose grace.*/m,
        "To mention aught before",
        "Allow this mote of",
        "To free itself of lowly",
        "And grant this drop",
        "To be at last united"
      ),
      splitLines(/Speak the Persian tongue.*/m, "Love indeed doth"),
      splitLines(
        /Our hearts will be as open.*/m,
        "Should He the pearls",
        "Our lives will ready",
        "Were He to hurl the"
      ),
      splitLines(
        /My soul doth sense the fragrant.*/m,
        "Of a well-beloved",
        "The fragrance of",
        "Who’s my heart’s"
      ),
      splitLines(
        /The duty of long years of love.*/m,
        "And tell the tale",
        "That land and sky",
        "And it may gladden"
      ),
      prefix("For this is the realm of God", "\n\n"),
      splitLines(
        /None may approach that.*/m,
        "Who harboreth his",
        "None may embrace",
        "Who’s burdened"
      ),
      splitLines(/No more than this will I.*/m, "The riverbed can never"),
      splitLines(/I seek thy nearness, more.*/m, "I see thy visage"),
      ["Shams-i-Tabríz. Peace be", "Shams-i-Tabríz.\n\nPeace be"],
      splitLines(
        /Let us tell, some other day.*/m,
        "This parting hurt",
        "Let us write",
        "Love’s secrets—better",
        "Leave blood and noise",
        "And say no more"
      ),
      splitLines(/I write no more, beleaguered.*/m, "That my sweet"),
      prefix(/^An exposition of the mysteries/gm, "* "),
      prefix(/^In the Name of God, the Merciful/gm, "^ "),
      prefix(/^In the name of our Lord, the Most/gm, "^ "),
      prefix(/^In the name of the peerless and/gm, "^ "),
      prefix(/^He is the Ever-Living/gm, "^ "),
    ],
    "days-remembrance": [
      removeAfter("Key to Passages Translated by Shoghi Effendi"),
      title("", "Days of Remembrance", {
        author: "Bahá’u’lláh",
        years: authorYears["Bahá’u’lláh"],
      }),
      ["Selections from the Writings of Bahá’u’lláh for Bahá’í Holy Days", ""],
      title("#", "Preface", {
        meta: "The Universal House of Justice",
        years: [2017, 2017],
      }),
      [/^\d+$/gm, "##"],
      title("#", "Naw-Rúz"),
      title("#", "Riḍván"),
      title("#", "Declaration of the Báb"),
      title("#", "Ascension of Bahá’u’lláh"),
      title("#", "Martyrdom of the Báb"),
      title("#", "Birth of the Báb"),
      title("#", "Birth of Bahá’u’lláh"),
      title("##", "Tablet of the Wondrous Maiden", {
        translated: "Ḥúr-i-‘Ujáb",
      }),
      title("##", "Tablet of the Lover and the Beloved", {
        translated: "Lawḥ-i-‘Áshiq va Ma‘shúq",
      }),
      title("##", "Tablet of the Pen", { translated: "Súriy-i-Qalam" }),
      title("##", "Tablet of the Bell", { translated: "Lawḥ-i-Náqús" }),
      title("##", "Tablet of the Immortal Youth", {
        translated: "Lawḥ-i-Ghulámu’l-Khuld",
      }),
      title("##", "Tablet of the Branch", { translated: "Súriy-i-Ghuṣn" }),
      title("##", "Tablet to Rasúl", { translated: "Lawḥ-i-Rasúl" }),
      title("##", "Tablet to Maryam", { translated: "Lawḥ-i-Maryam" }),
      title("##", "Book of the Covenant", { translated: "Kitáb-i-‘Ahd" }),
      title("##", "The Tablet of Visitation"),
      title("##", "Tablet of Counsel", { translated: "Súriy-i-Nuṣḥ" }),
      title("##", "Tablet of the Kings", { translated: "Súriy-i-Múlúk" }),
      title("##", "Tablet to Salmán I", { translated: "Lawḥ-i-Salmán I" }),
      title("##", "Tablet of Remembrance", { translated: "Súriy-i-Dhikr" }),
      title("##", "Tablet of Sorrows", { translated: "Súriy-i-Aḥzán" }),
      title("##", "Tablet of the Birth", { translated: "Lawḥ-i-Mawlúd" }),
      [/^(#.*(?:\n.+)*\n\n)([A-Z].{0,100})$/gm, (_, a, b) => `${a}* ${b}`],
      prefix(/^This is the Súrih of the Pen, which hath/m, "* "),
      prefix(/^In the name of God, the Most Wondrous/m, "* "),
      prefix(/^This is a remembrance of that which was/m, "* "),
      prefix(/^In the name of the One born on this day/m, "* "),
    ],
    "epistle-son-wolf": [
      removeAfter("This document has been downloaded"),
      title("", "Epistle to the Son of the Wolf", {
        author: "Bahá’u’lláh",
        years: [1891, 1891],
      }),
      ["by Bahá’u’lláh", ""],
      ["Translated by Shoghi Effendi", ""],
      prefix(/^In the name of God, the One, the Incomparable/m, "^ "),
    ],
    "gems-divine-mysteries": [
      removeAfter("Notes"),
      ["Javáhiru’l-Asrár", ""],
      title("", "Gems of Divine Mysteries", {
        author: "Bahá’u’lláh",
        years: [1857, 1863],
        translated: "Javáhiru’l-Asrár",
      }),
      [/^by Bahá’u’lláh$/m, ""],
      title("#", "Introduction", {
        meta: "The Universal House of Justice",
        years: [2002, 2002],
      }),
      ["\nGems of Divine Mysteries", "\n# Gems of Divine Mysteries"],
      prefix(/^The essence of the divine mysteries/m, "* "),
      prefix(/^He is the Exalted, the Most High!/m, "^ "),
    ],
    "gleanings-writings-bahaullah": [
      removeAfter("This document has been downloaded"),
      ["Translated By Shoghi Effendi", ""],
      [/^– .* –$/gm, "#"],
      ["Gleanings from the Writings of Bahá’u’lláh", "Gleanings"],
      title("", "Gleanings", {
        author: "Bahá’u’lláh",
        years: authorYears["Bahá’u’lláh"],
      }),
    ],
    "hidden-words": [
      [/^Bahá’u’lláh/m, ""],
      [/^Translated by Shoghi Effendi.+/m, ""],
      [/\*\*\*/g, ""],
      [/^\d+\.$/gm, ""],
      [/^This document has been downloaded[\s\S]+/m, ""],
      title("", "The Hidden Words", {
        author: "Bahá’u’lláh",
        years: [1857, 1858],
      }),
      ["Part One\n\nFrom the Arabic", "# Part One: From the Arabic"],
      ["Part Two\n\nFrom the Persian", "# Part Two: From the Persian"],
      prefix(/^He Is the Glory of Glories/m, "^ "),
      prefix(/^This is that which hath descended/m, "* "),
      prefix(/^In the Name of the Lord of Utterance/m, "* "),
      prefix(/^In the eighth of the most holy lines/m, "* "),
      prefix(/^In the first line of the Tablet it is recorded/m, "* "),
      prefix(/^In the third of the most holy lines writ/m, "* "),
      prefix(/^The mystic and wondrous Bride, hidden/m, "* "),
      [/^O .+?!/gm, (s) => `> ${s}\n>`],
      ["Alas! Alas! O Lovers of Worldly Desire!", (s) => `> ${s}\n>`],
    ],
    "kitab-i-aqdas": [
      removeAfter("Key to Passages Translated by Shoghi Effendi"),
      ["The Most Holy Book", ""],
      ["Bahá’u’lláh", ""],
      [/\(\)/g, ""],
      [/\(Q&A.*\)/gi, ""],
      [/\(see.*\)/gi, ""],
      [/\(Tablets.*\)/g, ""],
      [/\(Prayers.*\)/g, ""],
      [/\*\*\*/g, ""],
      title("", "The Most Holy Book", {
        author: "Bahá’u’lláh",
        years: [1873, 1873],
        translated: "The Kitáb-i-Aqdas",
      }),
      title("#", "Preface", {
        meta: "The Universal House of Justice",
        years: [1992, 1992],
      }),
      title("#", "Introduction", {
        meta: "The Universal House of Justice",
        years: [1992, 1992],
      }),
      title("#", "A Description of the Kitáb-i-Aqdas by Shoghi Effendi", {
        meta: "Shoghi Effendi",
        years: [1944, 1944],
      }),
      prefix(/^Taken from God Passes By, his/m, "* "),
      ["\nThe Kitáb-i-Aqdas", "\n# The Most Holy Book"],
      prefix(/^In the name of Him Who is the Supreme Ruler/m, "^ "),
      [
        /^Some Texts Revealed by Bahá’u’lláh Supplementary.*daughter of Thy handmaiden, etc…\)/ms,
        "",
      ],
      title("#", "Questions and Answers"),
      [
        /^\d+\.$\n\n^Question.*$\n\n/gm,
        (s) => `> ${s.slice(s.indexOf(".") + 3, -2)}\n> `,
      ],
      [/^\d+\.$\n\n/gm, "> "],
      [/^Synopsis and Codification of the[\s\S]*^Notes$/m, "Notes"],
      title("#", "Notes", {
        meta: "The Universal House of Justice",
        years: [1992, 1992],
      }),
      [
        /^\d+\..*/gm,
        (s) => `##
        reference="${s.slice(s.indexOf(".") + 2)}"`,
      ],
      // ["of glory, and will aid", "of glory, and shall aid"],
      // ["Revelation of God, His name and", "Revelation of God, His names and"],
      // [
      //   "establishes the Nineteen Day Feast",
      //   "establishes the Nineteen Day Feasts",
      // ],
      // ["and the “keys” of His", "as the “keys” of His"],
      // ["verse is none other", "verse is none"],
    ],
    // "kitab-i-iqan": [],
    // "prayers-meditations": [],
    // "summons-lord-hosts": [],
    // "tabernacle-unity": [],
    // "tablets-bahaullah": [],
    // "additional-prayers-revealed-bahaullah": [],
    // "additional-tablets-extracts-from-tablets-revealed-bahaullah": [],
  },
  "the-bab": {
    // "selections-writings-bab": [],
  },
  "abdul-baha": {
    // "light-of-the-world": [],
    // "memorials-faithful": [],
    // "paris-talks": [],
    // "promulgation-universal-peace": [],
    // "secret-divine-civilization": [],
    // "selections-writings-abdul-baha": [],
    // "some-answered-questions": [],
    // "tablet-auguste-forel": [],
    // "tablets-divine-plan": [],
    // "tablets-hague-abdul-baha": [],
    // "travelers-narrative": [],
    // "twelve-table-talks-abdul-baha": [],
    // "will-testament-abdul-baha": [],
    // "additional-prayers-revealed-abdul-baha": [],
    // "additional-tablets-extracts-talks": [],
  },
  "shoghi-effendi": {
    // "advent-divine-justice": [],
    // "bahai-administration": [],
    // "citadel-faith": [],
    // "god-passes-by": [],
    // "promised-day-come": [],
    // "decisive-hour": [],
    // "world-order-bahaullah": [],
  },
  prayers: {
    // "bahai-prayers": [],
    // "bahai-prayers-tablets-children": [],
  },
};

export default sources;
