import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Crown, Clock, CheckCircle, XCircle, User } from 'lucide-react';
import { useAllPremiumRequests, useReviewPremiumRequest } from '@/hooks/usePremium';
import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { format } from 'date-fns';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function AdminPremiumRequests() {
  const { role, loading } = useAuth();
  const { data: requests, isLoading } = useAllPremiumRequests();
  const reviewRequest = useReviewPremiumRequest();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (role !== 'super_admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const pendingRequests = requests?.filter(r => r.status === 'pending') ?? [];
  const processedRequests = requests?.filter(r => r.status !== 'pending') ?? [];

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

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 container py-8">
        <div className="flex items-center gap-3 mb-6">
          <Crown className="h-8 w-8 text-amber-500" />
          <div>
            <h1 className="text-3xl font-bold">Premium Requests</h1>
            <p className="text-muted-foreground">Manage student premium membership requests</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Pending Requests */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Pending Requests ({pendingRequests.length})
                </CardTitle>
                <CardDescription>Requests awaiting your review</CardDescription>
              </CardHeader>
              <CardContent>
                {pendingRequests.length === 0 ? (
                  <p className="text-muted-foreground text-center py-6">No pending requests</p>
                ) : (
                  <div className="space-y-4">
                    {pendingRequests.map((request) => (
                      <div key={request.id} className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{request.user_name || 'Unknown User'}</p>
                              <p className="text-sm text-muted-foreground">{request.user_email}</p>
                            </div>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(request.created_at), 'PPP')}
                          </span>
                        </div>
                        {request.reason && (
                          <p className="text-sm bg-muted p-3 rounded">{request.reason}</p>
                        )}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => reviewRequest.mutate({ 
                              requestId: request.id, 
                              userId: request.user_id, 
                              approved: true 
                            })}
                            disabled={reviewRequest.isPending}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => reviewRequest.mutate({ 
                              requestId: request.id, 
                              userId: request.user_id, 
                              approved: false 
                            })}
                            disabled={reviewRequest.isPending}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Processed Requests */}
            <Card>
              <CardHeader>
                <CardTitle>Processed Requests ({processedRequests.length})</CardTitle>
                <CardDescription>Previously reviewed requests</CardDescription>
              </CardHeader>
              <CardContent>
                {processedRequests.length === 0 ? (
                  <p className="text-muted-foreground text-center py-6">No processed requests</p>
                ) : (
                  <div className="space-y-3">
                    {processedRequests.map((request) => (
                      <div key={request.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{request.user_name || 'Unknown User'}</p>
                            <p className="text-xs text-muted-foreground">{request.user_email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground">
                            {request.reviewed_at && format(new Date(request.reviewed_at), 'PPP')}
                          </span>
                          {getStatusBadge(request.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
