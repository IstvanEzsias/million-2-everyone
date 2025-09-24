import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getWalletSessionData, clearWalletSessionData, type WalletSessionData } from "@/utils/sessionStorage";
import { supabase } from "@/integrations/supabase/client";
import { ImageUpload } from "@/components/ImageUpload";
import { ProfileCreationReport } from "@/components/ProfileCreationReport";
import PrivateKeyVerificationDialog from "@/components/PrivateKeyVerificationDialog";

interface NostrProfileData {
  // Required fields
  name: string;
  display_name: string;
  about: string;
  location: string;
  currency: string;
  lanoshi2lash: string;
  whoAreYou: string;
  orgasmic_profile: string;
  tags_t: string; // Things interested in
  tags_o: string; // Intimacy interests
  
  // Optional fields
  picture: string;
  website: string;
  nip05: string;
  payment_link: string;
  lanaWalletID: string; // Prefilled, read-only
  bankName: string;
  bankAddress: string;
  bankSWIFT: string;
  bankAccount: string;
}

const NostrProfile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [walletData, setWalletData] = useState<WalletSessionData | null>(null);
  const [formData, setFormData] = useState<NostrProfileData>({
    name: "",
    display_name: "",
    about: "",
    location: "",
    currency: "GBP",
    lanoshi2lash: "100",
    whoAreYou: "Human",
    orgasmic_profile: "",
    tags_t: "",
    tags_o: "",
    picture: "",
    website: "",
    nip05: "",
    payment_link: "",
    lanaWalletID: "",
    bankName: "",
    bankAddress: "",
    bankSWIFT: "",
    bankAccount: ""
  });

  const [errors, setErrors] = useState<Partial<NostrProfileData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [creationResult, setCreationResult] = useState<any>(null);
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);

  useEffect(() => {
    const sessionData = getWalletSessionData();
    if (!sessionData) {
      toast({
        title: "No wallet data found",
        description: "Please generate a wallet first",
        variant: "destructive",
      });
      navigate("/");
      return;
    }
    
    setWalletData(sessionData);
    setFormData(prev => ({
      ...prev,
      lanaWalletID: sessionData.walletId
    }));
  }, [navigate, toast]);

  const validateForm = (): boolean => {
    const newErrors: Partial<NostrProfileData> = {};
    
    // Required field validation
    if (!formData.name.trim()) newErrors.name = "Name is required";
    if (!formData.display_name.trim()) newErrors.display_name = "Display name is required";
    if (!formData.about.trim()) newErrors.about = "About description is required";
    if (!formData.location.trim()) newErrors.location = "Location is required";
    if (!formData.currency.trim()) newErrors.currency = "Currency is required";
    if (!formData.lanoshi2lash.trim()) newErrors.lanoshi2lash = "Lanoshi2lash value is required";
    if (!formData.whoAreYou.trim()) newErrors.whoAreYou = "Please specify if you are Human or AI";
    if (!formData.orgasmic_profile.trim()) newErrors.orgasmic_profile = "Orgasmic profile is required";
    if (!formData.tags_t.trim()) newErrors.tags_t = "Interest tags are required";
    if (!formData.tags_o.trim()) newErrors.tags_o = "Intimacy interest tags are required";


    // URL validation if provided
    if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
      newErrors.website = "Please enter a valid URL starting with http:// or https://";
    }
    if (formData.picture && !/^https?:\/\/.+/.test(formData.picture)) {
      newErrors.picture = "Please enter a valid URL starting with http:// or https://";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof NostrProfileData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors below",
        variant: "destructive",
      });
      return;
    }

    // Show verification dialog instead of proceeding directly
    setShowVerificationDialog(true);
  };

  const handleVerificationSuccess = async () => {
    setShowVerificationDialog(false);
    setIsSubmitting(true);
    
    try {
      // Get wallet data from session storage
      if (!walletData) {
        throw new Error("No wallet data found. Please create a wallet first.");
      }

      // Call the edge function to create NOSTR profile
      const { data, error } = await supabase.functions.invoke('create-nostr-profile', {
        body: {
          profileData: formData,
        walletData: {
          walletId: walletData.walletId,
          nostrHex: walletData.nostrHex,
          nostrPrivateKey: walletData.nostrPrivateKey,
          email: walletData.email
        }
        }
      });

      if (error) {
        throw error;
      }

      // Show the report dialog with results
      setCreationResult(data);
      setShowReport(true);
      
    } catch (error: any) {
      console.error('Profile creation error:', error);
      
      // Show error in report dialog
      setCreationResult({
        success: false,
        error: error.message || "Failed to create NOSTR profile. Please try again."
      });
      setShowReport(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!walletData) {
    return (
      <div className="min-h-screen bg-gradient-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading wallet data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-background py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Create Your Lana NOSTR Profile</CardTitle>
            <CardDescription>
              Complete your profile information to create a KIND 0 NOSTR event
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Required Fields Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-primary">Required Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      className={errors.name ? "border-destructive" : ""}
                    />
                    {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
                  </div>

                  <div>
                    <Label htmlFor="display_name">Display Name *</Label>
                    <Input
                      id="display_name"
                      value={formData.display_name}
                      onChange={(e) => handleInputChange("display_name", e.target.value)}
                      className={errors.display_name ? "border-destructive" : ""}
                    />
                    {errors.display_name && <p className="text-sm text-destructive mt-1">{errors.display_name}</p>}
                  </div>

                  <div>
                    <Label htmlFor="location">Location *</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => handleInputChange("location", e.target.value)}
                      className={errors.location ? "border-destructive" : ""}
                    />
                    {errors.location && <p className="text-sm text-destructive mt-1">{errors.location}</p>}
                  </div>

                  <div>
                    <Label htmlFor="currency">Currency *</Label>
                    <Select value={formData.currency} onValueChange={(value) => handleInputChange("currency", value)}>
                      <SelectTrigger className={errors.currency ? "border-destructive" : ""}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.currency && <p className="text-sm text-destructive mt-1">{errors.currency}</p>}
                  </div>

                  <div>
                    <Label htmlFor="lanoshi2lash">Lanoshi2lash *</Label>
                    <Input
                      id="lanoshi2lash"
                      value={formData.lanoshi2lash}
                      onChange={(e) => handleInputChange("lanoshi2lash", e.target.value)}
                      placeholder="Exchange rate value"
                      className={errors.lanoshi2lash ? "border-destructive" : ""}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      1 Lana equals 100,000,000 Lanoshi. A Lash is like giving someone a token of appreciation. We recommend setting 1 Lash = 100 Lanoshi at the beginning.
                    </p>
                    {errors.lanoshi2lash && <p className="text-sm text-destructive mt-1">{errors.lanoshi2lash}</p>}
                  </div>

                  <div>
                    <Label htmlFor="whoAreYou">Who Are You *</Label>
                    <Select value={formData.whoAreYou} onValueChange={(value) => handleInputChange("whoAreYou", value)}>
                      <SelectTrigger className={errors.whoAreYou ? "border-destructive" : ""}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Human">Human</SelectItem>
                        <SelectItem value="AI">AI</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.whoAreYou && <p className="text-sm text-destructive mt-1">{errors.whoAreYou}</p>}
                  </div>

                  <div>
                    <Label htmlFor="lanaWalletID">LanaCoin Address</Label>
                    <Input
                      id="lanaWalletID"
                      value={formData.lanaWalletID}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                </div>

                {/* Hidden NOSTR identity fields - kept for session data */}
                <input type="hidden" value={walletData?.nostrPrivateKey || ""} />
                <input type="hidden" value={walletData?.nostrHex || ""} />

                {/* Security Note */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                  <p className="text-sm text-yellow-800">
                    <strong>Note:</strong> Hey Man, just a reminder — your Private Key is never stored anywhere. If you lose it, you lose both your identity and your Lana forever.
                  </p>
                </div>

                <div>
                  <Label htmlFor="about">About *</Label>
                  <Textarea
                    id="about"
                    value={formData.about}
                    onChange={(e) => handleInputChange("about", e.target.value)}
                    placeholder="Tell us about yourself..."
                    className={errors.about ? "border-destructive" : ""}
                  />
                  {errors.about && <p className="text-sm text-destructive mt-1">{errors.about}</p>}
                </div>

                <div>
                  <Label htmlFor="orgasmic_profile">Orgasmic Profile *</Label>
                  <Textarea
                    id="orgasmic_profile"
                    value={formData.orgasmic_profile}
                    onChange={(e) => handleInputChange("orgasmic_profile", e.target.value)}
                    placeholder="Orgasmic profile information and preferences..."
                    className={errors.orgasmic_profile ? "border-destructive" : ""}
                  />
                  {errors.orgasmic_profile && <p className="text-sm text-destructive mt-1">{errors.orgasmic_profile}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tags_t">Interest Tags * (comma-separated)</Label>
                    <Input
                      id="tags_t"
                      value={formData.tags_t}
                      onChange={(e) => handleInputChange("tags_t", e.target.value)}
                      placeholder="bitcoin, nostr, decentralization, privacy"
                      className={errors.tags_t ? "border-destructive" : ""}
                    />
                    {errors.tags_t && <p className="text-sm text-destructive mt-1">{errors.tags_t}</p>}
                  </div>

                  <div>
                    <Label htmlFor="tags_o">Intimacy Interest Tags * (comma-separated)</Label>
                    <Input
                      id="tags_o"
                      value={formData.tags_o}
                      onChange={(e) => handleInputChange("tags_o", e.target.value)}
                      placeholder="deep_connection, meaningful_intimacy, emotional_bond"
                      className={errors.tags_o ? "border-destructive" : ""}
                    />
                    {errors.tags_o && <p className="text-sm text-destructive mt-1">{errors.tags_o}</p>}
                  </div>
                </div>
              </div>

              {/* Optional Fields Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-primary">Optional Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <ImageUpload
                      value={formData.picture}
                      onChange={(url) => handleInputChange("picture", url)}
                      label="Profile Picture"
                    />
                    {errors.picture && <p className="text-sm text-destructive mt-1">{errors.picture}</p>}
                  </div>

                  <div>
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      value={formData.website}
                      onChange={(e) => handleInputChange("website", e.target.value)}
                      placeholder="https://yourdomain.com"
                      className={errors.website ? "border-destructive" : ""}
                    />
                    {errors.website && <p className="text-sm text-destructive mt-1">{errors.website}</p>}
                  </div>


                  <div>
                    <Label htmlFor="payment_link">Payment Link</Label>
                    <Input
                      id="payment_link"
                      value={formData.payment_link}
                      onChange={(e) => handleInputChange("payment_link", e.target.value)}
                      placeholder="Lightning address or payment URL"
                    />
                  </div>
                </div>

                {/* Banking Information */}
                <div className="space-y-4">
                  <h4 className="text-md font-medium text-primary">Banking Information</h4>
                  <p className="text-sm text-muted-foreground">
                    If you decide to sell some of your Lanas or Lanoshis, please provide your payment details so others know where to send the money.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="bankName">Bank Name</Label>
                      <Input
                        id="bankName"
                        value={formData.bankName}
                        onChange={(e) => handleInputChange("bankName", e.target.value)}
                        placeholder="Example Bank"
                      />
                    </div>

                    <div>
                      <Label htmlFor="bankSWIFT">SWIFT/BIC Code</Label>
                      <Input
                        id="bankSWIFT"
                        value={formData.bankSWIFT}
                        onChange={(e) => handleInputChange("bankSWIFT", e.target.value)}
                        placeholder="EXAMPLEUS33"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="bankAddress">Bank Address</Label>
                      <Input
                        id="bankAddress"
                        value={formData.bankAddress}
                        onChange={(e) => handleInputChange("bankAddress", e.target.value)}
                        placeholder="123 Banking St, New York, NY"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="bankAccount">Bank Account Number</Label>
                      <Input
                        id="bankAccount"
                        value={formData.bankAccount}
                        onChange={(e) => handleInputChange("bankAccount", e.target.value)}
                        placeholder="1234567890"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between pt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate("/")}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating Profile..." : "Create NOSTR Profile"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <ProfileCreationReport
          open={showReport}
          onOpenChange={setShowReport}
          result={creationResult}
        />

        <PrivateKeyVerificationDialog
          open={showVerificationDialog}
          onOpenChange={setShowVerificationDialog}
          expectedPrivateKey={walletData?.lanaPrivateKey || ""}
          onVerificationSuccess={handleVerificationSuccess}
        />
      </div>
    </div>
  );
};

export default NostrProfile;