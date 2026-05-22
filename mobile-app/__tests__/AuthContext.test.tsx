import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { AuthProvider, useAuth } from "../context/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

jest.mock("@react-native-async-storage/async-storage");
jest.mock("../api/client");

describe("AuthContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  it("initializes with no user when no token is saved", async () => {
    const TestComponent = () => {
      const { user, accessToken, isLoading } = useAuth();
      return (
        <>
          {isLoading && <Text testID="loading">Loading</Text>}
          {!isLoading && user === null && <Text testID="no-user">No user</Text>}
          {accessToken === null && <Text testID="no-token">No token</Text>}
        </>
      );
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestID("no-user")).toBeTruthy();
      expect(screen.getByTestID("no-token")).toBeTruthy();
    });
  });

  it("loads saved session from storage", async () => {
    const mockToken = "test-token-123";
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(mockToken);

    const TestComponent = () => {
      const { accessToken } = useAuth();
      return <>{accessToken && <Text testID="has-token">{accessToken}</Text>}</>;
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() => {
      expect(AsyncStorage.getItem).toHaveBeenCalledWith("cloudsnacks.authToken");
    });
  });

  it("clears storage on logout", async () => {
    const TestComponent = () => {
      const { signOut } = useAuth();
      return <Button testID="logout-btn" onPress={signOut} title="Logout" />;
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    const logoutBtn = screen.getByTestID("logout-btn");
    fireEvent.press(logoutBtn);

    await waitFor(() => {
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith("cloudsnacks.authToken");
    });
  });
});
