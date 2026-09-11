import type { StateRule } from '../types';

const LAST_VERIFIED = '2026-09-11';

// Deadline data is only ever added here after checking the actual statute —
// never inferred or guessed. Sources are official government/legislature
// pages. Everything else stays unverified until someone checks it the same
// way; do not fill in a number without a real source to back it.
const VERIFIED: StateRule[] = [
  {
    stateCode: 'CA',
    stateName: 'California',
    verified: true,
    deadlineDays: 21,
    itemizedListRequired: true,
    sourceUrl: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1950.5',
    lastVerified: LAST_VERIFIED,
  },
  {
    stateCode: 'NY',
    stateName: 'New York',
    verified: true,
    deadlineDays: 14,
    itemizedListRequired: true,
    sourceUrl: 'https://www.nysenate.gov/legislation/laws/GOB/A7T1',
    lastVerified: LAST_VERIFIED,
  },
  {
    stateCode: 'TX',
    stateName: 'Texas',
    verified: true,
    deadlineDays: 30,
    itemizedListRequired: true,
    sourceUrl: 'https://statutes.capitol.texas.gov/docs/PR/htm/PR.92.htm',
    lastVerified: LAST_VERIFIED,
  },
  {
    stateCode: 'FL',
    stateName: 'Florida',
    verified: true,
    deadlineDays: 30,
    itemizedListRequired: true,
    sourceUrl: 'https://www.flsenate.gov/laws/statutes/2023/83.49',
    lastVerified: LAST_VERIFIED,
    note: '15 days if no deductions claimed',
  },
  {
    stateCode: 'MA',
    stateName: 'Massachusetts',
    verified: true,
    deadlineDays: 30,
    itemizedListRequired: true,
    sourceUrl: 'https://malegislature.gov/Laws/GeneralLaws/PartII/TitleI/Chapter186/Section15b',
    lastVerified: LAST_VERIFIED,
  },
];

const UNVERIFIED_STATES: [string, string][] = [
  ['AL', 'Alabama'], ['AK', 'Alaska'], ['AZ', 'Arizona'], ['AR', 'Arkansas'],
  ['CO', 'Colorado'], ['CT', 'Connecticut'], ['DE', 'Delaware'],
  ['DC', 'District of Columbia'], ['GA', 'Georgia'], ['HI', 'Hawaii'],
  ['ID', 'Idaho'], ['IL', 'Illinois'], ['IN', 'Indiana'], ['IA', 'Iowa'],
  ['KS', 'Kansas'], ['KY', 'Kentucky'], ['LA', 'Louisiana'], ['ME', 'Maine'],
  ['MD', 'Maryland'], ['MI', 'Michigan'], ['MN', 'Minnesota'],
  ['MS', 'Mississippi'], ['MO', 'Missouri'], ['MT', 'Montana'],
  ['NE', 'Nebraska'], ['NV', 'Nevada'], ['NH', 'New Hampshire'],
  ['NJ', 'New Jersey'], ['NM', 'New Mexico'], ['NC', 'North Carolina'],
  ['ND', 'North Dakota'], ['OH', 'Ohio'], ['OK', 'Oklahoma'],
  ['OR', 'Oregon'], ['PA', 'Pennsylvania'], ['RI', 'Rhode Island'],
  ['SC', 'South Carolina'], ['SD', 'South Dakota'], ['TN', 'Tennessee'],
  ['UT', 'Utah'], ['VT', 'Vermont'], ['VA', 'Virginia'],
  ['WA', 'Washington'], ['WV', 'West Virginia'], ['WI', 'Wisconsin'],
  ['WY', 'Wyoming'],
];

export const STATE_RULES: StateRule[] = [
  ...VERIFIED,
  ...UNVERIFIED_STATES.map(
    ([stateCode, stateName]): StateRule => ({
      stateCode,
      stateName,
      verified: false,
      deadlineDays: null,
      itemizedListRequired: null,
      sourceUrl: null,
      lastVerified: null,
    }),
  ),
].sort((a, b) => a.stateName.localeCompare(b.stateName));

export function getStateRule(stateCode: string | undefined): StateRule | undefined {
  return STATE_RULES.find((s) => s.stateCode === stateCode);
}
