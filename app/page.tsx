import { DisplayPatients } from "@/components/display-patients";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main className="max-w-6xl mx-auto prose p-4">
      <h1>K-Sense Take Home</h1>
      <p>Patient risk scoring with a preview of the assessment submission payload.</p>
      <section className="not-prose mt-8">
        <h2 className="text-xl font-semibold mb-3">Patients</h2>
        <DisplayPatients />
      </section>
    </main>
  );
}
