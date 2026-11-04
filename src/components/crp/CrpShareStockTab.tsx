import { useEffect, useState } from "react";
import { useLanguage } from "@/i18n/LanguageContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getAggregatedStock, getLatestMarketPrice } from "@/lib/crpMockData";
import { api } from "@/lib/api";
import { MessageCircle } from "lucide-react";

const CrpShareStockTab = () => {
  const { t } = useLanguage();
  const stock = getAggregatedStock();
  const [marketPrice, setMarketPrice] = useState<any>(null);
  const [customPhone, setCustomPhone] = useState("");

  useEffect(() => {
    api.getMarketPrice().then(setMarketPrice).catch(() => {});
  }, []);

  const broilerPrice = marketPrice?.broiler ?? "—";
  const chickPrice = marketPrice?.chick ?? "—";
  const eggPrice = marketPrice?.egg ?? "—";

  const stockMessage =
    `🐔 கோ-கோ செயலி — கோழி இருப்பு விவரம்\n\n` +
    `🐣 குஞ்சுகள்: ${stock.chicks}\n` +
    `🐔 வளர் பருவம்: ${stock.growers}\n` +
    `🥚 வளர்ந்த கோழிகள்: ${stock.layers}\n` +
    `🍗 நாட்டுக்கோழி: ${stock.broilers}\n` +
    `📦 மொத்தம்: ${stock.total}\n\n` +
    `💰 இன்றைய விலை:\n` +
    `நாட்டுக்கோழி: ₹${broilerPrice}/kg\n` +
    `நாட்டுக்கோழி குஞ்சுகள்: ₹${chickPrice}/குஞ்சு\n` +
    `நாட்டுக்கோழி முட்டை: ₹${eggPrice}/முட்டை`;

  const handleShareGeneral = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(stockMessage)}`, "_blank");
  };

  const handleShareToNumber = () => {
    if (customPhone.length !== 10) return;
    window.open(`https://wa.me/91${customPhone}?text=${encodeURIComponent(stockMessage)}`, "_blank");
  };

  return (
    <div className="flex flex-col gap-5">

      {/* Stock summary */}
      <Card className="p-5 bg-primary text-primary-foreground">
        <h2 className="text-base font-bold mb-3">கோழி இருப்பு (Available Stock)</h2>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <span>🐣 குஞ்சுகள்: {stock.chicks}</span>
          <span>🐔 வளர் பருவம்: {stock.growers}</span>
          <span>🥚 வளர்ந்தவை: {stock.layers}</span>
          <span>🍗 நாட்டுக்கோழி: {stock.broilers}</span>
        </div>
        <p className="text-base font-bold mt-3">மொத்தம்: {stock.total}</p>
        <p className="text-xs mt-1 opacity-90">
          ₹{broilerPrice}/kg • ₹{chickPrice}/குஞ்சு • ₹{eggPrice}/முட்டை
        </p>
      </Card>

      {/* Share to anyone via WhatsApp */}
      <Card className="p-5 bg-card flex flex-col gap-4">
        <h2 className="text-base font-bold text-foreground">WhatsApp மூலம் பகிர்</h2>

        {/* Share to a specific number */}
        <div>
          <Label className="text-sm font-medium mb-2 block">
            குறிப்பிட்ட எண்ணுக்கு அனுப்பு (Send to specific number)
          </Label>
          <div className="flex gap-2">
            <Input
              value={customPhone}
              onChange={(e) => setCustomPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="9876543210"
              inputMode="numeric"
              type="tel"
              className="tap-target flex-1"
            />
            <Button
              onClick={handleShareToNumber}
              disabled={customPhone.length !== 10}
              className="bg-success text-success-foreground gap-2 shrink-0"
            >
              <MessageCircle size={16} /> அனுப்பு
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">அல்லது (or)</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Broadcast to anyone */}
        <Button
          onClick={handleShareGeneral}
          className="tap-target w-full text-base font-bold bg-success text-success-foreground gap-2"
        >
          <MessageCircle size={18} /> WhatsApp Broadcast
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          இது WhatsApp-ல் திறக்கும், நீங்கள் யாருக்கு வேண்டுமானாலும் அனுப்பலாம்
        </p>
      </Card>
    </div>
  );
};

export default CrpShareStockTab;
