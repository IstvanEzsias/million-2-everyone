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
import { useTranslation } from 'react-i18next';

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
  statement_of_responsibility: string; // Self-responsibility acceptance statement
  
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
  const { t } = useTranslation('profile');
  const [walletData, setWalletData] = useState<WalletSessionData | null>(null);
  const [formData, setFormData] = useState<NostrProfileData>({
    name: "",
    display_name: "",
    about: "",
    location: "",
    currency: "GBP",
    lanoshi2lash: "10000",
    whoAreYou: "Human",
    orgasmic_profile: "",
    tags_t: "",
    tags_o: "",
    statement_of_responsibility: "",
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
  const [showVerificationDialog, setShowVerificationDialog] = useState(false);

  useEffect(() => {
    const sessionData = getWalletSessionData();
    if (!sessionData) {
      toast({
        title: t('loadingStates.noWalletData'),
        description: t('loadingStates.noWalletDescription'),
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
    if (!formData.name.trim()) newErrors.name = t('validation.nameRequired');
    if (!formData.display_name.trim()) newErrors.display_name = t('validation.displayNameRequired');
    if (!formData.about.trim()) newErrors.about = t('validation.aboutRequired');
    if (!formData.location.trim()) newErrors.location = t('validation.locationRequired');
    if (!formData.currency.trim()) newErrors.currency = t('validation.currencyRequired');
    if (!formData.lanoshi2lash.trim()) {
      newErrors.lanoshi2lash = t('validation.lanoshi2lashRequired');
    } else {
      const lanoshiValue = parseInt(formData.lanoshi2lash);
      if (isNaN(lanoshiValue) || lanoshiValue < 10000) {
        newErrors.lanoshi2lash = "Minimalna vrednost je 10.000 Lanoshijev";
      }
    }
    if (!formData.whoAreYou.trim()) newErrors.whoAreYou = t('validation.whoAreYouRequired');
    if (!formData.orgasmic_profile.trim()) newErrors.orgasmic_profile = t('validation.orgasmicProfileRequired');
    if (!formData.tags_t.trim()) newErrors.tags_t = t('validation.interestTagsRequired');
    if (!formData.tags_o.trim()) newErrors.tags_o = t('validation.intimacyTagsRequired');
    if (!formData.statement_of_responsibility.trim()) {
      newErrors.statement_of_responsibility = t('validation.statementRequired');
    } else if (formData.statement_of_responsibility.trim().length < 10) {
      newErrors.statement_of_responsibility = t('validation.statementTooShort');
    }


    // URL validation if provided
    if (formData.website && !/^https?:\/\/.+/.test(formData.website)) {
      newErrors.website = t('validation.invalidUrl', { ns: 'common' });
    }
    if (formData.picture && !/^https?:\/\/.+/.test(formData.picture)) {
      newErrors.picture = t('validation.invalidUrl', { ns: 'common' });
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
        title: t('notifications.validationError'),
        description: t('notifications.validationErrorDesc'),
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
          email: walletData.email,
          playedGame: walletData.playedGame || false
        }
        }
      });

      if (error) {
        throw error;
      }

      // Navigate to results page with the data
      navigate('/profile-results', { state: { result: data } });
      
    } catch (error: any) {
      console.error('Profile creation error:', error);
      
      // Navigate to results page with the error
      navigate('/profile-results', { 
        state: { 
          result: {
            success: false,
            error: error.message || "Failed to create NOSTR profile. Please try again."
          }
        } 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!walletData) {
    return (
      <div className="min-h-screen bg-gradient-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">{t('loadingStates.walletData')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-background py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>{t('title')}</CardTitle>
            <CardDescription>
              {t('description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Required Fields Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-primary">{t('sections.required')}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">{t('fields.name')} *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      placeholder={t('placeholders.name')}
                      className={errors.name ? "border-destructive" : ""}
                    />
                    {errors.name && <p className="text-sm text-destructive mt-1">{errors.name}</p>}
                  </div>

                  <div>
                    <Label htmlFor="display_name">{t('fields.displayName')} *</Label>
                    <Input
                      id="display_name"
                      value={formData.display_name}
                      onChange={(e) => handleInputChange("display_name", e.target.value)}
                      placeholder={t('placeholders.displayName')}
                      className={errors.display_name ? "border-destructive" : ""}
                    />
                    {errors.display_name && <p className="text-sm text-destructive mt-1">{errors.display_name}</p>}
                  </div>

                  <div>
                    <Label htmlFor="location">{t('fields.location')} *</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => handleInputChange("location", e.target.value)}
                      placeholder={t('placeholders.location')}
                      className={errors.location ? "border-destructive" : ""}
                    />
                    {errors.location && <p className="text-sm text-destructive mt-1">{errors.location}</p>}
                  </div>

                  <div>
                    <Label htmlFor="currency">{t('fields.currency')} *</Label>
                    <Select value={formData.currency} onValueChange={(value) => handleInputChange("currency", value)}>
                      <SelectTrigger className={errors.currency ? "border-destructive" : ""}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">{t('options.currencies.USD')}</SelectItem>
                        <SelectItem value="EUR">{t('options.currencies.EUR')}</SelectItem>
                        <SelectItem value="GBP">{t('options.currencies.GBP')}</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.currency && <p className="text-sm text-destructive mt-1">{errors.currency}</p>}
                  </div>

                  <div>
                    <Label htmlFor="lanoshi2lash">{t('fields.lanoshi2lash')} *</Label>
                    <Input
                      id="lanoshi2lash"
                      type="number"
                      min="10000"
                      value={formData.lanoshi2lash}
                      onChange={(e) => handleInputChange("lanoshi2lash", e.target.value)}
                      placeholder={t('placeholders.lanoshi2lash')}
                      className={errors.lanoshi2lash ? "border-destructive" : ""}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      1 Lana = 100,000,000 Lanoshi. Minimalna vrednost je 10.000 Lanoshijev.
                    </p>
                    {errors.lanoshi2lash && <p className="text-sm text-destructive mt-1">{errors.lanoshi2lash}</p>}
                  </div>

                  <div>
                    <Label htmlFor="whoAreYou">{t('fields.whoAreYou')} *</Label>
                    <Select value={formData.whoAreYou} onValueChange={(value) => handleInputChange("whoAreYou", value)}>
                      <SelectTrigger className={errors.whoAreYou ? "border-destructive" : ""}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Human">{t('options.whoAreYou.Human')}</SelectItem>
                        <SelectItem value="AI">{t('options.whoAreYou.AI')}</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.whoAreYou && <p className="text-sm text-destructive mt-1">{errors.whoAreYou}</p>}
                  </div>

                  <div>
                    <Label htmlFor="lanaWalletID">{t('fields.lanaWalletID')}</Label>
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
                    <strong>{t('labels.info', { ns: 'common' })}:</strong> {t('help.privateKey')}
                  </p>
                </div>

                <div>
                  <Label htmlFor="about">{t('fields.about')} *</Label>
                  <Textarea
                    id="about"
                    value={formData.about}
                    onChange={(e) => handleInputChange("about", e.target.value)}
                    placeholder={t('placeholders.about')}
                    className={errors.about ? "border-destructive" : ""}
                  />
                  {errors.about && <p className="text-sm text-destructive mt-1">{errors.about}</p>}
                </div>

                <div>
                  <Label htmlFor="orgasmic_profile">{t('fields.orgasmicProfile')} *</Label>
                  <Textarea
                    id="orgasmic_profile"
                    value={formData.orgasmic_profile}
                    onChange={(e) => handleInputChange("orgasmic_profile", e.target.value)}
                    placeholder={t('placeholders.orgasmicProfile')}
                    className={errors.orgasmic_profile ? "border-destructive" : ""}
                  />
                  {errors.orgasmic_profile && <p className="text-sm text-destructive mt-1">{errors.orgasmic_profile}</p>}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tags_t">{t('fields.interestTags')} * {t('commaNote')}</Label>
                    <Input
                      id="tags_t"
                      value={formData.tags_t}
                      onChange={(e) => handleInputChange("tags_t", e.target.value)}
                      placeholder={t('placeholders.interestTags')}
                      className={errors.tags_t ? "border-destructive" : ""}
                    />
                    {errors.tags_t && <p className="text-sm text-destructive mt-1">{errors.tags_t}</p>}
                  </div>

                  <div>
                    <Label htmlFor="tags_o">{t('fields.intimacyTags')} * {t('commaNote')}</Label>
                    <Input
                      id="tags_o"
                      value={formData.tags_o}
                      onChange={(e) => handleInputChange("tags_o", e.target.value)}
                      placeholder={t('placeholders.intimacyTags')}
                      className={errors.tags_o ? "border-destructive" : ""}
                    />
                    {errors.tags_o && <p className="text-sm text-destructive mt-1">{errors.tags_o}</p>}
                  </div>
                </div>
              </div>

              {/* Optional Fields Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-primary">{t('sections.optional')}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <ImageUpload
                      value={formData.picture}
                      onChange={(url) => handleInputChange("picture", url)}
                      label={t('fields.picture')}
                    />
                    {errors.picture && <p className="text-sm text-destructive mt-1">{errors.picture}</p>}
                  </div>

                  <div>
                    <Label htmlFor="website">{t('fields.website')}</Label>
                    <Input
                      id="website"
                      value={formData.website}
                      onChange={(e) => handleInputChange("website", e.target.value)}
                      placeholder={t('placeholders.website')}
                      className={errors.website ? "border-destructive" : ""}
                    />
                    {errors.website && <p className="text-sm text-destructive mt-1">{errors.website}</p>}
                  </div>


                  <div>
                    <Label htmlFor="payment_link">{t('fields.paymentLink')}</Label>
                    <Input
                      id="payment_link"
                      value={formData.payment_link}
                      onChange={(e) => handleInputChange("payment_link", e.target.value)}
                      placeholder={t('placeholders.paymentLink')}
                    />
                  </div>
                </div>

                {/* Banking Information */}
                <div className="space-y-4">
                  <h4 className="text-md font-medium text-primary">{t('sections.banking')}</h4>
                  <p className="text-sm text-muted-foreground">
                    {t('help.banking')}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="bankName">{t('fields.bankName')}</Label>
                      <Input
                        id="bankName"
                        value={formData.bankName}
                        onChange={(e) => handleInputChange("bankName", e.target.value)}
                        placeholder={t('placeholders.bankName')}
                      />
                    </div>

                    <div>
                      <Label htmlFor="bankSWIFT">{t('fields.bankSWIFT')}</Label>
                      <Input
                        id="bankSWIFT"
                        value={formData.bankSWIFT}
                        onChange={(e) => handleInputChange("bankSWIFT", e.target.value)}
                        placeholder={t('placeholders.bankSWIFT')}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="bankAddress">{t('fields.bankAddress')}</Label>
                      <Input
                        id="bankAddress"
                        value={formData.bankAddress}
                        onChange={(e) => handleInputChange("bankAddress", e.target.value)}
                        placeholder={t('placeholders.bankAddress')}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="bankAccount">{t('fields.bankAccount')}</Label>
                      <Input
                        id="bankAccount"
                        value={formData.bankAccount}
                        onChange={(e) => handleInputChange("bankAccount", e.target.value)}
                        placeholder={t('placeholders.bankAccount')}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Self-Responsibility Statement Section */}
              <div className="mt-8 p-6 rounded-xl border-2 border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent space-y-6">
                {/* Main Rule Header */}
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-bold text-primary">
                    {t('selfResponsibility.title')}
                  </h3>
                  <p className="text-2xl font-bold text-foreground">
                    {t('selfResponsibility.mainRule')}
                  </p>
                </div>

                {/* Explanation */}
                <div className="space-y-4">
                  <p className="font-semibold text-foreground">
                    {t('selfResponsibility.thatMeans')}
                  </p>
                  <ul className="space-y-3 ml-4">
                    <li className="flex items-start gap-3">
                      <span className="text-primary font-bold mt-0.5">•</span>
                      <span className="text-muted-foreground">{t('selfResponsibility.bullet1')}</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-primary font-bold mt-0.5">•</span>
                      <span className="text-muted-foreground">{t('selfResponsibility.bullet2')}</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="text-primary font-bold mt-0.5">•</span>
                      <span className="text-muted-foreground">{t('selfResponsibility.bullet3')}</span>
                    </li>
                  </ul>
                </div>

                {/* Philosophy paragraph */}
                <div className="text-center space-y-2 py-4 border-t border-b border-primary/20">
                  <p className="text-muted-foreground italic">
                    {t('selfResponsibility.notPunishment')}
                  </p>
                  <p className="font-semibold text-foreground">
                    {t('selfResponsibility.power')}
                  </p>
                </div>

                {/* Statement Input Section */}
                <div className="space-y-4">
                  <h4 className="text-lg font-bold text-primary">
                    {t('selfResponsibility.statementTitle')}
                  </h4>
                  <p className="text-muted-foreground">
                    {t('selfResponsibility.statementDescription')}
                  </p>
                  
                  {/* Example */}
                  <div className="bg-muted/30 p-4 rounded-lg border border-muted">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">{t('selfResponsibility.example')}</span>
                    </p>
                    <p className="text-sm text-muted-foreground italic mt-1">
                      {t('selfResponsibility.exampleText')}
                    </p>
                  </div>

                  {/* Textarea */}
                  <Textarea
                    id="statement_of_responsibility"
                    value={formData.statement_of_responsibility}
                    onChange={(e) => handleInputChange("statement_of_responsibility", e.target.value)}
                    placeholder={t('placeholders.statementOfResponsibility')}
                    className={`min-h-[120px] ${errors.statement_of_responsibility ? "border-destructive" : ""}`}
                    rows={4}
                  />
                  {errors.statement_of_responsibility && (
                    <p className="text-sm text-destructive mt-1">{errors.statement_of_responsibility}</p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between pt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate("/")}
                >
                  {t('buttons.cancel', { ns: 'common' })}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? t('buttons.creating', { ns: 'common' }) : t('selfResponsibility.acceptButton')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>


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