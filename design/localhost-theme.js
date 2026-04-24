// React Theme — extracted from http://localhost:5173
// Compatible with: Chakra UI, Stitches, Vanilla Extract, or any CSS-in-JS

/**
 * TypeScript type definition for this theme:
 *
 * interface Theme {
 *   colors: {
    primary: string;
    secondary: string;
    background: string;
    foreground: string;
    neutral50: string;
    neutral100: string;
    neutral200: string;
    neutral300: string;
    neutral400: string;
    neutral500: string;
 *   };
 *   fonts: {
    body: string;
    mono: string;
 *   };
 *   fontSizes: {
    '11': string;
    '12': string;
    '13': string;
    '14': string;
    '15': string;
    '16': string;
    '20': string;
    '28': string;
    '40': string;
    '72': string;
    '17.92': string;
    '13.3333': string;
 *   };
 *   space: {
    '2': string;
    '32': string;
    '40': string;
    '48': string;
    '56': string;
    '72': string;
 *   };
 *   radii: {
    md: string;
    full: string;
 *   };
 *   shadows: {

 *   };
 *   states: {
 *     hover: { opacity: number };
 *     focus: { opacity: number };
 *     active: { opacity: number };
 *     disabled: { opacity: number };
 *   };
 * }
 */

export const theme = {
  "colors": {
    "primary": "#16a34a",
    "secondary": "#22c55e",
    "background": "#0a0a0a",
    "foreground": "#e5e5e5",
    "neutral50": "#e5e5e5",
    "neutral100": "#a3a3a3",
    "neutral200": "#737373",
    "neutral300": "#f5f5f5",
    "neutral400": "#0a0a0a",
    "neutral500": "#222222"
  },
  "fonts": {
    "body": "'system-ui', sans-serif",
    "mono": "'ui-monospace', monospace"
  },
  "fontSizes": {
    "11": "11px",
    "12": "12px",
    "13": "13px",
    "14": "14px",
    "15": "15px",
    "16": "16px",
    "20": "20px",
    "28": "28px",
    "40": "40px",
    "72": "72px",
    "17.92": "17.92px",
    "13.3333": "13.3333px"
  },
  "space": {
    "2": "2px",
    "32": "32px",
    "40": "40px",
    "48": "48px",
    "56": "56px",
    "72": "72px"
  },
  "radii": {
    "md": "10px",
    "full": "999px"
  },
  "shadows": {},
  "states": {
    "hover": {
      "opacity": 0.08
    },
    "focus": {
      "opacity": 0.12
    },
    "active": {
      "opacity": 0.16
    },
    "disabled": {
      "opacity": 0.38
    }
  }
};

// MUI v5 theme
export const muiTheme = {
  "palette": {
    "primary": {
      "main": "#16a34a",
      "light": "hsl(142, 76%, 51%)",
      "dark": "hsl(142, 76%, 21%)"
    },
    "secondary": {
      "main": "#22c55e",
      "light": "hsl(142, 71%, 60%)",
      "dark": "hsl(142, 71%, 30%)"
    },
    "background": {
      "default": "#0a0a0a",
      "paper": "#111111"
    },
    "text": {
      "primary": "#e5e5e5",
      "secondary": "#a3a3a3"
    }
  },
  "typography": {
    "fontFamily": "'ui-sans-serif', sans-serif",
    "h1": {
      "fontSize": "40px",
      "fontWeight": "500",
      "lineHeight": "60px"
    },
    "h2": {
      "fontSize": "28px",
      "fontWeight": "400",
      "lineHeight": "normal"
    },
    "h3": {
      "fontSize": "20px",
      "fontWeight": "900",
      "lineHeight": "30px"
    },
    "body1": {
      "fontSize": "16px",
      "fontWeight": "400",
      "lineHeight": "normal"
    }
  },
  "shape": {
    "borderRadius": 6
  },
  "shadows": []
};

export default theme;
