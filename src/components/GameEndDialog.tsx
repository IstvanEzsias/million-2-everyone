import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { generateWallet, type WalletData } from "@/utils/walletGenerator";
import { toast } from "@/hooks/use-toast";
import { Copy, RefreshCw, Mail, Key, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import hundredMillionLogo from "@/assets/100-million-logo.png";

interface GameEndDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const GameEndDialog = ({ open, onOpenChange }: GameEndDialogProps) => {
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [librariesLoaded, setLibrariesLoaded] = useState(false);
  const [email, setEmail] = useState("");

  // Check if libraries are loaded with timeout fallback
  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 50; // 5 second timeout (50 * 100ms)
    
    const checkLibraries = () => {
      console.log('Checking libraries, attempt:', attempts + 1);
      console.log('Libraries status:', {
        elliptic: !!window.elliptic,
        CryptoJS: !!window.CryptoJS
      });
      
      if (window.elliptic && window.CryptoJS) {
        console.log('All libraries loaded successfully!');
        setLibrariesLoaded(true);
        return;
      }
      
      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(checkLibraries, 100);
      } else {
        console.error('Timeout: Libraries failed to load after 5 seconds');
        // Allow proceeding anyway to show a better error message
        setLibrariesLoaded(true);
      }
    };
    
    checkLibraries();
  }, []);

  const handleCreateWallet = async () => {
    setIsGenerating(true);
    try {
      console.log("Starting wallet generation...");
      const wallet = await generateWallet();
      console.log("Wallet generated successfully:", wallet);
      setWalletData(wallet);
      toast({
        title: "🎉 Wallet Created!",
        description: "Your LanaCoin wallet has been generated successfully.",
      });
    } catch (error) {
      console.error("Wallet generation error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to generate wallet. Please try again.";
      toast({
        title: "Error",
        description: errorMessage.includes("libraries not loaded") 
          ? "Cryptographic libraries are still loading. Please refresh the page and try again." 
          : errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateWallet = async () => {
    setIsGenerating(true);
    try {
      const wallet = await generateWallet();
      setWalletData(wallet);
      toast({
        title: "🔄 Wallet Regenerated!",
        description: "A new LanaCoin wallet has been generated.",
      });
    } catch (error) {
      console.error("Wallet regeneration error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to regenerate wallet. Please try again.";
      toast({
        title: "Error",
        description: errorMessage.includes("libraries not loaded") 
          ? "Cryptographic libraries are still loading. Please refresh the page and try again." 
          : errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard.`,
    });
  };

  const handleEmailAndNostr = () => {
    toast({
      title: "Backend Required",
      description: "Please connect to Supabase to enable email functionality and NOSTR profile creation.",
      variant: "destructive",
    });
  };

  const handleReset = () => {
    setWalletData(null);
  };

  if (!walletData) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-bold text-primary">
              🎉 Congratulations! 🎉
            </DialogTitle>
            <DialogDescription className="text-center text-base mt-4">
              You earned 1 LanaCoin that is going to become Worth 100 Million
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex justify-center mt-6">
            <Button 
              onClick={handleCreateWallet}
              disabled={isGenerating}
              className="bg-primary hover:bg-primary-glow text-primary-foreground font-bold py-3 px-8 rounded-xl"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : !librariesLoaded ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Loading Libraries...
                </>
              ) : (
                "Create Lana Wallet"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          {/* 100 Million to Everyone Sign */}
          <div className="text-center mb-4">
            <img 
              src={hundredMillionLogo} 
              alt="100 Million to Everyone" 
              className="mx-auto w-48 h-48 object-contain"
            />
          </div>
          
          <DialogTitle className="text-center text-xl font-bold text-primary">
            🎉 Your Lana Wallet is Ready! 🎉
          </DialogTitle>
          <DialogDescription className="text-center text-base mt-2">
            Keep your private key safe - you'll need it to access your wallet
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 mt-6">
          {/* LanaCoin Address */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-primary flex items-center gap-2">
                <Key className="w-4 h-4" />
                LanaCoin Address
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(walletData.lanaAddress, "LanaCoin Address")}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-sm font-mono break-all bg-background p-2 rounded border">
              {walletData.lanaAddress}
            </p>
          </div>

          {/* Private Key WIF */}
          <div className="bg-destructive/10 p-4 rounded-lg border-destructive/20 border">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-destructive">Private Key (WIF)</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(walletData.privateKeyWIF, "Private Key")}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-sm font-mono break-all bg-background p-2 rounded border">
              {walletData.privateKeyWIF}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              ⚠️ Keep this private key secure! Anyone with this key can access your wallet.
            </p>
          </div>

          {/* Nostr Keys */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <h3 className="font-semibold text-primary mb-3">NOSTR Identity</h3>
            
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-destructive">Private Key (HEX)</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(walletData.privateKeyHex, "NOSTR Private Key")}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs font-mono break-all bg-background p-2 rounded border border-destructive/20">
                  {walletData.privateKeyHex}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  ⚠️ Keep this private key secure! Used for signing NOSTR events.
                </p>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium">Public Key (HEX)</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(walletData.nostrHexId, "NOSTR HEX ID")}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs font-mono break-all bg-background p-2 rounded border">
                  {walletData.nostrHexId}
                </p>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium">Public Key (npub)</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(walletData.nostrNpubId, "NOSTR npub ID")}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs font-mono break-all bg-background p-2 rounded border">
                  {walletData.nostrNpubId}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Email Input */}
        <div className="mt-6">
          <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
            Email Address <span className="text-destructive">*</span>
          </label>
          <Input
            id="email"
            type="email"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Required to receive wallet information and NOSTR profile details.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <Button 
            onClick={handleRegenerateWallet}
            disabled={isGenerating}
            variant="outline"
            className="flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Regenerate Wallet
              </>
            )}
          </Button>
          
          <Button 
            onClick={handleEmailAndNostr}
            disabled={!email.trim()}
            className="bg-primary hover:bg-primary-glow text-primary-foreground flex items-center gap-2"
          >
            <Mail className="w-4 h-4" />
            Send Wallet & Create NOSTR Profile
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GameEndDialog;