import React from 'react';
import { ArrowLeft, Play, X, MoreVertical, ListMusic, Music } from 'lucide-react';
import { Playlist, Track, PlaybackStatus } from '../types';

interface PlaylistDetailViewProps {
    playlist: Playlist;
    allTracks: Track[];
    onBack: () => void;
    onPlayTrack: (trackId: string) => void;
    onRemoveTrack: (playlistId: string, trackId: string) => void;
    onUpdateImage: (playlistId: string, image: string) => void;
    currentTrackId?: string;
    playbackStatus?: PlaybackStatus;
}

const PlaylistDetailView: React.FC<PlaylistDetailViewProps> = ({
    playlist,
    allTracks,
    onBack,
    onPlayTrack,
    onRemoveTrack,
    onUpdateImage,
    currentTrackId,
    playbackStatus
}) => {
    // Filter tracks that are in this playlist
    // Note: This preserves the order of IDs in the playlist
    const playlistTracks = playlist.trackIds
        .map(id => allTracks.find(t => t.id === id))
        .filter((t): t is Track => t !== undefined);

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                // Resize to max 300px
                const maxSize = 300;
                let width = img.width;
                let height = img.height;
                if (width > height) {
                    if (width > maxSize) {
                        height *= maxSize / width;
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width *= maxSize / height;
                        height = maxSize;
                    }
                }
                canvas.width = width;
                canvas.height = height;
                ctx?.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                onUpdateImage(playlist.id, dataUrl);
            };
            img.src = ev.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="flex flex-col h-[calc(100vh-140px)]">
            {/* HEADER */}
            <div className="flex items-center gap-6 mb-8 px-2">
                <button
                    onClick={onBack}
                    className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors mr-2"
                >
                    <ArrowLeft size={24} />
                </button>

                {/* Playlist Cover Image */}
                <div className="relative group size-32 shrink-0 rounded-2xl overflow-hidden shadow-2xl bg-zinc-800 border border-white/10">
                    <label className="cursor-pointer block size-full">
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                        {playlist.coverImage ? (
                            <img src={playlist.coverImage} alt={playlist.name} className="size-full object-cover" />
                        ) : (
                            <div className="size-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900">
                                <ListMusic size={40} className="text-white/20" />
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-white border border-white/30 px-3 py-1 rounded-full bg-black/50 backdrop-blur-sm">Edit</span>
                        </div>
                    </label>
                </div>

                <div className="flex-1 min-w-0">
                    <h1 className="text-3xl font-black uppercase tracking-tight truncate leading-none mb-2">{playlist.name}</h1>
                    <p className="text-xs text-foreground/50 uppercase tracking-widest font-bold">{playlistTracks.length} Tracks</p>
                </div>
            </div>

            {/* TRACK LIST */}
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 pr-1 pb-20">
                {playlistTracks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-foreground/30 border border-dashed border-white/10 rounded-xl">
                        <ListMusic size={40} className="mb-4 opacity-50" />
                        <p className="text-xs uppercase tracking-widest text-center">Playlist is empty</p>
                        <p className="text-[10px] text-center mt-2 max-w-[200px]">Add songs from your library to this playlist.</p>
                    </div>
                ) : (
                    playlistTracks.map((t, idx) => (
                        <div
                            key={`${t.id}-${idx}`}
                            className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors group cursor-pointer border border-transparent hover:border-white/5"
                            onClick={() => onPlayTrack(t.id)}
                        >
                            <div className="size-10 rounded overflow-hidden bg-zinc-800 flex items-center justify-center shrink-0">
                                {t.palette ? (
                                    <div className="size-full" style={{ backgroundColor: t.palette.primary }} />
                                ) : (
                                    <Music size={16} className="text-white/20" />
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className={`text-sm font-bold truncate ${currentTrackId === t.id ? 'text-primary' : 'text-foreground'}`}>{t.title}</p>
                                <p className="text-[10px] text-foreground/50 uppercase tracking-wider truncate">{t.artist}</p>
                            </div>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onRemoveTrack(playlist.id, t.id);
                                }}
                                className="p-2 rounded-full hover:bg-white/10 text-foreground/30 hover:text-red-500 transition-colors"
                                title="Remove from playlist"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default PlaylistDetailView;
