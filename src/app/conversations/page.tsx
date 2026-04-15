"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { MessageCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";

interface Conversation {
  id: string;
  waId: string;
  phoneNumber: string;
  contactName: string | null;
  status: string;
  lastMessageAt: string;
  createdAt: string;
  lead: { name: string | null; company: string | null } | null;
  _count: { messages: number };
  messages: Array<{ content: string; role: string; createdAt: string }>;
}

export default function ConversationsPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchConversations() {
      setLoading(true);
      try {
        const res = await fetch(`/api/conversations?page=${page}&limit=20`);
        const data = await res.json();
        setConversations(data.conversations || []);
        setTotalPages(data.totalPages || 1);
      } catch (error) {
        console.error("Failed to fetch conversations:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchConversations();
  }, [page]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">WhatsApp Conversations</h1>
        <p className="text-muted-foreground mt-1">
          AI-powered WhatsApp conversations with your contacts
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contact</TableHead>
                <TableHead>Last Message</TableHead>
                <TableHead>Messages</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" />
                  </TableCell>
                </TableRow>
              ) : conversations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <MessageCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">
                      No WhatsApp conversations yet
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                conversations.map((conv) => (
                  <TableRow
                    key={conv.id}
                    className="cursor-pointer hover:bg-white/5"
                    onClick={() => router.push(`/conversations/${conv.id}`)}
                  >
                    <TableCell className="font-medium">
                      {conv.contactName || conv.lead?.name || "Unknown"}
                      <span className="text-xs text-muted-foreground block">
                        {conv.phoneNumber}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                      {conv.messages[0]?.content || "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {conv._count.messages}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          conv.status === "active"
                            ? "default"
                            : conv.status === "closed"
                              ? "secondary"
                              : "outline"
                        }
                        className="text-[10px]"
                      >
                        {conv.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(
                        new Date(conv.lastMessageAt),
                        "MMM d, h:mm a"
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
