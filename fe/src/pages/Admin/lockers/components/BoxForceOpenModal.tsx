import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Button } from "~/components/ui/button";
import { AlertTriangle, Box, Unlock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { BoxStatus } from "~/types/admin/enums";

interface BoxData {
  id: number;
  number: number;
  status: BoxStatus;
  orderId?: string;
  size: string;
}

interface BoxForceOpenModalProps {
  isOpen: boolean;
  onClose: () => void;
  box: BoxData | null;
  onConfirm: (boxId: number) => void;
}

export function BoxForceOpenModal({
  isOpen,
  onClose,
  box,
  onConfirm,
}: BoxForceOpenModalProps) {
  const { t } = useTranslation();
  if (!box) return null;

  const handleConfirm = () => {
    onConfirm(box.id);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Unlock className="h-5 w-5 text-muted-foreground" />
            {t("admin.lockers.forceOpen.title")}
          </DialogTitle>
          <DialogDescription>
            {t("admin.lockers.forceOpen.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="p-4 bg-secondary/50 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-card border border-border rounded-lg flex items-center justify-center">
                <Box className="h-6 w-6 text-foreground" />
              </div>
              <div>
                <p className="font-semibold text-lg text-foreground">{t("admin.lockers.forceOpen.boxNumber", { number: box.number })}</p>
                <p className="text-xs text-muted-foreground">{t("admin.lockers.forceOpen.size", { size: box.size })}</p>
              </div>
            </div>
          </div>

          {box.orderId && (
            <div className="p-3 bg-secondary/30 border border-border/50 rounded-lg">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{t("admin.lockers.forceOpen.order")}</span> {box.orderId}
              </p>
            </div>
          )}

          <div className="flex items-start gap-2.5 p-3 bg-secondary/30 border border-border/60 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t("admin.lockers.forceOpen.warning")}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("button.cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
          >
            <Unlock className="mr-2 h-4 w-4" />
            {t("admin.lockers.forceOpen.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
