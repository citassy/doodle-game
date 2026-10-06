import { PuzzleRoom } from "@/components/puzzle/PuzzleRoom";

export default async function PuzzleRoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <PuzzleRoom code={code} />;
}
