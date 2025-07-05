const stopwords = [
  "the",
  "and",
  "that",
  "his",
  "this",
  "for",
  "all",
  "with",
  // "god",
  "are",
  "which",
  "their",
  "have",
  "from",
  // "will",
  "its",
  "they",
  "thy",
  "not",
  "one",
  // "world",
  "who",
  "was",
  "been",
  "them",
  "him",
  "thou",
  "hath",
  // "bahai",
  "has",
  "you",
  "these",
  "such",
  "but",
  "may",
  // "bahaullah",
  "upon",
  // "faith",
  "your",
  "most",
  "cause",
  "were",
  "through",
  "had",
  "thee",
  "every",
  "can",
  // "spiritual",
  "should",
  "unto",
  "would",
  "must",
  "those",
  // "divine",
  "when",
  // "lord",
  "our",

  "myself",
  "ours",
  "ourselves",
  "yours",
  "yourself",
  "yourselves",
  "himself",
  "she",
  "her",
  "hers",
  "herself",
  "itself",
  "theirs",
  "themselves",
  "what",
  "whom",
  //   "being",
  "having",
  "does",
  "did",
  // "doing",
  "could",
  // "ought",
  "because",
  "until",
  "while",
  "about",
  //   "against",
  //   "between",
  "into",
  //   "during",
  //   "before",
  //   "after",
  //   "above",
  //   "below",
  "down",
  "out",
  "off",
  //   "over",
  //   "under",
  "again",
  //   "further",
  "then",
  //   "once",
  "here",
  "there",
  "where",
  "why",
  "how",
  "any",
  // "both",
  "each",
  //   "few",
  //   "more",
  //   "other",
  //   "some",
  //   "only",
  "own",
  //   "same",
  "than",
  "too",
  //   "very",
];

// ## Regex Definitions

// Regex definition of `double`.
var rgxDouble = /(bb|dd|ff|gg|ll|mm|nn|pp|rr|tt)$/;
// Definition for Step Ia suffixes.
var rgxSFXsses = /(.+)(sses)$/;
var rgxSFXiedORies2 = /(.{2,})(ied|ies)$/;
var rgxSFXiedORies1 = /(.{1})(ied|ies)$/;
var rgxSFXusORss = /(.+)(us|ss)$/;
var rgxSFXs = /(.+)(s)$/;
// Definition for Step Ib suffixes.
var rgxSFXeedlyOReed = /(.*)(eedly|eed|eeth|eest)$/;
var rgxSFXedORedlyORinglyORing = /([aeiouy].*)(ed|edly|ingly|ing|eth|est)$/;
var rgxSFXatORblORis = /(at|bl|is)$/;
// Definition for Step Ic suffixes.
var rgxSFXyOR3 = /(.+[^aeiouy])([y3])$/;
// Definition for Step II suffixes; note we have spot the longest suffix.
var rgxSFXstep2 =
  /(lessness|isation|ational|fulness|ousness|iveness|liness|tional|biliti|lessli|entli|ation|alism|aliti|ousli|iviti|fulli|enci|anci|ence?|ance?|abli|iser|ator|alli|elli|less|bli|aci|eci|ogi|li)$/;
var rgxSFXstep2WithReplacements = [
  { rgx: /lessness$/, replacement: "" },
  // Length 7.
  { rgx: /ational$/, replacement: "ate" },
  { rgx: /isation$/, replacement: "ise" },
  { rgx: /fulness$/, replacement: "ful" },
  { rgx: /ousness$/, replacement: "ous" },
  { rgx: /iveness$/, replacement: "ive" },
  // Length 6.
  { rgx: /tional$/, replacement: "tion" },
  { rgx: /biliti$/, replacement: "ble" },
  { rgx: /lessli$/, replacement: "" },
  { rgx: /liness$/, replacement: "" },
  // Length 5.
  { rgx: /iviti$/, replacement: "ive" },
  { rgx: /ousli$/, replacement: "ous" },
  { rgx: /ation$/, replacement: "ate" },
  { rgx: /entli$/, replacement: "ent" },
  { rgx: /(.*)(alism|aliti)$/, replacement: "$1al" },
  { rgx: /fulli$/, replacement: "ful" },
  // Length 4.
  { rgx: /alli$/, replacement: "al" },
  { rgx: /elli$/, replacement: "el" },
  { rgx: /ator$/, replacement: "ate" },
  { rgx: /iser$/, replacement: "ise" },
  { rgx: /enci$/, replacement: "ent" },
  { rgx: /anci$/, replacement: "ant" },
  { rgx: /ence?$/, replacement: "ent" },
  { rgx: /ance?$/, replacement: "ant" },
  { rgx: /abli$/, replacement: "able" },
  { rgx: /less$/, replacement: "" },
  // Length 3.
  { rgx: /bli$/, replacement: "ble" },
  { rgx: /aci$/, replacement: "at" },
  { rgx: /eci$/, replacement: "et" },
  { rgx: /(.*)(l)(ogi)$/, replacement: "$1$2og" },
  // Length 2.
  { rgx: /(.*)([cdeghikmnrt])(li)$/, replacement: "$1$2" },
];
// Definition for Step III suffixes; once again spot the longest one first!
var rgxSFXstep3 =
  /(ational|tional|alise|iance|icate|iciti|ative|ical|ness|ful)$/;
var rgxSFXstep3WithReplacements = [
  { rgx: /ational$/, replacement: "ate" },
  { rgx: /tional$/, replacement: "tion" },
  { rgx: /alise$/, replacement: "al" },
  { rgx: /iance$/, replacement: "iant" },
  { rgx: /(.*)(icate|iciti|ical)$/, replacement: "$1ic" },
  { rgx: /(ness|ful)$/, replacement: "" },
];
// Definition for Step IV suffixes.
var rgxSFXstep4 =
  /(ement|ance|ence|able|ible|ment|ant|ent|ism|ate|iti|ous|ive|ise|al|er|ic)$/;
var rgxSFXstep4Full =
  /(ement|ance|ence|able|ible|ment|ant|ent|ism|ate|iti|ous|ive|ise|ion|al|er|ic)$/;
var rgxSFXstep4ion = /(.*)(s|t)(ion)$/;
// Exceptions Set I.
var exceptions1 = Object.create(null);
// Mapped!
exceptions1.skis = "ski";
exceptions1.skies = "sky";
exceptions1.dying = "die";
exceptions1.lying = "lie";
exceptions1.tying = "tie";
exceptions1.idly = "idl";
exceptions1.gently = "gentl";
exceptions1.ugly = "ugli";
exceptions1.early = "earli";
exceptions1.earliest = "earli";
exceptions1.only = "onli";
exceptions1.singly = "singl";
exceptions1.humility = "humbl";
exceptions1.nobility = "nobl";
exceptions1.nobly = "nobl";
exceptions1.cruelly = "cruel";
exceptions1.lowliness = "lowli";
exceptions1.ironically = "ironi";
exceptions1.pacification = "pacifi";
exceptions1.haply = "happ";
exceptions1.institutes = "institute";
exceptions1.lieth = "lie";
exceptions1.dieth = "die";
exceptions1.deadlier = "dead";
exceptions1.holier = "ho";
exceptions1.icy = "ice";
exceptions1.academia = "academ";
exceptions1.apologia = "apolog";
exceptions1.australasian = "australasia";
exceptions1.criteria = "criterion";
exceptions1.curricula = "curriculum";
exceptions1.curricular = "curriculum";
exceptions1.arabian = "arabia";
exceptions1.arisen = "aris";
exceptions1.biblic = "bibl";
exceptions1.briny = "brine";
exceptions1.celebratory = "celebr";
exceptions1.developmental = "develop";
exceptions1.eaten = "eat";
exceptions1.ebb = "eb";
exceptions1.erred = "error";
exceptions1.erring = "error";
exceptions1.fill = "fil";
exceptions1.fills = "fil";
exceptions1.layer = "layer";
exceptions1.layered = "layer";
exceptions1.layers = "layer";
exceptions1.nuclei = "nucleus";
exceptions1.pearly = "pearl";
exceptions1.objected = "objection";
exceptions1.objection = "objection";
exceptions1.objections = "objection";
exceptions1.objector = "objection";
exceptions1.compassion = "compassion";
exceptions1.compassions = "compassion";
exceptions1.truthful = "truthful";
exceptions1.truthfully = "truthful";
exceptions1.truthfulness = "truthful";
exceptions1.devotional = "devotional";
exceptions1.animal = "animal";
exceptions1.animals = "animal";
exceptions1.animalism = "animalism";
exceptions1.animalistic = "animalism";
exceptions1.teacher = "teacher";
exceptions1.teachers = "teacher";
exceptions1.teachings = "teachings";
exceptions1.tutorial = "tuition";
exceptions1.smallest = "small";
exceptions1.defamatory = "defam";
exceptions1.service = "serv";
exceptions1.services = "serv";
exceptions1.servitude = "serv";
exceptions1.purer = "pure";
exceptions1.purity = "pure";
exceptions1.splendrous = "splendour";
exceptions1.active = "active";
exceptions1.actively = "active";
exceptions1.activity = "activity";
exceptions1.activities = "activity";
exceptions1.admiral = "admiralt";
exceptions1.affection = "affection";
exceptions1.affections = "affection";
exceptions1.agency = "agency";
exceptions1.agencies = "agency";
exceptions1.animator = "animator";
exceptions1.animators = "animator";
exceptions1.apart = "apar";
exceptions1.applicable = "applicable";
exceptions1.applicability = "applicable";
exceptions1.appropriate = "appropriate";
exceptions1.appropriately = "appropriate";
exceptions1.appropriateness = "appropriate";
exceptions1.assistant = "assistant";
exceptions1.assistants = "assistant";
exceptions1.capital = "capital";
exceptions1.capitals = "capital";
exceptions1.capitalism = "capitalist";
exceptions1.caste = "caste";
exceptions1.castes = "caste";
exceptions1.clustered = "clustered";
exceptions1.clustering = "clustered";
exceptions1.coincidence = "coincident";
exceptions1.coincident = "coincident";
exceptions1.damped = "dampen";
exceptions1.discretion = "discreet";
exceptions1.diversion = "divert";
exceptions1.duplicity = "duplicit";
exceptions1.eastern = "east";
exceptions1.entranced = "entranced";
exceptions1.entrancing = "entranced";
exceptions1.executes = "executor";
exceptions1.executing = "executor";
exceptions1.fevered = "feverish";
exceptions1.furnishings = "furnitur";
exceptions1.generals = "generalship";
exceptions1.hanged = "hangman";
exceptions1.heroin = "heroi";
exceptions1.imports = "imports";
exceptions1.imported = "imports";
exceptions1.imprecise = "imprecis";
exceptions1.intimated = "intimation";
exceptions1.intimates = "intimation";
exceptions1.judicial = "judiciar";
exceptions1.landed = "landed";
exceptions1.landing = "landed";
exceptions1.literate = "literar";
exceptions1.maximise = "maximum";
exceptions1.nerves = "nervous";
exceptions1.oceanic = "oceania";
exceptions1.optimism = "optimist";
exceptions1.organ = "orga";
exceptions1.organs = "orga";
exceptions1.orient = "oriental";
exceptions1.projected = "projection";
exceptions1.publicity = "publicis";
exceptions1.ravening = "ravenous";
exceptions1.saw = "see";
exceptions1.seeth = "see";
exceptions1.should = "shoul";
exceptions1.smoking = "smok";
exceptions1.solicitous = "solicitud";
exceptions1.sooth = "soothsay";
exceptions1.stating = "stated";
exceptions1.subsidy = "subsidis";
exceptions1.succeedeth = "successiv";
exceptions1.succeeding = "successiv";
exceptions1.tax = "taxat";
exceptions1.taxes = "taxat";
exceptions1.tears = "tearful";
exceptions1.unit = "units";
exceptions1.wondering = "wondere";
exceptions1.hast = "has";
// Invariants!
exceptions1.institute = "institute";
exceptions1.sky = "sky";
exceptions1.news = "news";
exceptions1.atlas = "atlas";
exceptions1.cosmos = "cosmos";
exceptions1.bias = "bias";
exceptions1.andes = "andes";
exceptions1.kaleidoscope = "kaleidoscope";
exceptions1.rabid = "rabid";
exceptions1.addis = "*addis";
exceptions1.ali = "*ali";
exceptions1.aries = "aries";
exceptions1.auguste = "*auguste";
exceptions1["ash‑i‑kashk"] = "*ash‑i‑kashk";
exceptions1.baby = "baby";
exceptions1.badi = "*badi";
exceptions1.bani = "*bani";
exceptions1.barbe = "*barbe";
exceptions1.browne = "*browne";
exceptions1.chary = "chary";
exceptions1.dais = "dais";
exceptions1.daisy = "daisy";
exceptions1.digest = "digest";
exceptions1.fars = "*fars";
exceptions1.fath = "*fath";
exceptions1.fathe = "*fathe";
exceptions1.fil = "*fil";
exceptions1.franks = "*franks";
exceptions1.homilies = "homilies";
exceptions1.layli = "*layli";
exceptions1.maine = "*maine";
exceptions1.mann = "*mann";
exceptions1.mercer = "mercer";
exceptions1.moore = "*moore";
exceptions1.nevis = "*nevis";
exceptions1.porte = "*porte";
exceptions1.quli = "*quli";
exceptions1.rumi = "*rumi";
exceptions1.sadi = "*sadi";
exceptions1.shams = "*shams";
exceptions1.sicily = "*sicily";
exceptions1.starr = "*starr";
exceptions1.timor = "*timor";
exceptions1.politic = "politic";
exceptions1.patients = "patients";
exceptions1.honest = "honest";
exceptions1.accession = "accession";
exceptions1.adamant = "adamant";
exceptions1.adulterated = "adulterated";
exceptions1.affectation = "affectation";
exceptions1.armfuls = "armfuls";
exceptions1.boyer = "*boyer";
exceptions1.angeles = "*angeles";
exceptions1.arabi = "*arabi";
exceptions1.betty = "*betty";
exceptions1.complicity = "complicity";
exceptions1.cooper = "*cooper";
exceptions1.currency = "currency";
exceptions1.currents = "currents";
exceptions1.darteth = "darteth";
exceptions1.earnest = "earnest";
exceptions1.electrons = "electrons";
exceptions1.equation = "equation";
exceptions1.equator = "equator";
exceptions1.facile = "facile";
exceptions1.farthing = "farthing";
exceptions1.galvani = "*galvani";
exceptions1.generality = "generality";
exceptions1.historic = "historic";
exceptions1.humanities = "humanities";
exceptions1.hindi = "*hindi";
exceptions1.identical = "identical";
exceptions1.imperious = "imperious";
exceptions1.incidental = "incidental";
exceptions1.industrious = "industrious";
exceptions1.integral = "integral";
exceptions1.integrity = "integrity";
exceptions1.judgemental = "judgemental";
exceptions1.leste = "*leste";
exceptions1.lester = "*lester";
exceptions1.locke = "*locke";
exceptions1.meanness = "meanness";
exceptions1.militated = "militated";
exceptions1.monumental = "monumental";
exceptions1.morale = "morale";
exceptions1.negligible = "negligible";
exceptions1.palatable = "palatable";
exceptions1.pointe = "*pointe";
exceptions1.posterity = "posterity";
exceptions1.presently = "presently";
exceptions1.principe = "*principe";
exceptions1.privates = "privates";
exceptions1.projecting = "projecting";
exceptions1.provenance = "provenance";
exceptions1.quite = "quite";
exceptions1.ravenous = "ravenous";
exceptions1.rayy = "*rayy";
exceptions1.rev = "revv";
exceptions1.rights = "rights";
exceptions1.seconds = "seconds";
exceptions1.secretes = "secretes";
exceptions1.shades = "shades";
exceptions1.shortly = "shortly";
exceptions1.sophists = "*sophists";
exceptions1.stafi = "*stafi";
exceptions1.stately = "stately";
exceptions1.stated = "stated";
exceptions1.suite = "suite";
exceptions1.supp = "supp";
exceptions1.suspense = "suspense";
exceptions1.temps = "*temps";
exceptions1.temperate = "temperate";
exceptions1.temperance = "temperance";
exceptions1.tempered = "tempered";
exceptions1.texting = "texting";
exceptions1.thorne = "*thorne";
exceptions1.under = "under";
exceptions1.undertaker = "undertaker";
exceptions1.units = "units";
exceptions1.wages = "wages";
exceptions1.wast = "wast";
exceptions1.woking = "*woking";
exceptions1.wretches = "wretches";
exceptions1.writings = "writings";
exceptions1.timely = "timely";
exceptions1.timeliness = "timely";
exceptions1.utterly = "utterly";
exceptions1.kinds = "kinds";
exceptions1.longer = "longer";
exceptions1.orders = "orders";
exceptions1.unless = "unless";
exceptions1.very = "very";
exceptions1.her = "her";
exceptions1.hers = "hers";
exceptions1.than = "than";
exceptions1.any = "any";
exceptions1.and = "and";
exceptions1.upon = "upon";
exceptions1.had = "had";
exceptions1.does = "does";
exceptions1.off = "ooff";
exceptions1.out = "oout";
exceptions1.she = "sshe";
exceptions1.these = "these";
exceptions1.un = "un";
exceptions1.until = "uuntil";
exceptions1.with = "wwith";
exceptions1.ones = "ones";
// Tweaks!
var tweaks = Object.create(null);
tweaks.aggressor = "aggress";
tweaks.anathema = "anathemat";
tweaks.politic = "polit";
tweaks.politician = "polit";
tweaks.defens = "defend";
tweaks.defent = "defend";
tweaks.darken = "dark";
tweaks.darksom = "dark";
tweaks.health = "heal";
tweaks.generos = "generous";
tweaks.joyous = "joy";
tweaks.friendship = "friend";
tweaks.spiritu = "spirit";
tweaks.abolit = "abolish";
tweaks.abhorr = "abhor";
tweaks.absente = "absent";
tweaks.absolutist = "absolut";
tweaks.absorpt = "absorb";
tweaks.abstem = "abstain";
tweaks.abstent = "abstain";
tweaks.abstin = "abstain";
tweaks.accident = "accid";
tweaks.acclam = "acclaim";
tweaks.accurat = "accur";
tweaks.accusator = "accus";
tweaks.acquaintanceship = "acquaint";
tweaks.acquisit = "acquir";
tweaks.adequat = "adequ";
tweaks.adhes = "adh";
tweaks.administr = "administ";
tweaks.admitt = "admit";
tweaks.admixtur = "admix";
tweaks.admonit = "admonish";
tweaks.adulteress = "adulter";
tweaks.adulthood = "adult";
tweaks.advant = "advanc";
tweaks.adversar = "advers";
tweaks.advertis = "advert";
tweaks.advic = "advis";
tweaks.advisor = "advis";
tweaks.advocat = "advoc";
tweaks.african = "africa";
tweaks.aggrandis = "aggrand";
tweaks.agnostic = "agnost";
tweaks.agreeabl = "agre";
tweaks.agreement = "agre";
tweaks.alliant = "al";
tweaks.altruist = "altruism";
tweaks.almight = "might";
tweaks.ambassadress = "ambassador";
tweaks.american = "america";
tweaks.amiabl = "amic";
tweaks.amidst = "amid";
tweaks.amongst = "among";
tweaks.amp = "ampl";
tweaks.ancestr = "ancestor";
tweaks.antagonist = "antagon";
tweaks.anthropomorphist = "anthropomorph";
tweaks.anticipator = "anticip";
tweaks.antithet = "antithes";
tweaks.apathet = "apath";
tweaks.apocalypt = "apocalyps";
tweaks.apologist = "apolog";
tweaks.apostas = "apost";
tweaks.apostat = "apost";
tweaks.apostleship = "apostl";
tweaks.apostol = "apostl";
tweaks.appendic = "appendix";
tweaks.applaus = "applaud";
tweaks.appointe = "appoint";
tweaks.apportion = "apport";
tweaks.apprenticeship = "apprentic";
tweaks.arabia = "arab";
tweaks.arabian = "arab";
tweaks.arbitr = "arbit";
tweaks.architectur = "architect";
tweaks.argument = "argu";
tweaks.armi = "arm";
tweaks.armament = "arm";
tweaks.aros = "aris";
tweaks.arrowhead = "arrow";
tweaks.arsonist = "arson";
tweaks.artist = "art";
tweaks.artistr = "art";
tweaks.ascens = "ascend";
tweaks.ascent = "ascend";
tweaks.ascetic = "ascet";
tweaks.asian = "asia";
tweaks.asiat = "asia";
tweaks.assemblag = "assembl";
tweaks.assumpt = "assum";
tweaks.atheist = "atheism";
tweaks.attende = "attend";
tweaks.attractor = "attract";
tweaks.authoress = "author";
tweaks.authorship = "author";
tweaks.awaken = "awak";
tweaks.awok = "awak";
tweaks.awesom = "awe";
tweaks.awestricken = "awestruck";
tweaks.axiomat = "axiom";
tweaks.babe = "baby";
tweaks.babyhood = "baby";
tweaks.bafflement = "baffl";
tweaks.bake = "bak";
tweaks.bankruptc = "bankrupt";
tweaks.baptism = "baptis";
tweaks.baptist = "baptis";
tweaks.barbarian = "barbar";
tweaks.baro = "baron";
tweaks.baser = "base";
tweaks.bathhous = "bath";
tweaks.battlefield = "battle";
tweaks.battleground = "battle";
tweaks.bearabl = "bear";
tweaks.beaten = "beat";
tweaks.beautif = "beaut";
tweaks.beauteous = "beaut";
tweaks.beck = "beckon";
tweaks.befel = "befal";
tweaks.befallen = "befal";
tweaks.begat = "beget";
tweaks.begett = "beget";
tweaks.begot = "beget";
tweaks.begotten = "beget";
tweaks.behaviour = "behav";
tweaks.beheld = "behold";
tweaks.beholden = "behold";
tweaks.belief = "believ";
tweaks.belovd = "belov";
tweaks.benefactor = "benefact";
tweaks.benefici = "benefit";
tweaks.bespok = "bespeak";
tweaks.betook = "betak";
tweaks.biass = "bias";
tweaks.biblic = "bibl";
tweaks.bibliolog = "bibliograph";
tweaks.bicentenn = "bicentenar";
tweaks.bidden = "bid";
tweaks.bigg = "big";
tweaks.bigotr = "bigot";
tweaks.biologist = "biolog";
tweaks.birthdat = "birthday";
tweaks.bitten = "bite";
tweaks.blacken = "black";
tweaks.blame = "blam";
tweaks.bled = "blood";
tweaks.bleed = "blood";
tweaks.blessed = "bless";
tweaks.blest = "bless";
tweaks.blew = "blow";
tweaks.blown = "blow";
tweaks.bondsmaid = "bondsmen";
tweaks.bondswoman = "bondsmen";
tweaks.borderland = "bord";
tweaks.bore = "bear";
tweaks.borne = "bear";
tweaks.bothering = "bother";
tweaks.bought = "buy";
tweaks.bounteous = "bount";
tweaks.boyhood = "boy";
tweaks.brav = "brave";
tweaks.bred = "breed";
tweaks.brib = "bribe";
tweaks.bridal = "bride";
tweaks.bridegroom = "bride";
tweaks.brigandag = "brigand";
tweaks.brighten = "bright";
tweaks.brightsom = "bright";
tweaks.broaden = "broad";
tweaks.broke = "break";
tweaks.broken = "break";
tweaks.brotherhood = "broth";
tweaks.brutal = "brute";
tweaks.brutish = "brute";
tweaks.buddhism = "buddha";
tweaks.buddhist = "buddha";
tweaks.budgetar = "budget";
tweaks.built = "build";
tweaks.burdensom = "burden";
tweaks.burnt = "burn";
tweaks.businessmen = "businessman";
tweaks.cablegram = "cabl";
tweaks.calamit = "calam";
tweaks.call = "cal";
tweaks.carpentr = "carpent";
tweaks.causal = "caus";
tweaks.causat = "caus";
tweaks.cautionar = "caution";
tweaks.cautious = "caution";
tweaks.centenn = "centenar";
tweaks.central = "centr";
tweaks.centred = "centr";
tweaks.certaint = "certain";
tweaks.certitud = "certain";
tweaks.chancellor = "chancell";
tweaks.changeabl = "chang";
tweaks.chaotic = "chao";
tweaks.characterist = "charact";
tweaks.chastis = "chasten";
tweaks.chastit = "chast";
tweaks.chicken = "chick";
tweaks.childhood = "child";
tweaks.children = "child";
tweaks.chimerical = "chimaera";
tweaks.chorist = "choir";
tweaks.chose = "choos";
tweaks.chosen = "choos";
tweaks.christhood = "christ";
tweaks.christendom = "christian";
tweaks.churchmen = "churchman";
tweaks.circumscript = "circumscrib";
tweaks.circumstant = "circumst";
tweaks.citat = "cite";
tweaks.citizenr = "citizen";
tweaks.citizenship = "citizen";
tweaks.clamor = "clamour";
tweaks.clarit = "clear";
tweaks.cleavag = "cleav";
tweaks.cleft = "cleav";
tweaks.clergymen = "clerg";
tweaks.clove = "cleav";
tweaks.cloven = "cleav";
tweaks.coarsen = "coars";
tweaks.cockcrow = "cock";
tweaks.cockerel = "cock";
tweaks.codif = "code";
tweaks.coercion = "coerc";
tweaks.coerciv = "coerc";
tweaks.collis = "collid";
tweaks.commendator = "commend";
tweaks.commission = "commiss";
tweaks.commodit = "commod";
tweaks.commonplac = "common";
tweaks.communal = "commune";
tweaks.communism = "communist";
tweaks.companionship = "companion";
tweaks.comparison = "compar";
tweaks.competit = "compet";
tweaks.competitor = "compet";
tweaks.complaint = "complain";
tweaks.complementar = "complement";
tweaks.composit = "compos";
tweaks.comprehens = "comprehend";
tweaks.comradeship = "comrad";
tweaks.conciliator = "conc";
tweaks.conclus = "conclud";
tweaks.concubinag = "concubin";
tweaks.concurr = "concur";
tweaks.condemnator = "condemn";
tweaks.condescens = "condescend";
tweaks.conductor = "conduct";
tweaks.confirmator = "confirm";
tweaks.conformist = "conform";
tweaks.congratulator = "congratul";
tweaks.congressmen = "congress";
tweaks.conjoint = "conjoin";
tweaks.conqueror = "conqu";
tweaks.consequent = "consequ";
tweaks.conservative = "conservat";
tweaks.conspirat = "conspir";
tweaks.constabular = "constabl";
tweaks.constraint = "constrain";
tweaks.consular = "consul";
tweaks.consumpt = "consum";
tweaks.contagion = "contag";
tweaks.contemporan = "contemporar";
tweaks.contemptu = "contempt";
tweaks.contest = "cont";
tweaks.contradictor = "contradict";
tweaks.contrariet = "contrar";
tweaks.contributor = "contribut";
tweaks.controversialist = "controvers";
tweaks.contumac = "contumat";
tweaks.convenor = "conven";
tweaks.convoc = "convok";
tweaks.corros = "corrod";
tweaks.corruptor = "corrupt";
tweaks.cosmos = "cosmic";
tweaks.countrymen = "countryman";
tweaks.courtes = "courteous";
tweaks.covenant = "coven";
tweaks.cowardic = "coward";
tweaks.crimin = "crime";
tweaks.crise = "cris";
tweaks.crucifixion = "crucif";
tweaks.cruelt = "cruel";
tweaks.crystallin = "crystal";
tweaks.curios = "curious";
tweaks.curvatur = "curv";
tweaks.customar = "custom";
tweaks.damnat = "damn";
tweaks.dawntid = "dawn";
tweaks.deafen = "deaf";
tweaks.dealt = "deal";
tweaks.death = "dead";
tweaks.debtor = "debt";
tweaks.deceiv = "deceit";
tweaks.decomposit = "decompos";
tweaks.dedicator = "dedic";
tweaks.defector = "defect";
tweaks.defenc = "defend";
tweaks.deferent = "def";
tweaks.defiant = "defi";
tweaks.definit = "defin";
tweaks.degenerat = "degen";
tweaks.deific = "deif";
tweaks.delightsom = "delight";
tweaks.delus = "delud";
tweaks.delusor = "delud";
tweaks.demolit = "demolish";
tweaks.denial = "deni";
tweaks.densit = "dens";
tweaks.denunciator = "denunc";
tweaks.departur = "depart";
tweaks.depositor = "deposit";
tweaks.depute = "deput";
tweaks.deris = "derid";
tweaks.derogator = "derog";
tweaks.descent = "descend";
tweaks.descript = "describ";
tweaks.destruct = "destroy";
tweaks.detaine = "detain";
tweaks.determinist = "determin";
tweaks.detractor = "detract";
tweaks.devilish = "devil";
tweaks.devolut = "devolv";
tweaks.devote = "devot";
tweaks.dictator = "dictat";
tweaks.dictatorship = "dictat";
tweaks.different = "diff";
tweaks.dignit = "dignif";
tweaks.dilator = "dilat";
tweaks.dimm = "dim";
tweaks.disagre = "disagr";
tweaks.disarma = "disarm";
tweaks.disastr = "disast";
tweaks.disbelief = "disbeliev";
tweaks.discipleship = "discipl";
tweaks.disciplinar = "disciplin";
tweaks.disclosur = "disclos";
tweaks.discomfitur = "discomfit";
tweaks.discourtes = "discourt";
tweaks.disenchant = "disench";
tweaks.dishonest = "dishon";
tweaks.disillusion = "disillus";
tweaks.disinterested = "disinterest";
tweaks.disloyalt = "disloy";
tweaks.disobed = "disobey";
tweaks.displeasur = "displeas";
tweaks.disproof = "disprov";
tweaks.disquietud = "disquiet";
tweaks.dissatisfact = "dissatisf";
tweaks.distributor = "distribut";
tweaks.disunit = "disun";
tweaks.div = "divers";
tweaks.division = "divis";
tweaks.documentar = "document";
tweaks.dogmat = "dogma";
tweaks.donor = "donat";
tweaks.doub = "doubl";
tweaks.drawn = "draw";
tweaks.dreamt = "dream";
tweaks.drew = "draw";
tweaks.driv = "drive";
tweaks.driven = "drive";
tweaks.drove = "drive";
tweaks.duchess = "duke";
tweaks.dwel = "dwell";
tweaks.eastward = "east";
tweaks.ecclesiastic = "ecclesiast";
tweaks.eclectic = "eclect";
tweaks.economist = "econom";
tweaks.ecstat = "ecstas";
tweaks.editor = "edit";
tweaks.educationalist = "educ";
tweaks.effectu = "effect";
tweaks.efficat = "efficac";
tweaks.election = "elect";
tweaks.elector = "elect";
tweaks.elementar = "element";
tweaks.embed = "emb";
tweaks.employe = "employ";
tweaks.empress = "emperor";
tweaks.enactor = "enact";
tweaks.encumbr = "encumb";
tweaks.energet = "energ";
tweaks.enfranchis = "enfranch";
tweaks.engraven = "engrav";
tweaks.enhanc = "enhant";
tweaks.enigmat = "enigma";
tweaks.entiret = "entir";
tweaks.entrant = "entr";
tweaks.enviabl = "env";
tweaks.envious = "env";
tweaks.envisag = "envis";
tweaks.episcopalian = "episcop";
tweaks.equabl = "equal";
tweaks.equat = "equal";
tweaks.equilibrium = "equilibr";
tweaks.equinoct = "equinox";
tweaks.eros = "erod";
tweaks.err = "error";
tweaks.erron = "error";
tweaks.euphoria = "euphor";
tweaks.european = "europ";
tweaks.evangelist = "evangel";
tweaks.eve = "evening";
tweaks.evoc = "evok";
tweaks.evolut = "evolv";
tweaks.evolutionar = "evolv";
tweaks.exactitud = "exact";
tweaks.examin = "exam";
tweaks.exclam = "exclaim";
tweaks.execution = "execut";
tweaks.existent = "exist";
tweaks.experimentalist = "experimental";
tweaks.explan = "explain";
tweaks.explanator = "explain";
tweaks.explorator = "explor";
tweaks.explos = "explod";
tweaks.expositor = "exposit";
tweaks.exposur = "expos";
tweaks.extortion = "extort";
tweaks.extremist = "extrem";
tweaks.factious = "faction";
tweaks.factual = "fact";
tweaks.failur = "fail";
tweaks.fal = "fall";
tweaks.fallat = "fallac";
tweaks.fallen = "fall";
tweaks.falsehood = "fals";
tweaks.falsit = "fals";
tweaks.fanatic = "fanat";
tweaks.fantast = "fantas";
tweaks.farmhous = "farm";
tweaks.farmland = "farm";
tweaks.farthermost = "farth";
tweaks.fascism = "fascist";
tweaks.fatherhood = "fath";
tweaks.fearsom = "fear";
tweaks.fed = "feed";
tweaks.felicit = "felic";
tweaks.fell = "fall";
tweaks.felt = "feel";
tweaks.feminist = "femin";
tweaks.fervid = "fervent";
tweaks.fervour = "fervent";
tweaks.festal = "festiv";
tweaks.fi = "fire";
tweaks.fictit = "fiction";
tweaks.fiendish = "fiend";
tweaks.finant = "financ";
tweaks.fixit = "fix";
tweaks.flamelik = "flame";
tweaks.fled = "flee";
tweaks.fledgl = "fledg";
tweaks.fleeth = "flee";
tweaks.fleeting = "fleet";
tweaks.flew = "f";
tweaks.flight = "f";
tweaks.flora = "flower";
tweaks.floral = "flower";
tweaks.flowerb = "flower";
tweaks.flown = "f";
tweaks.fluenc = "fluent";
tweaks.fluidit = "fluid";
tweaks.flung = "fling";
tweaks.foc = "focus";
tweaks.focal = "focus";
tweaks.foemen = "foe";
tweaks.foetal = "foetus";
tweaks.foolish = "fool";
tweaks.fora = "forum";
tweaks.forbad = "forbid";
tweaks.forbidden = "forbid";
tweaks.forborn = "forbear";
tweaks.forcibl = "forc";
tweaks.foregon = "forego";
tweaks.foresaw = "forese";
tweaks.foreseen = "forese";
tweaks.foresight = "forese";
tweaks.foretold = "foretel";
tweaks.forevermor = "forev";
tweaks.forfeitur = "forfeit";
tweaks.forgav = "forgiv";
tweaks.forgiven = "forgiv";
tweaks.forgon = "forgo";
tweaks.forgot = "forget";
tweaks.forgotten = "forget";
tweaks.forsaken = "forsak";
tweaks.forsook = "forsak";
tweaks.fought = "fight";
tweaks.fragmentar = "fragment";
tweaks.frailt = "frail";
tweaks.fram = "frame";
tweaks.fraudul = "fraud";
tweaks.fre = "free";
tweaks.freed = "free";
tweaks.freeth = "free";
tweaks.frenetic = "frenet";
tweaks.freshen = "fresh";
tweaks.frighten = "fright";
tweaks.fruitag = "fruit";
tweaks.fruition = "fruit";
tweaks.ful = "full";
tweaks.furious = "furi";
tweaks.fusion = "fuse";
tweaks.gainsaid = "gainsay";
tweaks.gallantr = "gallant";
tweaks.gase = "gas";
tweaks.gaseous = "gas";
tweaks.gave = "give";
tweaks.gentlemen = "gentleman";
tweaks.geologist = "geolog";
tweaks.gigant = "giant";
tweaks.giv = "give";
tweaks.given = "give";
tweaks.gladden = "glad";
tweaks.gladsom = "glad";
tweaks.glorif = "glor";
tweaks.glorious = "glor";
tweaks.goe = "go";
tweaks.golden = "gold";
tweaks.gone = "go";
tweaks.gotten = "get";
tweaks.government = "govern";
tweaks.governorship = "governor";
tweaks.gradualist = "gradual";
tweaks.grammarian = "grammar";
tweaks.grammat = "grammar";
tweaks.gratitud = "grate";
tweaks.grav = "grave";
tweaks.grew = "grow";
tweaks.griev = "grief";
tweaks.grimm = "grim";
tweaks.grown = "grow";
tweaks.growth = "grow";
tweaks.guarantor = "guarante";
tweaks.guardianship = "guardian";
tweaks.guardsmen = "guard";
tweaks.habitu = "habit";
tweaks.halv = "half";
tweaks.handmaiden = "handmaid";
tweaks.harvest = "harv";
tweaks.hasten = "hast";
tweaks.hater = "hate";
tweaks.hatr = "hate";
tweaks.haz = "haze";
tweaks.heard = "hear";
tweaks.hearst = "hear";
tweaks.heartbroken = "heartbreak";
tweaks.hearted = "heart";
tweaks.heartfelt = "heart";
tweaks.heathenish = "heathen";
tweaks.held = "hold";
tweaks.hellish = "hell";
tweaks.helpmeet = "helpmat";
tweaks.hereditar = "hered";
tweaks.heroic = "hero";
tweaks.heroism = "hero";
tweaks.hid = "hide";
tweaks.hidden = "hide";
tweaks.hindrant = "hind";
tweaks.hinduism = "hindu";
tweaks.hindus = "hindu";
tweaks.hindustan = "hindu";
tweaks.historian = "histor";
tweaks.historicist = "histor";
tweaks.historiograph = "histor";
tweaks.holden = "hold";
tweaks.honorar = "honour";
tweaks.horsemen = "horseman";
tweaks.hostess = "host";
tweaks.hott = "hot";
tweaks.humankind = "human";
tweaks.humor = "humour";
tweaks.hung = "hang";
tweaks.hungr = "hunger";
tweaks.huntsman = "hunt";
tweaks.husbandmen = "husbandman";
tweaks.husbandr = "husbandman";
tweaks.hypocris = "hypocrit";
tweaks.heroin = "hero";
tweaks.idealist = "ideal";
tweaks.ideat = "idea";
tweaks.ideologu = "ideolog";
tweaks.idolat = "idol";
tweaks.idolatr = "idol";
tweaks.illegitimat = "illegitim";
tweaks.illiterat = "illit";
tweaks.illum = "illumin";
tweaks.illusor = "illus";
tweaks.imaginar = "imagin";
tweaks.immaculat = "immacul";
tweaks.immediat = "immed";
tweaks.immobil = "immobl";
tweaks.imperialist = "imp";
tweaks.impetuos = "impetu";
tweaks.impiet = "impious";
tweaks.impostur = "impostor";
tweaks.impractic = "impract";
tweaks.inaccurat = "inaccur";
tweaks.inadequat = "inadequ";
tweaks.incapac = "incap";
tweaks.incapacit = "incap";
tweaks.incident = "incid";
tweaks.indebted = "indebt";
tweaks.indiscret = "indiscreet";
tweaks.indisposit = "indispos";
tweaks.individualist = "individu";
tweaks.industrialist = "industr";
tweaks.ineffectu = "ineffect";
tweaks.ineptitud = "inept";
tweaks.infantil = "infant";
tweaks.infinit = "infin";
tweaks.infinitud = "infin";
tweaks.infinitum = "infin";
tweaks.inflationar = "inflat";
tweaks.inflictor = "inflict";
tweaks.ingenu = "ingen";
tweaks.inheritor = "inherit";
tweaks.iniquit = "iniqu";
tweaks.inoper = "inop";
tweaks.inscript = "inscrib";
tweaks.inspector = "inspect";
tweaks.instinctu = "instinct";
tweaks.instructor = "instruct";
tweaks.intellectu = "intellect";
tweaks.intensif = "intens";
tweaks.intercessor = "intercess";
tweaks.interconnected = "interconnect";
tweaks.intermarriag = "intermarr";
tweaks.intermediar = "intermed";
tweaks.interposit = "interpos";
tweaks.interrelationship = "interrel";
tweaks.interrogator = "interrog";
tweaks.interwoven = "interweav";
tweaks.intestat = "intest";
tweaks.intimat = "intim";
tweaks.intoxic = "intox";
tweaks.intricat = "intric";
tweaks.introduct = "introduc";
tweaks.introductor = "introduc";
tweaks.intrud = "intrus";
tweaks.invas = "invad";
tweaks.inventor = "invent";
tweaks.invers = "invert";
tweaks.invoc = "invok";
tweaks.irreligion = "irrelig";
tweaks.isolationist = "isol";
tweaks.issuant = "issu";
tweaks.jewish = "jew";
tweaks.jewr = "jew";
tweaks.joint = "join";
tweaks.journalist = "journal";
tweaks.judgement = "judg";
tweaks.jurid = "judiciar";
tweaks.jurisprud = "judiciar";
tweaks.justic = "just";
tweaks.kept = "keep";
tweaks.kil = "kill";
tweaks.kindr = "kin";
tweaks.kinfolk = "kin";
tweaks.kinsfolk = "kin";
tweaks.kinship = "kin";
tweaks.kinsman = "kin";
tweaks.kinsmen = "kin";
tweaks.kinswoman = "kin";
tweaks.kingship = "king";
tweaks.knelt = "kneel";
tweaks.knew = "know";
tweaks.knighthood = "knight";
tweaks.knive = "knife";
tweaks.knowabl = "know";
tweaks.known = "know";
tweaks.labor = "labour";
tweaks.laci = "lace";
tweaks.laid = "lay";
tweaks.lain = "lay";
tweaks.lat = "late";
tweaks.laudabl = "laud";
tweaks.laudat = "laud";
tweaks.laudator = "laud";
tweaks.laught = "laugh";
tweaks.laxit = "lax";
tweaks.laymen = "layman";
tweaks.leadership = "lead";
tweaks.leapt = "leap";
tweaks.learnt = "learn";
tweaks.led = "lead";
tweaks.legalist = "legal";
tweaks.legate = "legat";
tweaks.legendar = "legend";
tweaks.legislatur = "legisl";
tweaks.legitimat = "legitim";
tweaks.lengthen = "length";
tweaks.lepros = "lep";
tweaks.lessen = "less";
tweaks.liaison = "liais";
tweaks.lineal = "lineag";
tweaks.linkag = "link";
tweaks.lioness = "lion";
tweaks.liquef = "liquid";
tweaks.literalist = "liter";
tweaks.literat = "literar";
tweaks.literatur = "literar";
tweaks.loathsom = "loath";
tweaks.lonesom = "lone";
tweaks.loosen = "loos";
tweaks.lordship = "lord";
tweaks.loss = "lose";
tweaks.lost = "lose";
tweaks.lov = "love";
tweaks.lovabl = "love";
tweaks.lovesom = "love";
tweaks.lowbr = "lowborn";
tweaks.lowli = "low";
tweaks.loyalt = "loyal";
tweaks.lul = "lull";
tweaks.luminos = "lumin";
tweaks.luncheon = "lunch";
tweaks.lustrous = "lustr";
tweaks.madman = "mad";
tweaks.made = "make";
tweaks.magian = "mag";
tweaks.magistrat = "magistr";
tweaks.maidserv = "maid";
tweaks.mak = "make";
tweaks.malefactor = "malefic";
tweaks.manhood = "man";
tweaks.manifest = "manif";
tweaks.manifestor = "manif";
tweaks.marit = "marr";
tweaks.marketplac = "market";
tweaks.marriag = "marr";
tweaks.martyrdom = "martyr";
tweaks.mathematician = "mathemat";
tweaks.matrimon = "marr";
tweaks.mead = "meadow";
tweaks.meag = "meagr";
tweaks.meaning = "mean";
tweaks.meant = "mean";
tweaks.mediumship = "medium";
tweaks.men = "man";
tweaks.meritor = "merit";
tweaks.merriment = "merr";
tweaks.messeng = "messag";
tweaks.messengership = "messag";
tweaks.messiahship = "messiah";
tweaks.messian = "messiah";
tweaks.met = "meet";
tweaks.metallurg = "metal";
tweaks.metaphysician = "metaphys";
tweaks.methodolog = "method";
tweaks.metropolitan = "metropo";
tweaks.mileag = "mile";
tweaks.milieus = "milieu";
tweaks.militar = "milit";
tweaks.militarist = "milit";
tweaks.millennia = "millenn";
tweaks.millennialist = "millenn";
tweaks.millennium = "millenn";
tweaks.minded = "mind";
tweaks.min = "mine";
tweaks.minimum = "minim";
tweaks.ministr = "minist";
tweaks.minutia = "minut";
tweaks.miracul = "miracl";
tweaks.misapprehens = "misapprehend";
tweaks.misbeliev = "misbelief";
tweaks.mischiev = "mischief";
tweaks.misconceiv = "misconc";
tweaks.misconcept = "misconc";
tweaks.misl = "mislead";
tweaks.misrepresent = "misrepres";
tweaks.mistaken = "mistak";
tweaks.misunderstood = "misunderstand";
tweaks.mixtur = "mix";
tweaks.modernist = "modern";
tweaks.moisten = "moist";
tweaks.moistur = "moist";
tweaks.mole = "molest";
tweaks.monarchist = "monarch";
tweaks.monastic = "monast";
tweaks.mon = "money";
tweaks.monetar = "money";
tweaks.monk = "monast";
tweaks.monopo = "monopol";
tweaks.monotheist = "monoth";
tweaks.monstros = "monstrous";
tweaks.moonlit = "moonlight";
tweaks.moralist = "moral";
tweaks.morningtid = "morn";
tweaks.motherhood = "mother";
tweaks.mountainsid = "mountain";
tweaks.mountaintop = "mountain";
tweaks.mov = "move";
tweaks.movabl = "move";
tweaks.movement = "move";
tweaks.mown = "mow";
tweaks.mudd = "mud";
tweaks.mulet = "mule";
tweaks.multipl = "multip";
tweaks.multitudin = "multitud";
tweaks.musician = "music";
tweaks.mytholog = "myth";
tweaks.naivet = "naiv";
tweaks.naked = "nake";
tweaks.namesak = "name";
tweaks.nationhood = "nation";
tweaks.nationwid = "nation";
tweaks.naval = "nav";
tweaks.nearb = "near";
tweaks.necessar = "necess";
tweaks.necessit = "necess";
tweaks.needst = "need";
tweaks.neglig = "neglect";
tweaks.neighbor = "neighbour";
tweaks.ngos = "ngo";
tweaks.nightfal = "night";
tweaks.nihilist = "nihil";
tweaks.nobleman = "nobl";
tweaks.noblemen = "nobl";
tweaks.nomine = "nomin";
tweaks.noonday = "noon";
tweaks.noontid = "noon";
tweaks.northeastern = "northeast";
tweaks.northern = "north";
tweaks.northward = "north";
tweaks.northwestern = "northw";
tweaks.nothing = "noth";
tweaks.notoriet = "notor";
tweaks.nullit = "nullif";
tweaks.obdurat = "obdur";
tweaks.objector = "objection";
tweaks.obligator = "oblig";
tweaks.obscurant = "obscur";
tweaks.obsolesc = "obsolet";
tweaks.obstinat = "obstin";
tweaks.occident = "occid";
tweaks.occurr = "occur";
tweaks.odium = "odious";
tweaks.offenc = "offend";
tweaks.offens = "offend";
tweaks.offent = "offend";
tweaks.officialdom = "offic";
tweaks.oft = "often";
tweaks.olden = "old";
tweaks.omiss = "omit";
tweaks.opportunist = "opportun";
tweaks.oppressor = "oppress";
tweaks.orator = "orat";
tweaks.orphanag = "orphan";
tweaks.ostentat = "ostent";
tweaks.outdon = "outdo";
tweaks.outgrown = "outgrow";
tweaks.outgrowth = "outgrow";
tweaks.outshon = "outshin";
tweaks.overcam = "overcom";
tweaks.overheard = "overhear";
tweaks.overlordship = "overlord";
tweaks.overran = "overrun";
tweaks.overs = "overse";
tweaks.overseen = "overse";
tweaks.oversight = "overse";
tweaks.overtaken = "overtak";
tweaks.overthrew = "overthrow";
tweaks.overthrown = "overthrow";
tweaks.overtook = "overtak";
tweaks.ownership = "own";
tweaks.pacifist = "pacifi";
tweaks.pageantr = "pageant";
tweaks.paid = "pay";
tweaks.paintbrush = "paint";
tweaks.panoram = "panorama";
tweaks.pantheist = "pantheism";
tweaks.papat = "papal";
tweaks.parentag = "parent";
tweaks.parenthood = "parent";
tweaks.parliamentar = "parliament";
tweaks.parliamentarian = "parliament";
tweaks.partaken = "partak";
tweaks.participator = "particip";
tweaks.particularist = "particular";
tweaks.partisanship = "partisan";
tweaks.partnership = "partn";
tweaks.partook = "partak";
tweaks.paternalist = "patern";
tweaks.pathogen = "patholog";
tweaks.patronag = "patron";
tweaks.payabl = "pay";
tweaks.payment = "pay";
tweaks.peaceabl = "peac";
tweaks.penalt = "penal";
tweaks.peninsular = "peninsula";
tweaks.percentag = "percent";
tweaks.permeabl = "permeat";
tweaks.persecutor = "persecut";
tweaks.persian = "persia";
tweaks.persuad = "persuas";
tweaks.pertin = "pertain";
tweaks.pervas = "pervad";
tweaks.pestilent = "pestil";
tweaks.petition = "petit";
tweaks.pharaon = "pharaoh";
tweaks.pharisa = "pharise";
tweaks.phenomenon = "phenomena";
tweaks.philanthropist = "philanthrop";
tweaks.photograph = "photo";
tweaks.physicist = "physic";
tweaks.pietism = "piet";
tweaks.pilgrimag = "pilgrim";
tweaks.pious = "piet";
tweaks.pip = "pipe";
tweaks.pitiabl = "piti";
tweaks.placement = "place";
tweaks.planetar = "planet";
tweaks.plann = "plan";
tweaks.plasterwork = "plast";
tweaks.plateaus = "plateau";
tweaks.plead = "plea";
tweaks.pled = "plea";
tweaks.plenitud = "plent";
tweaks.plenteous = "plent";
tweaks.plott = "plot";
tweaks.poem = "poet";
tweaks.policemen = "polic";
tweaks.politi = "polit";
tweaks.politic = "polit";
tweaks.pompous = "pomp";
tweaks.pope = "papal";
tweaks.populac = "popul";
tweaks.portent = "portend";
tweaks.possessor = "possess";
tweaks.pott = "pot";
tweaks.precautionar = "precaut";
tweaks.preconcept = "preconceiv";
tweaks.predator = "predat";
tweaks.predecessor = "predeceas";
tweaks.predisposit = "predispos";
tweaks.preferent = "pref";
tweaks.prejudic = "prejud";
tweaks.premonitor = "premonit";
tweaks.preparator = "prepar";
tweaks.prescript = "prescrib";
tweaks.presumpt = "presum";
tweaks.presumptu = "presum";
tweaks.preval = "prevail";
tweaks.priestcraft = "priest";
tweaks.priesthood = "priest";
tweaks.princel = "princ";
tweaks.princess = "princ";
tweaks.problemat = "problem";
tweaks.proclam = "proclaim";
tweaks.profligat = "proflig";
tweaks.profund = "profound";
tweaks.programmat = "programm";
tweaks.promissor = "promis";
tweaks.promptitud = "prompt";
tweaks.propagandist = "propaganda";
tweaks.propagat = "propag";
tweaks.prophes = "prophet";
tweaks.prophethood = "prophet";
tweaks.proportion = "proport";
tweaks.proprietor = "propriet";
tweaks.proscript = "proscrib";
tweaks.prosecutor = "prosecut";
tweaks.protector = "protect";
tweaks.protectorship = "protectorate";
tweaks.provabl = "proof";
tweaks.prove = "proof";
tweaks.proven = "proof";
tweaks.provoc = "provok";
tweaks.psalmist = "psalm";
tweaks.psychiatrist = "psychiatr";
tweaks.psychologist = "psycholog";
tweaks.pull = "pul";
tweaks.pulsat = "puls";
tweaks.punit = "punish";
tweaks.pursuant = "pursu";
tweaks.pursuit = "pursu";
tweaks.purveyor = "purvey";
tweaks.putrif = "putrid";
tweaks.quaff = "quaf";
tweaks.quarrelsom = "quarrel";
tweaks.quicken = "quick";
tweaks.quietud = "quiet";
tweaks.quintessent = "quintess";
tweaks.quotat = "quot";
tweaks.racial = "race";
tweaks.racist = "racism";
tweaks.radiat = "radiant";
tweaks.rancor = "rancour";
tweaks.raptur = "rapt";
tweaks.rational = "ration";
tweaks.rationalist = "ration";
tweaks.reaction = "react";
tweaks.readabl = "read";
tweaks.readership = "read";
tweaks.rebellion = "rebel";
tweaks.reborn = "rebirth";
tweaks.rebuilt = "rebuild";
tweaks.reclam = "reclaim";
tweaks.recognis = "recogn";
tweaks.recognit = "recogn";
tweaks.recurr = "recur";
tweaks.redden = "red";
tweaks.redefinit = "redefin";
tweaks.reduct = "reduc";
tweaks.reentr = "reent";
tweaks.reflector = "reflect";
tweaks.reformator = "reform";
tweaks.regrett = "regret";
tweaks.reincarnationist = "reincarn";
tweaks.relief = "reliev";
tweaks.religion = "relig";
tweaks.religionist = "relig";
tweaks.remaind = "remain";
tweaks.remembr = "rememb";
tweaks.renaiss = "renasc";
tweaks.rental = "rent";
tweaks.repaid = "repay";
tweaks.replica = "replic";
tweaks.represent = "repres";
tweaks.reproduct = "reproduc";
tweaks.reproof = "reprov";
tweaks.republican = "republ";
tweaks.request = "requ";
tweaks.resident = "resid";
tweaks.respons = "respond";
tweaks.restraint = "restrain";
tweaks.resumpt = "resum";
tweaks.retributor = "retribut";
tweaks.reunit = "reunion";
tweaks.revealedst = "reveal";
tweaks.reverent = "rev";
tweaks.rhythmic = "rhythm";
tweaks.ribaldr = "ribald";
tweaks.ridden = "ride";
tweaks.rider = "ride";
tweaks.riflemen = "rifl";
tweaks.rigor = "rigour";
tweaks.ripen = "ripe";
tweaks.riper = "ripe";
tweaks.risen = "rise";
tweaks.ritualist = "ritual";
tweaks.rivalr = "rival";
tweaks.robb = "rob";
tweaks.rocklik = "rock";
tweaks.rode = "ride";
tweaks.roll = "rol";
tweaks.ros = "rose";
tweaks.roseat = "rose";
tweaks.roseb = "rose";
tweaks.rosebud = "rose";
tweaks.rotten = "rot";
tweaks.royalt = "royal";
tweaks.rudimentar = "rudiment";
tweaks.ruinous = "ruin";
tweaks.rul = "rule";
tweaks.rulership = "rule";
tweaks.runn = "run";
tweaks.sacred = "sacr";
tweaks.sacrific = "sacrif";
tweaks.sadden = "sad";
tweaks.safet = "safe";
tweaks.sale = "sell";
tweaks.said = "say";
tweaks.sailor = "sail";
tweaks.saintship = "saint";
tweaks.saith = "say";
tweaks.sanctit = "sanctif";
tweaks.sang = "sing";
tweaks.sanitar = "sanit";
tweaks.saniti = "sane";
tweaks.sank = "sink";
tweaks.sat = "sit";
tweaks.satiet = "satiat";
tweaks.satisfact = "satisf";
tweaks.satisfactor = "satisf";
tweaks.sawn = "saw";
tweaks.scarcit = "scarc";
tweaks.schem = "scheme";
tweaks.schismat = "schism";
tweaks.scholarship = "scholar";
tweaks.scholast = "scholar";
tweaks.schoolchildren = "schoolchild";
tweaks.scientif = "scienc";
tweaks.scientist = "scienc";
tweaks.scof = "scoff";
tweaks.sculptor = "sculptur";
tweaks.secess = "seced";
tweaks.seclus = "seclud";
tweaks.secondar = "second";
tweaks.secretariat = "secretar";
tweaks.sectarian = "sect";
tweaks.seduct = "seduc";
tweaks.seedb = "seed";
tweaks.seedl = "seed";
tweaks.seen = "see";
tweaks.seest = "see";
tweaks.sel = "sell";
tweaks.selv = "self";
tweaks.seminarian = "seminari";
tweaks.sensibl = "sens";
tweaks.sensor = "sens";
tweaks.sensuous = "sensual";
tweaks.sent = "send";
tweaks.sequestr = "sequest";
tweaks.serfdom = "serf";
tweaks.sew = "sow";
tweaks.sewn = "sow";
tweaks.shaken = "shake";
tweaks.shalt = "shall";
tweaks.shap = "shape";
tweaks.shar = "share";
tweaks.sharpen = "sharp";
tweaks.shaven = "shave";
tweaks.shedd = "shed";
tweaks.shew = "show";
tweaks.shod = "shoe";
tweaks.shone = "shine";
tweaks.shook = "shake";
tweaks.shopkeep = "shop";
tweaks.shorn = "shear";
tweaks.shorten = "short";
tweaks.shortsighted = "shortsight";
tweaks.shot = "shoot";
tweaks.shouldst = "shoul";
tweaks.shown = "show";
tweaks.shrank = "shrink";
tweaks.shril = "shrill";
tweaks.shrunk = "shrink";
tweaks.shrunken = "shrink";
tweaks.sicken = "sick";
tweaks.sighted = "sight";
tweaks.silken = "silk";
tweaks.simp = "simpl";
tweaks.simplic = "simpl";
tweaks.singular = "singl";
tweaks.sinn = "sin";
tweaks.skil = "skill";
tweaks.skyward = "sky";
tweaks.slacken = "slack";
tweaks.slain = "slay";
tweaks.slaughterhous = "slaught";
tweaks.slaver = "slave";
tweaks.slavish = "slave";
tweaks.slept = "sleep";
tweaks.slipp = "slip";
tweaks.smel = "smell";
tweaks.smit = "smite";
tweaks.smitten = "smite";
tweaks.smote = "smite";
tweaks.snakelik = "snake";
tweaks.snuf = "snuff";
tweaks.sobriet = "sober";
tweaks.soften = "soft";
tweaks.sold = "sell";
tweaks.solidif = "solid";
tweaks.solitud = "solitar";
tweaks.soloist = "solo";
tweaks.solubl = "solv";
tweaks.solut = "solv";
tweaks.song = "sing";
tweaks.songst = "sing";
tweaks.sought = "seek";
tweaks.southern = "south";
tweaks.southernmost = "south";
tweaks.southward = "south";
tweaks.sovereignt = "sovereign";
tweaks.sown = "sow";
tweaks.spacious = "space";
tweaks.spake = "speak";
tweaks.spasmod = "spasm";
tweaks.sped = "speed";
tweaks.spel = "spell";
tweaks.spent = "spend";
tweaks.spheric = "sphere";
tweaks.spil = "spill";
tweaks.spilt = "spill";
tweaks.spinal = "spine";
tweaks.spat = "spit";
tweaks.spoke = "speak";
tweaks.spoken = "speak";
tweaks.sponsorship = "sponsor";
tweaks.sprang = "spring";
tweaks.springtid = "spring";
tweaks.springtim = "spring";
tweaks.sprung = "spring";
tweaks.staf = "staff";
tweaks.stagnant = "stagnat";
tweaks.staircas = "stair";
tweaks.stairway = "stair";
tweaks.stal = "stall";
tweaks.starr = "star";
tweaks.starvat = "starv";
tweaks.stellar = "star";
tweaks.stepmoth = "stepfath";
tweaks.stewardship = "steward";
tweaks.stiffen = "stiff";
tweaks.stigmat = "stigma";
tweaks.stil = "still";
tweaks.stirr = "stir";
tweaks.stoical = "stoic";
tweaks.ston = "stone";
tweaks.stonework = "stone";
tweaks.stood = "stand";
tweaks.stopp = "stop";
tweaks.stoppag = "stop";
tweaks.storag = "store";
tweaks.stranglehold = "strangl";
tweaks.strangul = "strangl";
tweaks.stratagem = "strateg";
tweaks.stratum = "strata";
tweaks.strengthen = "strength";
tweaks.strewn = "strew";
tweaks.striv = "strive";
tweaks.striven = "strive";
tweaks.strode = "stride";
tweaks.strol = "stroll";
tweaks.strove = "strive";
tweaks.struck = "strike";
tweaks.strung = "string";
tweaks.student = "studi";
tweaks.studious = "studi";
tweaks.stuf = "stuff";
tweaks.stung = "sting";
tweaks.stupefact = "stupef";
tweaks.subcontinent = "subcontin";
tweaks.subdivis = "subdivid";
tweaks.subscript = "subscrib";
tweaks.subterranean = "subterren";
tweaks.subtil = "subtl";
tweaks.subtlet = "subtl";
tweaks.suburban = "suburb";
tweaks.subvers = "subvert";
tweaks.successorship = "successor";
tweaks.suffragist = "suffrag";
tweaks.suitabl = "suit";
tweaks.sullen = "sulk";
tweaks.summertim = "summ";
tweaks.summons = "summon";
tweaks.sung = "sing";
tweaks.sunk = "sink";
tweaks.superbl = "superb";
tweaks.supererogator = "supererog";
tweaks.supersedur = "supersed";
tweaks.supervis = "superv";
tweaks.supervisor = "superv";
tweaks.supplementar = "supplement";
tweaks.supposit = "suppos";
tweaks.supremat = "suprem";
tweaks.surer = "sure";
tweaks.suret = "sure";
tweaks.survivor = "surviv";
tweaks.suspens = "suspend";
tweaks.suspicion = "suspic";
tweaks.susten = "sustain";
tweaks.sware = "swear";
tweaks.sweeten = "sweet";
tweaks.swel = "swell";
tweaks.swept = "sweep";
tweaks.swollen = "swell";
tweaks.swordsman = "sword";
tweaks.swore = "swear";
tweaks.sworn = "swear";
tweaks.swung = "swing";
tweaks.sympathet = "sympath";
tweaks.symposia = "symposium";
tweaks.taken = "take";
tweaks.taught = "teach";
tweaks.teenag = "teen";
tweaks.teeth = "tooth";
tweaks.tel = "tell";
tweaks.televis = "telev";
tweaks.temperament = "tempera";
tweaks.tempestu = "temp";
tweaks.temptat = "tempt";
tweaks.tension = "tens";
tweaks.testamentar = "testament";
tweaks.thanksgiv = "thank";
tweaks.theatric = "theatr";
tweaks.themat = "theme";
tweaks.theologian = "theolog";
tweaks.theorist = "theor";
tweaks.theosophist = "theosoph";
tweaks.these = "thes";
tweaks.theft = "thief";
tweaks.thiev = "thief";
tweaks.thraldom = "thrall";
tweaks.threaten = "threat";
tweaks.threw = "throw";
tweaks.thril = "thrill";
tweaks.throve = "thrive";
tweaks.thrown = "throw";
tweaks.tidal = "tide";
tweaks.tighten = "tight";
tweaks.til = "till";
tweaks.tillag = "till";
tweaks.tiller = "till";
tweaks.toilsom = "toil";
tweaks.told = "tell";
tweaks.tombston = "tomb";
tweaks.took = "take";
tweaks.topmost = "top";
tweaks.tormentor = "torment";
tweaks.torn = "tear";
tweaks.torpor = "torpid";
tweaks.tortuous = "tortur";
tweaks.traceabl = "trace";
tweaks.trad = "trade";
tweaks.tradesman = "trade";
tweaks.tradesmen = "trade";
tweaks.traditionalist = "tradit";
tweaks.traditionar = "tradit";
tweaks.traged = "tragic";
tweaks.traine = "train";
tweaks.transcendent = "transcend";
tweaks.transcript = "transcrib";
tweaks.transgressor = "transgress";
tweaks.transmigrationist = "transmigr";
tweaks.transmitt = "transmit";
tweaks.treatment = "treat";
tweaks.trellis = "trel";
tweaks.triangular = "triangl";
tweaks.tribal = "tribe";
tweaks.tribesman = "tribe";
tweaks.tributar = "tribut";
tweaks.triumphal = "triumph";
tweaks.triumphant = "triumph";
tweaks.trod = "tread";
tweaks.trodden = "tread";
tweaks.troublemak = "troubl";
tweaks.troublesom = "troubl";
tweaks.troublous = "troubl";
tweaks.trusteeship = "truste";
tweaks.tumultu = "tumult";
tweaks.tumultuar = "tumult";
tweaks.tutorship = "tuition";
tweaks.tyrann = "tyrant";
tweaks.unbeliev = "unbelief";
tweaks.unbroken = "unbreak";
tweaks.uncertaint = "uncertain";
tweaks.unchasten = "unchast";
tweaks.undefeat = "undef";
tweaks.undergon = "undergo";
tweaks.understood = "understand";
tweaks.undertaken = "undertak";
tweaks.undertook = "undertak";
tweaks.underw = "undergo";
tweaks.undon = "undo";
tweaks.undreamt = "undream";
tweaks.unforeseen = "unforese";
tweaks.unknown = "unknow";
tweaks.unloosen = "unloos";
tweaks.unmanifest = "unmanif";
tweaks.unprepared = "unprepar";
tweaks.unprovoc = "unprovok";
tweaks.unrealist = "unreal";
tweaks.unsatisfactor = "unsatisf";
tweaks.unseeabl = "unse";
tweaks.unseen = "unse";
tweaks.unshaken = "unshak";
tweaks.untruth = "untru";
tweaks.unwilling = "unwil";
tweaks.unwisdom = "unwis";
tweaks.upheld = "uphold";
tweaks.uppermost = "upp";
tweaks.utopian = "utopia";
tweaks.vacant = "vacat";
tweaks.vainglor = "vain";
tweaks.valor = "valour";
tweaks.valuabl = "valu";
tweaks.vanit = "vain";
tweaks.var = "vari";
tweaks.vengeant = "veng";
tweaks.verdur = "verdant";
tweaks.vexat = "vex";
tweaks.viabil = "viabl";
tweaks.vicarship = "vicar";
tweaks.victimhood = "victim";
tweaks.victor = "victori";
tweaks.viewpoint = "view";
tweaks.vigor = "vigour";
tweaks.vil = "vile";
tweaks.vineyard = "vine";
tweaks.viol = "violin";
tweaks.violinist = "violin";
tweaks.virtuous = "virtu";
tweaks.visitor = "visit";
tweaks.voluntar = "volunt";
tweaks.vot = "vote";
tweaks.waken = "wake";
tweaks.wal = "wall";
tweaks.warcraft = "war";
tweaks.warfar = "war";
tweaks.warlik = "war";
tweaks.warlord = "war";
tweaks.warmong = "war";
tweaks.warmth = "warm";
tweaks.warrior = "war";
tweaks.watchmen = "watchman";
tweaks.weaken = "weak";
tweaks.weakl = "weak";
tweaks.weaponr = "weapon";
tweaks.wearisom = "weari";
tweaks.wedlock = "wed";
tweaks.wept = "weep";
tweaks.western = "west";
tweaks.westernmost = "west";
tweaks.westward = "west";
tweaks.whiten = "white";
tweaks.whol = "whole";
tweaks.wholehearted = "wholeheart";
tweaks.wid = "wide";
tweaks.width = "wide";
tweaks.willpow = "will";
tweaks.wintertim = "wint";
tweaks.wintr = "wint";
tweaks.wis = "wise";
tweaks.wisdom = "wise";
tweaks.withdrawn = "withdraw";
tweaks.withdrew = "withdraw";
tweaks.withheld = "withhold";
tweaks.withstood = "withstand";
tweaks.witt = "wit";
tweaks.wive = "wife";
tweaks.woeful = "woe";
tweaks.woke = "wake";
tweaks.wolv = "wolf";
tweaks.womanhood = "woman";
tweaks.womankind = "woman";
tweaks.women = "woman";
tweaks.womenfolk = "woman";
tweaks.wondrous = "wond";
tweaks.wooden = "wood";
tweaks.woodland = "wood";
tweaks.wore = "wear";
tweaks.workabl = "work";
tweaks.workingmen = "workman";
tweaks.workmen = "workman";
tweaks.worriment = "worr";
tweaks.worsen = "wors";
tweaks.worshipp = "worship";
tweaks.worst = "wors";
tweaks.wreckag = "wreck";
tweaks.wretched = "wretch";
tweaks.writer = "write";
tweaks.written = "write";
tweaks.wrongdo = "wrong";
tweaks.wrote = "write";
tweaks.youngst = "young";
tweaks.zonal = "zone";
tweaks.un = "unerr";

const ierReg = /ier$/;
const eriReg = /eri$/;
const liReg = /li$/;
const erReg = /er$/;
const iReg = /i$/;

const nameFarsiExceptions = [
  "alas",
  "america",
  "american",
  "abandon",
  "alcohol",
  "algebra",
  "ambassador",
  "apartheid",
  "archdeacon",
  "armageddon",
  "arsenal",
  "assassin",
  "asterisk",
  "athwart",
  "australasia",
  "authoritarian",
  "awestruck",
  "barefoot",
  "basilica",
  "becloud",
  "bedevil",
  "bedrock",
  "beseech",
  "betwixt",
  "biannual",
  "birdsong",
  "blackboard",
  "bodyguard",
  "borderland",
  "boycott",
  "brainsick",
  "breakdown",
  "bulletin",
  "bulwark",
  "cablegram",
  "calendar",
  "camphor",
  "capitol",
  "caravan",
  "carcass",
  "cauldron",
  "central",
  "cesspool",
  "charcoal",
  "churchman",
  "cochair",
  "coequal",
  "colonel",
  "corridor",
  "cosmopolitan",
  "courtyard",
  "crescendo",
  "crimson",
  "crystal",
  "custodian",
  "despair",
  "dilemma",
  "doorstep",
  "draconian",
  "drumbeat",
  "drunkard",
  "dustbin",
  "ecosystem",
  "emblazon",
  "emerald",
  "emperor",
  "empyrean",
  "engross",
  "erelong",
  "farmland",
  "fatherland",
  "fellowman",
  "firewood",
  "flaccid",
  "footstool",
  "gainsay",
  "gentleman",
  "ghastly",
  "ghost",
  "ghoulishly",
  "gilded",
  "gill",
  "governor",
  "graveyard",
  "guardian",
  "haggard",
  "halcyon",
  "hamstrung",
  "handkerchief",
  "hangman",
  "haphazard",
  "headlong",
  "headstrong",
  "herculean",
  "hexagon",
  "hitherto",
  "homeland",
  "honeydew",
  "hostess",
  "humanitarian",
  "imperil",
  "inertia",
  "insignia",
  "insofar",
  "invalid",
  "journal",
  "kaleidoscope",
  "kerchief",
  "languor",
  "laughingstock",
  "leitmotif",
  "leopard",
  "leviathan",
  "liaison",
  "livestock",
  "lodestar",
  "longterm",
  "lukewarm",
  "magician",
  "malaria",
  "mandolin",
  "marijuana",
  "memento",
  "messiah",
  "misbelief",
  "mischief",
  "misdoubt",
  "moribund",
  "mosquito",
  "motherland",
  "musician",
  "mustard",
  "naphtha",
  "newtonian",
  "niche",
  "nicknames",
  "nobleman",
  "nonsectarian",
  "nucleus",
  "paintbrush",
  "panorama",
  "paradigm",
  "paragon",
  "parallel",
  "partridge",
  "passport",
  "peacock",
  "peninsula",
  "personnel",
  "pharaoh",
  "ploughman",
  "polygon",
  "pontiff",
  "portray",
  "possessor",
  "purport",
  "pyramid",
  "rapporteur",
  "rebuilt",
  "recross",
  "refocus",
  "registrar",
  "remould",
  "replica",
  "republican",
  "salient",
  "sandbank",
  "sarcophagus",
  "satchel",
  "scabbard",
  "scandal",
  "scapegoat",
  "secretariat",
  "sectarian",
  "seminar",
  "sensual",
  "shallow",
  "sheepskin",
  "shipwreck",
  "skeleton",
  "snapshot",
  "souvenir",
  "splendid",
  "squalid",
  "stalwart",
  "stamina",
  "standard",
  "staunch",
  "stepson",
  "stimulus",
  "stygian",
  "sulphur",
  "sunbeam",
  "sundown",
  "supervisor",
  "survivor",
  "swastika",
  "sweetmeat",
  "symposia",
  "telegram",
  "terminus",
  "textual",
  "thousand",
  "tobacco",
  "torpedo",
  "totalitarian",
  "transgressor",
  "travail",
  "treason",
  "turmoil",
  "twoweek",
  "typhoid",
  "umbrella",
  "utilitarian",
  "utopian",
  "vendetta",
  "veteran",
  "vineyard",
  "vitriol",
  "wasteland",
  "watchman",
  "watermark",
  "wedlock",
  "wonderstruck",
  "workman",
  "yardstick",
  "acclaim",
  "applaud",
  "artisan",
  "assault",
  "bastinado",
  "bejewel",
  "bespeak",
  "boulevard",
  "buffalo",
  "candlestick",
  "chairperson",
  "channel",
  "confirm",
  "conform",
  "correspond",
  "curtail",
  "destroy",
  "difficult",
  "diplomat",
  "drawback",
  "earmark",
  "egalitarian",
  "embroil",
  "factual",
  "fingernail",
  "formula",
  "garrison",
  "general",
  "gradual",
  "hallmark",
  "handicap",
  "hegelian",
  "hinterland",
  "historian",
  "imprison",
  "landmark",
  "marshal",
  "mathematician",
  "milieus",
  "millennia",
  "misunderstand",
  "monarch",
  "neutral",
  "nostril",
  "obelisk",
  "octagon",
  "odyssey",
  "offshoot",
  "oppressor",
  "orchard",
  "panacea",
  "partisan",
  "patriot",
  "pentagon",
  "perform",
  "perplex",
  "perturb",
  "pervert",
  "physician",
  "pilgrim",
  "plebeian",
  "plethora",
  "politician",
  "purveyor",
  "railroad",
  "reclaim",
  "refresh",
  "rethink",
  "retreat",
  "safeguard",
  "setback",
  "shortcut",
  "songbird",
  "spokesperson",
  "sponsor",
  "stretch",
  "support",
  "swallow",
  "technician",
  "tranquil",
  "transform",
  "transport",
  "trespass",
  "vanguard",
  "virtual",
  "barrack",
  "battlefield",
  "besmirch",
  "cherubim",
  "christian",
  "episcopalian",
  "euphoria",
  "european",
  "evangel",
  "garland",
  "meridian",
  "oceania",
  "persian",
  "ransack",
  "reprimand",
  "ruffian",
  "saddlebag",
  "samovar",
  "sentinel",
  "shepherd",
  "abbreviated",
  "dustheap",
  "itself",
];
const nameFarsiInclude = [
  "aba",
  "abidin",
  "abjad",
  "acca",
  "accra",
  "achor",
  "addis",
  "adda",
  "adelaid",
  "adja",
  "adolf",
  "adrianopl",
  "aeg",
  "aeneid",
  "afaq",
  "aghsan",
  "agn",
  "agnew",
  "agra",
  "albert",
  "aleppo",
  "alfr",
  "alg",
  "alif",
  "allen",
  "allenb",
  "allgemein",
  "amanat",
  "ambato",
  "ame",
  "amelia",
  "amerindian",
  "ammu",
  "amo",
  "an",
  "ana",
  "anab",
  "anchorag",
  "anchorit",
  "andes",
  "angola",
  "anisa",
  "ann",
  "anna",
  "annan",
  "annelies",
  "ansar",
  "anticost",
  "antill",
  "anton",
  "anvar",
  "apia",
  "apotr",
  "appa",
  "appony",
  "arbil",
  "ard",
  "ardekan",
  "arif",
  "arius",
  "arslan",
  "askar",
  "assr",
  "assyrian",
  "asuncion",
  "athim",
  "athen",
  "atho",
  "attar",
  "attila",
  "austrian",
  "austro",
  "avalim",
  "avarih",
  "avesta",
  "avih",
  "avoirdupo",
  "ashab",
  "ashura",
  "ba",
  "babel",
  "babylonian",
  "baffin",
  "bailey",
  "bain",
  "balcic",
  "balear",
  "baluch",
  "bamako",
  "banan",
  "bandar",
  "barbado",
  "barney",
  "baroda",
  "bastam",
  "bates",
  "batha",
  "batum",
  "bazar",
  "bbc",
  "beatric",
  "beech",
  "begum",
  "beha",
  "beliz",
  "bellicos",
  "ben",
  "benar",
  "bene",
  "benito",
  "besant",
  "bey",
  "bibb",
  "bidor",
  "birka",
  "bissau",
  "blair",
  "bleck",
  "boll",
  "boman",
  "bombay",
  "bool",
  "boor",
  "borneo",
  "borrah",
  "boyl",
  "breakwel",
  "brill",
  "brisban",
  "brussel",
  "bueno",
  "bun",
  "buren",
  "burhan",
  "bushru",
  "buyuk",
  "buzurg",
  "ca",
  "campbel",
  "canoa",
  "canterbur",
  "cape",
  "capr",
  "carina",
  "cathay",
  "catherin",
  "catull",
  "cedric",
  "celeb",
  "celtic",
  "cepha",
  "ceram",
  "cesar",
  "ceylon",
  "ch",
  "chago",
  "cheroke",
  "chiang",
  "chichen",
  "chigan",
  "chilaw",
  "chorrillo",
  "chosro",
  "christal",
  "chupan",
  "churchil",
  "ciudad",
  "clara",
  "cluj",
  "cobb",
  "cod",
  "col",
  "cole",
  "collin",
  "colo",
  "comoro",
  "comt",
  "congrev",
  "connecticut",
  "controcen",
  "cor",
  "costa",
  "cote",
  "cowan",
  "craven",
  "crete",
  "cropp",
  "cruz",
  "culv",
  "curzon",
  "cuso",
  "cyprus",
  "cyrus",
  "d",
  "dacr",
  "dais",
  "damm",
  "dasht",
  "daylamit",
  "dayyan",
  "dea",
  "del",
  "delawar",
  "delh",
  "denv",
  "desaparecido",
  "detroit",
  "diego",
  "dinar",
  "divan",
  "divoir",
  "donald",
  "dos",
  "dowag",
  "doyen",
  "drap",
  "duab",
  "dublin",
  "dugh",
  "duha",
  "dunbar",
  "dunn",
  "dunya",
  "durham",
  "dushanb",
  "dutch",
  "easton",
  "ecosoc",
  "eden",
  "edith",
  "eduard",
  "een",
  "effend",
  "el",
  "elena",
  "eloy",
  "emanu",
  "emmanu",
  "emogen",
  "empedocl",
  "enayat",
  "enoch",
  "erl",
  "ernest",
  "esau",
  "estal",
  "estell",
  "esth",
  "estlin",
  "etah",
  "ethel",
  "ethiopian",
  "euphrat",
  "evin",
  "ezra",
  "faiz",
  "fann",
  "faro",
  "farrash",
  "farsakh",
  "fattah",
  "fatva",
  "feisal",
  "fiedl",
  "findik",
  "firman",
  "flemish",
  "florent",
  "fofana",
  "foo",
  "forel",
  "frankfurt",
  "franz",
  "fred",
  "freir",
  "fuad",
  "fuego",
  "funafut",
  "gail",
  "galapago",
  "galen",
  "galile",
  "gallipo",
  "galu",
  "gambia",
  "garcia",
  "gardn",
  "gayl",
  "gedd",
  "gendarm",
  "geneva",
  "gensch",
  "georg",
  "giach",
  "glenconn",
  "gog",
  "goldzih",
  "golpaygan",
  "goodal",
  "goumoen",
  "graham",
  "granvill",
  "gregor",
  "greuz",
  "grund",
  "guiana",
  "gul",
  "guney",
  "guthr",
  "guyana",
  "h",
  "habib",
  "had",
  "hafiz",
  "hagar",
  "hagga",
  "hagu",
  "halab",
  "hammerf",
  "hampshir",
  "hamzih",
  "han",
  "haney",
  "harris",
  "harvey",
  "havana",
  "hazira",
  "hegira",
  "helois",
  "herm",
  "herod",
  "herr",
  "hidayat",
  "hideya",
  "hil",
  "hillih",
  "hilm",
  "himalaya",
  "hin",
  "hitl",
  "hivaid",
  "hoagg",
  "hobb",
  "hoehnk",
  "holley",
  "holsappl",
  "hom",
  "hoover",
  "hopp",
  "horne",
  "hulagu",
  "hur",
  "hyde",
  "iceland",
  "idaho",
  "idha",
  "idr",
  "ignaz",
  "ih",
  "illino",
  "inayat",
  "inca",
  "ind",
  "indira",
  "indo",
  "indor",
  "inouy",
  "ioa",
  "iowa",
  "iroquo",
  "isobel",
  "jack",
  "jackboot",
  "jacob",
  "jean",
  "jen",
  "jess",
  "jessup",
  "jethro",
  "jibt",
  "jim",
  "kee",
  "kerman",
  "kiev",
  "kinney",
  "laccad",
  "lae",
  "lago",
  "laiciz",
  "lakhmit",
  "lalliant",
  "lam",
  "langenhain",
  "lanka",
  "lapp",
  "larijan",
  "las",
  "lass",
  "lathene",
  "latim",
  "laura",
  "lawrent",
  "lee",
  "leeward",
  "leland",
  "lengua",
  "leo",
  "leon",
  "leong",
  "les",
  "lesch",
  "levant",
  "lew",
  "libya",
  "lidia",
  "liva",
  "lofoten",
  "loggia",
  "lome",
  "london",
  "los",
  "luca",
  "lucia",
  "luke",
  "lumpur",
  "lunt",
  "lur",
  "lusaka",
  "ma",
  "madel",
  "madhya",
  "magallan",
  "magdalen",
  "maidih",
  "maitrey",
  "maj",
  "mal",
  "malden",
  "maldiv",
  "manat",
  "manekj",
  "margaret",
  "marguerit",
  "marina",
  "marino",
  "marseill",
  "marshall",
  "marshalles",
  "martha",
  "marvan",
  "mason",
  "masqat",
  "massachusett",
  "masta",
  "mataco",
  "mathan",
  "mathew",
  "matin",
  "matt",
  "maud",
  "maus",
  "maxwel",
  "mayberr",
  "mecca",
  "medak",
  "medina",
  "melvill",
  "mentawa",
  "merida",
  "messr",
  "metropol",
  "metz",
  "miam",
  "millerit",
  "mim",
  "minneapo",
  "minsk",
  "minu",
  "mir",
  "miraj",
  "mississipp",
  "missour",
  "mithraic",
  "mithraism",
  "modl",
  "molucca",
  "monaco",
  "mond",
  "moneeb",
  "montt",
  "moor",
  "moresb",
  "mormon",
  "morten",
  "moscow",
  "mosul",
  "motua",
  "mulk",
  "mumtaz",
  "munib",
  "my",
  "mysor",
  "nansen",
  "napl",
  "napoleon",
  "nathan",
  "nauru",
  "navvab",
  "nepal",
  "nestorian",
  "netherland",
  "nevada",
  "newtonian",
  "niederreit",
  "nig",
  "niham",
  "nile",
  "nimrod",
  "noah",
  "nobel",
  "nonbaha",
  "nordic",
  "norman",
  "nort",
  "norway",
  "nove",
  "numan",
  "nundu",
  "nur",
  "oakland",
  "ob",
  "oblast",
  "oelia",
  "ohio",
  "okinawan",
  "olga",
  "olinga",
  "ong",
  "oneida",
  "oran",
  "oregon",
  "oriya",
  "orkney",
  "oro",
  "ose",
  "oslo",
  "owen",
  "oxford",
  "oxus",
  "pacif",
  "pago",
  "palau",
  "palestin",
  "palo",
  "panama",
  "papua",
  "para",
  "paraclet",
  "paran",
  "parc",
  "pari",
  "parisian",
  "partridg",
  "passmor",
  "patna",
  "pavon",
  "payam",
  "payman",
  "pear",
  "pedro",
  "peke",
  "penh",
  "peoria",
  "pera",
  "pere",
  "perin",
  "perron",
  "perth",
  "peru",
  "peter",
  "philon",
  "phoeb",
  "phoenician",
  "piedmontes",
  "pietist",
  "pilat",
  "pitr",
  "pleiad",
  "plin",
  "pointapitr",
  "poland",
  "polin",
  "pollux",
  "poona",
  "posen",
  "presbyterian",
  "pringl",
  "providencia",
  "puebla",
  "puerto",
  "puritan",
  "pursish",
  "pythagora",
  "quebec",
  "quetta",
  "quilpu",
  "quito",
  "ra",
  "racin",
  "raf",
  "ramin",
  "randal",
  "rane",
  "rav",
  "rayen",
  "recif",
  "regina",
  "remey",
  "renan",
  "rhine",
  "rio",
  "roan",
  "robert",
  "rochest",
  "rog",
  "rolf",
  "rom",
  "roma",
  "rome",
  "ronald",
  "roo",
  "rosa",
  "rouhan",
  "roy",
  "rudak",
  "rukn",
  "rupe",
  "rushd",
  "rustam",
  "ruth",
  "sadiq",
  "sadl",
  "saigon",
  "salvan",
  "salvar",
  "samovar",
  "sampa",
  "sapel",
  "sar",
  "saud",
  "savak",
  "saxon",
  "scala",
  "scandinavian",
  "schecht",
  "schopfloch",
  "sedan",
  "seir",
  "sen",
  "seoul",
  "serampor",
  "serpentin",
  "seth",
  "sevill",
  "sewel",
  "shaban",
  "shadid",
  "shaf",
  "shakespear",
  "shams",
  "sharpl",
  "shatir",
  "shavird",
  "sheba",
  "sheikh",
  "shem",
  "shens",
  "sherbrook",
  "sherril",
  "shirin",
  "shoa",
  "shoeb",
  "shogh",
  "shukuh",
  "siam",
  "sierra",
  "sighih",
  "siloam",
  "simeon",
  "simin",
  "simnan",
  "simon",
  "sistan",
  "siva",
  "smith",
  "smyrna",
  "socrat",
  "soe",
  "sohrab",
  "solano",
  "solomon",
  "somaj",
  "sophia",
  "sorabje",
  "soviet",
  "spain",
  "sparta",
  "spenc",
  "spragu",
  "sr",
  "ssrs",
  "stalin",
  "stephen",
  "steven",
  "storr",
  "struven",
  "sudur",
  "suef",
  "suf",
  "susan",
  "sweden",
  "swiss",
  "sydney",
  "syme",
  "ta",
  "taam",
  "tabor",
  "taereh",
  "taipe",
  "taiwan",
  "taleb",
  "talib",
  "talmud",
  "tamerlan",
  "tamil",
  "tanakabun",
  "tar",
  "techest",
  "tehna",
  "telegu",
  "tennesse",
  "teresa",
  "texa",
  "than",
  "thelma",
  "thonon",
  "thoresen",
  "thule",
  "thyolo",
  "tierra",
  "tigr",
  "tina",
  "titus",
  "tobago",
  "tobey",
  "togo",
  "tokyo",
  "toledo",
  "tom",
  "toma",
  "tonga",
  "torah",
  "towa",
  "townshend",
  "toynbe",
  "tran",
  "transke",
  "travancor",
  "trefah",
  "tripo",
  "troy",
  "trubn",
  "tubingen",
  "tullab",
  "tun",
  "turbat",
  "tyre",
  "ubay",
  "unep",
  "unesco",
  "ungava",
  "unicef",
  "unifem",
  "uno",
  "unwin",
  "urbana",
  "usa",
  "ussr",
  "ustad",
  "utah",
  "va",
  "vaino",
  "val",
  "valentin",
  "valids",
  "valiy",
  "varqa",
  "vera",
  "verd",
  "vermont",
  "verona",
  "versaill",
  "vicent",
  "vike",
  "vila",
  "vina",
  "vincent",
  "vis",
  "von",
  "vuaz",
  "vujdan",
  "wahb",
  "wainwright",
  "wale",
  "warren",
  "warsaw",
  "watl",
  "watson",
  "weimar",
  "westminst",
  "whyte",
  "wight",
  "wilberforc",
  "william",
  "wilson",
  "winckl",
  "windust",
  "witzel",
  "woodrow",
  "worcest",
  "york",
];
const nameFarsiStart =
  /^(the|wh|with|some|ov|out|hear|dis|def|un|triu|thu|surp|suc|res|rea|pro|pre|pla|phe|life|int|husb|gram|grand|ex|en[^g]|dia|coun|con[^f]|com|aft|chanc|day|fore|hor|inc|inf|main|met|mid|sea|sub|desp)/;
const nameFarsiEnd =
  /(ship|hood|less|ress|st|en|way|th|aid|ft|et|sm|tus|ix|ox|ct|ic|ead|ney|um|op|lf|rn|ous|our|nt|ear|oar|ght|old|ind|ward|pt|rew|iew|er|ound|sman|woman|rman|hand|tood|lk|ork|eon|eof|oof|word|lord|uch|ach|lar|ook|rior|day|om|out|tor|ild|era|up|ion|aph|ish|end|it|human|ugh|ain|rgo|iar|gn|row|del|rel|ial|ess)$/;

const nameFarsiReg =
  /(^(aa|aba[^nst]|abb|abdu([^c]|$)|abe[^ry]|abha|abi([^dl]|$)|abra|abu([^ns]|$)|abv|adh[^e]|ad[il]|adl|af[cgnsu]|agu|ah[dmrs]|ain|aju|ak[bhkr]|ala([^bcr]|$)|alb[au]|ale[ux]|ali([ajmqy])|alma|alu|ama([^nsz]|$)|amh|ami[nr]|amm[^u]|amr|amu([^s]|$)|an[dhku]|ane[^cw]|angu[^i]|aq[^u]|ara[^b]|arba|ard[ai]|ar[nuy]|arge|arka|arme|art[ahu]|as[abdgmnr]|ashik|ashr|asi[my]|ata|avam|avv|aws|ay[admny]|az|baa|bab([^ey]|$)|bad[aikr]|bag[dhu]|bah|baj|bak[hru]|bala([^n]|$)|bal[bfkty]|ban[gj]|baq|bar[af]|barb[ou]|bas[hqr]|basi[rt]|bay[^o]|be[bi]|belg|ben[gs]|ber[ln]|bh|bi[hjk]|blum|bog[do]|bolsh|bona[ip]|bop|bos[cnt]|bra[dhz]|brit|brun[eo]|bry|bu[jk]|buch|buda|bulg|bur[muy]|bvp|bwn|byz|cai|calif|calv|cam[bo]|cana[^lr]|car[lm]|carne|carol|cauc|ca[xy]|cha[dh]|chal(d|$)|charl|che[lnsy]|chil[eo]|chin[ae]|chi[rt]|christo|cid|cinc|cisk|congo|constantin|copen|copt|cor[bi]|coz|cte|cuba|cz|da[hjk]|dag[am]|dal[al]|dan[ai]|dar([aimvw]|$)|dav|daw[lsu]|deut|dey|dh|di[hyz]|dipc|dirh|d[jn]|dolg|doro|dru[sz]|dukh|ed[now]|efi|egy|eht|ei[dns]|ekp|elb|eli[ajz]|ell|emil|epy|eri|es[hkw]|esper|essl|esthl|ett|eus|fad[il]|fakh|fara[^w]|far[hiuvz]|farma|fatim|fay|ferr[ae]|fez|fid[ar]|fi[jz]|finn|fir[adu]|foz|franc|french|fuq|furu|ga[bw]|gan[dj]|germa|get[hs]|gey|gh|gi[lot]|goh|gree[ck]|gua[dmy]|guin|guj|gul[^f]|gu[rw]|gwa|gya|haa|had[^s]|hai[fnt]|ha[jk]|hama|hamid|han[intz]|haq|hara[kmnt]|har[il]|has[ah]|hatz|haw[ad]|hay|he[bz]|hel[es]|hen[ru]|hi[jk]|hippo|hir[ai]|his[ahp]|ho[hk]|hon([adg]|$)|hoop|hor([ae]|$)|hos[aes]|how[ad]|hrh|hu[djpqvx]|hur[mu]|hungar|husa|iaq|ib|ich|ihd|iel|ifn|ift|ijt|il[^l]|ima[^g]|im[orst]|india|iqa|ira[jnq]|ir[bis]|is[^los]|ith|itim|it[astz]|iv[ade]|i[yz]|ja[bdfhklmpz]|jan([^u]|$)|jav[^e]|je[ehr]|jha|jin|jo[aehnrsw]|ju[ak]|jud([ae]|$)|jul[^y]|jumi|juna|juv|k[ahoruvy]|ke[^epry].|ki[aigry]|kili|kina|kish|kit[acht]|la[ho]|lat[av]|lawh|lenin|ler|lim[aj]|lis[bi]|lj|ll|lou([hi]|$)|lu[abiq]|lud[ow]|lut[^e]|lyc|ma[ab]|mac([ak]|$)|madr|mada[dn]|ma[hoqz]|mago|maj[^eo]|mak[ak]|mala[bcgwy]|mali[hk]|mal[ku]|malt[ae]|mama|manch|mani[kl]|mans[hou]|mar[adjqwxy]|mari([ao]|$)|martin|mas[^ckoqst]|maw.|may[ad]|mba|mc|me[hxy]|mic[ah]|mid[hi]|mih|mil[anw]|mirz|mith[aq]|miy|mna|mo[fghz]|mu[abefhijkqv]|mud[ai]|mul[bclu]|mun[atz]|munir|mur[^dkm]|mus[ahsu]|musta[^r]|muta[^t]|mutis|mutta|mwi|mz|na[bdghjqwz]|nai[^lv]|nak[hu]|nama|nami[bq]|nara|nas[ir]|nay.|ne[hl]|ni[ackrstuyz]|nudb|nu[kqs]|nya|ol[oy]|oma|osb|ot[at]|ou[al]|pa[hko]|parv|pah[ah]|pan[cjk]|pars|pash|paul|payr|paz|pem|pey|phili|phn|pi[adru]|plato|poh|port[suv]|pto|pui|pun[jot]|q[ai]|qu[cdlmr]|ra[bhjkqu]|raf[^f]|ram[alo]|ras[^h]|rash[hit]|raw.|re[xy]|rh[ao]|ri[akz]|ric[ao]|rid[av]|ris[as]|rls|roba|rod[dr]|roman([^t]|$)|ru[hqyz]|rum[^bo]|russ|r[wy]|sa[ah]|sab[^l]|sad[hru]|saf[afw]|said.|sak[^e]|sala[adhmstv]|sal[ijlms]|sam([^ep]|$)|san([ajt]|$)|sanka|sao|sar[^c]|sas[^h]|say[fy]|saz|scot|seat.|sen[eo]|serb|se[yz]|sha[hnwy]|shar[ahio]|shi[abdi]|shim[^m]|shira|shu[hy]|sid[^e]|si[jky]|sin[ad]|sing[ah]|sir[aju]|slav([^ei]|$)|spanish|spit[sz]|subh|sudan|suf[iy]|su[hk]|sul[^klpt]|sunn|su[qtvz]|sur[aci]|syr|tab[ar]|tabli|ta[fghjqyz]|tak[uy]|tan[nu]|tara|tas[hlm]|taw[fh]|tbi|te[gt]|tem[iu]|tha([bcm]|$)|thom|ti[bfh]|tir[ai]|ts|tuma|tu[qsv]|tur[aciks]|u[dk]|ug[ao]|ula|um[amt]|up[aeo]|ur[dsuv]|uth|uz|va[fhkmtvz]|van[cn]|varaq|vas[hu]|vel[lm]|vien|viz|vla|volt|vu[ty]|wa[dq]|wem|wilm|wlg|wur|wyo|ya[^r]|yar([^d]|$)|ye[mr]|yi[^e]|yos|yu|z[^eo]|ze[cin]|zo[gr])|(anih|llah))/;

const isException = (word: string, stem: string) =>
  ((word === stem &&
    stem.length > 6 &&
    !nameFarsiStart.test(stem) &&
    !nameFarsiEnd.test(stem)) ||
    nameFarsiReg.test(stem) ||
    nameFarsiInclude.includes(stem)) &&
  !nameFarsiExceptions.includes(word);

const ierEndings = [
  "denier",
  "earlier",
  "frontier",
  "heavier",
  "pitier",
  "readier",
  "soldier",
  "tinier",
];

const eriEndings = [
  "adulteri",
  "archeri",
  "arteri",
  "boweri",
  "deleteri",
  "fineri",
  "forgeri",
  "masteri",
  "materi",
  "nurseri",
  "queri",
  "reveri",
  "slaveri",
];

const liEndings = ["beli", "earli", "impli", "pli", "realli", "sli", "tripli"];

const erEndings = [
  "adder",
  "adulter",
  "barber",
  "baser",
  "batter",
  "beer",
  "bower",
  "buckler",
  "butter",
  "career",
  "cater",
  "charter",
  "collater",
  "corner",
  "counter",
  "ember",
  "enter",
  "ever",
  "feder",
  "finer",
  "flower",
  "folder",
  "former",
  "further",
  "halter",
  "hater",
  "hoover",
  "hunger",
  "imper",
  "inner",
  "inoper",
  "layer",
  "liter",
  "liver",
  "master",
  "matter",
  "mother",
  "muster",
  "number",
  "outer",
  "per",
  "peter",
  "pitcher",
  "ponder",
  "porter",
  "poster",
  "proper",
  "render",
  "rider",
  "riper",
  "shower",
  "sincer",
  "slipper",
  "sober",
  "sticker",
  "stranger",
  "supper",
  "surer",
  "taper",
  "teller",
  "temper",
  "templer",
  "tender",
  "tiller",
  "user",
  "ver",
  "wager",
  "writer",
];

const iEndings = [
  "allegi",
  "anti",
  "armi",
  "beli",
  "benefici",
  "booti",
  "busi",
  "commodi",
  "contenti",
  "conveni",
  "crafti",
  "credenti",
  "defi",
  "delici",
  "deni",
  "directori",
  "earli",
  "elegi",
  "fi",
  "faceti",
  "factori",
  "forti",
  "fronti",
  "furi",
  "headi",
  "heavi",
  "illustri",
  "imparti",
  "insidi",
  "ironi",
  "laci",
  "ladi",
  "levi",
  "licenti",
  "mani",
  "mari",
  "pacifi",
  "pari",
  "parti",
  "piti",
  "polici",
  "politi",
  "potenti",
  "presenti",
  "readi",
  "recipi",
  "registri",
  "rubi",
  "saniti",
  "seminari",
  "soldi",
  "steadi",
  "studi",
  "tendenti",
  "tini",
  "treati",
  "tricki",
  "undi",
  "victori",
  "wari",
  "wavi",
  "weari",
];

// Exceptions Set II.
// Note, these are to be treated as full words.
var rgxException2 =
  /^(inning|outing|canning|herring|proceed|exceed|succeed|earring)$/;

// ## Private functions

// ### prelude
/**
 * Performs initial pre-processing by transforming the input string `s` as
 * per the replacements.
 *
 * @param {String} s Input string
 * @return {String} Processed string
 * @private
 */
var prelude = function (s: string) {
  return (
    s
      // Handle `y`'s.
      .replace(/^y/, "3")
      .replace(/([aeiou])y/, "$13")
      // Handle apostrophe.
      .replace(/\’s$|\'s$/, "")
      .replace(/s\’$|s\'$/, "")
      .replace(/[\’\']$/, "")
  );
}; // prelude()

// ### isShort
/**
 * @param {String} s Input string
 * @return {Boolean} `true` if `s` is a short syllable, `false` otherwise
 * @private
 */
var isShort = function (s: string) {
  // (a) a vowel followed by a non-vowel other than w, x or 3 and
  // preceded by a non-vowel, **or** (b) a vowel at the beginning of the word
  // followed by a non-vowel.
  return (
    /[^aeiouy][aeiouy][^aeiouywx3]$/.test(s) ||
    /^[aeiouy][^aeiouy]{0,1}$/.test(s) // Removed this new changed??
  );
}; // isShort()

// ### markRegions
/**
 * @param {String} s Input string
 * @return {Object} the `R1` and `R2` regions as an object from the input string `s`.
 * @private
 */
var markRegions = function (s: string) {
  // Matches of `R1` and `R2`.
  var m1, m2;
  // To detect regions i.e. `R1` and `R2`.
  var rgxRegions = /[aeiouy]+([^aeiouy]{1}.+)/;
  m1 = rgxRegions.exec(s);
  if (!m1) return { r1: "", r2: "" };
  m1 = m1[1]!.slice(1);
  // Handle exceptions here to prevent over stemming.
  m1 = /^(gener|commun|arsen)/.test(s)
    ? s.replace(/^(gener|commun|arsen)(.*)/, "$2")
    : m1;
  m2 = rgxRegions.exec(m1);
  if (!m2) return { r1: m1, r2: "" };
  m2 = m2[1]!.slice(1);
  return { r1: m1, r2: m2 };
}; // markRegions()

// ### step1a
/**
 * @param {String} s Input string
 * @return {String} Processed string
 * @private
 */
var step1a = function (s: string) {
  var wordPart;
  if (rgxSFXsses.test(s)) return s.replace(rgxSFXsses, "$1ss");
  if (rgxSFXiedORies2.test(s)) return s.replace(rgxSFXiedORies2, "$1i");
  if (rgxSFXiedORies1.test(s)) return s.replace(rgxSFXiedORies1, "$1ie");
  if (rgxSFXusORss.test(s)) return s;
  wordPart = s.replace(rgxSFXs, "$1");
  if (/[aeiuouy](.+)$/.test(wordPart)) return s.replace(rgxSFXs, "$1");
  return s;
}; // step1a()

// ### step1b
/**
 * @param {String} s Input string
 * @return {String} Processed string
 * @private
 */
var step1b = function (s: string) {
  var rgn = markRegions(s),
    sd;
  // Search for the longest among the `eedly|eed` suffixes.
  if (rgxSFXeedlyOReed.test(s))
    // Replace by ee if in R1.
    return rgxSFXeedlyOReed.test(rgn.r1)
      ? s.replace(rgxSFXeedlyOReed, "$1ee")
      : s;
  // Delete `ed|edly|ingly|ing` if the preceding word part contains a vowel.
  if (rgxSFXedORedlyORinglyORing.test(s)) {
    sd = s.replace(rgxSFXedORedlyORinglyORing, "$1");
    rgn = markRegions(sd);
    // And after deletion, return either
    return rgxSFXatORblORis.test(sd)
      ? sd + "e"
      : // or
        rgxDouble.test(sd)
        ? sd.replace(/.$/, "")
        : // or
          isShort(sd) && rgn.r1 === ""
          ? sd + "e"
          : // or
            sd;
  }
  return s;
}; // step1b()

// ### step1c
/**
 * @param {String} s Input string
 * @return {String} Processed string
 * @private
 */
var step1c = function (s: string) {
  return s.replace(rgxSFXyOR3, "$1i");
}; // step1c()

// ### step2
/**
 * @param {String} s Input string
 * @return {String} Processed string
 * @private
 */
var step2 = function (s: string) {
  var i,
    imax,
    rgn = markRegions(s),
    us; // updated s.
  var match: any = s.match(rgxSFXstep2);
  match = match === null ? "$$$$$" : match[1];
  if (rgn.r1.indexOf(match) !== -1) {
    for (i = 0, imax = rgxSFXstep2WithReplacements.length; i < imax; i += 1) {
      us = s.replace(
        rgxSFXstep2WithReplacements[i]!.rgx,
        rgxSFXstep2WithReplacements[i]!.replacement
      );
      if (s !== us) return us;
    }
  }
  return s;
}; // step2()

// ### step3
/**
 * @param {String} s Input string
 * @return {String} Processed string
 * @private
 */
var step3 = function (s: string) {
  var i,
    imax,
    rgn = markRegions(s),
    us; // updated s.
  var match: any = s.match(rgxSFXstep3);
  match = match === null ? "$$$$$" : match[1];

  if (rgn.r1.indexOf(match) !== -1) {
    for (i = 0, imax = rgxSFXstep3WithReplacements.length; i < imax; i += 1) {
      us = s.replace(
        rgxSFXstep3WithReplacements[i]!.rgx,
        rgxSFXstep3WithReplacements[i]!.replacement
      );
      if (s !== us) return us;
    }
    if (/ative/.test(rgn.r2)) return s.replace(/ative$/, "");
  }
  return s;
}; // step3()

// ### step4
/**
 * @param {String} s Input string
 * @return {String} Processed string
 * @private
 */
var step4 = function (s: string) {
  var rgn = markRegions(s);
  var match: any = s.match(rgxSFXstep4Full);
  match = match === null ? "$$$$$" : match[1];
  if (rgxSFXstep4Full.test(s) && rgn.r2.indexOf(match) !== -1) {
    return rgxSFXstep4.test(s)
      ? s.replace(rgxSFXstep4, "")
      : rgxSFXstep4ion.test(s)
        ? s.replace(rgxSFXstep4ion, "$1$2")
        : s;
  }
  return s;
}; // step4()

// ### step5
/**
 * @param {String} s Input string
 * @return {String} Processed string
 * @private
 */
var step5 = function (s: string) {
  var preceding, rgn;
  // Search for the `e` suffixes.
  rgn = markRegions(s);
  if (/e$/i.test(s)) {
    preceding = s.replace(/e$/, "");
    return (
      // Found: delete if in R2, or in R1 and not preceded by a short syllable
      /e/.test(rgn.r2) || (/e/.test(rgn.r1) && !isShort(preceding))
        ? preceding
        : s
    );
  }
  // Search for the `l` suffixes.
  if (/l$/.test(s)) {
    rgn = markRegions(s);
    // Found: delete if in R2
    return rgn.r2 && /l$/.test(rgn.r2) ? s.replace(/ll$/, "l") : s;
  }
  // If nothing happens, must return the string!
  return s;
}; // step5()

// ## Public functions
// ### stem
/**
 *
 * Stems an inflected `word` using Porter2 stemming algorithm.
 *
 * @param {string} word — word to be stemmed.
 * @return {string} — the stemmed word.
 *
 * @example
 * stem( 'consisting' );
 * // -> consist
 */
const stem = function (w: string) {
  const word = w
    .toLowerCase()
    .replace(/[’']s\b/g, "")
    .replace(/[’']/g, "");
  var str = word.replace(/‑/g, "");
  if (str.length < 3) return str;
  if (exceptions1[str]) return exceptions1[str];
  if (!word.includes("‑")) {
    if (word.startsWith("polite")) return "polite";
    if (word.startsWith("arrogat")) return "arrogat";
    if (word.startsWith("authoris")) return "authoris";
    if (word.startsWith("authorit")) return "authorit";
    if (word.startsWith("availa")) return "availa";
    if (word.startsWith("candidat")) return "candidat";
    if (word.startsWith("captivat")) return "captivat";
    if (word.startsWith("chairm")) return "chairperson";
    if (word.startsWith("chairp")) return "chairperson";
    if (word.startsWith("civilisation")) return "civilisation";
    if (word.startsWith("collaborator")) return "collaborator";
    if (word.startsWith("conception")) return "conception";
    if (word.startsWith("conference")) return "conference";
    if (word.startsWith("constitution")) return "constitution";
    if (word.startsWith("continent")) return "continent";
    if (word.startsWith("craftsm")) return "craftsperson";
    if (word.startsWith("craftsp")) return "craftsperson";
    if (word.startsWith("custod")) return "custod";
    if (word.startsWith("drama")) return "drama";
    if (word.startsWith("drunk")) return "drunk";
    if (word.startsWith("dwelling")) return "dwelling";
    if (word.startsWith("effective")) return "effective";
    if (word.startsWith("ego")) return "ego";
    if (word.startsWith("enthus")) return "enthus";
    if (word.startsWith("evening")) return "evening";
    if (word.startsWith("executive")) return "executor";
    if (word.startsWith("expeditious")) return "expeditious";
    if (word.startsWith("expedition")) return "expedition";
    if (word.startsWith("fish")) return "fish";
    if (word.startsWith("formalism")) return "formal";
    if (word.startsWith("formalis")) return "formalis";
    if (word.startsWith("fundamentalis")) return "fundamentalis";
    if (word.startsWith("generalis")) return "generalis";
    if (word.startsWith("globalis")) return "globalis";
    if (word.startsWith("habita")) return "habita";
    if (word.startsWith("horr")) return "horr";
    if (word.startsWith("humanis")) return "humanis";
    if (word.startsWith("humane")) return "humane";
    if (word.startsWith("importation")) return "imports";
    if (word.startsWith("impression")) return "impression";
    if (word.startsWith("income")) return "income";
    if (word.startsWith("incurable")) return "incurable";
    if (word.startsWith("individualised")) return "individualit";
    if (word.startsWith("individualit")) return "individualit";
    if (word.startsWith("individualis")) return "individualis";
    if (word.startsWith("individuat")) return "individuat";
    if (word.startsWith("inequit")) return "inequit";
    if (word.startsWith("interest")) return "interest";
    if (word.startsWith("internalis")) return "internalis";
    if (word.startsWith("international")) return "international";
    if (word.startsWith("intimation")) return "intimation";
    if (word.startsWith("legatees")) return "legat";
    if (word.startsWith("legat")) return "legate";
    if (word.startsWith("liberat")) return "liberat";
    if (word.startsWith("likeness")) return "liken";
    if (word.startsWith("majorit")) return "majorit";
    if (word.startsWith("materialism")) return "materialist";
    if (word.startsWith("materialist")) return "materialist";
    if (word.startsWith("materialis")) return "materialis";
    if (word.startsWith("memorabl")) return "memorabl";
    if (word.startsWith("memorial")) return "memorial";
    if (word.startsWith("memoris")) return "memoris";
    if (word.startsWith("mineral")) return "mineral";
    if (word.startsWith("nationalised")) return "nationalised";
    if (word.startsWith("nationalis")) return "nationalis";
    if (word.startsWith("naturalis")) return "naturalis";
    if (word.startsWith("natural")) return "natural";
    if (word.startsWith("negative")) return "negative";
    if (word.startsWith("nominal")) return "nominal";
    if (word.startsWith("numerical")) return "number";
    if (word.startsWith("opinionated")) return "opinionated";
    if (word.startsWith("opposition")) return "oppos";
    if (word.startsWith("organisation")) return "organisation";
    if (word.startsWith("organism")) return "organism";
    if (word.startsWith("organis")) return "organis";
    if (word.startsWith("oriental")) return "oriental";
    if (word.startsWith("paste")) return "paste";
    if (word.startsWith("paternalis")) return "paternalis";
    if (word.startsWith("patronis")) return "paternalis";
    if (word.startsWith("physical")) return "physical";
    if (word.startsWith("plough")) return "plough";
    if (word.startsWith("poet")) return "poet";
    if (word.startsWith("position")) return "position";
    if (word.startsWith("positive")) return "positive";
    if (word.startsWith("possibilit")) return "possibilit";
    if (word.startsWith("potentate")) return "potentate";
    if (word.startsWith("practice")) return "practis";
    if (word.startsWith("presentation")) return "presentation";
    if (word.startsWith("presiden")) return "presiden";
    if (word.startsWith("principalit")) return "principalit";
    if (word.startsWith("privation")) return "privation";
    if (word.startsWith("productiv")) return "productiv";
    if (word.startsWith("production")) return "production";
    if (word.startsWith("profession")) return "profession";
    if (word.startsWith("projection")) return "projection";
    if (word.startsWith("protectorate")) return "protectorate";
    if (word.startsWith("protestant")) return "protestant";
    if (word.startsWith("publication")) return "publication";
    if (word.startsWith("publicis")) return "publicis";
    if (word.startsWith("receptiv")) return "receptiv";
    if (word.startsWith("regale")) return "regale";
    if (word.startsWith("relatives")) return "relatives";
    if (word.startsWith("relative")) return "relative";
    if (word.startsWith("relativi")) return "relativi";
    if (word.startsWith("reputa")) return "reputa";
    if (word.startsWith("reservation")) return "reservation";
    if (word.startsWith("responsiv")) return "responsiv";
    if (word.startsWith("responsib")) return "responsib";
    if (word.startsWith("revelat")) return "revelat";
    if (word.startsWith("revolution")) return "revolution";
    if (word.startsWith("ruthless")) return "ruthless";
    if (word.startsWith("sensibilit")) return "sensibilit";
    if (word.startsWith("several")) return "several";
    if (word.startsWith("severit")) return "severe";
    if (word.startsWith("severeth")) return "sever";
    if (word.startsWith("severed")) return "sever";
    if (word.startsWith("severe")) return "severe";
    if (word.startsWith("sever")) return "sever";
    if (word.startsWith("situation")) return "situation";
    if (word.startsWith("socialis")) return "socialis";
    if (word.startsWith("specialis")) return "specialis";
    if (word.startsWith("spokes")) return "spokes";
    if (word.startsWith("statesm")) return "statesm";
    if (word.startsWith("steamer")) return "steamship";
    if (word.startsWith("subjectiv")) return "subjectiv";
    if (word.startsWith("subsidis")) return "subsidis";
    if (word.startsWith("successiv")) return "successiv";
    if (word.startsWith("successi")) return "successor";
    if (word.startsWith("tearful")) return "tearful";
    if (word.startsWith("transition")) return "transition";
    if (word.startsWith("universit")) return "universit";
    if (word.startsWith("universal")) return "universal";
    if (word.startsWith("unlikel")) return "unlikel";
    if (word.startsWith("vacation")) return "vacation";
    if (word.startsWith("vari")) return "vari";
    if (word.startsWith("westernis")) return "westernis";
    if (word.startsWith("wicked")) return "wicked";
    if (word.startsWith("wonderful")) return "wonderful";
    if (word.startsWith("wondere")) return "wondere";
    if (word.startsWith("worldl")) return "worldl";
    if (word.startsWith("zealand")) return "*zealand";
    if (word.startsWith("zeal")) return "zeal";
  }

  str = prelude(str);
  str = step1a(str);

  // console.log(word);
  // console.log("1a", str);

  if (!rgxException2.test(str)) {
    str = step1b(str);
    // console.log("1b", str);
    str = step1c(str);
    // console.log("1c", str);
    str = step2(str);
    // console.log("2", str);
    str = step3(str);
    // console.log("3", str);
    str = step4(str);
    // console.log("4", str);
    str = step5(str);
    // console.log("5", str);
  }

  if (ierReg.test(str) && !ierEndings.includes(str)) str = str.slice(0, -3);
  // console.log("ier", str);

  if (eriReg.test(str) && !eriEndings.includes(str)) str = str.slice(0, -3);
  // console.log("eri", str);

  if (liReg.test(str) && !liEndings.includes(str)) str = str.slice(0, -2);
  // console.log("li", str);

  if (erReg.test(str) && !erEndings.includes(str)) str = str.slice(0, -2);
  // console.log("er", str);

  if (iReg.test(str) && !iEndings.includes(str)) str = str.slice(0, -1);
  // console.log("i", str);

  str = str.replace(/3/g, "y");
  // console.log("y", str);

  if (tweaks[str]) return tweaks[str];

  if (
    /‑/.test(word)
      ? word
          .split("‑")
          .filter((p) => p && p !== "and")
          .some(
            (p) =>
              (p.length < 3 &&
                ![
                  "a",
                  "l",
                  "in",
                  "of",
                  "up",
                  "is",
                  "no",
                  "co",
                  "ex",
                  "by",
                  "to",
                  "do",
                  "be",
                  "so",
                  "as",
                  "de",
                  "at",
                ].includes(p)) ||
              stem(p)[0] === "*"
          )
      : isException(word, str)
  ) {
    return `*${str}`;
  }

  return str;
}; // stem()

export default (word: string) => {
  if (word.length <= 2 || stopwords.includes(word)) return "";
  return stem(word);
};
