import { SoundYXZLogo, WealthsimpleLogo } from '../../components/company-logos';

/**
 * Take note that these logos may have different dimensions than logos used elsewhere.
 */
export const companyLogos = {
  'sound-xyz': <SoundYXZLogo width={193} height={64} />,
  wealthsimple: <WealthsimpleLogo width={212} height={64} />,
};

export function getCompanyLogo(company: string) {
  if (company in companyLogos) {
    return companyLogos[company as keyof typeof companyLogos];
  }

  console.dir({ companyLogos }, { depth: 9 });
  throw new Error(
    `No logo found for ${company}. We have the following: (${Object.keys(companyLogos).join(', ')})`,
  );
}
