const KEY = "pendingInvite";
const CODE_FORMAT = /^[a-f0-9]{64}$/;

export function savePendingInvite(code: string) {
  try {
    sessionStorage.setItem(KEY, code);
  } catch {
    // Storage can be blocked in some private modes. The person can simply open the link again.
  }
}

export function takePendingInvite(): string | null {
  try {
    const code = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    // if there is the code and it has the right shape return it otherwise return null 
    return code && CODE_FORMAT.test(code) ? code : null;
  } catch {
    return null;
  }
}