import type { Section } from './types';

// Section 8 taxonomy. Seeded on first run. Each category carries a short
// syllabus blurb used to ground AI generation (Section 9b), subcategories used
// for tagging + analytics, and an optional third level of micro-topics so a
// user can focus a quiz (e.g. Polity > Judiciary > Supreme Court).

export interface MicroSeed {
  name: string;
  slug: string;
}
export interface SubSeed {
  name: string;
  slug: string;
  micro: MicroSeed[];
}
export interface TaxonomySeed {
  name: string;
  slug: string;
  section: Section;
  blurb: string;
  subcategories: SubSeed[];
}

const m = (name: string, slug: string): MicroSeed => ({ name, slug });
const sub = (name: string, slug: string, micro: MicroSeed[] = []): SubSeed => ({ name, slug, micro });

export const TAXONOMY: TaxonomySeed[] = [
  {
    name: 'General Science',
    slug: 'general-science',
    section: 'GS',
    blurb:
      'Degree-standard general science: scientific principles and everyday applications across physics, chemistry, biology, modern science & technology, and human health & nutrition.',
    subcategories: [
      sub('Physics', 'physics', [
        m('Mechanics & Motion', 'mechanics'),
        m('Heat & Thermodynamics', 'heat-thermodynamics'),
        m('Light & Optics', 'light-optics'),
        m('Electricity & Magnetism', 'electricity-magnetism'),
        m('Sound & Waves', 'sound-waves'),
        m('Modern Physics', 'modern-physics'),
      ]),
      sub('Chemistry', 'chemistry', [
        m('Periodic Table & Elements', 'periodic-table'),
        m('Acids, Bases & Salts', 'acids-bases-salts'),
        m('Metals & Non-metals', 'metals-nonmetals'),
        m('Organic Chemistry', 'organic-chemistry'),
        m('Chemical Reactions', 'chemical-reactions'),
      ]),
      sub('Biology', 'biology', [
        m('Cell Biology', 'cell-biology'),
        m('Human Physiology', 'human-physiology'),
        m('Plant Biology', 'plant-biology'),
        m('Genetics', 'genetics'),
        m('Diseases & Immunity', 'diseases-immunity'),
        m('Ecology', 'ecology'),
      ]),
      sub('Science & Technology', 'science-tech', [
        m('Space & ISRO', 'space-isro'),
        m('Defence Technology', 'defence-tech'),
        m('IT & Computers', 'it-computers'),
        m('Nuclear Technology', 'nuclear-tech'),
        m('Biotechnology', 'biotechnology'),
      ]),
      sub('Health & Nutrition', 'health-nutrition', [
        m('Nutrients & Deficiency', 'nutrients-deficiency'),
        m('Vitamins', 'vitamins'),
        m('Communicable Diseases', 'communicable-diseases'),
        m('Public Health Programmes', 'public-health'),
      ]),
    ],
  },
  {
    name: 'Current Events',
    slug: 'current-events',
    section: 'GS',
    blurb:
      'Contemporary national and international affairs, Tamil Nadu current events, government schemes, awards & honours, and sports.',
    subcategories: [
      sub('National', 'national', [
        m('Polity & Governance', 'national-polity'),
        m('Economy & Budget', 'national-economy'),
        m('Reports & Indices', 'reports-indices'),
        m('Bills & Acts', 'bills-acts'),
      ]),
      sub('International', 'international', [
        m('Summits & Organisations', 'summits-orgs'),
        m('Treaties & Agreements', 'treaties'),
        m('India & the World', 'india-world'),
      ]),
      sub('Tamil Nadu', 'tamil-nadu', [
        m('TN Schemes', 'tn-current-schemes'),
        m('TN Appointments', 'tn-appointments'),
        m('TN Events', 'tn-events'),
      ]),
      sub('Schemes', 'schemes', [
        m('Central Schemes', 'central-schemes'),
        m('State Schemes', 'state-schemes'),
        m('Welfare & Subsidy', 'welfare-subsidy'),
      ]),
      sub('Awards', 'awards', [
        m('National Awards', 'national-awards'),
        m('International Awards', 'international-awards'),
        m('Literary & Film Awards', 'literary-film-awards'),
      ]),
      sub('Sports', 'sports', [
        m('National Sports', 'national-sports'),
        m('International Events', 'international-sports'),
        m('Awards in Sports', 'sports-awards'),
      ]),
    ],
  },
  {
    name: 'Geography',
    slug: 'geography',
    section: 'GS',
    blurb:
      'Physical geography of India, economic geography of India, and the geography of Tamil Nadu: relief, climate, rivers, resources, agriculture and industry.',
    subcategories: [
      sub('Physical India', 'physical-india', [
        m('Relief & Physiography', 'relief-physiography'),
        m('Drainage Systems', 'drainage'),
        m('Climate & Monsoon', 'climate-monsoon'),
        m('Soils', 'soils'),
        m('Natural Vegetation', 'vegetation'),
      ]),
      sub('India Economic Geography', 'india-economic-geography', [
        m('Agriculture', 'geo-agriculture'),
        m('Minerals & Energy', 'minerals-energy'),
        m('Industries', 'geo-industries'),
        m('Transport', 'transport'),
      ]),
      sub('Tamil Nadu Geography', 'tamil-nadu-geography', [
        m('TN Rivers', 'tn-rivers'),
        m('TN Climate & Soil', 'tn-climate-soil'),
        m('TN Resources', 'tn-resources'),
        m('TN Agriculture', 'tn-agriculture'),
      ]),
    ],
  },
  {
    name: 'History & Culture — India',
    slug: 'history-india',
    section: 'GS',
    blurb:
      'History and culture of India across the Ancient, Medieval and Modern periods, including art, architecture, literature and social reform.',
    subcategories: [
      sub('Ancient', 'ancient', [
        m('Indus Valley Civilisation', 'indus-valley'),
        m('Vedic Age', 'vedic-age'),
        m('Mauryan Empire', 'mauryan'),
        m('Gupta Empire', 'gupta'),
        m('Buddhism & Jainism', 'buddhism-jainism'),
      ]),
      sub('Medieval', 'medieval', [
        m('Delhi Sultanate', 'delhi-sultanate'),
        m('Mughal Empire', 'mughal'),
        m('Bhakti & Sufi Movements', 'bhakti-sufi'),
        m('Vijayanagara Empire', 'vijayanagara'),
      ]),
      sub('Modern', 'modern', [
        m('Advent of Europeans', 'advent-europeans'),
        m('British Expansion', 'british-expansion'),
        m('Revolt of 1857', 'revolt-1857'),
        m('Socio-religious Reforms', 'socio-religious-reforms'),
      ]),
    ],
  },
  {
    name: 'History & Culture — Tamil Nadu',
    slug: 'history-tamil-nadu',
    section: 'GS',
    blurb:
      'History and culture of Tamil Nadu: Sangam age, Tamil dynasties (Chera, Chola, Pandya, Pallava), Bhakti movement, Tamil literature, art and social reformers.',
    subcategories: [
      sub('Sangam Age', 'sangam-age', [
        m('Sangam Literature', 'sangam-literature'),
        m('Sangam Polity', 'sangam-polity'),
        m('Sangam Society & Economy', 'sangam-society'),
      ]),
      sub('Tamil Dynasties', 'tamil-dynasties', [
        m('Cholas', 'cholas'),
        m('Pandyas', 'pandyas'),
        m('Pallavas', 'pallavas'),
        m('Cheras', 'cheras'),
      ]),
      sub('Tamil Literature & Culture', 'tamil-literature-culture', [
        m('Bhakti Literature', 'bhakti-literature'),
        m('Tamil Grammar Works', 'tamil-grammar'),
        m('Art & Architecture', 'tn-art-architecture'),
      ]),
      sub('Social Reformers', 'social-reformers', [
        m('Periyar', 'periyar'),
        m('Arignar Anna', 'anna'),
        m('Other Reformers', 'other-reformers'),
      ]),
    ],
  },
  {
    name: 'Indian National Movement',
    slug: 'indian-national-movement',
    section: 'GS',
    blurb:
      'The Indian freedom struggle: rise of nationalism, major movements and leaders, the role of Tamil Nadu, and the path to independence.',
    subcategories: [
      sub('Rise of Nationalism', 'rise-of-nationalism', [
        m('Formation of INC', 'formation-inc'),
        m('Moderates & Extremists', 'moderates-extremists'),
        m('Partition of Bengal', 'partition-bengal'),
        m('Swadeshi Movement', 'swadeshi'),
      ]),
      sub('Gandhian Era', 'gandhian-era', [
        m('Non-Cooperation Movement', 'non-cooperation'),
        m('Civil Disobedience', 'civil-disobedience'),
        m('Quit India Movement', 'quit-india'),
        m('Round Table Conferences', 'round-table'),
      ]),
      sub('Role of Tamil Nadu', 'role-of-tamil-nadu', [
        m('TN Freedom Fighters', 'tn-freedom-fighters'),
        m('TN Movements', 'tn-movements'),
      ]),
      sub('Towards Independence', 'towards-independence', [
        m('Cabinet Mission', 'cabinet-mission'),
        m('Partition & Independence', 'partition-independence'),
        m('Constituent Assembly', 'constituent-assembly'),
      ]),
    ],
  },
  {
    name: 'Indian Polity & Constitution',
    slug: 'indian-polity',
    section: 'GS',
    blurb:
      'Indian Constitution, fundamental rights and duties, union and state government, judiciary, federalism, local self-government, and constitutional bodies.',
    subcategories: [
      sub('Constitution & Preamble', 'constitution-preamble', [
        m('Making of the Constitution', 'making-constitution'),
        m('Preamble', 'preamble'),
        m('Salient Features', 'salient-features'),
        m('Sources of the Constitution', 'sources-constitution'),
      ]),
      sub('Fundamental Rights & Duties', 'rights-duties', [
        m('Fundamental Rights', 'fundamental-rights'),
        m('Directive Principles', 'dpsp'),
        m('Fundamental Duties', 'fundamental-duties'),
        m('Writs', 'writs'),
      ]),
      sub('Union Government', 'union-government', [
        m('President', 'president'),
        m('PM & Council of Ministers', 'pm-council'),
        m('Parliament', 'parliament'),
        m('Lok Sabha & Rajya Sabha', 'lok-rajya-sabha'),
      ]),
      sub('State Government', 'state-government', [
        m('Governor', 'governor'),
        m('Chief Minister & Council', 'cm-council'),
        m('State Legislature', 'state-legislature'),
      ]),
      sub('Judiciary', 'judiciary', [
        m('Supreme Court', 'supreme-court'),
        m('High Courts', 'high-courts'),
        m('Subordinate Judiciary', 'subordinate-judiciary'),
        m('Judicial Review', 'judicial-review'),
        m('Judicial Activism & PIL', 'judicial-activism-pil'),
      ]),
      sub('Local Government', 'local-government', [
        m('Panchayati Raj', 'panchayati-raj'),
        m('Urban Local Bodies', 'urban-local-bodies'),
        m('73rd & 74th Amendments', '73-74-amendments'),
      ]),
      sub('Constitutional Bodies', 'constitutional-bodies', [
        m('Election Commission', 'election-commission'),
        m('UPSC & State PSC', 'upsc-psc'),
        m('CAG', 'cag'),
        m('Finance Commission', 'finance-commission'),
        m('Attorney General', 'attorney-general'),
      ]),
    ],
  },
  {
    name: 'Indian Economy',
    slug: 'indian-economy',
    section: 'GS',
    blurb:
      'Indian economy: planning, national income, money and banking, public finance, agriculture, industry, and economic reforms and development.',
    subcategories: [
      sub('Planning & Development', 'planning-development', [
        m('Five Year Plans', 'five-year-plans'),
        m('NITI Aayog', 'niti-aayog'),
        m('National Income', 'national-income'),
        m('Human Development', 'human-development'),
      ]),
      sub('Money & Banking', 'money-banking', [
        m('RBI & Monetary Policy', 'rbi-monetary-policy'),
        m('Banking System', 'banking-system'),
        m('Money Market', 'money-market'),
        m('Inflation', 'inflation'),
      ]),
      sub('Public Finance', 'public-finance', [
        m('Union Budget', 'union-budget'),
        m('Taxation & GST', 'taxation-gst'),
        m('Fiscal Policy', 'fiscal-policy'),
        m('FRBM Act', 'frbm'),
      ]),
      sub('Agriculture & Industry', 'agriculture-industry', [
        m('Agriculture & Cropping', 'agriculture-cropping'),
        m('Industrial Policy', 'industrial-policy'),
        m('MSME', 'msme'),
        m('Infrastructure', 'infrastructure'),
      ]),
      sub('Economic Reforms', 'economic-reforms', [
        m('1991 Reforms (LPG)', 'lpg-reforms'),
        m('Foreign Trade', 'foreign-trade'),
        m('Disinvestment', 'disinvestment'),
      ]),
    ],
  },
  {
    name: 'Tamil Nadu — Governance, Administration & Welfare Schemes',
    slug: 'tamil-nadu-governance',
    section: 'GS',
    blurb:
      'Governance and public administration in Tamil Nadu: state administrative structure, e-governance, and flagship welfare schemes and their impact.',
    subcategories: [
      sub('State Administration', 'state-administration', [
        m('District Administration', 'district-administration'),
        m('Secretariat & Departments', 'secretariat-departments'),
        m('Civil Services', 'civil-services'),
      ]),
      sub('Welfare Schemes', 'welfare-schemes', [
        m('Women & Child Welfare', 'women-child-welfare'),
        m('Social Welfare', 'social-welfare'),
        m('Education & Health Schemes', 'education-health-schemes'),
      ]),
      sub('e-Governance', 'e-governance', [
        m('e-Services', 'e-services'),
        m('Digital Tamil Nadu', 'digital-tn'),
        m('Citizen Services', 'citizen-services'),
      ]),
    ],
  },
  {
    name: 'Aptitude & Mental Ability',
    slug: 'aptitude',
    section: 'APTITUDE',
    blurb:
      'SSLC-standard aptitude and mental ability: arithmetic, quantitative aptitude, logical reasoning and data interpretation.',
    subcategories: [
      sub('Simplification', 'simplification', [
        m('BODMAS', 'bodmas'),
        m('Fractions & Decimals', 'fractions-decimals'),
        m('Surds & Indices', 'surds-indices'),
      ]),
      sub('Percentage', 'percentage', [
        m('Percentage Basics', 'percentage-basics'),
        m('Profit & Loss', 'profit-loss'),
        m('Discount', 'discount'),
      ]),
      sub('Ratio & Proportion', 'ratio-proportion', [
        m('Ratio & Proportion', 'ratio-basics'),
        m('Partnership', 'partnership'),
        m('Problems on Ages', 'ages'),
      ]),
      sub('Interest', 'interest', [
        m('Simple Interest', 'simple-interest'),
        m('Compound Interest', 'compound-interest'),
      ]),
      sub('Time & Work', 'time-work', [
        m('Time & Work', 'time-work-basics'),
        m('Pipes & Cisterns', 'pipes-cisterns'),
        m('Time, Speed & Distance', 'time-speed-distance'),
      ]),
      sub('Area & Volume', 'area-volume', [
        m('Areas', 'areas'),
        m('Volumes & Surface Areas', 'volumes'),
        m('Mensuration', 'mensuration'),
      ]),
      sub('Reasoning', 'reasoning', [
        m('Series', 'series'),
        m('Coding-Decoding', 'coding-decoding'),
        m('Blood Relations', 'blood-relations'),
        m('Direction Sense', 'direction-sense'),
        m('Syllogism', 'syllogism'),
      ]),
      sub('Data Interpretation', 'data-interpretation', [
        m('Tables', 'di-tables'),
        m('Bar & Pie Charts', 'di-charts'),
        m('Line Graphs', 'di-line-graphs'),
      ]),
    ],
  },
];
