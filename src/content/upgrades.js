export const INSTITUTE_UPGRADES = [
  {
    id: 'rapid-permit',
    name: 'RAPID PERMIT',
    department: 'FIELD OPERATIONS',
    description: 'Abilities and dodges recover 12% faster. The form claims this is administrative efficiency.',
    cost: 420,
    rankRequired: 1,
  },
  {
    id: 'route-priority',
    name: 'ROUTE PRIORITY',
    department: 'PASSAGE SCHEDULING',
    description: 'Adds 15 seconds to the safe window before the independent server arrives.',
    cost: 560,
    rankRequired: 2,
  },
  {
    id: 'contradiction-case',
    name: 'CONTRADICTION CASE',
    department: 'OBJECT CONSERVATION',
    description: 'Remote-server objects retain 20% more appraised value during extraction.',
    cost: 740,
    rankRequired: 3,
  },
  {
    id: 'field-insurance',
    name: 'FIELD INSURANCE',
    department: 'RISK AND DENIAL',
    description: 'Prevents one threshold seizure per run while A Chave Geral remains active.',
    cost: 980,
    rankRequired: 4,
  },
  {
    id: 'shared-license',
    name: 'SHARED MEDICAL LICENSE',
    department: 'CLINICAL JURISDICTION',
    description: 'All healing effects are 22% stronger and revive fallback grants a brief recovery pulse.',
    cost: 860,
    rankRequired: 4,
  },
  {
    id: 'vault-warrant',
    name: 'REMOTE VAULT WARRANT',
    department: 'CROSS-STATE CLAIMS',
    description: 'Remote vault recoveries gain an additional fixed appraisal premium.',
    cost: 1250,
    rankRequired: 6,
  },
  {
    id: 'auditor-exemption',
    name: 'AUDITOR EXEMPTION',
    department: 'ABSURD COMPLIANCE',
    description: 'The Auditor enters later and begins with reduced health. The exemption is unsigned.',
    cost: 1600,
    rankRequired: 8,
  },
];

export function upgradeById(id) {
  return INSTITUTE_UPGRADES.find((upgrade) => upgrade.id === id);
}
