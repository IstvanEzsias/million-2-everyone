import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Code } from "lucide-react";
import { useTranslation } from 'react-i18next';

const ReferralDocumentation = () => {
  const { t } = useTranslation('documentation');
  return (
    <div className="min-h-screen bg-gradient-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-primary mb-4">{t('title')}</h1>
          <p className="text-lg text-muted-foreground">
            {t('subtitle')}
          </p>
        </header>

        <div className="space-y-8">
          {/* Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                {t('sections.overview.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                {t('sections.overview.description')}
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">Secure URL validation</Badge>
                <Badge variant="secondary">Session persistence</Badge>
                <Badge variant="secondary">Custom site branding</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Quick Start */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Start</CardTitle>
              <CardDescription>Get started in under 5 minutes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">1. Basic Implementation</h4>
                  <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                    {`https://100milliontoeveryone.com/?return_url=https://yoursite.com/success`}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">2. With Custom Site Name</h4>
                  <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                    {`https://100milliontoeveryone.com/?return_url=https://yoursite.com/success&site_name=Your%20App`}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Parameters */}
          <Card>
            <CardHeader>
              <CardTitle>URL Parameters</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-3 font-semibold">Parameter</th>
                      <th className="text-left p-3 font-semibold">Required</th>
                      <th className="text-left p-3 font-semibold">Description</th>
                      <th className="text-left p-3 font-semibold">Example</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-3 font-mono text-sm">return_url</td>
                      <td className="p-3"><Badge variant="destructive">Required</Badge></td>
                      <td className="p-3">The URL to redirect users back to after profile creation</td>
                      <td className="p-3 font-mono text-sm">https://yoursite.com/success</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-3 font-mono text-sm">site_name</td>
                      <td className="p-3"><Badge variant="outline">Optional</Badge></td>
                      <td className="p-3">Display name for your site (shown to users)</td>
                      <td className="p-3 font-mono text-sm">Your App Name</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* User Flow */}
          <Card>
            <CardHeader>
              <CardTitle>User Flow</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold">1</div>
                  <div>
                    <h4 className="font-semibold">User clicks your referral link</h4>
                    <p className="text-sm text-muted-foreground">From your website or app</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold">2</div>
                  <div>
                    <h4 className="font-semibold">User arrives at Lana Game</h4>
                    <p className="text-sm text-muted-foreground">Sees message: "You'll return to [Your Site] after creating your profile"</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold">3</div>
                  <div>
                    <h4 className="font-semibold">User plays game and creates profile</h4>
                    <p className="text-sm text-muted-foreground">Complete gaming experience and Nostr profile creation</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center font-bold">4</div>
                  <div>
                    <h4 className="font-semibold">User is redirected back to your site</h4>
                    <p className="text-sm text-muted-foreground">Via "Return to [Your Site]" button on results page</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Security */}
          <Card>
            <CardHeader>
              <CardTitle>Security & Validation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Domain Whitelist</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Only approved domains are allowed for security. Current whitelist includes:
                </p>
                <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                  <li>localhost (development)</li>
                  <li>127.0.0.1 (development)</li>
                  <li>lovable.app</li>
                  <li>lovable.dev</li>
                </ul>
                <p className="text-sm text-muted-foreground mt-2">
                  Contact support to add your domain to the whitelist.
                </p>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">URL Requirements</h4>
                <ul className="list-disc list-inside text-sm space-y-1 ml-4">
                  <li>Must use HTTPS (except localhost for development)</li>
                  <li>Must be a valid, well-formed URL</li>
                  <li>Domain must be in the approved whitelist</li>
                  <li>URLs expire after 24 hours for security</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Examples */}
          <Card>
            <CardHeader>
              <CardTitle>Integration Examples</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-semibold mb-2">HTML Link</h4>
                <div className="bg-muted p-4 rounded-lg">
                  <code className="text-sm">
                    {`<a href="https://100milliontoeveryone.com/?return_url=https://yoursite.com/welcome&site_name=My%20App" 
   target="_blank" 
   className="btn btn-primary">
  Play Lana Game & Create Profile
</a>`}
                  </code>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">JavaScript</h4>
                <div className="bg-muted p-4 rounded-lg">
                  <code className="text-sm">
                    {`function openLanaGame() {
  const returnUrl = encodeURIComponent('https://yoursite.com/profile-created');
  const siteName = encodeURIComponent('Your App');
  const gameUrl = \`https://100milliontoeveryone.com/?return_url=\${returnUrl}&site_name=\${siteName}\`;
  
  window.open(gameUrl, '_blank');
}`}
                  </code>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">React Component</h4>
                <div className="bg-muted p-4 rounded-lg">
                  <code className="text-sm">
                    {`const LanaGameButton = () => {
  const handleClick = () => {
    const params = new URLSearchParams({
      return_url: 'https://yoursite.com/success',
      site_name: 'Your App Name'
    });
    
    window.open(\`https://100milliontoeveryone.com/?\${params}\`, '_blank');
  };

  return (
    <button onClick={handleClick} className="btn-primary">
      Create Lana Profile
    </button>
  );
};`}
                  </code>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Troubleshooting */}
          <Card>
            <CardHeader>
              <CardTitle>Troubleshooting</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-red-600">Return URL not working?</h4>
                  <ul className="list-disc list-inside text-sm space-y-1 ml-4 mt-1">
                    <li>Check if your domain is in the whitelist</li>
                    <li>Ensure you're using HTTPS (not HTTP)</li>
                    <li>Verify the URL is properly encoded</li>
                    <li>Check browser console for security errors</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold text-red-600">Site name not displaying?</h4>
                  <ul className="list-disc list-inside text-sm space-y-1 ml-4 mt-1">
                    <li>Make sure to URL encode the site_name parameter</li>
                    <li>Check for special characters that need encoding</li>
                    <li>Verify the parameter name is exactly "site_name"</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact */}
          <Card>
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                If you need your domain added to the whitelist or have integration questions, 
                please contact our support team with your domain and use case details.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ReferralDocumentation;