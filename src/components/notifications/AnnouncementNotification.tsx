import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Bell, ArrowRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Notification {
  id: string;
  classroom_id: string;
  post_id: string;
  title: string;
  message: string | null;
  created_at: string;
  classroom_name?: string;
}

export const AnnouncementNotification = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchUnreadNotifications = async () => {
      // Fetch unread notifications with classroom info
      const { data, error } = await supabase
        .from("notifications")
        .select(`
          id,
          classroom_id,
          post_id,
          title,
          message,
          created_at
        `)
        .eq("user_id", user.id)
        .eq("is_read", false)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching notifications:", error);
        return;
      }

      if (data && data.length > 0) {
        // Get classroom names
        const classroomIds = [...new Set(data.map((n) => n.classroom_id))];
        const { data: classrooms } = await supabase
          .from("classrooms")
          .select("id, name")
          .in("id", classroomIds);

        const classroomMap = new Map(
          classrooms?.map((c) => [c.id, c.name]) || []
        );

        const notificationsWithClassroom = data.map((n) => ({
          ...n,
          classroom_name: classroomMap.get(n.classroom_id) || "Unknown Classroom",
        }));

        setNotifications(notificationsWithClassroom);
        setIsOpen(true);
      }
    };

    fetchUnreadNotifications();
  }, [user]);

  const handleViewClassroom = async (notification: Notification) => {
    // Mark notification as read
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notification.id);

    setIsOpen(false);
    navigate(`/classrooms/${notification.classroom_id}`);
  };

  const handleDismissAll = async () => {
    // Mark all notifications as read
    const ids = notifications.map((n) => n.id);
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", ids);

    setIsOpen(false);
    setNotifications([]);
  };

  if (notifications.length === 0) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            New Announcements
          </DialogTitle>
          <DialogDescription>
            You have {notifications.length} new announcement
            {notifications.length > 1 ? "s" : ""} from your classrooms.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[300px] pr-4">
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="rounded-lg border bg-muted/50 p-4 hover:bg-muted transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground mb-1">
                      {notification.classroom_name}
                    </p>
                    <h4 className="font-medium text-sm truncate">
                      {notification.title}
                    </h4>
                    {notification.message && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="shrink-0"
                    onClick={() => handleViewClassroom(notification)}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 mt-2">
          <Button variant="outline" onClick={handleDismissAll}>
            Dismiss All
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
