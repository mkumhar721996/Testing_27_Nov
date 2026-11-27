import { AppShell } from "@/components/app-shell";
import { JobOpeningsView } from "@/components/job-openings/job-openings-view";
import "./job-openings.css";

export default function JobOpeningsPage() {
  return (
    <AppShell active="settings">
      <JobOpeningsView />
    </AppShell>
  );
}
