import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { api, errMsg } from "@/lib/api";
import { useProfile } from "@/context/ProfileContext";
import { PageHeader } from "@/components/PageHeader";
import { BrandLogo } from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Profile() {
  const { profile, setProfile } = useProfile();
  const [form, setForm] = useState(profile);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setForm(profile);
  }, [profile]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put("/app-profile", form);
      setProfile(data);
      toast.success("Profil usaha tersimpan");
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title="Profil Usaha" subtitle="Nama dan logo tampil di header aplikasi, struk kasir, dan tiket dapur." />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <form onSubmit={save} data-testid="profile-form" className="grid gap-5 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="grid gap-1.5">
            <Label htmlFor="app_name">Nama Usaha</Label>
            <Input id="app_name" data-testid="profile-app-name-input" required maxLength={120} value={form.app_name}
              onChange={(e) => setForm((f) => ({ ...f, app_name: e.target.value }))} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="logo_url">URL Logo</Label>
            <Input id="logo_url" data-testid="profile-logo-url-input" type="url" placeholder="https://..." value={form.logo_url}
              onChange={(e) => setForm((f) => ({ ...f, logo_url: e.target.value }))} />
            <p className="text-xs text-muted-foreground">Kosongkan untuk memakai ikon standar.</p>
          </div>
          <div>
            <Button data-testid="profile-save-button" type="submit" disabled={saving}><Save className="mr-1 h-4 w-4" />{saving ? "Menyimpan..." : "Simpan"}</Button>
          </div>
        </form>
        <ProfilePreview form={form} />
      </div>
    </div>
  );
}

const ProfilePreview = ({ form }) => (
  <div data-testid="profile-preview" className="rounded-2xl border border-border bg-card p-5">
    <p className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Pratinjau</p>
    <div className="flex items-center gap-3 rounded-xl bg-secondary p-3">
      <BrandLogo url={form.logo_url} />
      <p className="truncate font-bold tracking-tight">{form.app_name || "Nama Usaha"}</p>
    </div>
    <div className="mt-4 flex flex-col items-center gap-2 rounded-xl border border-dashed border-border p-4 text-center">
      <BrandLogo url={form.logo_url} className="h-12 w-12" iconClass="h-6 w-6" />
      <p className="font-bold">{form.app_name || "Nama Usaha"}</p>
      <p className="text-xs text-muted-foreground">Kop struk & tiket dapur</p>
    </div>
  </div>
);
