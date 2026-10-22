// "Remember me" for the login screen.
// Only the e-mail is kept by the app. The password is handed to the browser's own password
// manager (Credential Management API, Chrome/Edge), which stores it encrypted — never in localStorage.

const EMAIL_KEY = 'lynus_remembered_email';

type PasswordCredentialCtor = new (data: { id: string; password: string; name?: string }) => Credential;

function passwordCredentialApi(): PasswordCredentialCtor | null {
  const ctor = (window as unknown as { PasswordCredential?: PasswordCredentialCtor }).PasswordCredential;
  return ctor && navigator.credentials ? ctor : null;
}

export function getRememberedEmail(): string | null {
  try {
    return localStorage.getItem(EMAIL_KEY);
  } catch {
    return null;
  }
}

/** Saves (or forgets) the login after a successful sign-in */
export async function rememberLogin(remember: boolean, email: string, password: string) {
  try {
    if (!remember) {
      localStorage.removeItem(EMAIL_KEY);
      return;
    }
    localStorage.setItem(EMAIL_KEY, email);
  } catch {
    // storage blocked: nothing to remember
  }

  const Ctor = passwordCredentialApi();
  if (Ctor) {
    try {
      // Shows the browser's "Save password?" prompt
      await navigator.credentials.store(new Ctor({ id: email, password }));
    } catch {
      // user dismissed or browser policy blocked it
    }
  }
}

/** Asks the browser for a saved password for this site (Chrome/Edge); null elsewhere */
export async function getSavedCredential(): Promise<{ email: string; password: string } | null> {
  if (!passwordCredentialApi()) return null;
  try {
    const cred = (await navigator.credentials.get({
      password: true,
      mediation: 'optional',
    } as CredentialRequestOptions)) as (Credential & { password?: string }) | null;
    return cred?.password ? { email: cred.id, password: cred.password } : null;
  } catch {
    return null;
  }
}
