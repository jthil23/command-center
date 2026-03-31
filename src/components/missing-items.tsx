"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Loader2 } from "lucide-react";

interface MissingItem {
  id: number;
  title: string;
  subtitle: string;
  year: number;
}

type AppOption = "sonarr" | "radarr";
type TypeOption = "missing" | "cutoff";

export function MissingItems() {
  const [app, setApp] = useState<AppOption>("sonarr");
  const [type, setType] = useState<TypeOption>("missing");
  const [items, setItems] = useState<MissingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchingId, setSearchingId] = useState<number | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/media/missing?app=${app}&type=${type}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [app, type]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  async function handleSearch(item: MissingItem) {
    setSearchingId(item.id);
    try {
      await fetch("/api/media/triggers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app, action: "search", itemId: item.id }),
      });
    } finally {
      setSearchingId(null);
    }
  }

  return (
    <Card className="border-border/40 bg-card/50">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-3">
          <span>Missing & Cutoff Unmet</span>
          <div className="ml-auto flex items-center gap-2">
            <Select value={app} onValueChange={(val: string | null) => setApp((val ?? "sonarr") as AppOption)}>
              <SelectTrigger size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sonarr">Sonarr</SelectItem>
                <SelectItem value="radarr">Radarr</SelectItem>
              </SelectContent>
            </Select>
            <Select value={type} onValueChange={(val: string | null) => setType((val ?? "missing") as TypeOption)}>
              <SelectTrigger size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="missing">Missing</SelectItem>
                <SelectItem value="cutoff">Cutoff Unmet</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading...
          </div>
        ) : items.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">No items found.</p>
        ) : (
          <>
            <div className="mb-2">
              <Badge variant="secondary">
                {items.length} {type === "missing" ? "missing" : "cutoff unmet"}
              </Badge>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Subtitle</TableHead>
                  <TableHead className="text-right">Year</TableHead>
                  <TableHead className="w-20 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.title}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.subtitle}
                    </TableCell>
                    <TableCell className="text-right">{item.year}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        title="Search"
                        disabled={searchingId !== null}
                        onClick={() => handleSearch(item)}
                      >
                        {searchingId === item.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Search className="h-3 w-3" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </CardContent>
    </Card>
  );
}
