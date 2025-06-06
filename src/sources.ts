// const authorYears = {
//   "The Báb": [1844, 1853],
//   "Bahá’u’lláh": [1853, 1892],
//   "‘Abdu’l-Bahá": [1892, 1921],
//   "Shoghi Effendi": [1921, 1957],
// };

const prefix = (
  line: string | RegExp,
  pre: string
): [string | RegExp, (s: string) => string] => [
  line,
  (s: string) => `${pre}${s}`,
];

const escapeForRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const getTitle = (s: string, t: string, translated?: string) => {
  if (!translated) return t;
  if (s.toLowerCase().includes("excerpts")) return `Excerpts from the ${t}`;
  if (s.toLowerCase().includes("excerpt")) return `Excerpt from the ${t}`;
  return t;
};
const title = (
  level: string,
  title: string,
  { translated, meta, ...config } = {} as {
    author?: string;
    years?: [number, number];
    translated?: string;
    meta?: boolean;
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
      meta && "meta",
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
      [/Notes.*/s, ""],
      ["Selected Mystical Works of Bahá’u’lláh", ""],
      title("", "The Call of the Divine Beloved", {
        author: "Bahá’u’lláh",
        years: [1852, 1863],
      }),
      title("#", "Preface", {
        author: "The Universal House of Justice",
        years: [2019, 2019],
        meta: true,
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
      prefix(/^He is the Ever‑Living/gm, "^ "),
    ],
    // "days-remembrance": [],
    // "epistle-son-wolf": [],
    // "gems-divine-mysteries": [],
    // "gleanings-writings-bahaullah": [],
    // "hidden-words": [],
    // "kitab-i-aqdas": [],
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
