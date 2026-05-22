import { useState } from 'react';

export default function LocalAuthSetupStep({ onNext, addLog }) {
  const [form, setForm] = useState({ username: '', password: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }

    setSaving(true);
    addLog('Saving local auth credentials...');

    try {
      const res = await fetch('/api/setup/auth-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: form.username,
          password: form.password,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save credentials');

      addLog('Local auth credentials saved', 'success');
      onNext({ username: form.username });
    } catch (err) {
      addLog(`Failed: ${err.message}`, 'error');
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-xl font-semibold mb-1">Local Auth</h2>
      <p className="text-gray-600 text-sm mb-5">
        Set a single username and password for this instance. Credentials are stored
        as Dokku environment variables (<code className="bg-gray-100 px-1 rounded text-xs">LOCAL_AUTH_USERNAME</code> and{' '}
        <code className="bg-gray-100 px-1 rounded text-xs">LOCAL_AUTH_PASSWORD</code>).
      </p>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Username
          </label>
          <input
            type="text"
            value={form.username}
            onChange={set('username')}
            required
            autoComplete="off"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            placeholder="admin"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            type="password"
            value={form.password}
            onChange={set('password')}
            required
            autoComplete="new-password"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Confirm Password
          </label>
          <input
            type="password"
            value={form.confirm}
            onChange={set('confirm')}
            required
            autoComplete="new-password"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={saving || !form.username || !form.password || !form.confirm}
          className="w-full py-2.5 px-4 bg-indigo-600 text-white font-medium rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save & Continue'}
        </button>
      </form>
    </div>
  );
}
