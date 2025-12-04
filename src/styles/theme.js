import { createTheme } from '@mui/material/styles';

// Professional Law-Tech Color Palette
const colors = {
  navy: {
    900: '#0A1929', // Deepest Navy
    800: '#102A43',
    700: '#1A365D', // Primary Main
    600: '#2C5282',
    500: '#3182CE',
    100: '#EBF8FF',
    50: '#F7FAFC',
  },
  gold: {
    main: '#C5A059', // Classic Legal Gold
    light: '#E5C687',
    dark: '#967635',
  },
  slate: {
    900: '#171923',
    800: '#2D3748',
    700: '#4A5568',
    600: '#718096',
    500: '#A0AEC0',
    400: '#CBD5E0',
    300: '#E2E8F0',
    200: '#EDF2F7',
    100: '#F7FAFC',
    50: '#FFFFFF',
  }
};

const typography = {
  fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  h1: {
    fontWeight: 700,
    fontSize: '2.5rem',
    letterSpacing: '-0.02em',
    color: colors.navy[900],
  },
  h2: {
    fontWeight: 600,
    fontSize: '2rem',
    letterSpacing: '-0.01em',
    color: colors.navy[800],
  },
  h3: {
    fontWeight: 600,
    fontSize: '1.75rem',
    color: colors.navy[800],
  },
  h4: {
    fontWeight: 600,
    fontSize: '1.5rem',
    color: colors.navy[700],
  },
  h5: {
    fontWeight: 500,
    fontSize: '1.25rem',
    color: colors.navy[700],
  },
  h6: {
    fontWeight: 500,
    fontSize: '1rem',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  button: {
    fontWeight: 600,
    textTransform: 'none',
  },
};

const components = {
  MuiButton: {
    styleOverrides: {
      root: {
        borderRadius: 8,
        padding: '8px 24px',
        boxShadow: 'none',
        '&:hover': {
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        },
      },
      containedPrimary: {
        backgroundColor: colors.navy[700],
        '&:hover': {
          backgroundColor: colors.navy[800],
        },
      },
      containedSecondary: {
        backgroundColor: colors.gold.main,
        color: colors.navy[900],
        '&:hover': {
          backgroundColor: colors.gold.dark,
        },
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: 12,
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        border: `1px solid ${colors.slate[200]}`,
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        backgroundImage: 'none',
      },
    },
  },
  MuiAppBar: {
    styleOverrides: {
      root: {
        backgroundColor: colors.navy[900],
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
      },
    },
  },
  MuiDrawer: {
    styleOverrides: {
      paper: {
        backgroundColor: colors.navy[900],
        color: '#fff',
      },
    },
  },
  MuiListItem: {
    styleOverrides: {
      root: {
        '&.Mui-selected': {
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderLeft: `4px solid ${colors.gold.main}`,
        },
        '&:hover': {
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
        },
      },
    },
  },
  MuiListItemIcon: {
    styleOverrides: {
      root: {
        color: colors.slate[400],
      },
    },
  },
  MuiListItemText: {
    styleOverrides: {
      primary: {
        color: colors.slate[100],
      },
    },
  },
};

export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: colors.navy[700],
      light: colors.navy[600],
      dark: colors.navy[900],
      contrastText: '#fff',
    },
    secondary: {
      main: colors.gold.main,
      light: colors.gold.light,
      dark: colors.gold.dark,
      contrastText: colors.navy[900],
    },
    background: {
      default: colors.slate[50],
      paper: '#ffffff',
    },
    text: {
      primary: colors.navy[900],
      secondary: colors.slate[600],
    },
    divider: colors.slate[200],
  },
  typography,
  components,
});

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: colors.navy[500],
      light: colors.navy[400],
      dark: colors.navy[700],
      contrastText: '#fff',
    },
    secondary: {
      main: colors.gold.main,
      light: colors.gold.light,
      dark: colors.gold.dark,
      contrastText: colors.navy[900],
    },
    background: {
      default: colors.navy[900],
      paper: colors.navy[800],
    },
    text: {
      primary: colors.slate[50],
      secondary: colors.slate[400],
    },
    divider: colors.navy[700],
  },
  typography: {
    ...typography,
    h1: { ...typography.h1, color: colors.slate[50] },
    h2: { ...typography.h2, color: colors.slate[50] },
    h3: { ...typography.h3, color: colors.slate[100] },
    h4: { ...typography.h4, color: colors.slate[100] },
    h5: { ...typography.h5, color: colors.slate[200] },
  },
  components: {
    ...components,
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: colors.navy[800],
          borderColor: colors.navy[700],
        },
      },
    },
  },
});
