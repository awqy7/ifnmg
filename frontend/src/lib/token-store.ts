/**
 * tokenStore — fallback em memória para a requisição que acabou de autenticar.
 *
 * A sessão persistente fica somente no cookie httpOnly. JWT em localStorage ou
 * sessionStorage poderia ser lido por qualquer script injetado na página.
 */

const KEY = "ifnmg_jwt";

let _inMemory: string | null = null;
let legacyStorageCleared = false;

function isBrowser() {
  return typeof window !== "undefined";
}

export const tokenStore = {
  /**
   * Salva o token apenas em memória. O cookie httpOnly mantém a sessão.
   */
  set(token: string | null) {
    _inMemory = token;
    if (!isBrowser()) return;
    try {
      sessionStorage.removeItem(KEY);
      localStorage.removeItem(KEY);
      legacyStorageCleared = true;
    } catch {
      // Storage pode ser bloqueado em modo privado do Safari
    }
  },

  /**
   * Lê somente da memória e remove tokens persistidos por versões antigas.
   */
  get(): string | null {
    if (_inMemory) return _inMemory;
    if (!isBrowser()) return null;
    if (!legacyStorageCleared) {
      try {
        sessionStorage.removeItem(KEY);
        localStorage.removeItem(KEY);
      } catch {}
      legacyStorageCleared = true;
    }
    return _inMemory;
  },

  /**
   * Remove o token de todos os storages.
   */
  clear() {
    _inMemory = null;
    if (!isBrowser()) return;
    try {
      sessionStorage.removeItem(KEY);
      localStorage.removeItem(KEY);
    } catch {}
  },
};
