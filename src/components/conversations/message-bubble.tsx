import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export function MessageBubble({ role, content, createdAt }: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm",
          isUser
            ? "bg-blue-600 text-white rounded-br-md"
            : "bg-white/5 text-slate-200 border border-white/10 rounded-bl-md"
        )}
      >
        <p className="whitespace-pre-wrap break-words">{content}</p>
        <p
          className={cn(
            "text-[10px] mt-1",
            isUser ? "text-blue-200" : "text-slate-500"
          )}
        >
          {format(new Date(createdAt), "h:mm a")}
        </p>
      </div>
    </div>
  );
}
