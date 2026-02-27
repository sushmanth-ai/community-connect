import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LocationPicker } from "@/components/map/LocationPicker";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const categories = [
  { value: "roads", label: "Roads & Transport" },
  { value: "water", label: "Water Supply" },
  { value: "electricity", label: "Electricity" },
  { value: "sanitation", label: "Sanitation" },
  { value: "public_safety", label: "Public Safety" },
  { value: "parks", label: "Parks & Recreation" },
  { value: "other", label: "Other" },
];

const SubmitIssue = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [severity, setSeverity] = useState("3");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!location) {
      toast({ title: "Location required", description: "Please click on the map to set a location", variant: "destructive" });
      return;
    }
    if (!category) {
      toast({ title: "Category required", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      let imageUrl: string | null = null;

      if (imageFile) {
        const ext = imageFile.name.split(".").pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("issue-images").upload(path, imageFile);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from("issue-images").getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }

      // Call the submit-issue edge function for AI duplicate detection
      const { data, error } = await supabase.functions.invoke("submit-issue", {
        body: {
          title,
          description,
          category,
          severity: parseInt(severity),
          lat: location.lat,
          lng: location.lng,
          image_url: imageUrl,
        },
      });

      if (error) throw error;

      if (data?.duplicate) {
        toast({
          title: "Similar issue found!",
          description: "Your report has been added to an existing issue. +10 civic points!",
        });
      } else {
        toast({ title: "Issue submitted!", description: "Your report has been created. +10 civic points!" });
      }

      navigate("/citizen/issues");
    } catch (err: any) {
      toast({ title: "Submission failed", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">Report a Civic Issue</h1>
        <Card>
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="title">Issue Title</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Brief description of the problem" required maxLength={200} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Detailed Description</Label>
                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Provide as much detail as possible..." required maxLength={2000} rows={4} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Severity (1-5)</Label>
                  <Select value={severity} onValueChange={setSeverity}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map((s) => (
                        <SelectItem key={s} value={String(s)}>{s} - {["Minor", "Low", "Moderate", "High", "Critical"][s - 1]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Location (click on map)</Label>
                <LocationPicker value={location} onChange={setLocation} height="300px" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="image">Photo (optional)</Label>
                <Input
                  id="image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file && file.size > 5 * 1024 * 1024) {
                      toast({ title: "File too large", description: "Max 5MB", variant: "destructive" });
                      return;
                    }
                    setImageFile(file || null);
                  }}
                />
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyzing & Submitting...</> : "Submit Issue"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default SubmitIssue;
