import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Crown, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useSubmitPremiumRequest, useMyPremiumRequests } from '@/hooks/usePremium';
import { format } from 'date-fns';

export function PremiumRequestForm() {
  const [reason, setReason] = useState('');
  const { data: myRequests, isLoading: requestsLoading } = useMyPremiumRequests();
  const submitRequest = useSubmitPremiumRequest();

  const pendingRequest = myRequests?.find(r => r.status === 'pending');
  const hasApprovedRequest = myRequests?.some(r => r.status === 'approved');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.trim()) {
      submitRequest.mutate(reason.trim());
      setReason('');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
      case 'approved':
        return <Badge className="gap-1 bg-green-500"><CheckCircle className="h-3 w-3" /> Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Rejected</Badge>;
      default:
        return null;
    }
  };

  if (hasApprovedRequest) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            <CardTitle>Premium Membership</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <span>You are a premium member!</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Crown className="h-5 w-5 text-amber-500" />
          <CardTitle>Request Premium Membership</CardTitle>
        </div>
        <CardDescription>
          Submit a request to become a premium member and unlock exclusive features.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {pendingRequest ? (
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Your request is under review</span>
              {getStatusBadge('pending')}
            </div>
            <p className="text-sm text-muted-foreground">
              Submitted on {format(new Date(pendingRequest.created_at), 'PPP')}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Why would you like premium membership?</Label>
              <Textarea
                id="reason"
                placeholder="Tell us why you'd like to become a premium member..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={4}
              />
            </div>
            <Button type="submit" disabled={!reason.trim() || submitRequest.isPending}>
              {submitRequest.isPending ? 'Submitting...' : 'Submit Request'}
            </Button>
          </form>
        )}

        {myRequests && myRequests.length > 0 && (
          <div className="mt-6">
            <h4 className="font-medium mb-3">Request History</h4>
            <div className="space-y-2">
              {myRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(request.created_at), 'PPP')}
                  </span>
                  {getStatusBadge(request.status)}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
