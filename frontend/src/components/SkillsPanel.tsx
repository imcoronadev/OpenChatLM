import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { X, Plus, Trash2, Lock, Edit3 } from "lucide-react";
import { api, Skill } from "@/lib/api";
import { useSettingsStore } from "@/stores/settingsStore";

interface Props {
  open: boolean;
  onClose: () => void;
}

export const SkillsPanel: React.FC<Props> = ({ open, onClose }) => {
  const { t } = useTranslation();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [editing, setEditing] = useState<Skill | null>(null);
  const [creating, setCreating] = useState(false);
  const { activeSkills, toggleSkill } = useSettingsStore();

  const load = async () => {
    const s = await api.listSkills();
    setSkills(s);
  };
  useEffect(() => {
    if (open) load();
  }, [open]);

  if (!open) return null;

  const protectedSkills = skills.filter((s) => s.protected || s.is_meta);
  const userSkills = skills.filter((s) => !s.protected && !s.is_meta);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" style={{ width: "min(820px, 95vw)" }} onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="font-semibold text-lg flex items-center gap-2">
            {t("skills.title")}
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-primary" onClick={() => setCreating(true)}>
              <Plus size={14} /> {t("skills.new")}
            </button>
            <button className="btn btn-ghost" onClick={onClose}>
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="p-4 max-h-[70vh] overflow-y-auto space-y-5">
          <section>
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <Lock size={14} /> {t("skills.protected")}
            </h3>
            <p className="text-xs text-fg-mute mb-2">{t("skills.protected.note")}</p>
            <div className="space-y-2">
              {protectedSkills.map((s) => (
                <div key={s.id} className="border border-border rounded-lg p-3 bg-bg-soft">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium flex items-center gap-2">
                        {s.name}
                        {s.is_meta && <span className="tag">meta</span>}
                        {s.is_tool && <span className="tag">tool</span>}
                      </div>
                      <div className="text-xs text-fg-mute">{s.description}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={activeSkills.includes(s.id)}
                          onChange={() => !s.is_meta && toggleSkill(s.id)}
                          disabled={!!s.is_meta}
                        />
                        active
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="font-medium mb-2">User skills</h3>
            <div className="space-y-2">
              {userSkills.length === 0 && <div className="text-sm text-fg-mute">No skills yet.</div>}
              {userSkills.map((s) => (
                <div key={s.id} className="border border-border rounded-lg p-3 bg-bg-soft">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-fg-mute">{s.description}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <label className="text-xs flex items-center gap-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={activeSkills.includes(s.id)}
                          onChange={() => toggleSkill(s.id)}
                        />
                        active
                      </label>
                      <button className="btn btn-ghost" onClick={() => setEditing(s)}>
                        <Edit3 size={14} />
                      </button>
                      <button
                        className="btn btn-ghost btn-danger"
                        onClick={async () => {
                          if (confirm("Delete skill?")) {
                            await api.deleteSkill(s.id);
                            load();
                          }
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {(editing || creating) && (
        <SkillEditor
          initial={editing || undefined}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSaved={() => {
            setEditing(null);
            setCreating(false);
            load();
          }}
        />
      )}
    </div>
  );
};

const SkillEditor: React.FC<{
  initial?: Skill;
  onClose: () => void;
  onSaved: () => void;
}> = ({ initial, onClose, onSaved }) => {
  const [id, setId] = useState(initial?.id || "");
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [systemPrompt, setSystemPrompt] = useState(initial?.system_prompt_addition || "");
  const [keywords, setKeywords] = useState(
    Array.isArray(initial?.trigger_keywords) ? initial!.trigger_keywords.join(",") : (initial?.trigger_keywords as string) || ""
  );

  const save = async () => {
    const kw = keywords.split(",").map((s) => s.trim()).filter(Boolean);
    const payload = {
      id: id.trim(),
      name: name.trim(),
      description,
      system_prompt_addition: systemPrompt,
      trigger_keywords: kw,
      parameters: {},
    };
    if (initial) {
      await api.updateSkill(initial.id, payload);
    } else {
      await api.createSkill(payload);
    }
    onSaved();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" style={{ width: "min(640px, 95vw)" }} onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="font-semibold">{initial ? "Edit skill" : "New skill"}</div>
          <button className="btn btn-ghost" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-sm">ID</label>
            <input className="input" value={id} disabled={!!initial} onChange={(e) => setId(e.target.value)} />
          </div>
          <div>
            <label className="text-sm">Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm">Description</label>
            <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <label className="text-sm">Trigger keywords (comma-separated)</label>
            <input className="input" value={keywords} onChange={(e) => setKeywords(e.target.value)} />
          </div>
          <div>
            <label className="text-sm">System prompt addition</label>
            <textarea className="textarea" rows={8} value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)} />
          </div>
        </div>
        <div className="p-4 border-t border-border flex justify-end gap-2">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save} disabled={!id.trim() || !name.trim()}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
};