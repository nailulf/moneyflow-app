import { ChartConfig } from "@/components/ui/organisms/chart";

// Mock data for Stacked Bar Chart
export const stackedBarChartData = [
  { month: "January", revenue: 45000, expenses: 32000, profit: 13000 },
  { month: "February", revenue: 52000, expenses: 35000, profit: 17000 },
  { month: "March", revenue: 48000, expenses: 33000, profit: 15000 },
  { month: "April", revenue: 61000, expenses: 38000, profit: 23000 },
  { month: "May", revenue: 55000, expenses: 36000, profit: 19000 },
  { month: "June", revenue: 58000, expenses: 37000, profit: 21000 },
  { month: "July", revenue: 63000, expenses: 39000, profit: 24000 },
  { month: "August", revenue: 59000, expenses: 38000, profit: 21000 },
  { month: "September", revenue: 67000, expenses: 41000, profit: 26000 },
  { month: "October", revenue: 64000, expenses: 40000, profit: 24000 },
  { month: "November", revenue: 71000, expenses: 43000, profit: 28000 },
  { month: "December", revenue: 75000, expenses: 45000, profit: 30000 },
];

export const stackedBarChartConfig: ChartConfig = {
  revenue: {
    label: "Revenue",
    color: "hsl(var(--chart-1))",
  },
  expenses: {
    label: "Expenses",
    color: "hsl(var(--chart-2))",
  },
  profit: {
    label: "Profit",
    color: "hsl(var(--chart-3))",
  },
};

// Mock data for Spending vs Budget Chart
export const spendingVsBudgetData = [
  { month: "Jan", spending: 3200, budget: 4000, delta: 800, overspent: 0 },
  { month: "Feb", spending: 3500, budget: 4000, delta: 500, overspent: 0 },
  { month: "Mar", spending: 4200, budget: 4000, delta: 0, overspent: 200 },
  { month: "Apr", spending: 3800, budget: 4000, delta: 200, overspent: 0 },
  { month: "May", spending: 3900, budget: 4000, delta: 100, overspent: 0 },
  { month: "Jun", spending: 4500, budget: 4000, delta: 0, overspent: 500 },
  { month: "Jul", spending: 3700, budget: 4000, delta: 300, overspent: 0 },
  { month: "Aug", spending: 3600, budget: 4000, delta: 400, overspent: 0 },
  { month: "Sep", spending: 4100, budget: 4000, delta: 0, overspent: 100 },
  { month: "Oct", spending: 3900, budget: 4000, delta: 100, overspent: 0 },
  { month: "Nov", spending: 4300, budget: 4000, delta: 0, overspent: 300 },
  { month: "Dec", spending: 4800, budget: 4000, delta: 0, overspent: 800 },
];

export const spendingVsBudgetConfig: ChartConfig = {
  spending: {
    label: "Spending",
    color: "hsl(var(--chart-2))",
  },
  budget: {
    label: "Budget",
    color: "hsl(var(--chart-1))",
  },
  delta: {
    label: "Under Budget",
    color: "hsl(var(--chart-3))",
  },
  overspent: {
    label: "Over Budget",
    color: "hsl(var(--destructive))",
  },
};

// Mock data for Monthly Chart
export const monthlyChartData = [
  { month: "Jan", income: 5000, expenses: 3200, net: 1800 },
  { month: "Feb", income: 5000, expenses: 3500, net: 1500 },
  { month: "Mar", income: 5000, expenses: 4200, net: 800 },
  { month: "Apr", income: 5500, expenses: 3800, net: 1700 },
  { month: "May", income: 5500, expenses: 3900, net: 1600 },
  { month: "Jun", income: 5500, expenses: 4500, net: 1000 },
  { month: "Jul", income: 6000, expenses: 3700, net: 2300 },
  { month: "Aug", income: 6000, expenses: 3600, net: 2400 },
  { month: "Sep", income: 6000, expenses: 4100, net: 1900 },
  { month: "Oct", income: 6500, expenses: 3900, net: 2600 },
  { month: "Nov", income: 6500, expenses: 4300, net: 2200 },
  { month: "Dec", income: 7000, expenses: 4800, net: 2200 },
];

export const monthlyChartConfig: ChartConfig = {
  income: {
    label: "Income",
    color: "hsl(var(--chart-1))",
  },
  expenses: {
    label: "Expenses",
    color: "hsl(var(--chart-2))",
  },
  net: {
    label: "Net",
    color: "hsl(var(--chart-3))",
  },
};

// Mock data for Pie Chart (Spending Breakdown)
export const spendingBreakdownData = [
  { category: "Food", amount: 1200, percentage: 30, color: "hsl(var(--chart-1))" },
  { category: "Transport", amount: 800, percentage: 20, color: "hsl(var(--chart-2))" },
  { category: "Entertainment", amount: 600, percentage: 15, color: "hsl(var(--chart-3))" },
  { category: "Shopping", amount: 500, percentage: 12.5, color: "hsl(var(--chart-4))" },
  { category: "Utilities", amount: 400, percentage: 10, color: "hsl(var(--chart-5))" },
  { category: "Other", amount: 500, percentage: 12.5, color: "hsl(var(--chart-6))" },
];

export const spendingBreakdownConfig: ChartConfig = {
  amount: {
    label: "Amount",
  },
  food: {
    label: "Food",
    color: "hsl(var(--chart-1))",
  },
  transport: {
    label: "Transport",
    color: "hsl(var(--chart-2))",
  },
  entertainment: {
    label: "Entertainment",
    color: "hsl(var(--chart-3))",
  },
  shopping: {
    label: "Shopping",
    color: "hsl(var(--chart-4))",
  },
  utilities: {
    label: "Utilities",
    color: "hsl(var(--chart-5))",
  },
  other: {
    label: "Other",
    color: "hsl(var(--chart-6))",
  },
};

// Mock data for Area Chart (Net Worth)
export type TimePeriod = "1W" | "1M" | "3M" | "YTD" | "1Y" | "3Y" | "5Y";

export interface NetWorthData {
  date: string;
  value: number;
}

export const netWorthData: Record<TimePeriod, NetWorthData[]> = {
  "1W": [
    { date: "Mon", value: 98500 },
    { date: "Tue", value: 99200 },
    { date: "Wed", value: 98800 },
    { date: "Thu", value: 100100 },
    { date: "Fri", value: 101500 },
    { date: "Sat", value: 102000 },
    { date: "Sun", value: 102300 },
  ],
  "1M": [
    { date: "Week 1", value: 95000 },
    { date: "Week 2", value: 97500 },
    { date: "Week 3", value: 99800 },
    { date: "Week 4", value: 102300 },
  ],
  "3M": [
    { date: "Jan", value: 85000 },
    { date: "Feb", value: 92000 },
    { date: "Mar", value: 102300 },
  ],
  "YTD": [
    { date: "Jan", value: 85000 },
    { date: "Feb", value: 92000 },
    { date: "Mar", value: 102300 },
  ],
  "1Y": [
    { date: "Q1", value: 75000 },
    { date: "Q2", value: 82000 },
    { date: "Q3", value: 95000 },
    { date: "Q4", value: 102300 },
  ],
  "3Y": [
    { date: "2022", value: 45000 },
    { date: "2023", value: 68000 },
    { date: "2024", value: 102300 },
  ],
  "5Y": [
    { date: "2020", value: 25000 },
    { date: "2021", value: 35000 },
    { date: "2022", value: 45000 },
    { date: "2023", value: 68000 },
    { date: "2024", value: 102300 },
  ],
};

export const netWorthConfig: ChartConfig = {
  value: {
    label: "Net Worth",
    color: "hsl(var(--chart-1))",
  },
};

// Mock data for Asset Types
export interface AssetType {
  id: string;
  name: string;
  value: number;
  percentage: number;
  color: string;
  change: number;
  changePercentage: number;
}

export const assetData: AssetType[] = [
  {
    id: "1",
    name: "Stocks & ETFs",
    value: 45000,
    percentage: 44,
    color: "hsl(var(--chart-1))",
    change: 2500,
    changePercentage: 5.9,
  },
  {
    id: "2",
    name: "Real Estate",
    value: 35000,
    percentage: 34,
    color: "hsl(var(--chart-2))",
    change: 1200,
    changePercentage: 3.6,
  },
  {
    id: "3",
    name: "Cash & Savings",
    value: 12000,
    percentage: 12,
    color: "hsl(var(--chart-3))",
    change: -300,
    changePercentage: -2.4,
  },
  {
    id: "4",
    name: "Crypto",
    value: 10300,
    percentage: 10,
    color: "hsl(var(--chart-4))",
    change: 1800,
    changePercentage: 21.2,
  },
];