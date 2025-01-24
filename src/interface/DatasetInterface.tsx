export interface LanguageTranslationText {
  en: string;
  ar: string;
  fr: string;
}

export interface LanguageTranslationArray {
  en: string[];
  ar: string[];
  fr: string[];
}

export interface Provider {
  name: string;
  pictureUrl: string;
  website: string;
  contact: string;
}

export interface Dataset {
  title: LanguageTranslationText;
  slug: string;
  path: string;
  description: LanguageTranslationText;
  descriptionREADME: string;
  source: string;
  sourceURL: string;
  updatedDate: string;
  keywords: LanguageTranslationArray;
  category: LanguageTranslationText;
  provider: Provider;

  preview?: any;
  dataSize?: number;
}
