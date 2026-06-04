export const Palette = {
  light: {
    background: '#0A0A0A',      // Grigio abissale (Terminal background)
    surface: '#1A1A1A',         // Grigio antracite (Card background)
    textPrimary: '#E0E0E0',     // Grigio chiaro (Terminal text)
    textSecondary: '#888888',   // Grigio medio (Subtext/placeholders)
    border: '#333333',          // Bordi scuri netti
    accentPastel: '#00FF41',    // Verde Neon/Fluo (Accento IA / Terminal highlight)
  },
  dark: {
    background: '#0A0A0A',      // Grigio abissale (Terminal background)
    surface: '#1A1A1A',         // Grigio antracite (Card background)
    textPrimary: '#E0E0E0',     // Grigio chiaro (Terminal text)
    textSecondary: '#888888',   // Grigio medio (Subtext/placeholders)
    border: '#333333',          // Bordi scuri netti
    accentPastel: '#00FF41',    // Verde Neon/Fluo (Accento IA / Terminal highlight)
  }
};

// Esportazione di default per i componenti Themed e tab bars
const Colors = {
  light: {
    text: Palette.light.textPrimary,
    background: Palette.light.background,
    tint: '#00FF41',            // Verde Neon attivo per tab bar
    tabIconDefault: Palette.light.textSecondary,
    tabIconSelected: '#00FF41',
  },
  dark: {
    text: Palette.dark.textPrimary,
    background: Palette.dark.background,
    tint: '#00FF41',            // Verde Neon attivo per tab bar
    tabIconDefault: Palette.dark.textSecondary,
    tabIconSelected: '#00FF41',
  },
};

export default Colors;