import { createContext, PropsWithChildren, useContext, useMemo, useState } from "react";

import type { CartItem, Snack } from "../types";

type CartContextValue = {
  items: CartItem[];
  subtotal: number;
  totalItems: number;
  addSnack: (snack: Snack) => void;
  decreaseSnack: (snackId: Snack["id"]) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: PropsWithChildren) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addSnack = (snack: Snack) => {
    setItems((currentItems) => {
      const existingItem = currentItems.find((item) => item.snack.id === snack.id);

      if (!existingItem) {
        return [...currentItems, { snack, quantity: 1 }];
      }

      return currentItems.map((item) =>
        item.snack.id === snack.id ? { ...item, quantity: item.quantity + 1 } : item,
      );
    });
  };

  const decreaseSnack = (snackId: Snack["id"]) => {
    setItems((currentItems) =>
      currentItems
        .map((item) =>
          item.snack.id === snackId ? { ...item, quantity: item.quantity - 1 } : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const clearCart = () => setItems([]);

  const value = useMemo<CartContextValue>(() => {
    const subtotal = items.reduce((total, item) => total + item.snack.price * item.quantity, 0);
    const totalItems = items.reduce((total, item) => total + item.quantity, 0);

    return {
      items,
      subtotal,
      totalItems,
      addSnack,
      decreaseSnack,
      clearCart,
    };
  }, [items]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error("useCart must be used inside CartProvider");
  }

  return context;
}
