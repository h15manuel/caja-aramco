import { createFileRoute } from "@tanstack/react-router";
import Shifts from "@/pages/Shifts";

export const Route = createFileRoute("/shifts")({
  component: Shifts,
});
