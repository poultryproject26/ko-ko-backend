import { useEffect, useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, setUser, getToken } from "@/lib/auth";
import { api, Hamlet, Street } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, User as UserIcon, Phone, Home, MapPin, RefreshCw } from "lucide-react";
import ChangePinCard from "@/components/ui/ChangePinCard";

interface ProfileTabProps {
  user: User;
  onUserUpdate: (u: User) => void;
}

const hamletLabel = (h: Hamlet, lang: string) => (lang === "en" ? h.nameEn || h.name : h.nameTa || h.name) || h.name;
const streetLabel = (s: Street, lang: string) => (lang === "en" ? s.nameEn || s.name : s.nameTa || s.name) || s.name;

const ProfileTab = ({ user, onUserUpdate }: ProfileTabProps) => {
  const { lang } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState(user.name);
  const [houseNo, setHouseNo] = useState(user.houseNo || "");
  const [hamletId, setHamletId] = useState(user.hamletId || "");
  const [streetId, setStreetId] = useState(user.streetId || "");

  const [hamlets, setHamlets] = useState<Hamlet[]>([]);
  const [hamletsLoading, setHamletsLoading] = useState(false);
  const [hamletsError, setHamletsError] = useState(false);

  const [streets, setStreets] = useState<Street[]>([]);
  const [streetsLoading, setStreetsLoading] = useState(false);
  const [streetsError, setStreetsError] = useState(false);

  const loadHamlets = () => {
    setHamletsLoading(true);
    setHamletsError(false);
    api.getHamlets()
      .then(setHamlets)
      .catch(() => {
        setHamletsError(true);
        toast.error(lang === "ta" ? "குக்கிராமங்களை ஏற்ற முடியவில்லை" : "Could not load hamlets");
      })
      .finally(() => setHamletsLoading(false));
  };

  const loadStreets = (id: string) => {
    setStreetsLoading(true);
    setStreetsError(false);
    api.getHamletStreets(id)
      .then(setStreets)
      .catch(() => {
        setStreetsError(true);
        setStreets([]);
        toast.error(lang === "ta" ? "தெருக்களை ஏற்ற முடியவில்லை" : "Could not load streets");
      })
      .finally(() => setStreetsLoading(false));
  };

  // Load the real hamlet list from the backend as soon as edit mode opens.
  useEffect(() => {
    if (editing) loadHamlets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  // Load the streets for whichever hamlet is currently selected — including the
  // farmer's existing hamletId when edit mode first opens, so their current
  // street can be preselected.
  useEffect(() => {
    if (editing && hamletId) {
      loadStreets(hamletId);
    } else {
      setStreets([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, hamletId]);

  const handleEdit = () => {
    setName(user.name);
    setHouseNo(user.houseNo || "");
    setHamletId(user.hamletId || "");
    setStreetId(user.streetId || "");
    setEditing(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error(lang === "ta" ? "பெயர் தேவை" : "Name is required");
      return;
    }
    setLoading(true);
    try {
      const updated = await api.updateProfile({
        name: name.trim(),
        houseNo,
        hamletId: hamletId || undefined,
        streetId: streetId || undefined,
      });
      const newUser: User = { ...user, ...updated };
      setUser(newUser, getToken());
      onUserUpdate(newUser);
      toast.success(lang === "ta" ? "சுயவிவரம் புதுப்பிக்கப்பட்டது ✅" : "Profile updated ✅");
      setEditing(false);
    } catch (err: any) {
      toast.error(err?.message || (lang === "ta" ? "புதுப்பிக்க முடியவில்லை" : "Update failed"));
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setName(user.name);
    setHouseNo(user.houseNo || "");
    setHamletId(user.hamletId || "");
    setStreetId(user.streetId || "");
    setEditing(false);
  };

  const Field = ({ icon: Icon, label, value }: { icon: any; label: string; value: string }) => (
    <div className="flex items-start gap-3 py-3 border-b border-border/40 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={15} className="text-primary" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-foreground">{value || "—"}</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Avatar card */}
      <div className="bg-white rounded-2xl border border-border/60 shadow-sm overflow-hidden">
        <div className="px-4 py-5 flex items-center gap-4" style={{ background: "linear-gradient(135deg, #2E7D32, #4CAF50)" }}>
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-2xl font-bold text-white">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-base font-bold text-white">{user.name}</p>
            <p className="text-xs text-white/75">{user.shgName || user.shg_name || ""}</p>
            <p className="text-xs text-white/60">{user.role}</p>
          </div>
        </div>
      </div>

      {/* Details card */}
      <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-4">
        {!editing ? (
          <>
            <Field icon={UserIcon} label={lang === "ta" ? "பெயர்" : "Name"} value={user.name} />
            <Field icon={Phone} label={lang === "ta" ? "கைபேசி எண்" : "Phone"} value={user.phone} />
            <Field icon={Home} label={lang === "ta" ? "வீட்டு எண்" : "House No"} value={user.houseNo || ""} />
            <Field icon={MapPin} label={lang === "ta" ? "குக்கிராமம்" : "Hamlet"} value={user.hamlet || ""} />
            <Field icon={MapPin} label={lang === "ta" ? "தெரு" : "Street"} value={user.street || ""} />
            <Field icon={UserIcon} label={lang === "ta" ? "SHG குழு" : "SHG Group"} value={user.shgName || user.shg_name || ""} />
            <Button
              onClick={handleEdit}
              className="w-full mt-4 rounded-xl font-bold"
              style={{ background: "linear-gradient(135deg, #2E7D32, #4CAF50)" }}
            >
              ✏️ {lang === "ta" ? "திருத்து" : "Edit Profile"}
            </Button>
          </>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-semibold">{lang === "ta" ? "பெயர்" : "Name"}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="border-2 focus:border-primary rounded-xl" />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-semibold">{lang === "ta" ? "கைபேசி எண்" : "Phone"}</Label>
              <Input value={user.phone} disabled className="border-2 rounded-xl bg-muted/40 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{lang === "ta" ? "கைபேசி எண் மாற்ற முடியாது" : "Phone number cannot be changed"}</p>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label className="text-sm font-semibold">{lang === "ta" ? "வீட்டு எண்" : "House No"}</Label>
              <Input value={houseNo} onChange={(e) => setHouseNo(e.target.value)} className="border-2 focus:border-primary rounded-xl" />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">{lang === "ta" ? "குக்கிராமம்" : "Hamlet"}</Label>
                {hamletsLoading && <Loader2 className="animate-spin text-muted-foreground" size={14} />}
              </div>
              <Select
                value={hamletId}
                onValueChange={(v) => { setHamletId(v); setStreetId(""); }}
                disabled={hamletsLoading || hamletsError}
              >
                <SelectTrigger className="border-2 focus:border-primary rounded-xl">
                  <SelectValue placeholder={lang === "ta" ? "குக்கிராமத்தை தேர்ந்தெடுக்கவும்" : "Select hamlet"} />
                </SelectTrigger>
                <SelectContent>
                  {hamlets.map((h) => (
                    <SelectItem key={h._id} value={h._id}>{hamletLabel(h, lang)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hamletsError && (
                <button
                  type="button"
                  onClick={loadHamlets}
                  className="flex items-center gap-1.5 text-xs font-semibold text-danger"
                >
                  <RefreshCw size={12} /> {lang === "ta" ? "மீண்டும் முயற்சிக்கவும்" : "Retry"}
                </button>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">{lang === "ta" ? "தெரு" : "Street"}</Label>
                {streetsLoading && <Loader2 className="animate-spin text-muted-foreground" size={14} />}
              </div>
              <Select
                value={streetId}
                onValueChange={setStreetId}
                disabled={!hamletId || streetsLoading || streetsError}
              >
                <SelectTrigger className="border-2 focus:border-primary rounded-xl">
                  <SelectValue placeholder={
                    !hamletId
                      ? (lang === "ta" ? "முதலில் குக்கிராமத்தை தேர்ந்தெடுக்கவும்" : "Select a hamlet first")
                      : (lang === "ta" ? "தெருவை தேர்ந்தெடுக்கவும்" : "Select street")
                  } />
                </SelectTrigger>
                <SelectContent>
                  {streets.map((s) => (
                    <SelectItem key={s._id} value={s._id}>{streetLabel(s, lang)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {streetsError && (
                <button
                  type="button"
                  onClick={() => loadStreets(hamletId)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-danger"
                >
                  <RefreshCw size={12} /> {lang === "ta" ? "மீண்டும் முயற்சிக்கவும்" : "Retry"}
                </button>
              )}
            </div>

            <div className="flex gap-2 mt-2">
              <Button variant="outline" onClick={handleCancel} className="flex-1 rounded-xl">
                {lang === "ta" ? "ரத்து" : "Cancel"}
              </Button>
              <Button onClick={handleSave} disabled={loading} className="flex-1 rounded-xl font-bold" style={{ background: "linear-gradient(135deg, #2E7D32, #4CAF50)" }}>
                {loading ? <Loader2 className="animate-spin" size={18} /> : (lang === "ta" ? "சேமி" : "Save")}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Change PIN card */}
      <ChangePinCard />
    </div>
  );
};

export default ProfileTab;
