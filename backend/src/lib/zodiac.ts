export interface ZodiacInfo {
  name: string;
  symbol: string;
  dateRange: string;
  element: string;
}

export const ZODIAC_DATA: ZodiacInfo[] = [
  { name: "Aries", symbol: "♈", dateRange: "Mar 21 - Apr 19", element: "Fire" },
  { name: "Taurus", symbol: "♉", dateRange: "Apr 20 - May 20", element: "Earth" },
  { name: "Gemini", symbol: "♊", dateRange: "May 21 - Jun 20", element: "Air" },
  { name: "Cancer", symbol: "♋", dateRange: "Jun 21 - Jul 22", element: "Water" },
  { name: "Leo", symbol: "♌", dateRange: "Jul 23 - Aug 22", element: "Fire" },
  { name: "Virgo", symbol: "♍", dateRange: "Aug 23 - Sep 22", element: "Earth" },
  { name: "Libra", symbol: "♎", dateRange: "Sep 23 - Oct 22", element: "Air" },
  { name: "Scorpio", symbol: "♏", dateRange: "Oct 23 - Nov 21", element: "Water" },
  { name: "Sagittarius", symbol: "♐", dateRange: "Nov 22 - Dec 21", element: "Fire" },
  { name: "Capricorn", symbol: "♑", dateRange: "Dec 22 - Jan 19", element: "Earth" },
  { name: "Aquarius", symbol: "♒", dateRange: "Jan 20 - Feb 18", element: "Air" },
  { name: "Pisces", symbol: "♓", dateRange: "Feb 19 - Mar 20", element: "Water" },
];

// (month, day) the sign STARTS on, walked in calendar order starting from
// Capricorn (which wraps across the new year).
const BOUNDARIES: { name: string; month: number; day: number }[] = [
  { name: "Capricorn", month: 1, day: 1 },
  { name: "Aquarius", month: 1, day: 20 },
  { name: "Pisces", month: 2, day: 19 },
  { name: "Aries", month: 3, day: 21 },
  { name: "Taurus", month: 4, day: 20 },
  { name: "Gemini", month: 5, day: 21 },
  { name: "Cancer", month: 6, day: 21 },
  { name: "Leo", month: 7, day: 23 },
  { name: "Virgo", month: 8, day: 23 },
  { name: "Libra", month: 9, day: 23 },
  { name: "Scorpio", month: 10, day: 23 },
  { name: "Sagittarius", month: 11, day: 22 },
  { name: "Capricorn", month: 12, day: 22 },
];

export function zodiacFromDate(date: Date): ZodiacInfo {
  const month = date.getMonth() + 1;
  const day = date.getDate();
  let name = "Capricorn";
  for (const b of BOUNDARIES) {
    if (month > b.month || (month === b.month && day >= b.day)) {
      name = b.name;
    }
  }
  return ZODIAC_DATA.find((z) => z.name === name)!;
}

export interface RudrakshaInfo {
  mukhi: string;
  title: string;
  benefit: string;
}

// Traditional zodiac -> ruling planet -> associated rudraksha mukhi
// (bead face count), a well-established mapping in Vedic practice.
export const RUDRAKSHA_BY_ZODIAC: Record<string, RudrakshaInfo> = {
  Aries: { mukhi: "3 Mukhi", title: "Three-Faced Rudraksha (ruled by Mars)", benefit: "traditionally worn for courage, willpower, and overcoming inertia" },
  Taurus: { mukhi: "6 Mukhi", title: "Six-Faced Rudraksha (ruled by Venus)", benefit: "traditionally worn for harmony, charm, and steady prosperity" },
  Gemini: { mukhi: "4 Mukhi", title: "Four-Faced Rudraksha (ruled by Mercury)", benefit: "traditionally worn for clarity of thought, communication, and focus" },
  Cancer: { mukhi: "2 Mukhi", title: "Two-Faced Rudraksha (ruled by the Moon)", benefit: "traditionally worn for emotional balance and inner calm" },
  Leo: { mukhi: "12 Mukhi", title: "Twelve-Faced Rudraksha (ruled by the Sun)", benefit: "traditionally worn for confidence, leadership, and vitality" },
  Virgo: { mukhi: "4 Mukhi", title: "Four-Faced Rudraksha (ruled by Mercury)", benefit: "traditionally worn for discernment, precision, and mental clarity" },
  Libra: { mukhi: "6 Mukhi", title: "Six-Faced Rudraksha (ruled by Venus)", benefit: "traditionally worn for balance, relationships, and grace under pressure" },
  Scorpio: { mukhi: "3 Mukhi", title: "Three-Faced Rudraksha (ruled by Mars)", benefit: "traditionally worn for transformation, resilience, and inner strength" },
  Sagittarius: { mukhi: "5 Mukhi", title: "Five-Faced Rudraksha (ruled by Jupiter)", benefit: "traditionally worn for wisdom, optimism, and good fortune" },
  Capricorn: { mukhi: "7 Mukhi", title: "Seven-Faced Rudraksha (ruled by Saturn)", benefit: "traditionally worn for discipline, patience, and long-term success" },
  Aquarius: { mukhi: "7 Mukhi", title: "Seven-Faced Rudraksha (ruled by Saturn)", benefit: "traditionally worn for perseverance and steady, grounded progress" },
  Pisces: { mukhi: "5 Mukhi", title: "Five-Faced Rudraksha (ruled by Jupiter)", benefit: "traditionally worn for intuition, compassion, and spiritual growth" },
};
