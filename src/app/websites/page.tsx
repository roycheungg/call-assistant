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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Globe, Plus, Copy, Check } from "lucide-react";
import { format } from "date-fns";

interface Site {
  id: string;
  siteId: string;
  name: string;
  botName: string;
  enabled: boolean;
  brandColor: string;
  createdAt: string;
  _count: { conversations: number };
}

export default function WebsitesPage() {
  const router = useRouter();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [form, setForm] = useState({
    siteId: "",
    name: "",
    botName: "Assistant",
    systemPrompt: "",
    greeting: "",
    allowedOrigins: "",
  });

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/websites");
      const data = await res.json();
      setSites(data.sites || []);
    } catch (err) {
      console.error("Failed to load sites:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function createSite() {
    setCreating(true);
    try {
      const res = await fetch("/api/websites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId: form.siteId,
          name: form.name,
          botName: form.botName,
          systemPrompt: form.systemPrompt,
          greeting: form.greeting || null,
          allowedOrigins: form.allowedOrigins
            .split(",")
            .map((o) => o.trim())
            .filter(Boolean),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to create site");
        return;
      }

      setDialogOpen(false);
      setForm({
        siteId: "",
        name: "",
        botName: "Assistant",
        systemPrompt: "",
        greeting: "",
        allowedOrigins: "",
      });
      await load();
    } finally {
      setCreating(false);
    }
  }

  function copyEmbed(siteId: string) {
    const origin = window.location.origin;
    const snippet = `<script src="${origin}/widget.js" data-site-id="${siteId}" async></script>`;
    navigator.clipboard.writeText(snippet);
    setCopiedId(siteId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Websites</h1>
          <p className="text-muted-foreground mt-1">
            Manage embeddable chatbots for client websites
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Website
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Site ID</TableHead>
                <TableHead>Bot</TableHead>
                <TableHead>Conversations</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto" />
                  </TableCell>
                </TableRow>
              ) : sites.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <Globe className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No websites yet</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Click &quot;Add Website&quot; to create your first embeddable chatbot
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                sites.map((site) => (
                  <TableRow
                    key={site.id}
                    className="cursor-pointer hover:bg-white/5"
                    onClick={() => router.push(`/websites/${site.id}`)}
                  >
                    <TableCell className="font-medium">{site.name}</TableCell>
                    <TableCell>
                      <code className="text-xs bg-white/5 px-1.5 py-0.5 rounded">
                        {site.siteId}
                      </code>
                    </TableCell>
                    <TableCell className="text-sm">{site.botName}</TableCell>
                    <TableCell className="text-sm">
                      {site._count.conversations}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={site.enabled ? "default" : "secondary"}
                        className="text-[10px]"
                      >
                        {site.enabled ? "enabled" : "disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(site.createdAt), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyEmbed(site.siteId);
                        }}
                        title="Copy embed code"
                      >
                        {copiedId === site.siteId ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Website</DialogTitle>
            <DialogDescription>
              Create a new embeddable chatbot configuration
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-400">
                Site ID (unique identifier)
              </label>
              <Input
                value={form.siteId}
                onChange={(e) =>
                  setForm({ ...form, siteId: e.target.value.toLowerCase() })
                }
                placeholder="client-abc"
                className="mt-1"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Lowercase letters, numbers, dashes only
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400">
                Display Name
              </label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Client ABC"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400">
                Bot Name
              </label>
              <Input
                value={form.botName}
                onChange={(e) => setForm({ ...form, botName: e.target.value })}
                placeholder="Assistant"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400">
                Greeting (first message shown to visitors)
              </label>
              <Input
                value={form.greeting}
                onChange={(e) => setForm({ ...form, greeting: e.target.value })}
                placeholder="Hi! How can I help?"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400">
                System Prompt
              </label>
              <Textarea
                value={form.systemPrompt}
                onChange={(e) =>
                  setForm({ ...form, systemPrompt: e.target.value })
                }
                placeholder="You are a helpful assistant for..."
                rows={6}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-400">
                Allowed Origins (comma-separated)
              </label>
              <Input
                value={form.allowedOrigins}
                onChange={(e) =>
                  setForm({ ...form, allowedOrigins: e.target.value })
                }
                placeholder="https://client.com, https://www.client.com"
                className="mt-1"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Leave empty to allow all origins. Supports *.example.com
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={createSite}
              disabled={
                creating || !form.siteId || !form.name || !form.systemPrompt
              }
            >
              {creating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
