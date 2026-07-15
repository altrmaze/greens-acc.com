import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../../../supabaseClient';
import { useAuth } from '../../../context/AuthContext';
import {
  ALL_MANAGED_ROLES,
  ACCOUNT_STATUSES,
  DEFAULT_PAGE_SIZE,
  roleBadgeClass,
  statusBadgeClass,
  statusLabel,
  canDeleteUser,
  canAssignRole,
  totalPages,
} from '../../../lib/users';

// ── Badge components ──────────────────────────────────────────────────────

function RoleBadge({ role }) {
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${roleBadgeClass(role)}`}>
      {role ?? 'unknown'}
    </span>
  );
}

function StatusBadge({ status }) {
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusBadgeClass(status ?? 'active')}`}>
      {statusLabel(status ?? 'active')}
    </span>
  );
}

// ── Skeleton loader ───────────────────────────────────────────────────────

function Skeleton({ rows = 5 }) {
  return (
    <div className="p-4 space-y-2">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="animate-pulse bg-slate-700 h-10 rounded" />
      ))}
    </div>
  );
}

// ── Modal wrapper ─────────────────────────────────────────────────────────

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-100">{title}</h3>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-200 text-xl leading-none transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Invite User modal ─────────────────────────────────────────────────────

function InviteModal({ onClose, onSuccess }) {
  const [email, setEmail]       = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole]         = useState('user');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr]           = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) { setErr('Email is required'); return; }
    setErr(null);
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('adminManageUser', {
        body: {
          action: 'invite_user',
          email: email.trim(),
          display_name: displayName.trim() || null,
          role,
        },
      });
      if (error || data?.error) {
        setErr(error?.message || data?.error || 'Invite failed');
      } else {
        onSuccess('User invited successfully.');
      }
    } catch (ex) {
      setErr(ex.message || 'Unexpected error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Invite New User" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">Email address *</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500/60"
            placeholder="user@example.com"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">Display name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500/60"
            placeholder="Full Name"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500/60"
          >
            {ALL_MANAGED_ROLES.map((r) => (
              <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
            ))}
          </select>
        </div>
        {err && <p className="text-red-400 text-xs">{err}</p>}
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-semibold text-slate-400 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 px-4 py-2 text-sm font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Sending…' : 'Send Invite'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Edit Role modal ───────────────────────────────────────────────────────

function EditRoleModal({ user, onClose, onSuccess }) {
  const [role, setRole]         = useState(user.role ?? 'user');
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr]           = useState(null);
  const { role: actorRole }     = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canAssignRole(actorRole, role)) { setErr('You cannot assign this role'); return; }
    setErr(null);
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', user.id);
      if (error) throw error;

      await supabase.rpc('log_user_action', {
        p_target_id:  user.id,
        p_action:     'update_role',
        p_old_values: { role: user.role },
        p_new_values: { role },
      });

      onSuccess('Role updated.');
    } catch (ex) {
      setErr(ex.message || 'Update failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal title="Edit Role" onClose={onClose}>
      <p className="text-xs text-slate-500 -mt-2">
        User: <span className="text-slate-300">{user.email || user.id}</span>
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">New role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500/60"
          >
            {ALL_MANAGED_ROLES.map((r) => (
              <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
            ))}
          </select>
        </div>
        {err && <p className="text-red-400 text-xs">{err}</p>}
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm font-semibold text-slate-400 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="flex-1 px-4 py-2 text-sm font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/25 transition-colors disabled:opacity-50">
            {submitting ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Confirm action modal ──────────────────────────────────────────────────

function ConfirmModal({ title, message, confirmLabel, confirmClass, onClose, onConfirm }) {
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr]               = useState(null);

  const handleConfirm = async () => {
    setSubmitting(true);
    setErr(null);
    try {
      await onConfirm();
    } catch (ex) {
      setErr(ex.message || 'Action failed');
      setSubmitting(false);
    }
  };

  return (
    <Modal title={title} onClose={onClose}>
      <p className="text-sm text-slate-400">{message}</p>
      {err && <p className="text-red-400 text-xs">{err}</p>}
      <div className="flex gap-3 pt-1">
        <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-sm font-semibold text-slate-400 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors">
          Cancel
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={submitting}
          className={`flex-1 px-4 py-2 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50 ${confirmClass}`}
        >
          {submitting ? 'Working…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

// ── Pagination bar ────────────────────────────────────────────────────────

function PaginationBar({ page, total, pageSize, onPage }) {
  const pages = totalPages(total, pageSize);
  if (pages <= 1) return null;
  return (
    <div className="px-5 py-3 border-t border-slate-700 flex items-center justify-between text-xs text-slate-500">
      <span>Page {page} of {pages} · {total} total</span>
      <div className="flex gap-2">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="px-3 py-1 rounded-lg border border-slate-700 hover:bg-slate-700 disabled:opacity-40 transition-colors"
        >
          ← Prev
        </button>
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= pages}
          className="px-3 py-1 rounded-lg border border-slate-700 hover:bg-slate-700 disabled:opacity-40 transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

// ── Main UsersSection component ───────────────────────────────────────────

export default function UsersSection() {
  const { role: actorRole } = useAuth();

  const [users,   setUsers]   = useState([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [toast,   setToast]   = useState(null);

  const [search,       setSearch]       = useState('');
  const [filterRole,   setFilterRole]   = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [modal, setModal] = useState(null);

  const searchTimer = useRef(null);
  const searchVal   = useRef('');

  const fetchUsers = useCallback(async (pg, srch, fRole, fStatus) => {
    setLoading(true);
    setError(null);
    try {
      const offset = (pg - 1) * DEFAULT_PAGE_SIZE;

      const [listRes, countRes] = await Promise.all([
        supabase.rpc('admin_list_users', {
          p_search: srch  || null,
          p_role:   fRole || null,
          p_status: fStatus || null,
          p_limit:  DEFAULT_PAGE_SIZE,
          p_offset: offset,
        }),
        supabase.rpc('admin_count_users', {
          p_search: srch  || null,
          p_role:   fRole || null,
          p_status: fStatus || null,
        }),
      ]);

      if (listRes.error)  throw listRes.error;
      if (countRes.error) throw countRes.error;

      setUsers(listRes.data ?? []);
      setTotal(Number(countRes.data) || 0);
    } catch (ex) {
      setError(ex.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(page, search, filterRole, filterStatus);
  }, [page, filterRole, filterStatus, fetchUsers]);

  const handleSearchChange = (val) => {
    setSearch(val);
    searchVal.current = val;
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      fetchUsers(1, searchVal.current, filterRole, filterStatus);
    }, 350);
  };

  const showToast = (msg, isError = false) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 3500);
  };

  const refreshList = (msg) => {
    setModal(null);
    showToast(msg);
    fetchUsers(page, search, filterRole, filterStatus);
  };

  const handleStatusToggle = async (u) => {
    const newStatus = u.status === 'active' ? 'inactive' : 'active';
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus })
        .eq('id', u.id);
      if (error) throw error;

      await supabase.rpc('log_user_action', {
        p_target_id:  u.id,
        p_action:     newStatus === 'active' ? 'reactivate_user' : 'deactivate_user',
        p_old_values: { status: u.status },
        p_new_values: { status: newStatus },
      });

      setModal(null);
      showToast(`User ${newStatus === 'active' ? 'reactivated' : 'deactivated'}.`);
      fetchUsers(page, search, filterRole, filterStatus);
    } catch (ex) {
      throw ex;
    }
  };

  const handleResetPassword = async (u) => {
    const { data, error } = await supabase.functions.invoke('adminManageUser', {
      body: { action: 'reset_password', user_id: u.id, email: u.email },
    });
    if (error || data?.error) {
      throw new Error(error?.message || data?.error || 'Reset failed');
    }
    setModal(null);
    showToast('Password reset email sent.');
    await supabase.rpc('log_user_action', {
      p_target_id:  u.id,
      p_action:     'reset_password',
      p_old_values: null,
      p_new_values: { email: u.email },
    });
  };

  const handleDeleteUser = async (u) => {
    const { data, error } = await supabase.functions.invoke('adminManageUser', {
      body: { action: 'delete_user', user_id: u.id },
    });
    if (error || data?.error) {
      throw new Error(error?.message || data?.error || 'Delete failed');
    }
    setModal(null);
    showToast('User deleted.');
    fetchUsers(page, search, filterRole, filterStatus);
  };

  const isActive = (u) => u.status === 'active' || u.status == null;

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold transition-all ${toast.isError ? 'bg-red-900/80 text-red-300 border border-red-600' : 'bg-emerald-900/80 text-emerald-300 border border-emerald-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-100 mb-1">Users</h2>
          <p className="text-sm text-slate-500">Manage accounts, roles, and access status.</p>
        </div>
        <button
          onClick={() => setModal({ type: 'invite' })}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-xl hover:bg-emerald-500/25 transition-colors"
        >
          <span className="text-base leading-none">+</span> Invite User
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search by email or name…"
          className="flex-1 min-w-[180px] bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500/40"
        />
        <select
          value={filterRole}
          onChange={(e) => { setFilterRole(e.target.value); setPage(1); }}
          className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-emerald-500/40"
        >
          <option value="">All roles</option>
          {ALL_MANAGED_ROLES.map((r) => (
            <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-emerald-500/40"
        >
          <option value="">All statuses</option>
          {ACCOUNT_STATUSES.map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Table card */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-300">Profile Registry</h3>
          <span className="text-xs text-slate-500">
            {loading ? '…' : `${total} total`}
          </span>
        </div>

        {error ? (
          <div className="px-5 py-6 text-red-400 text-sm bg-red-500/5 border-t border-red-500/20">
            Failed to load users: {error}
          </div>
        ) : loading ? (
          <Skeleton />
        ) : users.length === 0 ? (
          <p className="px-5 py-8 text-slate-500 text-sm text-center">No users found matching your filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Joined</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-700/40 transition-colors">
                    {/* User identity */}
                    <td className="px-5 py-3 min-w-0">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-slate-400 text-xs font-bold flex-shrink-0 uppercase">
                          {(u.display_name || u.email || '?').charAt(0)}
                        </div>
                        <div className="min-w-0">
                          {u.display_name && (
                            <div className="text-slate-200 text-sm font-medium truncate max-w-[160px]">{u.display_name}</div>
                          )}
                          <div className="text-slate-500 text-xs truncate max-w-[160px]">{u.email || u.id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3"><RoleBadge role={u.role} /></td>
                    <td className="px-5 py-3"><StatusBadge status={u.status} /></td>
                    <td className="px-5 py-3 text-slate-500 text-xs hidden md:table-cell">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                    </td>
                    {/* Action buttons */}
                    <td className="px-5 py-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Edit role */}
                        <button
                          onClick={() => setModal({ type: 'edit_role', user: u })}
                          className="text-xs px-2 py-1 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                          title="Edit role"
                        >
                          Role
                        </button>
                        {/* Deactivate / Reactivate */}
                        <button
                          onClick={() => setModal({
                            type: 'confirm',
                            title: isActive(u) ? 'Deactivate User' : 'Reactivate User',
                            message: isActive(u)
                              ? `Deactivate ${u.email || u.id}? Their access will be suspended.`
                              : `Reactivate ${u.email || u.id}? Their access will be restored.`,
                            confirmLabel: isActive(u) ? 'Deactivate' : 'Reactivate',
                            confirmClass: isActive(u)
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25'
                              : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25',
                            onConfirm: () => handleStatusToggle(u),
                          })}
                          className={`text-xs px-2 py-1 rounded-lg transition-colors ${isActive(u) ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'}`}
                          title={isActive(u) ? 'Deactivate' : 'Reactivate'}
                        >
                          {isActive(u) ? 'Deactivate' : 'Activate'}
                        </button>
                        {/* Reset password */}
                        <button
                          onClick={() => setModal({
                            type: 'confirm',
                            title: 'Reset Password',
                            message: `Send a password reset email to ${u.email || u.id}?`,
                            confirmLabel: 'Send Reset',
                            confirmClass: 'bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25',
                            onConfirm: () => handleResetPassword(u),
                          })}
                          className="text-xs px-2 py-1 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                          title="Reset password"
                        >
                          Reset
                        </button>
                        {/* Delete (non-admin targets only) */}
                        {canDeleteUser(actorRole, u.role) && (
                          <button
                            onClick={() => setModal({
                              type: 'confirm',
                              title: 'Delete User',
                              message: `Permanently delete ${u.email || u.id}? This cannot be undone.`,
                              confirmLabel: 'Delete',
                              confirmClass: 'bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25',
                              onConfirm: () => handleDeleteUser(u),
                            })}
                            className="text-xs px-2 py-1 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors"
                            title="Delete user"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <PaginationBar
          page={page}
          total={total}
          pageSize={DEFAULT_PAGE_SIZE}
          onPage={setPage}
        />
      </div>

      {/* Modals */}
      {modal?.type === 'invite' && (
        <InviteModal
          onClose={() => setModal(null)}
          onSuccess={refreshList}
        />
      )}
      {modal?.type === 'edit_role' && (
        <EditRoleModal
          user={modal.user}
          onClose={() => setModal(null)}
          onSuccess={refreshList}
        />
      )}
      {modal?.type === 'confirm' && (
        <ConfirmModal
          title={modal.title}
          message={modal.message}
          confirmLabel={modal.confirmLabel}
          confirmClass={modal.confirmClass}
          onClose={() => setModal(null)}
          onConfirm={modal.onConfirm}
        />
      )}
    </div>
  );
}
