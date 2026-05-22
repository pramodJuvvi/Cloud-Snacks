import { render, screen, fireEvent } from "@testing-library/react-native";
import { CartProvider, useCart } from "../src/context/CartContext";
import { Text, Button } from "react-native";

describe("CartContext", () => {
  const mockSnack = {
    id: 1,
    name: "Test Snack",
    description: "A test snack",
    price: 10.0,
    prepMinutes: 15,
    calories: 150,
    category: "Protein" as const,
    accent: "#FF6B6B",
  };

  it("initializes with empty cart", () => {
    const TestComponent = () => {
      const { items, totalItems, subtotal } = useCart();
      return (
        <>
          <Text testID="item-count">{items.length}</Text>
          <Text testID="total-items">{totalItems}</Text>
          <Text testID="subtotal">{subtotal}</Text>
        </>
      );
    };

    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>,
    );

    expect(screen.getByTestID("item-count")).toHaveTextContent("0");
    expect(screen.getByTestID("total-items")).toHaveTextContent("0");
    expect(screen.getByTestID("subtotal")).toHaveTextContent("0");
  });

  it("adds snack to cart", () => {
    const TestComponent = () => {
      const { items, addSnack, totalItems } = useCart();
      return (
        <>
          <Button testID="add-btn" onPress={() => addSnack(mockSnack)} title="Add" />
          <Text testID="item-count">{items.length}</Text>
          <Text testID="total-items">{totalItems}</Text>
        </>
      );
    };

    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>,
    );

    const addBtn = screen.getByTestID("add-btn");
    fireEvent.press(addBtn);

    expect(screen.getByTestID("item-count")).toHaveTextContent("1");
    expect(screen.getByTestID("total-items")).toHaveTextContent("1");
  });

  it("increments quantity when adding same snack twice", () => {
    const TestComponent = () => {
      const { items, addSnack } = useCart();
      const cartItem = items[0];
      return (
        <>
          <Button testID="add-btn" onPress={() => addSnack(mockSnack)} title="Add" />
          {cartItem && (
            <>
              <Text testID="item-count">{items.length}</Text>
              <Text testID="quantity">{cartItem.quantity}</Text>
            </>
          )}
        </>
      );
    };

    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>,
    );

    const addBtn = screen.getByTestID("add-btn");
    fireEvent.press(addBtn);
    fireEvent.press(addBtn);

    expect(screen.getByTestID("item-count")).toHaveTextContent("1");
    expect(screen.getByTestID("quantity")).toHaveTextContent("2");
  });

  it("calculates correct subtotal", () => {
    const TestComponent = () => {
      const { addSnack, subtotal } = useCart();
      return (
        <>
          <Button testID="add-btn" onPress={() => addSnack(mockSnack)} title="Add" />
          <Text testID="subtotal">{subtotal.toFixed(2)}</Text>
        </>
      );
    };

    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>,
    );

    const addBtn = screen.getByTestID("add-btn");
    fireEvent.press(addBtn);
    fireEvent.press(addBtn);

    expect(screen.getByTestID("subtotal")).toHaveTextContent("20.00");
  });

  it("removes snack when quantity reaches 0", () => {
    const TestComponent = () => {
      const { items, addSnack, decreaseSnack } = useCart();
      return (
        <>
          <Button testID="add-btn" onPress={() => addSnack(mockSnack)} title="Add" />
          <Button testID="decrease-btn" onPress={() => decreaseSnack(mockSnack.id)} title="Dec" />
          <Text testID="item-count">{items.length}</Text>
        </>
      );
    };

    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>,
    );

    const addBtn = screen.getByTestID("add-btn");
    const decreaseBtn = screen.getByTestID("decrease-btn");

    fireEvent.press(addBtn);
    fireEvent.press(decreaseBtn);

    expect(screen.getByTestID("item-count")).toHaveTextContent("0");
  });

  it("clears entire cart", () => {
    const TestComponent = () => {
      const { items, addSnack, clearCart } = useCart();
      return (
        <>
          <Button testID="add-btn" onPress={() => addSnack(mockSnack)} title="Add" />
          <Button testID="clear-btn" onPress={clearCart} title="Clear" />
          <Text testID="item-count">{items.length}</Text>
        </>
      );
    };

    render(
      <CartProvider>
        <TestComponent />
      </CartProvider>,
    );

    const addBtn = screen.getByTestID("add-btn");
    const clearBtn = screen.getByTestID("clear-btn");

    fireEvent.press(addBtn);
    fireEvent.press(addBtn);
    fireEvent.press(clearBtn);

    expect(screen.getByTestID("item-count")).toHaveTextContent("0");
  });
});
