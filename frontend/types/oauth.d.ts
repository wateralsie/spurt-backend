/* Google Identity Services */
declare namespace google.accounts.oauth2 {
  interface TokenClient {
    callback: (response: TokenResponse) => void;
    requestAccessToken(): void;
  }

  interface TokenResponse {
    access_token: string;
    error?: string;
  }

  interface TokenClientConfig {
    client_id: string;
    scope: string;
    callback: (response: TokenResponse) => void;
  }

  function initTokenClient(config: TokenClientConfig): TokenClient;
}

/* Kakao JS SDK */
interface Window {
  Kakao: {
    init(appKey: string): void;
    isInitialized(): boolean;
    Auth: {
      login(options: {
        success: (response: { access_token: string }) => void;
        fail: (error: unknown) => void;
      }): void;
    };
  };
}
