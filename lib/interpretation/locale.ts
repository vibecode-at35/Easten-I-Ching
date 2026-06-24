import type { Locale } from "./types";

/**
 * Cheap heuristic to detect the language of the question without an LLM or heavy library.
 * This determines which language texts we pull from the DB for the reading prompt.
 */
export function detectLocale(question: string): Locale {
  // If it has Chinese characters
  if (/[\u4E00-\u9FA5]/.test(question)) {
    return "zh";
  }
  
  // If it has Vietnamese-specific characters (vowels with diacritics/tones, 'đ')
  // This safely distinguishes Vietnamese from English.
  if (/[àáãạảăắằẳẵặâấầẩẫậèéẹẻẽêềếểễệđìíĩỉịòóõọỏôốồổỗộơớờởỡợùúũụủưứừửữựỳýỹỷỵ]/i.test(question)) {
    return "vi";
  }

  // Default to English
  return "en";
}
