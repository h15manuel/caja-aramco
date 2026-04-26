import { createFileRoute } from "@tanstack/react-router";
import Fleet from "@/pages/Fleet";

export const Route = createFileRoute("/fleet")({
  component: Fleet,
});
