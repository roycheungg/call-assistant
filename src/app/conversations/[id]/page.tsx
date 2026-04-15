"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageCircle, User } from "lucide-react";
import { format } from "date-fns";
import { MessageBubble } from "@/components/conversations/message-bubble";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  status: string;
  createdAt: string;
}

interface Conversation {
  id: string;
  waId: string;
  phoneNumber: string;
  contactName: string | null;
  status: string;
  createdAt: string;
  lead: {
    id: string;
    name: string | null;
    company: string | null;
    email: string | null;
    status: string;
  } | null;
  messages: Message[];
}

export default function ConversationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchConversation() {
      try {
        const res = await fetch(`/api/conversations/${params.id}`);
        if (!res.ok) throw new Error("Not found");
        const data = await res.json();
        setConversation(data);
      } catch (error) {
        console.error("Failed to fetch conversation:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchConversation();
  }, [params.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="text-center py-12">
        <MessageCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-muted-foreground">Conversation not found</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => router.push("/conversations")}
        >
          Back to conversations
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/conversations")}
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">
            {conversation.contactName ||
              conversation.lead?.name ||
              conversation.phoneNumber}
          </h1>
          <p className="text-sm text-muted-foreground">
            {conversation.phoneNumber}
            {conversation.lead?.company && ` - ${conversation.lead.company}`}
          </p>
        </div>
        <Badge
          variant={conversation.status === "active" ? "default" : "secondary"}
        >
          {conversation.status}
        </Badge>
      </div>

      {/* Contact Info */}
      {conversation.lead && (
        <Card>
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600/20 flex items-center justify-center">
              <User className="w-4 h-4 text-blue-400" />
            </div>
            <div className="flex-1 text-sm">
              <span className="font-medium">
                {conversation.lead.name || "Unknown"}
              </span>
              {conversation.lead.email && (
                <span className="text-muted-foreground ml-3">
                  {conversation.lead.email}
                </span>
              )}
            </div>
            <Badge variant="outline" className="text-[10px]">
              {conversation.lead.status}
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* Messages */}
      <Card className="flex-1 overflow-hidden">
        <CardHeader className="py-3 px-4 border-b border-white/10">
          <p className="text-xs text-muted-foreground">
            {conversation.messages.length} messages - Started{" "}
            {format(new Date(conversation.createdAt), "MMM d, yyyy")}
          </p>
        </CardHeader>
        <CardContent className="p-4 overflow-y-auto max-h-[60vh] space-y-3">
          {conversation.messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              role={msg.role}
              content={msg.content}
              createdAt={msg.createdAt}
            />
          ))}
          <div ref={messagesEndRef} />
        </CardContent>
      </Card>
    </div>
  );
}
