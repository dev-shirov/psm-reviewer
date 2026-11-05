export interface Theme {
  dark: boolean;
  bg: string;
  surface: string;
  surface2: string;
  text: string;
  muted: string;
  border: string;
  accent: string;
  accentSoft: string;
  onAccent: string;
  ok: string;
  okSoft: string;
  bad: string;
  badSoft: string;
  warn: string;
}

export const lightTheme: Theme = {
  dark: false,
  bg: '#F4F6FB',
  surface: '#FFFFFF',
  surface2: '#EEF1F8',
  text: '#16203A',
  muted: '#5D6888',
  border: '#DDE3EF',
  accent: '#2F6DF6',
  accentSoft: '#E5EDFF',
  onAccent: '#FFFFFF',
  ok: '#17935A',
  okSoft: '#E3F7EC',
  bad: '#D4343F',
  badSoft: '#FDEAEB',
  warn: '#B7791F',
};

export const darkTheme: Theme = {
  dark: true,
  bg: '#0F1420',
  surface: '#171E2E',
  surface2: '#1F2838',
  text: '#E8ECF5',
  muted: '#9AA6C2',
  border: '#2B344A',
  accent: '#5B8DFF',
  accentSoft: '#1D2A47',
  onAccent: '#0F1420',
  ok: '#3AC07F',
  okSoft: '#14301F',
  bad: '#F0616C',
  badSoft: '#35191C',
  warn: '#E0A83C',
};

export const difficultyColor = (t: Theme, d: string) =>
  d === 'easy' ? t.ok : d === 'hard' ? t.bad : t.warn;

export const radius = { sm: 8, md: 12, lg: 16, xl: 22 };
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
