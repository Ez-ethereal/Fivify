/**
 * Fivify brand palette — warm scholarly stationery aesthetic.
 *
 * Derived from the Fivify logo: warm tan background + dark charcoal mark.
 */

const brand = {
  cream: "#F5F0E8",
  tan: "#C4B19A",
  sand: "#D4C5AE",
  charcoal: "#3D4148",
  stone: "#6B6560",
  warmgray: "#8A827A",
  surface: "#EDE7DB",
  muted: "#A89F95",
};

export default {
  light: {
    text: brand.charcoal,
    background: brand.cream,
    tint: brand.charcoal,
    tabIconDefault: brand.muted,
    tabIconSelected: brand.charcoal,
    brand,
  },
  dark: {
    text: brand.cream,
    background: "#1C1B19",
    tint: brand.tan,
    tabIconDefault: brand.stone,
    tabIconSelected: brand.tan,
    brand,
  },
};
