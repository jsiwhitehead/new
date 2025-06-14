const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

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

const getYearsFromId = (id: string) => {
  const v = parseFloat(id.slice(0, 4) + "." + id.slice(4, 6) + id.slice(6, 8));
  return [v, v];
};

const lowerFirstLetter = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const getMessageTo = (addressee: string) => {
  const lower = addressee.toLowerCase();
  if (lower.includes("local spiritual assembly")) {
    return "to a Local Assembly";
  } else if (lower.includes("spiritual assembly")) {
    return "to a National Assembly";
  } else if (
    lower.includes(
      "continental boards of counsellors and national spiritual assemblies"
    )
  ) {
    return "to the Counsellors and National Assemblies";
  } else if (lower.includes("counsellors")) {
    return "to the Counsellors";
  } else if (lower.includes("national spiritual assemblies")) {
    if (["in", "selected"].some((s) => lower.includes(s))) {
      return "to selected National Assemblies";
    } else {
      return "to all National Assemblies";
    }
  } else if (lower.includes("auxiliary board members")) {
    return "to the Auxiliary Board members";
  } else if (
    ["individuals", "three believers"].some((s) => lower.includes(s))
  ) {
    return "to selected individuals";
  } else if (["individual", "mr"].some((s) => lower.includes(s))) {
    return "to an individual";
  } else if (
    [
      "gathered",
      "assembled",
      "congress",
      "conference",
      "convention",
      "meeting",
      "participants",
    ].some((s) => lower.includes(s))
  ) {
    return "to those gathered";
  } else if (lower.includes("íránian")) {
    return "to Íránian Bahá’ís outside Írán";
  } else if (
    ["írán", "cradle", "lovers of the most great beauty"].some((s) =>
      lower.includes(s)
    )
  ) {
    if (lower.includes("youth")) {
      return "to Bahá’í youth in Írán";
    } else if (lower.includes("students")) {
      return "to Bahá’í students in Írán";
    } else {
      return "to the Bahá’ís of Írán";
    }
  } else if (lower.includes("youth")) {
    return "to Bahá’í youth";
  } else if (
    lower.includes("followers of bahá’u’lláh in") &&
    !lower.includes("every land")
  ) {
    return "to the Bahá’ís of a Nation";
  } else if (
    lower.includes("followers of bahá’u’lláh") ||
    lower.includes("on the occasion")
  ) {
    return "to the Bahá’ís of the World";
  } else if (["all who", "peoples"].some((s) => lower.includes(s))) {
    return "to the Peoples of the World";
  } else if (lower.includes("bahá’ís of")) {
    if (["world", "east and west"].some((s) => lower.includes(s))) {
      return "to the Bahá’ís of the World";
    } else {
      return "to the Bahá’ís of a Nation";
    }
  }
  return lowerFirstLetter(addressee);
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
      title("", "Gleanings from the Writings of Bahá’u’lláh", {
        author: "Bahá’u’lláh",
      }),
      [
        "The Divine Springtime is come, O Most Exalted",
        "In the name of Him Who hath cast His splendour over the entire creation!\n\nThe Divine Springtime is come, O Most Exalted",
      ],
      [
        "Release yourselves, O nightingales of God",
        "He is the Exalted, the Transcendent, the All‑Highest.\n\nRelease yourselves, O nightingales of God",
      ],
      ["The other station ", ""],
      ["Consider Moses!", "Moses!"],
      ["Behold how the sovereignty", "the sovereignty"],
      ["their hands.” Although the", "their hands.”\n\nAlthough the"],
      ["inmost selves. . . . That the", "inmost selves. . . .\n\nThat the"],
      ["bear witness unto that", "bear witness to that"],
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
        prayer: true,
      }),
      [/^— .* —$/gm, "#"],
      ...obligatory,
      [
        "* Whoso wisheth to recite this prayer",
        (a) => `* To be recited once in twenty‑four hours\n\n${a}`,
      ],
      [/We all, verily/g, "\n> We all, verily"],
      [
        "Since Thou hast, O my God, established",
        "In Thy name, the Most Wondrous, the Most Glorious!\n\nSince Thou hast, O my God, stablished",
      ],
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
      ["Additional Prayers Revealed by Bahá’u’lláh", "Additional"],
      title("", "Additional", {
        author: "Bahá’u’lláh",
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
        "Additional",
      ],
      title("", "Additional", {
        author: "Bahá’u’lláh",
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
      ["life, in that world. It", "life, in that world.\n\nIt"],
    ],
    "secret-divine-civilization": [
      ["‘Abdu’l‑Bahá", ""],
      [/^Translated from the Persian by Marzieh Gail.*/m, ""],
      removeAfter("Notes"),
      title("", "The Secret of Divine Civilisation", {
        author: "‘Abdu’l‑Bahá",
        years: [1875, 1875],
      }),
      prefix("In the Name of God the Clement, the Merciful", "^ "),
      splitLines(/“The hand is veiled.*/m, "The horse leaps forward"),
      splitLines(
        /“The flower‑faced may.*/m,
        "The cruel fair may bridle",
        "But coyness in the ugly",
        "And pain in a blind eye’s"
      ),
      splitLines(
        /But these ill‑omened owls.*/m,
        "And learned to sing as the",
        "And what of Sheba’s message",
        "If the bittern learn to sing"
      ),
      splitLines(
        /One sluggish, blind and surly’s.*/m,
        "“A lump of flesh, without a",
        "How far is he who apes and",
        "From the illumined, who doth",
        "One but an echo, though",
        "And one, the Psalmist"
      ),
      splitLines(
        /Desire and self come.*/m,
        "And blot out virtue",
        "And a hundred veils",
        "From the heart, to"
      ),
      splitLines(
        /It is all one, if it.*/m,
        "Or the bare ground",
        "Where the pure soul",
        "Down to die"
      ),
      splitLines(
        /The Sage of Ghazna told.*/m,
        "To his veiled hearers",
        "If those who err see",
        "But only words, it’s",
        "Of all the sun’s fire",
        "Only the warmth can"
      ),
      splitLines(
        /Once they were as the.*/m,
        "That the wind made",
        "Then God shed down",
        "And His sun but one",
        "Souls of dogs and",
        "But the soul of the"
      ),
      splitLines(/Thou, Brother, art thy.*/m, "The rest is only thew"),
      prefix(/^How long shall we drift on the wings/m, "\n\n***\n\n"),
      prefix(/^His Majesty the Sháh has, at the present/m, "\n\n***\n\n"),
      prefix(/^It is unquestionable that the object in/m, "\n\n***\n\n"),
      prefix(/^As to those who maintain that the inauguration/m, "\n\n***\n\n"),
      prefix(/^It has now been clearly and irrefutably/m, "\n\n***\n\n"),
      prefix(/^The state is, moreover, based upon two/m, "\n\n***\n\n"),
      prefix(/^The second of these spiritual standards/m, "\n\n***\n\n"),
      prefix(/^We shall here relate a story that will/m, "\n\n***\n\n"),
      prefix(/^Observe how one individual, and he/m, "\n\n***\n\n"),
      prefix(/^My heart aches, for I note with intense/m, "\n\n***\n\n"),
      prefix(/^The third element of the utterance/m, "\n\n***\n\n"),
      prefix(/^The apparatus of conflict will, as/m, "\n\n***\n\n"),
      prefix(/^No power on earth can prevail against/m, "\n\n***\n\n"),
      prefix(/^The fourth phrase of the aforementioned/m, "\n\n***\n\n"),
      prefix(/^O people of Persia! How long will your/m, "\n\n***\n\n"),
      prefix(/^Those European intellectuals who are/m, "\n\n***\n\n"),
      prefix(/^Among those matters which require thorough/m, "\n\n***\n\n"),
      prefix(/^As to that element who believe that/m, "\n\n***\n\n"),
    ],
    "selections-writings-abdul-baha": [
      [/^Compiled by the Research Department.*/m, ""],
      [/^Translated by a Committee at the.*/m, ""],
      ["References to the Qur’án", ""],
      [/^In footnotes referring to the Qur’án.*/m, ""],
      removeAfter("Notes on Translations"),
      title("", "Selections from the Writings of ‘Abdu’l‑Bahá", {
        author: "‘Abdu’l‑Bahá",
      }),
      title("#", "Preface", {
        meta: "The Universal House of Justice",
        years: [1978, 1978],
      }),
      [
        "\nSelections from the Writings of ‘Abdu’l‑Bahá",
        "\n# Selections from the Writings of ‘Abdu’l‑Bahá",
      ],
      [/^— .* —$/gm, "##"],
      [
        /The first is investigation[\s\S]*tenth, economic questions,/gm,
        (s) => "\n\n" + s.split("The").join("\n> The") + "\n\n",
      ],
      [/\nO Breakwell, O my dear one!/g, (a) => `> ${a.slice(1)}\n>`],
      prefix("> O Breakwell, O my dear one!", "\n"),
      splitLines(
        /If I, like Abraham, through flames.*/m,
        "Or yet like John",
        "If, Joseph‑like",
        "Or shut me up within",
        "Or make me e’en",
        "I will not go",
        "But ever stand",
        "My soul and body"
      ),
      splitLines(
        /Unless ye must, Bruise not the.*/m,
        "Bruise not the serpent",
        "How much less wound",
        "And if ye can",
        "No ant should ye",
        "Much less a brother"
      ),
      splitLines(
        /In the Orient scatter perfumes.*/m,
        "And shed splendours",
        "Carry light unto",
        "And the Slav with"
      ),
      splitLines(/That soul which hath itself not.*/m, "Can it then hope"),
      prefix("Whoso reciteth this prayer with lowliness", "* "),
      [
        "Evil One. . . . Should",
        "Evil One. Discussions must all be confined to spiritual matters that pertain to the training of souls, the instruction of children, the relief of the poor, the help of the feeble throughout all classes in the world, kindness to all peoples, the diffusion of the fragrances of God and the exaltation of His Holy Word. Should",
      ],
    ],
    "some-answered-questions": [
      removeAfter("Notes"),
      ["‘Abdu’l‑Bahá", ""],
      [/^Collected and translated from the.*/m, ""],
      [/^Newly Revised by a Committee at.*/m, ""],
      [/^Laura Clifford Barney$/m, ""],
      title("", "Some Answered Questions", {
        author: "‘Abdu’l‑Bahá",
        years: [1904, 1906],
      }),
      title("#", "Foreword", {
        meta: "The Universal House of Justice",
        years: [2014, 2014],
      }),
      title("#", "Author’s Preface to the First Edition", {
        meta: "Laura Clifford Barney",
        years: [1908, 1908],
      }),
      [/^(Part \d)\n\n(.*)/gm, (_, a, b) => `# ${a}: ${b}`],
      [/^— .* —$\n\n/gm, "## "],
    ],
    "tablet-auguste-forel": [
      [/^Original Persian text first published.*/m, ""],
      removeAfter("Notes"),
      ["***", ""],
      ["Haifa, 21 September 1921.", ""],
      title("", "‘Abdu’l‑Bahá’s Tablet to Dr. Forel", {
        author: "‘Abdu’l‑Bahá",
        years: [1921, 1921],
      }),
    ],
    "tablets-divine-plan": [
      ["‘Abdu’l‑Bahá", ""],
      removeAfter("Notes"),
      title("", "Tablets of the Divine Plan", {
        author: "‘Abdu’l‑Bahá",
        years: [1916, 1917],
      }),
      [/^(\d+)$\n\n(.*)\n\n\*\*\*\n\n/gm, (_, a, b) => `# ${a}: ${b}\n\n * `],
      [/^\*\*\*$/gm, ""],
    ],
    "tablets-hague-abdul-baha": [
      removeAfter("Notes"),
      [/^17 December 1919$/m, ""],
      [/^1 July 1920$/m, ""],
      ["‘Abdu’l‑Bahá’s Tablets to The Hague", "Tablets to The Hague"],
      title("", "Tablets to The Hague", {
        author: "‘Abdu’l‑Bahá",
        years: [1919, 1920],
      }),
      title("#", "First Tablet to The Hague"),
      title("#", "Second Tablet to The Hague"),
      prefix(/^O ye esteemed /m, "* "),
      prefix(/^To the /m, "* "),
    ],
    "travelers-narrative": [
      ["Written to Illustrate the Episode of the Báb", ""],
      ["by ‘Abdu’l‑Bahá", ""],
      ["Translated by Edward G. Browne", ""],
      removeAfter("Notes"),
      title("", "A Traveller’s Narrative", {
        author: "‘Abdu’l‑Bahá",
        years: [1886, 1886],
      }),
    ],
    "twelve-table-talks-abdul-baha": [
      removeAfter("Notes"),
      [
        "Twelve Table Talks given by ‘Abdu’l‑Bahá in ‘Akká",
        "Twelve Table Talks in ‘Akká",
      ],
      title("", "Twelve Table Talks in ‘Akká", {
        author: "‘Abdu’l‑Bahá",
        years: [1904, 1907],
      }),
      [/^— .* —$\n\n/gm, "# "],
    ],
    "will-testament-abdul-baha": [
      removeAfter("This document has been downloaded"),
      title("", "Will and Testament of ‘Abdu’l‑Bahá", {
        author: "‘Abdu’l‑Bahá",
        years: [1901, 1908],
      }),
      [/\[(Part.*)\]/g, (_, a) => `# ${a}`],
      prefix(/^Herein Follow the Tablets/m, "* "),
      prefix(/^He is God/m, "* "),
      prefix(/^He is the Witness/m, "* "),
    ],
    "additional-prayers-revealed-abdul-baha": [
      removeAfter("This document has been downloaded"),
      ["Additional Prayers Revealed by ‘Abdu’l‑Bahá", "Additional"],
      title("", "Additional", {
        author: "‘Abdu’l‑Bahá",
        prayer: true,
        items: true,
      }),
      [/^—‘Abdu’l‑Bahá$/gm, ""],
      [/\*\*\*/gm, "#"],
      [/^\+[^#]*(#|$)/gms, "#"],
      ["O Lord!\n\nPlant this tender", "O Lord! Plant this tender"],
      [
        /^O Lord so rich in bounty.*/ms,
        (s) =>
          s
            .split(/\n\n/g)
            .map((s, i) => `> ${s}${i % 2 === 1 ? "\n" : ""}`)
            .join("\n"),
      ],
    ],
    "additional-tablets-extracts-talks": [
      removeAfter("This document has been downloaded"),
      ["Additional Tablets, Extracts and Talks", "Additional"],
      title("", "Additional", {
        author: "‘Abdu’l‑Bahá",
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
    "advent-divine-justice": [
      removeAfter("Shoghi"),
      ["by Shoghi Effendi", ""],
      title("", "The Advent of Divine Justice", {
        author: "Shoghi Effendi",
        years: [1938.1215, 1938.1215],
      }),
      prefix(/^To the beloved of God and/m, "@ "),
      prefix(/^Best‑beloved brothers and/m, "@ "),
      prefix(/^Dearly beloved friends! Great as is my love/m, "\n\n***\n\n"),
      prefix(/^Dearly beloved friends! I have attempted/m, "\n\n***\n\n"),
      prefix(/^Such, dearly beloved friends, is the vista/m, "\n\n***\n\n"),
      prefix(/^One more word in conclusion\. Among some/m, "\n\n***\n\n"),
      ["he may be. The purpose of the", "he may be. . . . The purpose of the"],
      ["resplendent Spot. Be not", "resplendent Spot. . . . Be not"],
      [
        "thy God, the Lord of all worlds.",
        "thy God, the Lord of all worlds. . . .",
      ],
    ],
    "bahai-administration": [
      ["Shoghi Effendi", ""],
      ["Selected Messages 1922—1932", ""],
      ["Guardian of the Bahá’í Cause", ""],
      ["January 21, 1922—July 17, 1932", ""],
      removeAfter("+\n\nPart Two: Letters from Shoghi Effendi"),
      title("", "Bahá’í Administration", {
        author: "Shoghi Effendi",
        years: [1922, 1932],
      }),
      ["Part One\n\n", "Part One: "],
      ["Part Two\n\n", "Part Two: "],
      title(
        "#",
        "Part One: Excerpts from the Will and Testament of ‘Abdu’l‑Bahá",
        {
          author: "‘Abdu’l‑Bahá",
          years: [1901, 1908],
          items: true,
        }
      ),
      title("#", "Part Two: Letters from Shoghi Effendi"),
      prefix(/^O ye beloved of the Lord! The greatest/m, "\n\n##\n\n"),
      prefix(/^According to the direct and sacred command/m, "\n\n##\n\n"),
      prefix(/^O God, my God! Thou seest this wronged/m, "\n\n##\n\n"),
      prefix(/^O God, my God! Shield Thy trusted servants/m, "\n\n##\n\n"),
      prefix(
        /^O ye beloved of the Lord! It is incumbent upon you/m,
        "\n\n##\n\n"
      ),
      prefix(/^By the Ancient Beauty! This wronged one/m, "\n\n##\n\n"),
      prefix(/^O ye beloved of the Lord! Strive with/m, "\n\n##\n\n"),
      prefix(/^Whosoever and whatsoever meeting/m, "\n\n##\n\n"),
      [/^Letter/gm, "## Letter"],
      [/^[A-Z].{1,80}[a-z?]$/gm, (a) => `### ${a}`],
      ["### Bahá’í Administration", "Bahá’í Administration"],
      [
        /^## Letter.+$/gm,
        (a) => {
          if (a === "## Letter of Circa May, 1922 (undated).") {
            return `## May 1922 (Undated)\nyears=[1922.0501,1922.0501]`;
          }
          const [mm, dd, yy] = a
            .replace(/\.$/, "")
            .slice(13)
            .replace(/(\d)(st|nd|rd|th)/g, (_, a) => a)
            .split(/,? /g) as [string, string, string];
          const date = `${yy}.${`${months.indexOf(mm) + 1}`.padStart(
            2,
            "0"
          )}${dd.padStart(2, "0")}`;
          return `## ${dd} ${mm} ${yy}\nyears=[${date},${date}]`;
        },
      ],
      [/Circa May, 1922 \(undated\)\./g, ""],
      [/^.*19\d\d\.?\n+#/gm, "#"],
      [/^.*19\d\d\.?\n+P\.S\./gm, "P.S."],
      ["April 11, 1933.", ""],
      [/\]\n+(T.*)\n+(.*)/g, (_, a, b) => `]\n\n@ ${a}\n\n@ ${b}`],
      [/\]\n+([A-Z].*)/g, (_, a) => `]\n\n@ ${a}`],
      ["@ IN THE NAME OF GOD", "* IN THE NAME OF GOD"],
      [
        /^([A-Z].{0,50}\n\n+){1,3}##/gm,
        (a) =>
          a
            .split(/\n\n/)
            .map((s) => (s.startsWith("#") ? s : `@ ${s}`))
            .join("\n\n"),
      ],
      [/^@ *$/gm, ""],
      ["(Undated)", "(Undated 1)"],
      ["(Undated)", "(Undated 2)"],
      [/^## 6 December 1928$/m, "## 6 December 1928 (1)"],
      [/^## 6 December 1928$/m, "## 6 December 1928 (2)"],
      ["second condition:—They must", "second condition . . . They must"],
      ["doth not matter. It behoveth", "doth not matter. . . . It behoveth"],
      ["supreme victory:—‘O God", "supreme victory: . . . ‘O God"],
    ],
    "citadel-faith": [
      ["Messages to America 1947—1957", ""],
      ["Shoghi Effendi", ""],
      removeAfter("Notes"),
      title("", "Citadel of Faith", {
        author: "Shoghi Effendi",
        years: [1947, 1957],
      }),
      ["years=[1947,1957]", "years=[1947,1957]\n\n# Citadel of Faith"],
      title("#", "In Memoriam"),
      prefix("Frank Ashton", "## "),
      [/^\[.*\]$\n\n/gm, (a) => `${a}## `],
      [
        new RegExp(`^((?:${months.join("|")}) \\d.*)\\n\\n(.*)`, "gm"),
        (_, a, b) => {
          const [mm, dd, yy] = a.split(/,? /g);
          const date = `${yy}.${`${months.indexOf(mm) + 1}`.padStart(
            2,
            "0"
          )}${dd.padStart(2, "0")}`;
          return `## ${dd} ${mm} ${yy}\nyears=[${date},${date}]\nsummary="${b}"`;
        },
      ],
      [
        /(Circa June 1947)\n\n(.*)/,
        (_, a, b) => `## ${a}\nyears=[1947.0601,1947.0601]\nsummary="${b}"`,
      ],
      [
        /(Circa May 1954)\n\n(.*)/,
        (_, a, b) => `## ${a}\nyears=[1954.0501,1954.0501]\nsummary="${b}"`,
      ],
      [/^[A-Z].{1,80}[a-z?]$/gm, (a) => `### ${a}`],
      ["### Citadel of Faith", "Citadel of Faith"],
      [/##\s*$/, ""],
      [/^## 17 January 1951$/m, "## 17 January 1951 (1)"],
      [/^## 17 January 1951$/m, "## 17 January 1951 (2)"],
    ],
    "god-passes-by": [
      [/^Shoghi Effendi[\s\S]*Foreword$/m, "Foreword"],
      removeAfter("[END]"),
      title("", "God Passes By", {
        author: "Shoghi Effendi",
        years: [1944, 1944],
      }),
      title("#", "Foreword"),
      title("#", "Retrospect and Prospect"),
      [
        /^((?:First|Second|Third|Fourth) Period) (.*)\n\n(.*)/gm,
        (_, a, b, c) => `# ${a}: ${b} (${c})`,
      ],
      [/^‑ .* ‑$\n\n/gm, "## "],
      ["doth not matter. It behoveth", "doth not matter. . . . It behoveth"],
      ["honoured servants. Pointing", "honoured servants. . . . Pointing"],
    ],
    "promised-day-come": [
      ["By Shoghi Effendi", ""],
      ["Shoghi", ""],
      ["The Promised Day is Come", ""],
      removeAfter("Haifa, Palestine March 28, 1941"),
      title("", "The Promised Day Is Come", {
        author: "Shoghi Effendi",
        years: [1941.0328, 1941.0328],
      }),
      [/^[A-Z].{1,80}[a-z?]$/gm, (a) => `# ${a}`],
      ["# The Promised Day Is Come", "The Promised Day Is Come"],
      prefix(/^Friends and fellow‑heirs/m, "@ "),
    ],
    "decisive-hour": [
      [/^Messages from Shoghi Effendi to.*/m, ""],
      ["Shoghi Effendi", ""],
      removeAfter("Notes"),
      title("", "This Decisive Hour", {
        author: "Shoghi Effendi",
        years: [1932, 1946],
      }),
      [/^— .* —$\n\n/gm, "# "],
      [
        /^(#.+)(\n\n[^#].+)*?\n\n([\[\d].+)/gm,
        (_, a, b, c) => {
          const [dd, mm, yy] = c.replace(/\[|\]|circa /g, "").split(/ /g);
          const date = `${yy}.${`${months.indexOf(mm) + 1}`.padStart(
            2,
            "0"
          )}${dd.padStart(2, "0")}`;
          return `# ${dd} ${mm} ${yy}\nyears=[${date},${date}]\nsummary="${a.slice(
            2
          )}"${b || ""}`;
        },
      ],
      prefix(/^Message to/gm, "@ "),
      [/^## 18 November 1944$/m, "## 18 November 1944 (1)"],
      [/^## 18 November 1944$/m, "## 18 November 1944 (2)"],
      [/^## 2 October 1939$/m, "## 2 October 1939 (1)"],
      [/^## 2 October 1939$/m, "## 2 October 1939 (2)"],
    ],
    "world-order-bahaullah": [
      ["Selected Letters", ""],
      ["by Shoghi Effendi", ""],
      ["— Bahá’u’lláh", ""],
      ["The World Order of Bahá’u’lláh Further Considerations", ""],
      ["The Goal of a New World Order", ""],
      ["The Golden Age of the Cause of Bahá’u’lláh", ""],
      ["America and the Most Great Peace", ""],
      ["The Unfoldment of World Civilisation", ""],
      [/\*\*\*/g, ""],
      removeAfter("Notes"),
      title("", "The World Order of Bahá’u’lláh", {
        author: "Shoghi Effendi",
        years: [1938, 1938],
      }),
      [
        "\nThe World Order of Bahá’u’lláh",
        '\n# The World Order of Bahá’u’lláh\ndate="27 February 1929"',
      ],
      [
        "\nThe World Order of Bahá’u’lláh: Further Considerations",
        '\n# The World Order of Bahá’u’lláh: Further Considerations\ndate="21 March 1930"',
      ],
      [
        "\nThe Goal of a New World Order",
        '\n# The Goal of a New World Order\ndate="28 November 1931"',
      ],
      [
        "\nThe Golden Age of the Cause of Bahá’u’lláh",
        '\n# The Golden Age of the Cause of Bahá’u’lláh\ndate="21 March 1932"',
      ],
      [
        "\nAmerica and the Most Great Peace",
        '\n# America and the Most Great Peace\ndate="21 April 1933"',
      ],
      [
        "\nThe Dispensation of Bahá’u’lláh",
        '\n# The Dispensation of Bahá’u’lláh\ndate="8 February 1934"',
      ],
      title("##", "Bahá’u’lláh"),
      title("##", "The Báb"),
      title("##", "‘Abdu’l‑Bahá"),
      title("##", "The Administrative Order"),
      [
        "\nThe Unfoldment of World Civilisation",
        '\n# The Unfoldment of World Civilisation\ndate="11 March 1936"',
      ],
      [/^[A-Z].{1,80}[a-z]$/gm, (a) => `## ${a}`],
      ["## The World Order of Bahá’u’lláh", "The World Order of Bahá’u’lláh"],
      [/"\n+(T.*)\n+(.*)/g, (_, a, b) => `"\n\n@ ${a}\n\n@ ${b}`],
      [/^(To the beloved.*)\n+(.*)/m, (_, a, b) => `@ ${a}\n\n@ ${b}`],
      prefix(/^Fellow‑believers in/m, "@ "),
      [
        /^([A-Z].{0,50}\n\n){1,3}(# |$)/gm,
        (a) =>
          a
            .split(/\n\n/)
            .map((s) => (!s.trim() || s.startsWith("#") ? s : `@ ${s}`))
            .join("\n\n"),
      ],
    ],
  },
  "the-universal-house-of-justice": {
    "the-institution-of-the-counsellors": [
      ["THE UNIVERSAL HOUSE OF JUSTICE", ""],
      ["1 January 2001", ""],
      ["A Document Prepared by the Universal House of Justice", ""],
      removeAfter("This document has been downloaded"),
      ["and with their full support", "and with their full support."],
      [
        "THE INSTITUTION OF THE COUNSELLORS",
        "The Institution of the Counsellors",
      ],
      ["INTRODUCTION", "# Introduction"],
      [
        "INTERNATIONAL AND CONTINENTAL COUNSELLORS AND THE AUXILIARY BOARDS",
        "# International and Continental Counsellors and the Auxiliary Boards",
      ],
      [
        "SOME SPECIFIC ASPECTS OF THE FUNCTIONING OF THE INSTITUTION",
        "# Some Specific Aspects of the Functioning of the Institution",
      ],
      title("", "The Institution of the Counsellors", {
        author: "The Universal House of Justice",
        years: [2001.0101, 2001.0101],
      }),
      [/^[A-Z].*[a-z]$/gm, (a) => `## ${a}`],
      ["## The Institution", "The Institution"],
      [/\+/g, ""],
    ],
    messages: [
      [/^This document has been downloaded.*/gm, ""],
      [/^Transmitted by email.*/gm, ""],
      [/^\*$/gm, "***"],
      [
        "",
        `Selected Messages of the Universal House of Justice
        author="The Universal House of Justice"
        collection\n\n`,
      ],
      [/^Last modified:.*/gm, ""],
      [
        /^#\n(.*)\n(.*)\n(.*)\n(.*)/gm,
        (_, id, title, addressee, summary) => {
          const fixedTitle =
            (
              {
                "Riḍván 150": "Riḍván 1993",
                "Riḍván 151": "Riḍván 1994",
                "Riḍván 152": "Riḍván 1995",
                "Riḍván 153": "Riḍván 1996",
                "Riḍván 154": "Riḍván 1997",
                "Riḍván 155": "Riḍván 1998",
                "Riḍván 156": "Riḍván 1999",
                "Naw‑Rúz 177": "Naw‑Rúz 2020",
                "Naw‑Rúz 178": "Naw‑Rúz 2021",
                "Naw‑Rúz 179": "Naw‑Rúz 2022",
                "Naw‑Rúz 180": "Naw‑Rúz 2023",
                "Naw‑Rúz 181": "Naw‑Rúz 2024",
                "Naw‑Rúz 182": "Naw‑Rúz 2025",
                "Bahá 154 B.E.": "1 March 1997",
              } as Record<string, string>
            )[title] || title;
          const config = {
            years: getYearsFromId(id),
            summary,
          } as any;
          return [
            `# ${fixedTitle}, ${getMessageTo(addressee)}`,
            ...Object.keys(config).map(
              (k) => `${k}=${JSON.stringify(config[k])}`
            ),
          ].join("\n");
        },
      ],
      [/^Naw‑Rúz (1[78]\d)$/gm, (_, a) => `Naw‑Rúz ${parseInt(a, 10) + 1843}`],
      [/^Dearly loved friends$/gm, "Dearly loved friends,"],
      [/^TO: All National.*$/gm, "To all National Spiritual Assemblies"],
      [/^\[(To.*)\]$/gm, (_, a) => a],
      [
        /^summary.*(\n\n.*){7}$/gm,
        (a) => {
          const parts = a.split("\n\n");
          const index = [...parts]
            .reverse()
            .findIndex((s) =>
              /^((Dear|Beloved|Fellow).*,|(To |A Tribute|MESSAGE:|From:|Warmest).*)$/.test(
                s
              )
            );
          if (index !== -1) {
            return parts
              .map((s, i) =>
                i === 0 || !s.trim() || i >= parts.length - index ? s : `@ ${s}`
              )
              .join("\n\n");
          }
          return a;
        },
      ],
      [/^With loving Bahá’í greetings,$/gm, (a) => `@ ${a}`],
      [/^With all good wishes,$/gm, (a) => `@ ${a}`],
      [/^Deepest Bahá’í love,$/gm, (a) => `@ ${a}`],
      [/^With loving greetings,$/gm, (a) => `@ ${a}`],
      [/^\[signed: The Universal House of Justice\]$/gm, (a) => `@ ${a}`],
      [/^The Universal House of Justice$/gm, (a) => `@ ${a}`],
      [/^UNIVERSAL HOUSE OF JUSTICE$/gm, (a) => `@ ${a}`],
      [/^Department of the Secretariat$/gm, (a) => `@ ${a}`],
      [
        /^\(signed\) The National Spiritual Assembly of the Bahá’ís of Írán$/gm,
        (a) => `@ ${a}`,
      ],
      [/^Respectfully,$/gm, (a) => `@ ${a}`],
      [
        /^[A-Z].{1,80}[a-z]$/gm,
        (a) => {
          if (
            [
              "Department of the Secretariat",
              "From letters written on behalf of the Guardian to individual believers",
              "From the Research Department",
              "Prepared by the Research Department of the Universal House of Justice",
              "The Bahá’í International Community",
              "The Universal House of Justice",
              "To the Universal House of Justice",
              "A large number of Senators and Congressmen of the United States",
              "A meeting held in a committee room of the House of Commons, United Kingdom",
              "Africa",
              "Aghṣán",
              "All three parliamentary parties in Luxembourg",
              "Americas",
              "Amnesty International",
              "Anneliese Bopp",
              "Artemus Lamb",
              "Asia",
              "Athos Costas",
              "Australasia",
              "Auxiliary Boardmembers forPropagation",
              "Auxiliary Boardmembers forProtection",
              "AuxiliaryBoard forPropagation",
              "AuxiliaryBoard forProtection",
              "Bahíyyih Winckler",
              "Betty Reed",
              "Branch",
              "Carmen de Burafato",
              "Carmen de Burafato, Rowland Estall, Artemus Lamb, Paul Lucas, Alfred Osborne",
              "Carrying the healing Message of Bahá’u’lláh to the generality of mankind",
              "Central & East Africa",
              "Central America",
              "Central and East",
              "Central and East Africa",
              "Chellie Sundram",
              "Commission on Social Action of Reform Judaism",
              "Donald Witzel",
              "Dorothy Ferraby",
              "Dual",
              "Erik Blumenthal",
              "Europe",
              "Foreign Minister Hans‑Dietrich Genscher of Germany",
              "Former Chief Justice, India",
              "FormerNumber",
              "German Federal Parliament",
              "Ghuṣn",
              "Ghuṣnán",
              "Governor of the Commonwealth of the Northern Mariana Islands",
              "Greater involvement of the Faith in the life of human society",
              "House of Representatives, Australia",
              "Howard Harwood",
              "Human Rights Commission of the Federation of Protestant Churches in Switzerland",
              "International Association for Religious Freedom",
              "Isobel Sabri",
              "Kolonario Oule",
              "Lloyd Gardner",
              "Lloyd Gardner, Sarah Pereira, Velma Sherrill, Edna True",
              "Manúchihr Salmánpúr",
              "Minister of Foreign Affairs, Australia",
              "Muḥammad Kebdani",
              "Muḥammad Kebdani, Muḥammad Muṣṭafá, ‘Imád Ṣábirán",
              "NewNumber",
              "NewTotal",
              "North America",
              "Northeastern",
              "Northeastern Asia",
              "Northern",
              "Northern Africa",
              "Northwestern",
              "Northwestern Africa",
              "NumberAdded",
              "Offices of the King and Minister for Foreign Affairs of Belgium",
              "Oloro Epyeru",
              "Pacific Conference of Churches",
              "Plural",
              "PresentIncrease",
              "PresentNumber",
              "President Mitterrand of France",
              "President and Minister of Cultural Affairs of Luxembourg",
              "Prime Minister Indira Gandhi of India",
              "Prime Minister’s Office of the United Kingdom",
              "Propagation",
              "Protection",
              "Resolutions Adopted on Behalf of the Bahá’ís in Írán",
              "Richard Benson, Elena Marsella, Rúḥu’lláh Mumtází, Hideya Suzuki",
              "Sankaran‑Nair Vasudevan",
              "Seewoosumbur‑Jeehoba Appa",
              "Seewoosumbur‑Jeehoba Appa, Shidan Fat’he‑Aazam, William Masehla, Bahíyyih Winckler",
              "Senate, Australia",
              "Shírín Boman",
              "Singular",
              "South America",
              "South Central",
              "South Central Asia",
              "Southeastern",
              "Southeastern Asia",
              "Southern",
              "Southern Africa",
              "Statements and Letters from Governments, World Leaders and Others",
              "Suhayl ‘Alá’í, Owen Battrick, Howard Harwood, Violet Hoehnke, Thelma Perks",
              "Swiss Parliamentarians",
              "The Master, Balliol College, Oxford, England",
              "To name just a few",
              "Total",
              "Total Propagation",
              "Total Protection",
              "Trinidad and Tobago Bureau on Human Rights",
              "Vicente Samaniego",
              "Western",
              "Western Africa",
              "Western Asia",
              "Western Hemisphere",
              "Western Samoan Government",
              "Yan Kee Leong",
            ].includes(a) ||
            a.startsWith("Mr") ||
            a.startsWith("Dr")
          ) {
            return a;
          }
          return `## ${a}`;
        },
      ],
      ["## Selected Messages", "Selected Messages"],
      prefix(/^\([iv]/gm, "### "),
      [/summary="Riḍván.*/gm, ""],
      [
        /^SOCIAL ACTION\n\n.*\n\n.*/m,
        '# Social Action (OSED)\nauthor="Documents"\nyears=[2012.1126,2012.1126]\ndate="26 November 2012"',
      ],
      [/^A CODIFICATION OF THE[\s\S]*?(# Letter dated 24)/m, (_, a) => a],
      [/^## A Codification of[\s\S]*?(## The Development of)/m, (_, a) => a],
      [
        /^\([A-Z].*/gm,
        (a) => {
          if (
            ["Súrih", "Qur’án"].some((s) => a.includes(s)) ||
            [
              "(New appointments are indicated with an asterisk.)",
              "(Summarised from a report received concerning the functioning of such schools in a particular country)",
            ].includes(a)
          ) {
            return a;
          }
          return "";
        },
      ],
      [
        /^\([a-z].*/gm,
        (a) => {
          if (["(p. 14)", "(from a newly translated Tablet)"].includes(a)) {
            return "";
          }
          return a;
        },
      ],
      [/^\[Principles of Bahá’í.*/m, ""],
      [
        /^Northwestern Africa$[^#]*#/gms,
        (s) =>
          s
            .split("+")
            .map((a) => {
              const lines = a.trim().split("\n\n");
              return lines
                .map((p, i) => (i === lines.length - 1 ? `\n${p}\n` : `> ${p}`))
                .join("\n");
            })
            .join("\n\n")
            .trim(),
      ],
      [
        /^# Riḍván 1996, to the Bahá’ís of a Nation$/m,
        "# Riḍván 1996, to the Bahá’ís of a Nation (1)",
      ],
      [
        /^# Riḍván 1996, to the Bahá’ís of a Nation$/m,
        "# Riḍván 1996, to the Bahá’ís of a Nation (2)",
      ],
      [
        /^# Riḍván 1996, to the Bahá’ís of a Nation$/m,
        "# Riḍván 1996, to the Bahá’ís of a Nation (3)",
      ],
      [
        /^# Riḍván 1996, to the Bahá’ís of a Nation$/m,
        "# Riḍván 1996, to the Bahá’ís of a Nation (4)",
      ],
      [
        /^# Riḍván 1996, to the Bahá’ís of a Nation$/m,
        "# Riḍván 1996, to the Bahá’ís of a Nation (5)",
      ],
      [
        /^# Riḍván 1996, to the Bahá’ís of a Nation$/m,
        "# Riḍván 1996, to the Bahá’ís of a Nation (6)",
      ],
      [
        /^# Riḍván 1996, to the Bahá’ís of a Nation$/m,
        "# Riḍván 1996, to the Bahá’ís of a Nation (7)",
      ],
      [
        /^# Riḍván 1996, to the Bahá’ís of a Nation$/m,
        "# Riḍván 1996, to the Bahá’ís of a Nation (8)",
      ],
      [
        /^# 2 September 1982, to those gathered$/m,
        "# 2 September 1982, to those gathered (1)",
      ],
      [
        /^# 2 September 1982, to those gathered$/m,
        "# 2 September 1982, to those gathered (2)",
      ],
      [
        /^# 20 July 2000, to those gathered$/m,
        "# 20 July 2000, to those gathered (1)",
      ],
      [
        /^# 20 July 2000, to those gathered$/m,
        "# 20 July 2000, to those gathered (2)",
      ],
      [
        /^# 26 December 1995, to the Counsellors$/m,
        "# 26 December 1995, to the Counsellors (1)",
      ],
      [
        /^# 26 December 1995, to the Counsellors$/m,
        "# 26 December 1995, to the Counsellors (2)",
      ],
      [
        /^# January 1971, to those gathered$/m,
        "# January 1971, to those gathered (1)",
      ],
      [
        /^# January 1971, to those gathered$/m,
        "# January 1971, to those gathered (2)",
      ],
      [
        /^# January 1977, to those gathered$/m,
        "# January 1977, to those gathered (1)",
      ],
      [
        /^# January 1977, to those gathered$/m,
        "# January 1977, to those gathered (2)",
      ],
      [
        /^# July 1976, to those gathered$/m,
        "# July 1976, to those gathered (1)",
      ],
      [
        /^# July 1976, to those gathered$/m,
        "# July 1976, to those gathered (2)",
      ],
      [
        /^# September 1971, to those gathered$/m,
        "# September 1971, to those gathered (1)",
      ],
      [
        /^# September 1971, to those gathered$/m,
        "# September 1971, to those gathered (2)",
      ],
      [/^# May 1971, to those gathered$/m, "# May 1971, to those gathered (1)"],
      [/^# May 1971, to those gathered$/m, "# May 1971, to those gathered (2)"],
      ["has written: “Wherefore", "has written: . . . “Wherefore"],
      ["such belief.” See how firm", "such belief.” . . . See how firm"],
      [
        "preeminent importance. . . .",
        `preeminent importance.

An understanding of the principles by which we explore the Revelation of Bahá’u’lláh depends, too, on an appreciation of the broad nature of the authority conferred on the Universal House of Justice. Speaking of the relevant responsibilities of its elected membership, the Will and Testament states:

It is incumbent upon these members (of the Universal House of Justice) to gather in a certain place and deliberate upon all problems which have caused difference, questions that are obscure and matters that are not expressly recorded in the Book. Whatsoever they decide has the same effect as the Text itself.

Emphasising, in this same Charter of the Administrative Order, the importance of believers’ wholehearted adherence to the guidance given by both the Guardian and the Universal House of Justice, ‘Abdu’l‑Bahá says:

Whatsoever they decide is of God. Whoso obeyeth him not, neither obeyeth them, hath not obeyed God; whoso rebelleth against him and against them hath rebelled against God; whoso opposeth him hath opposed God; whoso contendeth with them hath contended with God. . . .`,
      ],
    ],
  },
  "official-statements-commentaries": {
    bahaullah: [
      [/^A statement prepared by the Bahá’í.*/m, ""],
      removeAfter("Notes"),
      title("", "Bahá’u’lláh", {
        author: "Documents",
        years: [1992.0529, 1992.0529],
      }),
      [/^[A-Z].{1,80}[a-z?]$/gm, (a) => `# ${a}`],
      [/^“.{0,80}”$/gm, (a) => `# ${a}`],
      ["# Bahá’u’lláh", "Bahá’u’lláh"],
    ],
    "century-light": [
      ["The Universal House of Justice", ""],
      ["Naw‑Rúz, 158 B.E.", ""],
      removeAfter("Notes"),
      title("", "Century of Light", {
        author: "Documents",
        years: [2001.0321, 2001.0321],
      }),
      [/\n^Century of Light$/m, "\n# Century of Light"],
      title("#", "Foreword", { meta: "The Universal House of Justice" }),
      [/^[A-Z]{1,5}$/gm, "***"],
      ["humanity! . . . At present", "humanity! . . .\n\nAt present"],
      ["edifice strong. . . . Naught", "edifice strong. . . .\n\nNaught"],
    ],
    "one-common-faith": [
      ["The Universal House of Justice", ""],
      ["Naw‑Rúz, 2005", ""],
      removeAfter("References"),
      title("", "One Common Faith", {
        author: "Documents",
        years: [2005.0321, 2005.0321],
      }),
      title("#", "Foreword", { meta: "The Universal House of Justice" }),
      ["\nOne Common Faith", "\n# One Common Faith"],
    ],
    "aqdas-place-literature": [
      removeAfter("+"),
      [
        "THE KITÁB‑I‑AQDAS\n\nITS PLACE IN BAHÁ’Í LITERATURE",
        "The Kitáb-i-Aqdas: Its Place in Bahá’í Literature",
      ],
      title("", "The Kitáb-i-Aqdas: Its Place in Bahá’í Literature", {
        author: "Documents",
        years: [1993.0101, 1993.0101],
      }),
      [
        "THE KITÁB‑I‑AQDAS AND THE BAHÁ’Í COMMUNITY",
        "The Kitáb‑i‑Aqdas and the Bahá’í Community",
      ],
      [/^[A-Z].{1,80}[a-z]$/gm, (a) => `# ${a}`],
      [
        "# The Kitáb-i-Aqdas: Its Place in Bahá’í Literature",
        "The Kitáb-i-Aqdas: Its Place in Bahá’í Literature",
      ],
    ],
    "prosperity-humankind": [
      [/^A statement prepared by the Bahá’í.*/m, ""],
      removeAfter("This document has been downloaded"),
      ["The Prosperity of Humankind", "The Prosperity of Humankind (BIC)"],
      title("", "The Prosperity of Humankind (BIC)", {
        author: "Documents",
        years: [1995.0303, 1995.0303],
      }),
      [/^[A-Z]{1,5}$/gm, "***"],
    ],
    "turning-point-all-nations": [
      [/^A statement prepared by the Bahá’í.*/m, ""],
      [/^A Statement of the Bahá’í International.*/m, ""],
      ["Turning Point for All Nations", ""],
      ["Shoghi Effendi, 1936", ""],
      removeAfter("Notes"),
      [
        "Recognising the Historical Context:\n\nA Call to World Leaders",
        "Recognising the Historical Context: A Call to World Leaders",
      ],
      ["Turning Point for All Nations", "Turning Point for All Nations (BIC)"],
      title("", "Turning Point for All Nations (BIC)", {
        author: "Documents",
        years: [1995.1001, 1995.1001],
      }),
      [/^[IV]{1,5}\. (.*)$/gm, (_, a) => `# ${a}`],
      [/^[A-D]{1,5}\. (.*)$/gm, (_, a) => `## ${a}`],
      [/^\d+\. (.*)$/gm, (_, a) => `### ${a}`],
    ],
  },
  prayers: {
    "bahai-prayers": [
      [/^A Selection of Prayers Revealed by.*/m, ""],
      removeAfter("Notes"),
      ["Bahá’í Prayers", ""],
      [/Obligatory Prayers.*Kitáb‑i‑Aqdas, p\. 36/s, ""],
      [/Marriage.*abide by the Will of God.”/s, ""],
      [/The Fast.*through March 20./s, ""],
      [/Ḥuqúqu’lláh.*All‑Possessing, the All‑Bountiful\./s, ""],
      [/“These daily obligatory.*His laws and precepts\.”\n\n—[^\n]*/s, ""],
      [/“Study the Tablet.*perceive, take warning!”\n\n—[^\n]*/s, ""],
      [/^\(Naw‑Rúz, March 21.*/m, ""],
      [/^\(The Intercalary Days.*/m, ""],
      [/^—/gm, "±"],
      [
        /^[A-ZḤ].{1,80}[a-z]$/gm,
        (a) => {
          if (
            [
              "Prayer for the Dead",
              "The Long Healing Prayer",
              "Tablet of Aḥmad",
              "Fire Tablet",
              "Tablet of the Holy Mariner",
            ].includes(a) ||
            a.endsWith("Obligatory Prayer") ||
            a.startsWith("Revealed to the")
          ) {
            return `# ${a}`;
          }
          return "";
        },
      ],
      [/([^±]*)^±(.*)$/gm, (_, a, b) => `#\nauthor="${b}"\n\n${a}`],
      [/(author="[^"]*")\n+(#.*)$/gm, (_, a, b) => `${b}\n${a}`],
      ...obligatory,
      [/^\nWe all, verily,/gm, (a) => `> ${a.slice(1)}`],
      ["of the following verses:", "of the following verses:\n"],
      prefix(/^\(The Prayer for the Dead is the only/m, "* "),
      prefix(/^O seeker of Truth! If thou desirest/m, "* "),
      prefix(/^Come ye together in gladness unalloyed/m, "* "),
      prefix(/^The following commune is to be read/m, "* "),
      prefix(/^The spreaders of the fragrances of God/m, "* "),
      prefix(/^Every soul who travels through the cities/m, "* "),
      prefix(/^Let the spreaders of the fragrances of/m, "* "),
      prefix(/^Whoever sets out on a teaching journey/m, "* "),
      prefix(/^Prayer to be said at the close of the/m, "* "),
      prefix(/^All the friends of God \. \. \. should/m, "* "),
      prefix(/^Whenever ye enter the council‑chamber/m, "* "),
      prefix(/^The following supplication is to be read/m, "* "),
      prefix(/^Let whosoever travels to different/m, "* "),
      prefix(/^\(This Tablet is read at the Shrines/m, "* "),
      prefix(/^\(This prayer, revealed by ‘Abdu’l‑Bahá/m, "* "),
      prefix(/^Whoso reciteth this prayer with lowliness/m, "* "),
      prefix("Intone, O My servant, the verses of God", "prayer=false\n\n"),
      prefix("He is the King, the All‑Knowing, the", "prayer=false\n\n"),
      prefix("In the Name of God, the Most Ancient", "prayer=false\n\n"),
      prefix("He is the Gracious, the Well‑Beloved!", "prayer=false\n\n"),
      [/\n+prayer=false/g, "\nprayer=false"],
      ["", "Additional\nprayer\n\n"],
    ],
    "bahai-prayers-tablets-children": [
      [/^A Compilation Prepared by the Research.*/m, ""],
      removeAfter("This document has been downloaded"),
      ["Bahá’í Prayers and Tablets for Children", "Additional"],
      title("", "Additional", {
        prayer: true,
        items: true,
      }),
      [/^—.*/gm, (a) => `${a}\n\n#`],
      [
        /^#+[^#]*/gm,
        (a) => {
          const [title, ...parts] = a.split("\n\n").slice(0, -1);
          const author = parts.pop();
          if (author?.[0] !== "—") return a;
          return [
            `${title}\nauthor=${JSON.stringify(
              author.slice(1, author.indexOf("[") - 1)
            )}`,
            ...parts,
            "",
          ].join("\n\n");
        },
      ],
      prefix("\n\nO ye tender seedlings in the garden", "\nprayer=false"),
      prefix("\n\nO loved ones of ‘Abdu’l‑Bahá!", "\nprayer=false"),
      ["‘Abdu’l‑Bahá!\n\nMan’s life", "‘Abdu’l‑Bahá! Man’s life"],
    ],
  },
};

export default sources;
