import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('fg_token'));
  const role = ref<'standard' | 'admin'>( (localStorage.getItem('fg_role') as 'standard' | 'admin') || 'standard');

  async function loginStandard() {
    try {
      const res = await fetch('/api/auth/login', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        token.value = data.token;
        role.value = 'standard';
        localStorage.setItem('fg_token', data.token);
        localStorage.setItem('fg_role', 'standard');
      }
    } catch (e) {
      console.error('Auth login failed:', e);
    }
  }

  async function verifyPin(pin: string): Promise<boolean> {
    try {
      const res = await fetch('/api/auth/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      });

      if (res.ok) {
        const data = await res.json();
        token.value = data.token;
        role.value = 'admin';
        localStorage.setItem('fg_token', data.token);
        localStorage.setItem('fg_role', 'admin');
        return true;
      }
    } catch (e) {
      console.error('PIN verify failed:', e);
    }
    return false;
  }

  function logout() {
    token.value = null;
    role.value = 'standard';
    localStorage.removeItem('fg_token');
    localStorage.removeItem('fg_role');
  }

  return { token, role, loginStandard, verifyPin, logout };
});
