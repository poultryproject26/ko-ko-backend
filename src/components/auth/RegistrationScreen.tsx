import { useState, useEffect } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, Street } from "@/lib/api";
import { useHamlets, hamletDisplayName } from "@/hooks/use-hamlets";
import { ArrowLeft, Loader2 } from "lucide-react";

interface RegistrationScreenProps {
  onNext: (data: {
    name: string;
    phone: string;
    hamlet: string;
    hamletId: string;
    houseNo: string;
    street: string;
    streetId: string;
    shgName: string;
  }) => void;
  onBack: () => void;
}

/* MOVE THIS OUTSIDE THE COMPONENT */
const FieldRow = ({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) => (
  <div className="flex flex-col gap-1.5">
    <Label
      htmlFor={htmlFor}
      className="text-sm font-semibold text-foreground"
    >
      {label}
    </Label>
    {children}
  </div>
);

const RegistrationScreen = ({
  onNext,
  onBack,
}: RegistrationScreenProps) => {
  const { t, lang, setLang } = useLanguage();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [houseNo, setHouseNo] = useState("");
  const [streetId, setStreetId] = useState("");
  const [hamletId, setHamletId] = useState("");
  const [shgName, setShgName] = useState("");
  const [shgNames, setShgNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const { hamlets, hamletsLoading } = useHamlets();

  const [streets, setStreets] = useState<Street[]>([]);
  const [streetsLoading, setStreetsLoading] = useState(false);

  useEffect(() => {
    api
      .getShgGroups()
      .then((data: any[]) => setShgNames(data.map((g) => g.name)))
      .catch(() => {});
  }, []);

  // Load the canonical streets for whichever hamlet is currently selected.
  useEffect(() => {
    if (!hamletId) { setStreets([]); return; }
    setStreetsLoading(true);
    api.getHamletStreets(hamletId)
      .then(setStreets)
      .catch(() => setStreets([]))
      .finally(() => setStreetsLoading(false));
  }, [hamletId]);

  const availableStreets = streets;

  const selectedHamlet = hamlets.find((h) => h._id === hamletId);
  const selectedStreet = streets.find((s) => s._id === streetId);

  const isValid =
    name.trim() &&
    phone.length === 10 &&
    hamletId &&
    streetId &&
    shgName;

  const handleSubmit = async () => {
    if (!isValid || !selectedHamlet || !selectedStreet) return;

    setLoading(true);

    await new Promise((r) => setTimeout(r, 400));

    setLoading(false);

    onNext({
      name,
      phone,
      hamlet: hamletDisplayName(selectedHamlet, lang),
      hamletId,
      houseNo,
      street: (lang === "en" ? selectedStreet.nameEn || selectedStreet.name : selectedStreet.nameTa || selectedStreet.name) || selectedStreet.name,
      streetId,
      shgName,
    });
  };

  const handleHamletChange = (value: string) => {
    setHamletId(value);
    setStreetId("");
  };

  return (
    <div
      className="flex flex-col min-h-screen"
      style={{
        background:
          "linear-gradient(160deg, #f1f8e9 0%, #e8f5e9 50%, #f9fbe7 100%)",
      }}
    >
      {/* Header */}
      <div className="relative agri-header-gradient px-5 pt-12 pb-8">
        <div className="flex justify-between items-start">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-white/80 hover:text-white mb-4 w-fit"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-medium">
              {t("back")}
            </span>
          </button>

          <button
            onClick={() => setLang(lang === "ta" ? "en" : "ta")}
            className="text-xs font-bold border border-white/30 rounded-lg px-2.5 py-1 text-white/80 hover:text-white hover:border-white/60 bg-white/10"
          >
            {lang === "ta" ? "EN" : "தமிழ்"}
          </button>
        </div>

        <h1 className="text-xl font-bold text-white">
          {t("registration")}
        </h1>

        <p className="text-sm text-white/75 mt-1">
          {t("newRegistrationSub")}
        </p>
      </div>

      <div className="flex-1 px-5 py-6 flex flex-col gap-4">
        <div className="bg-white rounded-2xl border border-border/60 shadow-sm p-5 flex flex-col gap-4">

          <FieldRow label={t("fullName")} htmlFor="name">
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-base border-2 focus:border-primary rounded-xl"
              placeholder={t("yourNamePlaceholder")}
            />
          </FieldRow>

          <FieldRow label={t("phoneNumber")} htmlFor="phone">
            <Input
              id="phone"
              value={phone}
              onChange={(e) =>
                setPhone(
                  e.target.value.replace(/\D/g, "").slice(0, 10)
                )
              }
              className="text-base border-2 focus:border-primary rounded-xl tracking-widest font-semibold"
              inputMode="numeric"
              type="tel"
              placeholder="9876543210"
            />
          </FieldRow>

          {/* Address section */}
          <div className="bg-muted/40 rounded-xl p-4 flex flex-col gap-3">
            <p className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <span>🏠</span> {t("address")}
            </p>

            <FieldRow label={t("houseNo")} htmlFor="houseNo">
              <Input
                id="houseNo"
                value={houseNo}
                onChange={(e) => setHouseNo(e.target.value)}
                className="text-base bg-white border-2 focus:border-primary rounded-xl"
              />
            </FieldRow>

            <FieldRow label={t("village")}>
              <Select
                value={hamletId}
                onValueChange={handleHamletChange}
                disabled={hamletsLoading}
              >
                <SelectTrigger className="tap-target text-base bg-white border-2 focus:border-primary rounded-xl">
                  <SelectValue placeholder={hamletsLoading ? t("loading") : t("selectHamlet")} />
                </SelectTrigger>

                <SelectContent>
                  {!hamletsLoading && hamlets.length === 0 && (
                    <div className="px-3 py-2 text-sm text-muted-foreground">{t("noHamletsFound")}</div>
                  )}
                  {hamlets.map((h) => (
                    <SelectItem
                      key={h._id}
                      value={h._id}
                      className="text-base py-3"
                    >
                      {hamletDisplayName(h, lang)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldRow>

            <FieldRow label={t("street")}>
              <Select
                value={streetId}
                onValueChange={setStreetId}
                disabled={!hamletId || streetsLoading}
              >
                <SelectTrigger className="tap-target text-base bg-white border-2 focus:border-primary rounded-xl">
                  <SelectValue placeholder={
                    !hamletId
                      ? t("selectHamletFirstPlaceholder")
                      : (streetsLoading ? t("loading") : t("selectStreet"))
                  } />
                </SelectTrigger>

                <SelectContent>
                  {!streetsLoading && hamletId && availableStreets.length === 0 && (
                    <div className="px-3 py-2 text-sm text-muted-foreground">{t("noStreetsFound")}</div>
                  )}
                  {availableStreets.map((s) => (
                    <SelectItem
                      key={s._id}
                      value={s._id}
                      className="text-base py-3"
                    >
                      {(lang === "en" ? s.nameEn || s.name : s.nameTa || s.name) || s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldRow>
          </div>

          <FieldRow label={t("shgGroupName")}>
            <Select value={shgName} onValueChange={setShgName}>
              <SelectTrigger className="tap-target text-base border-2 focus:border-primary rounded-xl">
                <SelectValue placeholder={t("selectShg")} />
              </SelectTrigger>

              <SelectContent>
                {shgNames.map((s) => (
                  <SelectItem
                    key={s}
                    value={s}
                    className="text-base py-3"
                  >
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!isValid || loading}
          className="tap-target w-full text-base font-bold rounded-xl shadow-sm disabled:opacity-40 mt-1"
          style={{
            background: isValid
              ? "linear-gradient(135deg, #2E7D32, #4CAF50)"
              : undefined,
          }}
        >
          {loading ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            t("submit") + " →"
          )}
        </Button>
      </div>
    </div>
  );
};

export default RegistrationScreen;