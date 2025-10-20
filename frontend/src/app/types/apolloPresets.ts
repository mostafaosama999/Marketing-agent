/**
 * Types for Apollo title search presets
 */

export interface ApolloTitlePreset {
  id: string;              // Unique identifier
  name: string;            // User-defined preset name
  titles: string[];        // Array of selected job titles
  createdAt: Date;        // When preset was created
}

/**
 * Load presets from localStorage
 */
export function loadApolloPresets(): ApolloTitlePreset[] {
  try {
    const stored = localStorage.getItem('apollo_title_presets');
    if (stored) {
      const parsed = JSON.parse(stored);
      // Convert date strings back to Date objects
      return parsed.map((preset: any) => ({
        ...preset,
        createdAt: new Date(preset.createdAt),
      }));
    }
  } catch (error) {
    console.error('Error loading Apollo presets from localStorage:', error);
  }
  return [];
}

/**
 * Save presets to localStorage
 */
export function saveApolloPresets(presets: ApolloTitlePreset[]): void {
  try {
    localStorage.setItem('apollo_title_presets', JSON.stringify(presets));
  } catch (error) {
    console.error('Error saving Apollo presets to localStorage:', error);
  }
}

/**
 * Create a new preset
 */
export function createPreset(name: string, titles: string[]): ApolloTitlePreset {
  return {
    id: `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    name: name.trim(),
    titles: [...titles],
    createdAt: new Date(),
  };
}
