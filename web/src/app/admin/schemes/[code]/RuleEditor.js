"use client";

import { useState } from "react";

import { OPERATORS_BY_TYPE, RULE_ATTRIBUTES } from "@/lib/ruleValidation";

const ATTRIBUTE_NAMES = Object.keys(RULE_ATTRIBUTES).sort();

function ruleValue(rule) {
  if (rule.value_type === "numeric") return String(rule.numeric_value);
  if (rule.value_type === "boolean") return rule.boolean_value ? "true" : "false";
  return rule.text_value;
}

function RuleForm({ initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState({
    attribute_name: initial?.attribute_name || "",
    operator: initial?.operator || "=",
    value: initial ? ruleValue(initial) : "",
    failure_message: initial?.failure_message || "",
  });

  // The type always follows the chosen attribute.
  const valueType = RULE_ATTRIBUTES[form.attribute_name] || null;
  const operators = valueType ? OPERATORS_BY_TYPE[valueType] : [];

  function change(e) {
    const { name, value } = e.target;

    setForm((f) => {
      const next = { ...f, [name]: value };

      if (name === "attribute_name") {
        const type = RULE_ATTRIBUTES[value];
        if (type && !OPERATORS_BY_TYPE[type].includes(f.operator)) {
          next.operator = "=";
        }
        if (type === "boolean") next.value = "true";
        else if (RULE_ATTRIBUTES[f.attribute_name] !== type) next.value = "";
      }

      return next;
    });
  }

  const input =
    "w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-teal-400";

  return (
    <div className="mt-3 grid gap-3 rounded-lg border border-slate-700 p-4 md:grid-cols-5">
      <select className={input} name="attribute_name" value={form.attribute_name} onChange={change}>
        <option value="">Choose attribute...</option>
        {ATTRIBUTE_NAMES.map((a) => (
          <option key={a} value={a}>{a} ({RULE_ATTRIBUTES[a]})</option>
        ))}
      </select>

      <select className={input} name="operator" value={form.operator} onChange={change} disabled={!valueType}>
        {operators.map((o) => <option key={o}>{o}</option>)}
      </select>

      {valueType === "boolean" ? (
        <select className={input} name="value" value={form.value || "true"} onChange={change}>
          <option value="true">true</option>
          <option value="false">false</option>
        </select>
      ) : (
        <input className={input} name="value"
          placeholder={
            valueType === "numeric" ? "number"
              : form.operator === "IN" || form.operator === "NOT IN" ? "comma-separated, e.g. SC,ST,OBC"
              : "value"
          }
          value={form.value} onChange={change} disabled={!valueType} />
      )}

      <input className={`${input} md:col-span-2`} name="failure_message" placeholder="message shown if not met"
        value={form.failure_message} onChange={change} />

      <div className="flex gap-2 md:col-span-5">
        <button type="button" disabled={saving || !valueType}
          onClick={() => onSave({ ...form, value: valueType === "boolean" && !form.value ? "true" : form.value })}
          className="rounded-lg bg-teal-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60">
          {saving ? "Saving..." : "Save Rule"}
        </button>
        <button type="button" onClick={onCancel}
          className="rounded-lg border border-slate-700 px-4 py-2 text-sm">
          Cancel
        </button>
      </div>
    </div>
  );
}

export default function RuleEditor({ code, initialGroups }) {
  const [groups, setGroups] = useState(initialGroups);
  const [editingId, setEditingId] = useState(null);
  const [addingGroupId, setAddingGroupId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [newGroupName, setNewGroupName] = useState("");

  async function refresh() {
    const res = await fetch(`/api/admin/schemes/${encodeURIComponent(code)}`, { cache: "no-store" });
    const data = await res.json();
    if (res.ok) setGroups(data.eligibility_groups || []);
  }

  async function send(url, method, body) {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Request failed.");
        return false;
      }
      await refresh();
      return true;
    } catch (e) {
      console.error(e);
      setError("Request failed.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function addRule(groupId, form) {
    const ok = await send("/api/admin/rules", "POST", { ...form, group_id: groupId });
    if (ok) setAddingGroupId(null);
  }

  async function updateRule(ruleId, form) {
    const ok = await send(`/api/admin/rules/${ruleId}`, "PUT", form);
    if (ok) setEditingId(null);
  }

  async function deleteRule(ruleId) {
    if (!confirm("Delete this rule?")) return;
    await send(`/api/admin/rules/${ruleId}`, "DELETE");
  }

  async function addGroup() {
    const name = newGroupName.trim();
    if (!name) {
      setError("Enter a name for the new group.");
      return;
    }

    const ok = await send("/api/admin/rule-groups", "POST", {
      scheme_code: code,
      group_name: name,
    });

    if (ok) setNewGroupName("");
  }

  async function deleteGroup(group) {
    if (
      !confirm(
        `Delete group "${group.group_name}" and all ${group.rules.length} of its rules?`
      )
    ) {
      return;
    }

    await send(`/api/admin/rule-groups/${group.group_id}`, "DELETE");
  }

  return (
    <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-xl font-bold">Eligibility Rules</h2>
      <p className="mt-2 text-sm text-slate-400">
        Rules inside a group use AND. Different groups are alternative OR paths.
      </p>

      {error && (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-red-300">
          {error}
        </div>
      )}

      <div className="mt-6 space-y-5">
        {groups.map((group) => (
          <div key={group.group_id} className="rounded-xl border border-slate-800 bg-slate-950 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold text-teal-400">{group.group_name}</h3>
                <p className="mt-1 text-xs text-slate-500">Group order: {group.group_order}</p>
              </div>

              <button
                type="button"
                onClick={() => deleteGroup(group)}
                className="text-xs text-red-400"
              >
                Delete group
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {group.rules.map((rule) =>
                editingId === rule.rule_id ? (
                  <RuleForm key={rule.rule_id} initial={rule} saving={saving}
                    onSave={(f) => updateRule(rule.rule_id, f)}
                    onCancel={() => setEditingId(null)} />
                ) : (
                  <div key={rule.rule_id}
                    className="flex items-center justify-between rounded-lg border border-slate-800 px-4 py-3 text-sm">
                    <div>
                      <span className="font-semibold">{rule.attribute_name}</span>{" "}
                      {rule.operator}{" "}
                      <span className="text-teal-300">{ruleValue(rule)}</span>
                    </div>
                    <div className="flex gap-3 text-xs">
                      <button onClick={() => setEditingId(rule.rule_id)} className="text-teal-400">Edit</button>
                      <button onClick={() => deleteRule(rule.rule_id)} className="text-red-400">Delete</button>
                    </div>
                  </div>
                )
              )}
            </div>

            {addingGroupId === group.group_id ? (
              <RuleForm saving={saving}
                onSave={(f) => addRule(group.group_id, f)}
                onCancel={() => setAddingGroupId(null)} />
            ) : (
              <button onClick={() => setAddingGroupId(group.group_id)}
                className="mt-4 text-sm font-semibold text-teal-400">
                + Add rule
              </button>
            )}
          </div>
        ))}
      </div>

      {groups.length === 0 && (
        <p className="mt-6 text-sm text-slate-400">
          This scheme has no eligibility rule groups yet.
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-3">
        <input
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          placeholder="New alternative group name (e.g. Lateral entry)"
          className="min-w-64 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-teal-400"
        />

        <button
          type="button"
          disabled={saving}
          onClick={addGroup}
          className="rounded-lg bg-teal-400 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
        >
          + Add group
        </button>
      </div>
    </section>
  );
}