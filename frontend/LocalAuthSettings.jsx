import { useState } from 'react';

export default function LocalAuthSettings({ appConfig, managerAppName, fetchConfig }) {
  const isUsernameSet = !!appConfig?.LOCAL_AUTH_USERNAME;
  const isPasswordSet = !!appConfig?.LOCAL_AUTH_PASSWORD;
  const isConfigured = isUsernameSet && isPasswordSet;

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ username: '', password: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const startEdit = () => {
    setForm({ username: appConfig?.LOCAL_AUTH_USERNAME || '', password: '', confirm: '' });
    setError(null);
    setEditing(true);
  };

  const save = async () => {
    if (!managerAppName) return;
    if (form.password && form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const vars = {};
      if (form.username) vars.LOCAL_AUTH_USERNAME = form.username;
      if (form.password) vars.LOCAL_AUTH_PASSWORD = form.password;

      if (Object.keys(vars).length === 0) {
        setError('No changes to save');
        return;
      }

      const res = await fetch(`/api/apps/${encodeURIComponent(managerAppName)}/config`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vars, noRestart: true }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');

      setEditing(false);
      await fetchConfig();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Local Auth</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Single-user username and password authentication.
          </p>
        </div>
        {!editing && (
          <button
            onClick={startEdit}
            disabled={!managerAppName}
            className="btn btn-secondary btn-sm"
          >
            {isConfigured ? 'Edit' : 'Configure'}
          </button>
        )}
      </div>

      <div className="p-4">
        {!editing ? (
          <dl className="space-y-3 text-sm">
            <div className="flex gap-2">
              <dt className="font-medium text-gray-700 w-36">Status:</dt>
              <dd>
                {isConfigured
                  ? <span className="badge badge-green">Configured</span>
                  : <span className="badge badge-gray">Not Configured</span>
                }
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-medium text-gray-700 w-36">Username:</dt>
              <dd className="font-mono text-xs text-gray-600">
                {isUsernameSet ? appConfig.LOCAL_AUTH_USERNAME : <span className="text-gray-400">not set</span>}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-medium text-gray-700 w-36">Password:</dt>
              <dd className="text-gray-600">
                {isPasswordSet ? '••••••••••••••••' : <span className="text-gray-400">not set</span>}
              </dd>
            </div>
            {!managerAppName && (
              <p className="text-xs text-amber-600">
                Config changes require the app to be deployed on Dokku.
              </p>
            )}
          </dl>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                className="input text-sm"
                placeholder="admin"
                autoComplete="off"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="input text-sm"
                placeholder={isPasswordSet ? '(leave empty to keep existing)' : ''}
                autoComplete="new-password"
              />
            </div>
            {form.password && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={form.confirm}
                  onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))}
                  className="input text-sm"
                  autoComplete="new-password"
                />
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={save}
                disabled={saving || !managerAppName}
                className="btn btn-primary btn-sm"
              >
                {saving ? 'Saving...' : 'Save (no restart)'}
              </button>
              <button
                onClick={() => setEditing(false)}
                disabled={saving}
                className="btn btn-secondary btn-sm"
              >
                Cancel
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Config is saved without an immediate restart. Restart the app manually
              for changes to take effect.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
