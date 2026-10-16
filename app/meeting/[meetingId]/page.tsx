import MeetingRoom from '@/components/meeting/MeetingRoom';
export default async function MeetingPage({ params }: {
    params: Promise<{
        meetingId: string;
    }>;
}) { const { meetingId } = await params; return <MeetingRoom key={meetingId} id={meetingId}/>; }
