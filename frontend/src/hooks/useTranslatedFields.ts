import { useTranslation } from 'react-i18next';
import type { Object } from '../types';

export interface TranslatedField {
  title: string;
  attribution: string;
  medium: string;
  provenance: string;
  credit_line: string;
  display_date: string;
  classification?: string;
  department?: string;
}

export function useTranslatedFields(artwork: Object | null): TranslatedField {
  const { i18n } = useTranslation();
  // Detect if current language is Chinese (could be 'zh', 'zh-CN', 'zh-TW')
  const isChinese = i18n.language.startsWith('zh');
  const locale = i18n.language;

  if (!artwork) {
    return {
      title: '',
      attribution: '',
      medium: '',
      provenance: '',
      credit_line: '',
      display_date: '',
    };
  }

  // 1. Prioritize flat _zh fields if language is Chinese
  if (isChinese) {
    return {
      title: artwork.title_zh || artwork.title || '',
      attribution: artwork.attribution_zh || artwork.attribution || '',
      medium: artwork.medium_zh || artwork.medium || '',
      provenance: artwork.provenance_zh || artwork.provenance || '',
      credit_line: artwork.credit_line_zh || artwork.credit_line || '',
      display_date: artwork.display_date_zh || artwork.display_date || '',
      classification: artwork.classification_zh || artwork.classification || '',
      department: artwork.department_zh || artwork.department || '',
    };
  }

  // 2. Fallback to legacy nested translations array
  const translation = artwork.translations?.find((t: any) => t.locale === locale);
  
  return {
    title: translation?.title || artwork.title || '',
    attribution: translation?.attribution || artwork.attribution || '',
    medium: translation?.medium || artwork.medium || '',
    provenance: translation?.provenance || artwork.provenance || '',
    credit_line: translation?.credit_line || artwork.credit_line || '',
    display_date: translation?.display_date || artwork.display_date || '',
    classification: (translation as any)?.classification || artwork.classification || '',
    department: (translation as any)?.department || artwork.department || '',
  };
}

// Helper function to get a single translated field
export function getTranslatedField(
  artwork: Object, 
  field: keyof TranslatedField
): string {
  const { i18n } = useTranslation();
  const isChinese = i18n.language.startsWith('zh');
  const locale = i18n.language;
  
  // 1. Check flat _zh field
  if (isChinese) {
    const zhField = `${field}_zh` as keyof Object;
    if (artwork[zhField] && typeof artwork[zhField] === 'string') {
      return artwork[zhField] as string;
    }
  }
  
  // 2. Check legacy translations
  const translation = artwork.translations?.find((t) => t.locale === locale);
  const translatedValue = translation?.[field];
  if (translatedValue && typeof translatedValue === 'string') {
    return translatedValue;
  }

  // 3. Fallback to original
  const originalValue = artwork[field as keyof Object];
  return (typeof originalValue === 'string' ? originalValue : '') || '';
}
