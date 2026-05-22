export type Snack = {
  id: number | string;
  name: string;
  description: string;
  price: number;
  prepMinutes: number;
  calories: number;
  category: string;
  accent: string;
  ingredients?: string[];
  allergens?: string[];
  isAvailable?: boolean;
};

export type CartItem = {
  snack: Snack;
  quantity: number;
};
