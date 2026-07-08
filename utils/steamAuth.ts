const STEAM_OPENID_URL = "https://steamcommunity.com/openid/login";

export class SteamAuth {
  private returnUrl: string;
  private realm: string;

  constructor(returnUrl: string, realm: string) {
    this.returnUrl = returnUrl;
    this.realm = realm;
  }

  /**
   * Generates Steam OpenID redirect URL.
   * @param state - State object to include in redirect URL.
   * @returns Redirect URL for Steam OpenID login.
   */
  getRedirectUrl(state: Record<string, string> = {}): string {
    const params = new URLSearchParams({
      "openid.ns": "http://specs.openid.net/auth/2.0",
      "openid.mode": "checkid_setup",
      "openid.return_to": this.buildReturnUrl(state),
      "openid.realm": this.realm,
      "openid.identity": "http://specs.openid.net/auth/2.0/identifier_select",
      "openid.claimed_id": "http://specs.openid.net/auth/2.0/identifier_select",
    });
    return `${STEAM_OPENID_URL}?${params.toString()}`;
  }

  /**
   * Verifies Steam OpenID response and extracts Steam ID.
   * @param requestUrl - URL from the verification request.
   * @returns Steam ID if verification is successful, otherwise null.
   */
  async verify(requestUrl: URL): Promise<string | null> {
    const params = requestUrl.searchParams;

    if (params.get("openid.mode") !== "id_res") return null;

    const validationParams = new URLSearchParams(params);
    validationParams.set("openid.mode", "check_authentication");

    const response = await fetch(STEAM_OPENID_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: validationParams.toString(),
    });

    const text = await response.text();
    if (!text.includes("is_valid:true")) return null;

    const claimedId = params.get("openid.claimed_id");
    const match = claimedId?.match(/\/id\/(\d+)$/);
    return match ? match[1] : null;
  }

  /**
   * Extracts state object from verification request URL.
   * @param requestUrl - URL from the verification request.
   * @returns State object.
   */
  getState(requestUrl: URL): Record<string, string> {
    const params = requestUrl.searchParams;
    const state: Record<string, string> = {};
    for (const [key, value] of params.entries()) {
      if (!key.startsWith("openid.")) {
        state[key] = value;
      }
    }
    return state;
  }

  /**
   * Builds return URL with state parameters.
   * @param state - State object to include in return URL.
   * @returns Return URL with state parameters.
   */
  private buildReturnUrl(state: Record<string, string>): string {
    const url = new URL(this.returnUrl);
    for (const [key, value] of Object.entries(state)) {
      url.searchParams.append(key, value);
    }
    return url.toString();
  }
}
