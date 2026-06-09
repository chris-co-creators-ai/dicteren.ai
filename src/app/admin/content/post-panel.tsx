"use client";

import { useEffect, useRef, useState } from "react";
import { Upload, Trash2, X, Check } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CHANNELS, type Channel, type PostStatus, type Space, type TeamMember } from "./content-client";

type LibraryAsset = {
  id: string;
  fileName: string;
  kind: "image" | "video" | "document";
  url: string | null;
  thumbnailUrl: string | null;
};

const STATUSES: { value: PostStatus; label: string }[] = [
  { value: "idea", label: "Idee" },
  { value: "draft", label: "Concept" },
  { value: "scheduled", label: "Gepland" },
  { value: "published", label: "Gepubliceerd" },
  { value: "cancelled", label: "Geannuleerd" },
];

// Date → waarde voor <input type="datetime-local"> (lokale tijd).
function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PostPanel({
  spaces,
  team,
  mode,
  postId,
  defaultDate,
  defaultSpaceId,
  onClose,
  onSaved,
}: {
  spaces: Space[];
  team: TeamMember[];
  mode: "new" | "edit";
  postId?: string;
  defaultDate: Date | null;
  defaultSpaceId?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [spaceId, setSpaceId] = useState(defaultSpaceId ?? spaces[0]?.id ?? "");
  const [channel, setChannel] = useState<Channel>("linkedin");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<PostStatus>(defaultDate ? "scheduled" : "idea");
  const [scheduledLocal, setScheduledLocal] = useState(
    defaultDate ? toLocalInput(new Date(defaultDate.setHours(9, 0, 0, 0))) : "",
  );
  const [assignee, setAssignee] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [library, setLibrary] = useState<LibraryAsset[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Edit: laad de post.
  useEffect(() => {
    if (mode !== "edit" || !postId) return;
    (async () => {
      const res = await fetch(`/api/admin/content/posts/${postId}`);
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error ?? "Laden mislukt");
        return;
      }
      const p = data.post;
      setSpaceId(p.spaceId);
      setChannel(p.channel);
      setTitle(p.title);
      setBody(p.body ?? "");
      setStatus(p.status);
      setScheduledLocal(p.scheduledAt ? toLocalInput(new Date(p.scheduledAt)) : "");
      setAssignee(p.assigneeUserId ?? "");
      setSelected(p.assets.map((a: { id: string }) => a.id));
    })();
  }, [mode, postId]);

  // Laad de bibliotheek van de gekozen ruimte.
  useEffect(() => {
    if (!spaceId) return;
    (async () => {
      const res = await fetch(`/api/admin/content/assets?space=${spaceId}`);
      const data = await res.json();
      if (data.success) setLibrary(data.assets);
    })();
  }, [spaceId]);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const signRes = await fetch("/api/admin/content/assets/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spaceId,
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
        }),
      });
      const sign = await signRes.json();
      if (!sign.success) {
        toast.error(sign.error ?? "Upload-voorbereiding mislukt");
        return;
      }
      const put = await fetch(sign.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!put.ok) {
        toast.error("Upload naar opslag mislukt");
        return;
      }
      const regRes = await fetch("/api/admin/content/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          spaceId,
          r2Key: sign.r2Key,
          kind: sign.kind,
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
        }),
      });
      const reg = await regRes.json();
      if (!reg.success) {
        toast.error(reg.error ?? "Registratie mislukt");
        return;
      }
      // Bibliotheek herladen (incl. presigned thumbnail-URL) + selecteren.
      const listRes = await fetch(`/api/admin/content/assets?space=${spaceId}`);
      const listData = await listRes.json();
      if (listData.success) setLibrary(listData.assets);
      setSelected((s) => [...s, reg.asset.id]);
      toast.success("Bestand geüpload");
    } catch {
      toast.error("Upload mislukt");
    } finally {
      setUploading(false);
    }
  }

  function toggleAsset(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  async function handleSave() {
    if (!title.trim()) {
      toast.error("Titel is verplicht");
      return;
    }
    if (!spaceId) {
      toast.error("Kies een ruimte");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        spaceId,
        channel,
        title: title.trim(),
        body: body.trim() || null,
        status,
        scheduledAt: scheduledLocal ? new Date(scheduledLocal).toISOString() : null,
        assigneeUserId: assignee || null,
        assetIds: selected,
      };
      const res =
        mode === "edit"
          ? await fetch(`/api/admin/content/posts/${postId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            })
          : await fetch("/api/admin/content/posts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error ?? "Opslaan mislukt");
        return;
      }
      toast.success(mode === "edit" ? "Post bijgewerkt" : "Post aangemaakt");
      onSaved();
    } catch {
      toast.error("Opslaan mislukt");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (mode !== "edit" || !postId) return;
    if (!confirm("Deze post verwijderen?")) return;
    const res = await fetch(`/api/admin/content/posts/${postId}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      toast.success("Post verwijderd");
      onSaved();
    } else {
      toast.error(data.error ?? "Verwijderen mislukt");
    }
  }

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="flex w-full flex-col gap-0 overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{mode === "edit" ? "Post bewerken" : "Nieuwe post"}</SheetTitle>
          <SheetDescription>
            Plan content op de kalender. Bij status &quot;gepland&quot; met een AM en datum
            verschijnt automatisch een taak.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-4 px-4 py-2">
          <Field label="Ruimte">
            <select
              value={spaceId}
              onChange={(e) => setSpaceId(e.target.value)}
              disabled={mode === "edit"}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm disabled:opacity-60"
            >
              {spaces.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Kanaal">
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(CHANNELS) as Channel[]).map((c) => {
                const cfg = CHANNELS[c];
                const Icon = cfg.Icon;
                const active = channel === c;
                return (
                  <button
                    key={c}
                    onClick={() => setChannel(c)}
                    className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs ${
                      active ? "border-transparent text-white" : "hover:bg-muted"
                    }`}
                    style={active ? { backgroundColor: cfg.color } : undefined}
                  >
                    <Icon className="size-3.5" />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Titel">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Korte titel" />
          </Field>

          <Field label="Tekst (caption / script / body)">
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              placeholder="De caption, het script of de e-mailtekst"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Status">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as PostStatus)}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Datum + tijd">
              <Input
                type="datetime-local"
                value={scheduledLocal}
                onChange={(e) => setScheduledLocal(e.target.value)}
              />
            </Field>
          </div>

          <Field label="Verantwoordelijke AM">
            <select
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="">Niemand toegewezen</option>
              {team.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>

          {/* Asset-picker */}
          <Field label="Media uit de bibliotheek">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  accept="image/*,video/*,application/pdf"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(f);
                    e.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading || !spaceId}
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="size-4" />
                  {uploading ? "Uploaden…" : "Uploaden"}
                </Button>
                <span className="text-xs text-muted-foreground">
                  {selected.length} geselecteerd
                </span>
              </div>
              {library.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {library.map((a) => {
                    const on = selected.includes(a.id);
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => toggleAsset(a.id)}
                        className={`relative aspect-square overflow-hidden rounded-md border-2 ${
                          on ? "border-primary" : "border-transparent"
                        }`}
                        title={a.fileName}
                      >
                        {a.thumbnailUrl || a.url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={(a.kind === "image" ? a.url : a.thumbnailUrl) ?? a.url ?? ""}
                            alt={a.fileName}
                            className="size-full bg-muted object-cover"
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center bg-muted text-[10px] text-muted-foreground">
                            {a.kind}
                          </div>
                        )}
                        {on && (
                          <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                            <Check className="size-3" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
                  Nog geen media in deze ruimte. Upload een bestand.
                </p>
              )}
            </div>
          </Field>
        </div>

        <SheetFooter className="flex-row items-center justify-between gap-2 border-t">
          {mode === "edit" ? (
            <Button variant="ghost" size="sm" onClick={handleDelete} className="text-destructive">
              <Trash2 className="size-4" /> Verwijderen
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="size-4" /> Annuleren
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Opslaan…" : "Opslaan"}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
    </div>
  );
}
