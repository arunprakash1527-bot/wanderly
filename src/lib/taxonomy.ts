import type { Section } from './types';

// Section 8 taxonomy. Seeded on first run. Each category carries a short
// syllabus blurb used to ground AI generation (Section 9b) and a list of
// subcategories used for tagging + analytics.

export interface TaxonomySeed {
  name: string;
  slug: string;
  section: Section;
  blurb: string;
  subcategories: { name: string; slug: string }[];
}

const sub = (name: string, slug: string) => ({ name, slug });

export const TAXONOMY: TaxonomySeed[] = [
  {
    name: 'General Science',
    slug: 'general-science',
    section: 'GS',
    blurb:
      'Degree-standard general science: scientific principles and everyday applications across physics, chemistry, biology, modern science & technology, and human health & nutrition.',
    subcategories: [
      sub('Physics', 'physics'),
      sub('Chemistry', 'chemistry'),
      sub('Biology', 'biology'),
      sub('Science & Technology', 'science-tech'),
      sub('Health & Nutrition', 'health-nutrition'),
    ],
  },
  {
    name: 'Current Events',
    slug: 'current-events',
    section: 'GS',
    blurb:
      'Contemporary national and international affairs, Tamil Nadu current events, government schemes, awards & honours, and sports.',
    subcategories: [
      sub('National', 'national'),
      sub('International', 'international'),
      sub('Tamil Nadu', 'tamil-nadu'),
      sub('Schemes', 'schemes'),
      sub('Awards', 'awards'),
      sub('Sports', 'sports'),
    ],
  },
  {
    name: 'Geography',
    slug: 'geography',
    section: 'GS',
    blurb:
      'Physical geography of India, economic geography of India, and the geography of Tamil Nadu: relief, climate, rivers, resources, agriculture and industry.',
    subcategories: [
      sub('Physical India', 'physical-india'),
      sub('India Economic Geography', 'india-economic-geography'),
      sub('Tamil Nadu Geography', 'tamil-nadu-geography'),
    ],
  },
  {
    name: 'History & Culture — India',
    slug: 'history-india',
    section: 'GS',
    blurb:
      'History and culture of India across the Ancient, Medieval and Modern periods, including art, architecture, literature and social reform.',
    subcategories: [
      sub('Ancient', 'ancient'),
      sub('Medieval', 'medieval'),
      sub('Modern', 'modern'),
    ],
  },
  {
    name: 'History & Culture — Tamil Nadu',
    slug: 'history-tamil-nadu',
    section: 'GS',
    blurb:
      'History and culture of Tamil Nadu: Sangam age, Tamil dynasties (Chera, Chola, Pandya, Pallava), Bhakti movement, Tamil literature, art and social reformers.',
    subcategories: [
      sub('Sangam Age', 'sangam-age'),
      sub('Tamil Dynasties', 'tamil-dynasties'),
      sub('Tamil Literature & Culture', 'tamil-literature-culture'),
      sub('Social Reformers', 'social-reformers'),
    ],
  },
  {
    name: 'Indian National Movement',
    slug: 'indian-national-movement',
    section: 'GS',
    blurb:
      'The Indian freedom struggle: rise of nationalism, major movements and leaders, the role of Tamil Nadu, and the path to independence.',
    subcategories: [
      sub('Rise of Nationalism', 'rise-of-nationalism'),
      sub('Gandhian Era', 'gandhian-era'),
      sub('Role of Tamil Nadu', 'role-of-tamil-nadu'),
      sub('Towards Independence', 'towards-independence'),
    ],
  },
  {
    name: 'Indian Polity & Constitution',
    slug: 'indian-polity',
    section: 'GS',
    blurb:
      'Indian Constitution, fundamental rights and duties, union and state government, judiciary, federalism, local self-government, and constitutional bodies.',
    subcategories: [
      sub('Constitution & Preamble', 'constitution-preamble'),
      sub('Fundamental Rights & Duties', 'rights-duties'),
      sub('Union Government', 'union-government'),
      sub('State Government', 'state-government'),
      sub('Judiciary', 'judiciary'),
      sub('Local Government', 'local-government'),
      sub('Constitutional Bodies', 'constitutional-bodies'),
    ],
  },
  {
    name: 'Indian Economy',
    slug: 'indian-economy',
    section: 'GS',
    blurb:
      'Indian economy: planning, national income, money and banking, public finance, agriculture, industry, and economic reforms and development.',
    subcategories: [
      sub('Planning & Development', 'planning-development'),
      sub('Money & Banking', 'money-banking'),
      sub('Public Finance', 'public-finance'),
      sub('Agriculture & Industry', 'agriculture-industry'),
      sub('Economic Reforms', 'economic-reforms'),
    ],
  },
  {
    name: 'Tamil Nadu — Governance, Administration & Welfare Schemes',
    slug: 'tamil-nadu-governance',
    section: 'GS',
    blurb:
      'Governance and public administration in Tamil Nadu: state administrative structure, e-governance, and flagship welfare schemes and their impact.',
    subcategories: [
      sub('State Administration', 'state-administration'),
      sub('Welfare Schemes', 'welfare-schemes'),
      sub('e-Governance', 'e-governance'),
    ],
  },
  {
    name: 'Aptitude & Mental Ability',
    slug: 'aptitude',
    section: 'APTITUDE',
    blurb:
      'SSLC-standard aptitude and mental ability: arithmetic, quantitative aptitude, logical reasoning and data interpretation.',
    subcategories: [
      sub('Simplification', 'simplification'),
      sub('Percentage', 'percentage'),
      sub('Ratio & Proportion', 'ratio-proportion'),
      sub('Interest', 'interest'),
      sub('Time & Work', 'time-work'),
      sub('Area & Volume', 'area-volume'),
      sub('Reasoning', 'reasoning'),
      sub('Data Interpretation', 'data-interpretation'),
    ],
  },
];
