/**
 * tokenStore — Armazenamento centralizado do JWT para compatibilidade com
 * Safari iOS e browsers que bloqueiam cookies cross-site (ITP).
 *
 * Estratégia: prioridade em camadas
 * 1. Memória (mais seguro, perdido ao recarregar) → estado React-like
 * 2. sessionStorage (tab/janela atual)
 * 3. localStorage (persistência entre sessões, necessário no iOS Safari)
 *
 * O token é limpo em logout() ou quando /api/auth/me retorna 401.
 */

const KEY = "ifnmg_jwt";

let _inMemory: string | null = null;

function isBrowser() {
  return typeof window !== "undefined";
}

export const tokenStore = {
  /**
   * Salva o token em memória + sessionStorage + localStorage (fallback iOS).
   */
  set(token: string | null) {
    _inMemory = token;
    if (!isBrowser()) return;
    try {
      if (token) {
        sessionStorage.setItem(KEY, token);
        localStorage.setItem(KEY, token);
      } else {
        sessionStorage.removeItem(KEY);
        localStorage.removeItem(KEY);
      }
    } catch {
      // Storage pode ser bloqueado em modo privado do Safari
    }
  },

  /**
   * Lê o token: memória → sessionStorage → localStorage.
   */
  get(): string | null {
    if (_inMemory) return _inMemory;
    if (!isBrowser()) return null;
    try {
      const s = sessionStorage.getItem(KEY) || localStorage.getItem(KEY);
      if (s) {
        _inMemory = s; // restaura em memória
        return s;
      }
    } catch {
      // sem acesso ao storage
    }
    return null;
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
