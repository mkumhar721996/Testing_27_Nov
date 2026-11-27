import { TopBar } from "@/components/top-bar";

export default function OrganizationsPage() {
  return (
    <>
      <TopBar />
      <main className="container page">
        <div className="page-header">
          <h1 className="page-title">Organizations</h1>
        </div>
        <div className="page-body">
          <div className="empty-state">
            <p>Your organizations will appear here.</p>
          </div>
        </div>
      </main>
    </>
  );
}
