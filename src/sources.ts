const authorYears = {
  "The Báb": [1844, 1853],
  "Bahá’u’lláh": [1853, 1892],
  "‘Abdu’l‑Bahá": [1892, 1921],
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
  { translated, prayer, items, ...config } = {} as {
    author?: string;
    years?: [number, number];
    translated?: string;
    meta?: string;
    prayer?: boolean;
    items?: boolean;
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
      prayer && "prayer",
      items && `\n${level}#`,
    ]
      .filter((x) => x)
      .join("\n"),
];

const splitLines = (
  line: RegExp,
  ...indices: any[]
): [RegExp, (s: string) => string] => [
  line,
  (s) => {
    const alternate =
      indices[indices.length - 1] === true ? indices.pop() : false;
    const allIndices = [
      0,
      ...indices.map((x) => (typeof x === "string" ? s.indexOf(x) : x)),
      s.length,
    ];
    return (
      "\n" +
      allIndices
        .slice(0, -1)
        .map(
          (num, i) =>
            `${alternate && i % 2 === 0 ? "\n\n" : "\n"}> ${s
              .slice(num, allIndices[i + 1])
              .trim()}`
        )
        .join("")
    );
  },
];
const makeLines = (line: RegExp): [RegExp, (s: string) => string] => [
  line,
  (s) =>
    s
      .split("\n\n")
      .map((a) => `> ${a}`)
      .join("\n"),
];

const obligatory = [
  prefix(/^To be recited once in twenty‑four/gm, "* "),
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

const romanToInt = (roman: string) => {
  const romanMap: Record<string, number> = {
    I: 1,
    V: 5,
    X: 10,
    L: 50,
    C: 100,
    D: 500,
    M: 1000,
  };
  let total = 0;
  let prev = 0;
  for (let i = roman.length - 1; i >= 0; i--) {
    const current = romanMap[roman[i]!.toUpperCase()]!;
    if (current < prev) {
      total -= current;
    } else {
      total += current;
      prev = current;
    }
  }
  return total;
};

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
        translated: "Rashḥ‑i‑‘Amá",
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
      ["chalice‑bearer’s charm! Behold", "chalice‑bearer’s charm!\n> Behold"],
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
        /^O thou lion‑hearted soul.*/m,
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
        "Of a well‑beloved",
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
      ["Shams‑i‑Tabríz. Peace be", "Shams‑i‑Tabríz.\n\nPeace be"],
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
      prefix(/^He is the Ever‑Living/gm, "^ "),
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
      title("#", "Naw‑Rúz"),
      title("#", "Riḍván"),
      title("#", "Declaration of the Báb"),
      title("#", "Ascension of Bahá’u’lláh"),
      title("#", "Martyrdom of the Báb"),
      title("#", "Birth of the Báb"),
      title("#", "Birth of Bahá’u’lláh"),
      title("##", "Tablet of the Wondrous Maiden", {
        translated: "Ḥúr‑i‑‘Ujáb",
      }),
      title("##", "Tablet of the Lover and the Beloved", {
        translated: "Lawḥ‑i‑‘Áshiq va Ma‘shúq",
      }),
      title("##", "Tablet of the Pen", { translated: "Súriy‑i‑Qalam" }),
      title("##", "Tablet of the Bell", { translated: "Lawḥ‑i‑Náqús" }),
      title("##", "Tablet of the Immortal Youth", {
        translated: "Lawḥ‑i‑Ghulámu’l‑Khuld",
      }),
      title("##", "Tablet of the Branch", { translated: "Súriy‑i‑Ghuṣn" }),
      title("##", "Tablet to Rasúl", { translated: "Lawḥ‑i‑Rasúl" }),
      title("##", "Tablet to Maryam", { translated: "Lawḥ‑i‑Maryam" }),
      title("##", "Book of the Covenant", { translated: "Kitáb‑i‑‘Ahd" }),
      title("##", "The Tablet of Visitation"),
      title("##", "Tablet of Counsel", { translated: "Súriy‑i‑Nuṣḥ" }),
      title("##", "Tablet of the Kings", { translated: "Súriy‑i‑Múlúk" }),
      title("##", "Tablet to Salmán I", { translated: "Lawḥ‑i‑Salmán I" }),
      title("##", "Tablet of Remembrance", { translated: "Súriy‑i‑Dhikr" }),
      title("##", "Tablet of Sorrows", { translated: "Súriy‑i‑Aḥzán" }),
      title("##", "Tablet of the Birth", { translated: "Lawḥ‑i‑Mawlúd" }),
      [/^(#.*(?:\n.+)*\n\n)([A‑Z].{0,100})$/gm, (_, a, b) => `${a}* ${b}`],
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
      ["Javáhiru’l‑Asrár", ""],
      title("", "Gems of Divine Mysteries", {
        author: "Bahá’u’lláh",
        years: [1857, 1863],
        translated: "Javáhiru’l‑Asrár",
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
      [/^— .* —$/gm, "#"],
      ["Gleanings from the Writings of Bahá’u’lláh", "Gleanings"],
      title("", "Gleanings", {
        author: "Bahá’u’lláh",
        years: authorYears["Bahá’u’lláh"],
      }),
      [
        "The Divine Springtime is come, O Most Exalted",
        "In the name of Him Who hath cast His splendour over the entire creation!\n\nThe Divine Springtime is come, O Most Exalted",
      ],
      [
        "Release yourselves, O nightingales of God",
        "He is the Exalted, the Transcendent, the All‑Highest.\n\nRelease yourselves, O nightingales of God",
      ],
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
        translated: "The Kitáb‑i‑Aqdas",
      }),
      title("#", "Preface", {
        meta: "The Universal House of Justice",
        years: [1992, 1992],
      }),
      title("#", "Introduction", {
        meta: "The Universal House of Justice",
        years: [1992, 1992],
      }),
      title("#", "A Description of the Kitáb‑i‑Aqdas by Shoghi Effendi", {
        meta: "Shoghi Effendi",
        years: [1944, 1944],
      }),
      prefix(/^Taken from God Passes By, his/m, "* "),
      ["\nThe Kitáb‑i‑Aqdas", "\n# The Most Holy Book"],
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
      [/^Synopsis and Codification of the.*^Notes$/ms, "Notes"],
      title("#", "Notes", {
        meta: "The Universal House of Justice",
        years: [1992, 1992],
      }),
      [
        /^\d+\..*/gm,
        (s) => `##
        reference="${s.slice(s.indexOf(".") + 2)}"`,
      ],
    ],
    "kitab-i-iqan": [
      removeAfter("Notes"),
      [/^END.*/gm, ""],
      ["The Kitáb‑i‑Íqán", ""],
      ["By Bahá’u’lláh", ""],
      ["Translated by Shoghi Effendi", ""],
      [/\*\*\*/g, ""],
      [/^—.+/gm, ""],
      title("", "The Book of Certitude", {
        author: "Bahá’u’lláh",
        years: [1862, 1862],
        translated: "The Kitáb‑i‑Íqán",
      }),
      title("#", "Foreword", {
        meta: "Shoghi Effendi",
        years: [1931, 1931],
      }),
      [
        "Part One",
        `# The Book of Certitude

        ## Part One`,
      ],
      ["Part Two", "## Part Two"],
      prefix("IN THE NAME OF OUR LORD", "^ "),
      prefix("No man shall attain the shores of the", "* "),
      prefix("Verily He Who is the Daystar of Truth", "* "),
    ],
    "prayers-meditations": [
      removeAfter("This document has been downloaded"),
      ["by Bahá’u’lláh", ""],
      ["Translated by Shoghi Effendi from the original Persian and Arabic", ""],
      [/^Short obligatory prayer.*/m, ""],
      [/^Medium obligatory prayer.*/m, ""],
      [/^Long obligatory prayer.*/m, ""],
      ["The Tablet of Visitation.", ""],
      ["Prayer for the Dead.", ""],
      title("", "Prayers and Meditations", {
        author: "Bahá’u’lláh",
        years: authorYears["Bahá’u’lláh"],
        prayer: true,
      }),
      [/^— .* —$/gm, "#"],
      ...obligatory,
      [
        "* Whoso wisheth to recite this prayer",
        (a) => `* To be recited once in twenty‑four hours\n\n${a}`,
      ],
      [/We all, verily/g, "\n> We all, verily"],
    ],
    "summons-lord-hosts": [
      ["Tablets of Bahá’u’lláh", ""],
      removeAfter("Endnotes"),
      title("", "The Summons of the Lord of Hosts", {
        author: "Bahá’u’lláh",
        years: [1867, 1869],
      }),
      ["The Universal House of Justice", ""],
      title("#", "Introduction", {
        meta: "The Universal House of Justice",
        years: [2002, 2002],
      }),
      title("#", "Tablet of the Temple", {
        translated: "Súriy‑i‑Haykal",
      }),
      title("##", "Pope Pius IX"),
      title("##", "Napoleon III"),
      title("##", "Czar Alexander II"),
      title("##", "Queen Victoria"),
      title("##", "Náṣiri’d‑Dín Sháh"),
      title("#", "Tablet of the Chief", {
        translated: "Súriy‑i‑Ra’ís",
      }),
      title("#", "Tablet of the Chief", {
        translated: "Lawḥ‑i‑Ra’ís",
      }),
      title("#", "Tablet of Fu’ád Páshá", {
        translated: "Lawḥ‑i‑Fu’ád",
      }),
      title("#", "Tablet of Kings", {
        translated: "Súriy‑i‑Múlúk",
      }),
      prefix("He is the Most Wondrous, the All‑Glorious!", "^ "),
      prefix("In His name, the All‑Glorious!", "^ "),
      prefix("He is in His own Right the Supreme Ruler!", "^ "),
      prefix("He is the Most Holy, the Most Glorious!", "^ "),
      prefix("He is the Almighty!", "^ "),
      [/He saith: O.*$/gm, (s) => `He saith: “${s.slice(10)}”`],
    ],
    "tabernacle-unity": [
      ["Bahá’u’lláh", ""],
      removeAfter("Notes"),
      [/^\d+$/gm, ""],
      [/^— .* —$/gm, "##"],
      title("", "The Tabernacle of Unity", {
        author: "Bahá’u’lláh",
        years: [1870, 1877],
      }),
      title("#", "Introduction", {
        meta: "The Universal House of Justice",
        years: [2006, 2006],
      }),
      title("#", "Tablet to Mánikchí Ṣáḥib", {
        translated: "Lawḥ‑i‑Mánikchí‑Ṣáḥib",
      }),
      prefix("Responses to questions of Mánikchí Ṣáḥib", "# "),
      title("#", "Tablet of the Seven Questions", {
        translated: "Lawḥ‑i‑Haft Pursish",
      }),
      title("#", "Two Other Tablets"),
      prefix("IN THE NAME OF THE ONE TRUE GOD", "^ "),
      prefix("IN THE NAME OF THE LORD OF UTTERANCE, THE ALL‑WISE", "^ "),
      prefix("THE BEGINNING OF ALL UTTERANCE IS THE PRAISE OF GOD", "^ "),
      prefix("THE BEGINNING OF EVERY ACCOUNT IS THE NAME OF GOD", "^ "),
    ],
    "tablets-bahaullah": [
      removeAfter("Passages Translated by Shoghi Effendi"),
      ["revealed after the Kitáb‑i‑Aqdas", ""],
      [/^Compiled by the Research Department.*/m, ""],
      ["References to the Qur’án", ""],
      [/^In footnotes referring to the Qur’án.*/m, ""],
      [/^\d+$/gm, ""],
      title("", "Tablets of Bahá’u’lláh", {
        author: "Bahá’u’lláh",
        years: [1877, 1891],
      }),
      title("#", "Tablet of Carmel", { translated: "Lawḥ‑i‑Karmil" }),
      title("#", "The Most Holy Tablet", { translated: "Lawḥ‑i‑Aqdas" }),
      title("#", "Glad‑Tidings", { translated: "Bishárát" }),
      title("#", "Ornaments", { translated: "Ṭarázát" }),
      title("#", "Effulgences", { translated: "Tajallíyát" }),
      title("#", "Words of Paradise", { translated: "Kalimát‑i‑Firdawsíyyih" }),
      title("#", "Tablet of the World", { translated: "Lawḥ‑i‑Dunyá" }),
      title("#", "Splendours", { translated: "Ishráqát" }),
      title("#", "Tablet of Wisdom", { translated: "Lawḥ‑i‑Ḥikmat" }),
      title("#", "Words of Wisdom", { translated: "Aṣl‑i‑Kullu’l‑Khayr" }),
      title("#", "Tablet of Maqṣúd", { translated: "Lawḥ‑i‑Maqṣúd" }),
      title("#", "Tablet to Vafá", { translated: "Súriy‑i‑Vafá" }),
      title("#", "Tablet to Siyyid Mihdíy‑i‑Dahají", {
        translated: "Lawḥ‑i‑Síyyid‑i‑Mihdíy‑i‑Dahají",
      }),
      title("#", "Tablet of the Proof", { translated: "Lawḥ‑i‑Burhán" }),
      title("#", "Book of the Covenant", { translated: "Kitáb‑i‑‘Ahd" }),
      title("#", "Tablet of the Land of Bá", { translated: "Lawḥ‑i‑Arḍ‑i‑Bá" }),
      title("#", "Excerpts from Other Tablets", { items: true }),
      prefix(/^All praise be to Thee, O my God, inasmuch/m, "\n\n##\n\n"),
      prefix(/^O Ḥusayn! God grant thou shalt ever be bright/m, "\n\n##\n\n"),
      prefix(/^This is a Tablet which the Lord of all being/m, "\n\n##\n\n"),
      prefix(/^O Friend! In the Bayán We directed everyone/m, "\n\n##\n\n"),
      prefix(/^O Javád! Such is the greatness of this/m, "\n\n##\n\n"),
      prefix(/^We make mention of him who hath been/m, "\n\n##\n\n"),
      prefix(/^O Thou who bearest My Name, Júd/m, "\n\n##\n\n"),
      prefix(/^O Ḥaydar! This Wronged One hath heard/m, "\n\n##\n\n"),
      prefix(/^By the righteousness of God! The Mother/m, "\n\n##\n\n"),
      prefix(/^O Muḥammad Ḥusayn! Be thou prepared to/m, "\n\n##\n\n"),
      prefix(/^O My handmaiden and My leaf! Rejoice/m, "\n\n##\n\n"),
      prefix(/^At one time this sublime Word was heard/m, "\n\n##\n\n"),
      prefix(/^This is a Tablet sent down by the All‑Merciful/m, "\n\n##\n\n"),
      prefix(/^O My handmaiden, O My leaf! Render/m, "\n\n##\n\n"),
      prefix(/^O handmaid of God! Hearken unto the/m, "\n\n##\n\n"),
      prefix(/^Fix your gaze upon wisdom in all things/m, "\n\n##\n\n"),
      prefix(/^This Wronged One doth mention him who/m, "\n\n##\n\n"),
      prefix(/^He Who leadeth to true victory is come/m, "\n\n##\n\n"),
      prefix(/^This is a Tablet sent down by the Lord/m, "\n\n##\n\n"),
      prefix(/^We desire to mention him who hath set his/m, "\n\n##\n\n"),
      prefix(/^Give ear unto that which the Spirit/m, "\n\n##\n\n"),
      prefix(/^This Wronged One hath perused thy letter/m, "\n\n##\n\n"),
      prefix(
        /^All praise be to Thee, O my God, inasmuch/m,
        "* He is the Eternal, the One, the Single, the All‑Possessing, the Most Exalted.\n\n"
      ),
      [/^(This is the [CEM].*)\n+(.*)/gm, (_, a, b) => `* ${a}\n\n^ ${b}`],
      [/"\n+([A‑Z].{0,120})$/gm, (_, s) => `"\n\n^ ${s}`],
      [/\*\*\*\n+(.*)\n+\*\*\*/g, (_, s) => `* ${s}`],
      prefix(/^He is God, exalted is He/m, "^ "),
    ],
    "additional-prayers-revealed-bahaullah": [
      removeAfter("This document has been downloaded"),
      [/^—Bahá’u’lláh$/gm, ""],
      title("", "Additional Prayers Revealed by Bahá’u’lláh", {
        author: "Bahá’u’lláh",
        years: authorYears["Bahá’u’lláh"],
        prayer: true,
        items: true,
      }),
      [/\*\*\*/g, "#"],
      [/^\+[^#]*(#|$)/gms, "#"],
    ],
    "additional-tablets-extracts-from-tablets-revealed-bahaullah": [
      removeAfter("This document has been downloaded"),
      [
        "Additional Tablets and Extracts from Tablets Revealed by Bahá’u’lláh",
        "Additional Tablets and Extracts",
      ],
      title("", "Additional Tablets and Extracts", {
        author: "Bahá’u’lláh",
        years: authorYears["Bahá’u’lláh"],
      }),
      [/^—Bahá’u’lláh$/gm, ""],
      prefix("He is the All‑Seeing from the Horizon", "#\n\n"),
      [/\*\*\*/g, "#"],
      [/^\+[^#]*(#|$)/gms, "#"],
    ],
  },
  "the-bab": {
    "selections-writings-bab": [
      title("", "Selections from the Writings of the Báb", {
        author: "The Báb",
        years: authorYears["The Báb"],
      }),
      removeAfter("Key to Passages Translated by Shoghi Effendi"),
      [/^\d+$/gm, ""],
      [
        "Compiled by the Research Department of the Universal House of Justice and translated by Ḥabíb Taherzadeh with the assistance of a Committee at the Bahá’í World Centre",
        "",
      ],
      ["References to the Qur’án", ""],
      [
        "In footnotes referring to the Qur’án the súrihs have been numbered according to the original, whereas the verse numbers are those in Rodwell’s translation which differ sometimes from those of the Arabic.",
        "",
      ],
      title("#", "Tablets and Addresses"),
      title("##", "A Tablet Addressed to “Him Who Will Be Made Manifest”"),
      title(
        "##",
        "A Second Tablet Addressed to “Him Who Will Be Made Manifest”"
      ),
      title("##", "Tablet to the First Letter of the Living"),
      title("##", "Extracts from an Epistle to Muḥammad Sháh"),
      title("##", "Extracts from Another Epistle to Muḥammad Sháh"),
      title("##", "Extracts from a Further Epistle to Muḥammad Sháh"),
      title(
        "##",
        "Extracts from a Tablet Containing Words Addressed to the Sherif of Mecca"
      ),
      title("##", "Address to a Muslim Divine"),
      title(
        "##",
        "Address to Sulaymán, One of the Muslim Divines in the Land of Masqaṭ"
      ),
      title("#", "Commentary on the Súrih of Joseph", {
        translated: "Qayyúmu’l‑Asmá’",
        items: true,
      }),
      title("#", "Persian Utterance", {
        translated: "Persian Bayán",
        items: true,
      }),
      title("#", "Seven Proofs", {
        translated: "Dalá’il‑i‑Sab‘ih",
        items: true,
      }),
      title("#", "Book of Names", {
        translated: "Kitáb‑i‑Asmá’",
        items: true,
      }),
      title("#", "Excerpts from Various Writings", { items: true }),
      title("#", "Prayers and Meditations", {
        prayer: true,
        items: true,
      }),
      [/Chapter [A-Z]+\.$/gm, (s) => `${s}\n\n##\n\n`],
      [/[A-Z]+, \d+\.$/gm, (s) => `${s}\n\n##\n\n`],
      [
        /^##([^#]*) Chapter ([A-Z]+)\.$/gms,
        (_: any, a: any, b: any) => `##\nsource="Chapter ${romanToInt(b)}"${a}`,
      ],
      [
        /^##([^#]*) ([A-Z]+), (\d+)\.$/gms,
        (_: any, a: any, b: any, c: any) =>
          `##\nsource="Chapter ${romanToInt(b)}, ${c}"${a}`,
      ],
      prefix(/^Gracious God! Within the domains/m, "\n\n##\n\n"),
      prefix(/^Ponder likewise the Dispensation/m, "\n\n##\n\n"),
      prefix(/^Consider the manifold favours/m, "\n\n##\n\n"),
      prefix(/^Let Me set forth some rational/m, "\n\n##\n\n"),
      prefix(/^The recognition of Him Who is/m, "\n\n##\n\n"),
      prefix(/^The evidences which the people/m, "\n\n##\n\n"),
      prefix(/^Rid thou thyself of all attachments/m, "\n\n##\n\n"),
      prefix(/^It is recorded in a tradition/m, "\n\n##\n\n"),
      prefix(/^Thy letter hath been perused/m, "\n\n##\n\n"),
      prefix(/^Say, verily any one follower of/m, "\n\n##\n\n"),
      prefix(/^God testifieth that there is none other God/gm, "\n\n##\n\n"),
      prefix(/^From the beginning that hath no/m, "\n\n##\n\n"),
      prefix(/^Consecrate Thou, O my God, the/m, "\n\n##\n\n"),
      prefix(/^He—glorified be His mention—resembleth/m, "\n\n##\n\n"),
      prefix(/^The glory of Him Whom God shall/m, "\n\n##\n\n"),
      prefix(/^All men have proceeded from God/m, "\n\n##\n\n"),
      prefix(
        /^In the Name of God, the Most Exalted, the Most High./gm,
        "\n\n##\n\n"
      ),
      prefix(/^He is God, the Sovereign Lord/m, "\n\n##\n\n"),
      prefix(/^He is God, the Supreme Ruler/m, "\n\n##\n\n"),
      prefix(/^O thou who art the chosen one/m, "\n\n##\n\n"),
      prefix(/^When the Daystar of Bahá will/m, "\n\n##\n\n"),
      prefix(/^He is the Almighty./m, "\n\n##\n\n"),
      prefix(/^It behoveth you to await the Day/m, "\n\n##\n\n"),
      prefix(/^Send down Thy blessings, O my God/m, "\n\n##\n\n"),
      prefix(/^Immeasurably glorified and exalted art Thou./m, "\n\n##\n\n"),
      prefix(/^Verily I am Thy servant, O my God/m, "\n\n##\n\n"),
      prefix(/^Magnified be Thy Name, O God./m, "\n\n##\n\n"),
      prefix(/^Lauded be Thy Name, O God./m, "\n\n##\n\n"),
      prefix(/^Glory be unto Thee, O God. How/m, "\n\n##\n\n"),
      prefix(/^Praise be unto Thee, O Lord. Forgive/m, "\n\n##\n\n"),
      prefix(/^O God our Lord! Protect us through Thy/m, "\n\n##\n\n"),
      prefix(/^Glory be unto Thee, O Lord my God!/gm, "\n\n##\n\n"),
      prefix(/^Glorified be Thy Name, O Lord!/gm, "\n\n##\n\n"),
      prefix(/^Thou art aware, O My God, that/gm, "\n\n##\n\n"),
      prefix(/^I am aware, O Lord, that my/gm, "\n\n##\n\n"),
      prefix(/^I beg Thee to forgive me, O my/gm, "\n\n##\n\n"),
      prefix(/^How can I praise Thee, O Lord/gm, "\n\n##\n\n"),
      prefix(/^Glory be to Thee, O God! Thou/gm, "\n\n##\n\n"),
      prefix(/^I implore Thee by the splendour/gm, "\n\n##\n\n"),
      prefix(/^Do Thou ordain for me, O Lord/gm, "\n\n##\n\n"),
      prefix(/^How numerous the souls raised/gm, "\n\n##\n\n"),
      prefix(/^Glory be unto Thee, O Lord!/gm, "\n\n##\n\n"),
      prefix(/^O Lord! Enable all the peoples/gm, "\n\n##\n\n"),
      prefix(/^Vouchsafe unto me, O my God/gm, "\n\n##\n\n"),
      prefix(/^Glory be unto Thee, O Lord, Thou/gm, "\n\n##\n\n"),
      prefix(/^O Lord! Unto Thee I repair for/gm, "\n\n##\n\n"),
      prefix(/^O Lord! Thou art the Remover of/gm, "\n\n##\n\n"),
      prefix(/^Throughout eternity Thou hast/gm, "\n\n##\n\n"),
      prefix(/^The glory of glories and the most/gm, "\n\n##\n\n"),
      prefix(/^In the Name of God, the Compassionate/gm, "\n\n##\n\n"),
      prefix(/^Thou art God, no God is there but Thee./gm, "\n\n##\n\n"),
      prefix(/^Immeasurably exalted art Thou, O my/gm, "\n\n##\n\n"),
      prefix(/^All majesty and glory, O my God/gm, "\n\n##\n\n"),
      prefix(/^O my God! There is no one but Thee/gm, "\n\n##\n\n"),
      prefix(/^O my God! I have failed to know/gm, "\n\n##\n\n"),
      prefix(/^He is God, the Sovereign Ruler/gm, "\n\n##\n\n"),
      prefix(/^O my God, my Lord and my Master! I have/gm, "\n\n##\n\n"),
      prefix(/^I adjure Thee by Thy might/gm, "\n\n##\n\n"),
      prefix(/^I beg Thy forgiveness, O/gm, "\n\n##\n\n"),
      prefix(/^Lauded be Thy Name, O Lord our/gm, "\n\n##\n\n"),
      prefix(/^Through Thy revelation, O my/gm, "\n\n##\n\n"),
      prefix(/^In the Name of thy Lord, the/gm, "\n\n##\n\n"),
      prefix(/^Glorified art Thou, O Lord my/gm, "\n\n##\n\n"),
      prefix(/^Praised and glorified art Thou, O/gm, "\n\n##\n\n"),
      prefix(/^Thou knowest full well, O my/gm, "\n\n##\n\n"),
      prefix(/^Praise be to Thee, O Lord, my/gm, "\n\n##\n\n"),
      prefix(/^O my God, O my Lord, O my Master!/gm, "\n\n##\n\n"),
      prefix(/^Thou seest, O my Lord, my/gm, "\n\n##\n\n"),
      prefix(/^Is there any Remover of difficulties/gm, "\n\n##\n\n"),
    ],
  },
  "abdul-baha": {
    "light-of-the-world": [
      [
        "Light of the World: Selected Tablets of ‘Abdu’l‑Bahá",
        "Light of the World",
      ],
      removeAfter("Notes"),
      title("", "Light of the World", {
        author: "‘Abdu’l‑Bahá",
        years: authorYears["‘Abdu’l‑Bahá"],
      }),
      title("#", "Preface", {
        meta: "The Universal House of Justice",
        years: [2021, 2021],
      }),
      [/^1$/m, "# Light of the World\n\n##"],
      [/^\d+$/gm, "##"],
      prefix("And yet these deniers, even as the bats", "\n\n"),
      splitLines(
        /Shed splendours on the Orient.*/m,
        "And perfumes scatter",
        "Carry light unto",
        "And the Turk with"
      ),
      splitLines(/Granted that this morn be.*/m, "Are seeing eyes also"),
      splitLines(
        /That beam of bliss and ecstasy.*/m,
        "Did stay with him",
        "Even as Aḥmad, the",
        "Who is always with"
      ),
      prefix("At that instant, ‘Abdu’l‑Bahá understood what", "\n\n"),
      splitLines(/Either speak no more of love.*/m, "Thus hath it been"),
      ["His grace? The Glory", "His grace?\n\nThe Glory"],
      splitLines(/Before the Friend how can I.*/m, "Abashed that I did"),
      splitLines(/The duty of long years of love.*/m, "And tell the tale"),
      splitLines(
        /O lifeless one, bereft of heart and soul.*/m,
        "Come to life, come",
        "O slumbering one",
        "Awake, do thou",
        "O drunken one, so",
        "Clear thy mind",
        "The world is filled",
        "From life and self",
        "Now is the time",
        "Lead thou the lovers",
        "The sweetly singing",
        "Commit His secrets",
        true
      ),
      splitLines(/To speak of the subtleties of.*/m, "Is like plucking the"),
      ["early dawn! The Glory", "early dawn!\n\nThe Glory"],
      splitLines(/Await the break of His sovereign.*/m, "These are but"),
      [/#\n+([A-Z].{0,120})$/gm, (_, s) => `#\n\n^ ${s}`],
    ],
    "memorials-faithful": [
      ["by ‘Abdu’l‑Bahá", ""],
      [/^Translated from the original Persian.*/m, ""],
      removeAfter("Notes"),
      title("", "Memorials of the Faithful", {
        author: "‘Abdu’l‑Bahá",
        years: [1914, 1915],
      }),
      [/^— .* —$\n\n/gm, "# "],
    ],
    "paris-talks": [
      removeAfter("Notes"),
      ["Addresses Given by ‘Abdu’l‑Bahá in 1911", ""],
      title("", "Paris Talks", {
        author: "‘Abdu’l‑Bahá",
        years: [1911, 1913],
      }),
      [/^The Eleven Principles out of the Teaching.*/m, ""],
      [/^The Search after Truth\. The Unity of Mankind.*/m, ""],
      title("#", "Part One"),
      title("#", "Part Two"),
      title("#", "Part Three"),
      [/^— .* —$\n\n/gm, "## "],
    ],
    "promulgation-universal-peace": [
      [/^Talks Delivered by ‘Abdu’l‑Bahá during.*/m, ""],
      ["Compiled by Howard MacNutt", ""],
      [/^Notes$[\s\S]+/m, ""],
      title("", "The Promulgation of Universal Peace", {
        author: "‘Abdu’l‑Bahá",
        years: [1912, 1912],
      }),
      [
        /^— .* —$\n\n(.*)\n\n(.*)\n\n(.*[^\.\n]$)?/gm,
        (_1, a, b, _2) => `## ${a}: ${b}\n\n`,
      ],
      [
        /^(Talk.*)$\n\n(.*)/gm,
        (_, a, b) => `# ${a.slice(31).trim()}, ${b.replace(" ‑ ", "‑")}`,
      ],
    ],
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
    "additional-tablets-extracts-talks": [
      removeAfter("This document has been downloaded"),
      title("", "Additional Tablets, Extracts and Talks", {
        author: "‘Abdu’l‑Bahá",
        years: authorYears["‘Abdu’l‑Bahá"],
      }),
      [/^\+[^*]*(\*\*\*|$)/gms, "***"],
      [/—‘Abdu’l‑Bahá/g, ""],
      [/\*\*\*\n\n(.*)/gm, (_, a) => `#\nsource="${a}"`],
      [
        "Extract from a Tablet of ‘Abdu’l‑Bahá",
        '#\nsource="Extract from a Tablet of ‘Abdu’l‑Bahá"',
      ],
      makeLines(/^Phoenix of Truth! For .* thou’rt returned!$/gms),
      makeLines(/^O zephyr, shouldst thou .* fragrant thy breath\.$/gms),
      makeLines(/^General running expenses .* support of the poor\.$/gms),
      makeLines(/^Praise be to God! His .* with exultation and joy\.$/gms),
      makeLines(/^I am lost, O Love, .* in all the earth\.$/gms),
      makeLines(/^Glad tidings! The light of.*Truth hath shone forth!$/gms),
      [
        /#\n+[A-ZṬ].{0,120}[^:\n](\n+[A-Z].{0,120})*$/gm,
        (s) =>
          s
            .split(/\n+/g)
            .map((t, i) => (i === 0 ? t : `^ ${t}`))
            .join("\n\n"),
      ],
      prefix(/^The Lamp of the assemblage/m, "^ "),
      prefix(/^A prayer beseeching forgiveness/m, "^ "),
      prefix(/^He is God/gm, "^ "),
      ["^ Religion and science", "Religion and science"],
      ["^ Seize thy chance", "Seize thy chance"],
    ],
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
