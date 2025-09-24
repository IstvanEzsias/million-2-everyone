import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Key, AlertCircle } from "lucide-react";
import { useTranslation } from 'react-i18next';

interface PrivateKeyVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expectedPrivateKey: string;
  onVerificationSuccess: () => void;
}

const PrivateKeyVerificationDialog = ({ 
  open, 
  onOpenChange, 
  expectedPrivateKey, 
  onVerificationSuccess 
}: PrivateKeyVerificationDialogProps) => {
  const navigate = useNavigate();
  const [inputPrivateKey, setInputPrivateKey] = useState("");
  const [error, setError] = useState("");
  const { t } = useTranslation('profile');

  const handleVerification = () => {
    if (inputPrivateKey.trim() === expectedPrivateKey) {
      setError("");
      setInputPrivateKey("");
      onVerificationSuccess();
    } else {
      setError(t('dialogs.privateKeyVerification.incorrectKey'));
    }
  };

  const handleLostKey = () => {
    navigate("/");
    onOpenChange(false);
  };

  const handleInputChange = (value: string) => {
    setInputPrivateKey(value);
    if (error) {
      setError("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold text-primary flex items-center justify-center gap-2">
            <Key className="w-5 h-5" />
            {t('dialogs.privateKeyVerification.title')}
          </DialogTitle>
          <DialogDescription className="text-center text-base mt-4">
            {t('dialogs.privateKeyVerification.description')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 mt-6">
          <div>
            <Label htmlFor="privateKey">{t('dialogs.privateKeyVerification.enterPrivateKey')}</Label>
            <Input
              id="privateKey"
              type="password"
              value={inputPrivateKey}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder={t('dialogs.privateKeyVerification.placeholder')}
              className={error ? "border-destructive" : ""}
            />
            {error && (
              <div className="flex items-center gap-2 mt-2 text-sm text-destructive">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 mt-6">
          <Button 
            onClick={handleVerification}
            disabled={!inputPrivateKey.trim()}
            className="bg-primary hover:bg-primary-glow text-primary-foreground"
          >
            {t('dialogs.privateKeyVerification.verifyKey')}
          </Button>
          
          <Button 
            onClick={handleLostKey}
            variant="outline"
            className="text-destructive border-destructive hover:bg-destructive/10"
          >
            {t('dialogs.privateKeyVerification.lostKey')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PrivateKeyVerificationDialog;