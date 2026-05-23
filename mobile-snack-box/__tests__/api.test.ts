import { getSnacks, createOrder, registerUser, loginUser } from "../src/api/client";

jest.mock("../src/api/client");

describe("API Client", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getSnacks", () => {
    it("returns array of snacks", async () => {
      const mockSnacks = [
        {
          id: 1,
          name: "Protein Bar",
          description: "High protein snack",
          price: 5.99,
          prepMinutes: 0,
          calories: 200,
          category: "Protein" as const,
          accent: "#FF6B6B",
        },
      ];

      (getSnacks as jest.Mock).mockResolvedValueOnce(mockSnacks);

      const result = await getSnacks();
      expect(result).toEqual(mockSnacks);
    });

    it("throws error on network failure", async () => {
      const error = new Error("Network error");
      (getSnacks as jest.Mock).mockRejectedValueOnce(error);

      await expect(getSnacks()).rejects.toThrow("Network error");
    });
  });

  describe("registerUser", () => {
    it("returns auth session on successful registration", async () => {
      const mockSession = {
        accessToken: "token-123",
        user: { id: 1, name: "John", email: "john@example.com" },
      };

      (registerUser as jest.Mock).mockResolvedValueOnce(mockSession);

      const result = await registerUser({
        name: "John",
        email: "john@example.com",
        password: "pass123",
      });

      expect(result).toEqual(mockSession);
    });

    it("throws error on duplicate email", async () => {
      const error = new Error("An account already exists for this email");
      (registerUser as jest.Mock).mockRejectedValueOnce(error);

      await expect(
        registerUser({
          name: "John",
          email: "existing@example.com",
          password: "pass123",
        }),
      ).rejects.toThrow("already exists");
    });
  });

  describe("loginUser", () => {
    it("returns auth session on successful login", async () => {
      const mockSession = {
        accessToken: "token-456",
        user: { id: 1, name: "John", email: "john@example.com" },
      };

      (loginUser as jest.Mock).mockResolvedValueOnce(mockSession);

      const result = await loginUser({
        email: "john@example.com",
        password: "pass123",
      });

      expect(result).toEqual(mockSession);
    });

    it("throws error on invalid credentials", async () => {
      const error = new Error("Invalid email or password");
      (loginUser as jest.Mock).mockRejectedValueOnce(error);

      await expect(
        loginUser({
          email: "john@example.com",
          password: "wrongpass",
        }),
      ).rejects.toThrow("Invalid");
    });
  });

  describe("createOrder", () => {
    it("returns created order on success", async () => {
      const mockOrder = {
        id: 100,
        status: "received",
        total: 34.98,
        createdAt: "2024-01-01T00:00:00Z",
        customerPhone: "1234567890",
        deliveryAddress: "123 Main St",
        deliveryNote: "",
        items: [
          {
            id: 1,
            name: "Snack",
            quantity: 2,
            unitPrice: 5.99,
          },
        ],
      };

      (createOrder as jest.Mock).mockResolvedValueOnce(mockOrder);

      const result = await createOrder(
        [{ snackId: 1, quantity: 2 }],
        {
          customerName: "John",
          customerEmail: "john@example.com",
          customerPhone: "1234567890",
          deliveryAddress: "123 Main St",
          deliveryNote: "",
        },
      );

      expect(result).toEqual(mockOrder);
      expect(createOrder).toHaveBeenCalledWith(
        [{ snackId: 1, quantity: 2 }],
        expect.objectContaining({
          customerName: "John",
          customerEmail: "john@example.com",
        }),
        undefined,
      );
    });
  });
});
