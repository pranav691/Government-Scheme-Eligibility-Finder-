"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function AdminUsersList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [deletingId, setDeletingId] = useState(null);

  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    async function loadUsers() {
      try {
        const response = await fetch("/api/admin/users", {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Unable to load users.");
          return;
        }

        setUsers(data.users || []);
      } catch (error) {
        console.error(error);
        setError("Unable to load users.");
      } finally {
        setLoading(false);
      }
    }

    loadUsers();
  }, [refreshKey]);

  async function deleteUser(user) {
    const confirmed = window.confirm(
      `Delete ${user.role_name} "${user.full_name}" (${user.email})? Their profile will be removed too. This cannot be undone.`
    );

    if (!confirmed) return;

    setDeletingId(user.user_id);
    setError("");

    try {
      const response = await fetch(`/api/admin/users/${user.user_id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Unable to delete user.");
        return;
      }

      setRefreshKey((key) => key + 1);
    } catch (error) {
      console.error(error);
      setError("Unable to delete user.");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Loading users...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-6xl">

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-teal-400">
              Admin
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              Users
            </h1>

            <p className="mt-2 text-slate-400">
              Registered students, officers and administrators.
            </p>
          </div>

          <Link
            href="/admin"
            className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold hover:bg-slate-800"
          >
            Back to Dashboard
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
            {error}
          </div>
        )}

        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-950">
              <tr>
                <th className="px-5 py-4">ID</th>
                <th className="px-5 py-4">Name</th>
                <th className="px-5 py-4">Email</th>
                <th className="px-5 py-4">Role</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Created</th>
                <th className="px-5 py-4">Actions</th>
              </tr>
            </thead>

            <tbody>
              {users.map((user) => (
                <tr
                  key={user.user_id}
                  className="border-b border-slate-800 last:border-b-0"
                >
                  <td className="px-5 py-4">
                    {user.user_id}
                  </td>

                  <td className="px-5 py-4 font-medium">
                    {user.full_name}
                  </td>

                  <td className="px-5 py-4 text-slate-300">
                    {user.email}
                  </td>

                  <td className="px-5 py-4 capitalize">
                    {user.role_name}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        user.is_active
                          ? "bg-emerald-500/10 text-emerald-300"
                          : "bg-red-500/10 text-red-300"
                      }`}
                    >
                      {user.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-slate-400">
                    {new Date(user.created_at).toLocaleString()}
                  </td>

                  <td className="px-5 py-4">
                    {user.role_name !== "admin" && (
                      <button
                        onClick={() => deleteUser(user)}
                        disabled={deletingId === user.user_id}
                        className="rounded-xl border border-red-500/40 px-3 py-1 text-xs font-semibold text-red-300 hover:bg-red-500/10 disabled:opacity-60"
                      >
                        {deletingId === user.user_id
                          ? "Deleting..."
                          : "Delete"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </main>
  );
}