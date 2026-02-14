import React, { useState } from 'react';
import { Plus, ListMusic, Music, MoreVertical, Play, Trash2 } from 'lucide-react';
import { Playlist, Track } from '../types';

interface PlaylistViewProps {
    playlists: Playlist[];
    onCreatePlaylist: (name: string) => void;
    onDeletePlaylist: (id: string) => void;
    onSelectPlaylist: (playlist: Playlist) => void;
}

const PlaylistView: React.FC<PlaylistViewProps> = ({
    playlists,
    onCreatePlaylist,
    onDeletePlaylist,
    onSelectPlaylist
}) => {
    const [isCreating, setIsCreating] = useState(false);
    const [newPlaylistName, setNewPlaylistName] = useState('');

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (newPlaylistName.trim()) {
            onCreatePlaylist(newPlaylistName.trim());
            setNewPlaylistName('');
            setIsCreating(false);
        }
    };

    return (
        <div className="p-6 pb-32 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-[10px] font-mono tracking-[0.3em] text-primary uppercase leading-none">Library</h2>
                    <h1 className="text-xl font-bold tracking-tight text-foreground uppercase mt-1">Playlists</h1>
                </div>
                <button
                    onClick={() => setIsCreating(true)}
                    className="size-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 hover:bg-primary/20 transition-colors"
                >
                    <Plus size={20} className="text-primary" />
                </button>
            </div>

            {isCreating && (
                <form onSubmit={handleCreate} className="mb-6 animate-in fade-in slide-in-from-top-2">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newPlaylistName}
                            onChange={(e) => setNewPlaylistName(e.target.value)}
                            placeholder="Playlist Name"
                            autoFocus
                            className="flex-1 bg-foreground/5 border border-foreground/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary/50 text-foreground placeholder:text-foreground/30"
                        />
                        <button
                            type="submit"
                            className="bg-primary text-white font-bold uppercase text-[10px] tracking-widest px-6 rounded-xl hover:bg-orange-600 transition-colors"
                        >
                            Create
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsCreating(false)}
                            className="bg-foreground/5 text-foreground/50 font-bold uppercase text-[10px] tracking-widest px-4 rounded-xl hover:bg-foreground/10 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {playlists.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-foreground/10 rounded-2xl p-8 text-center text-foreground/30">
                    <div className="size-16 rounded-full bg-foreground/5 flex items-center justify-center mb-4">
                        <ListMusic size={32} className="opacity-50" />
                    </div>
                    <p className="text-xs font-bold uppercase tracking-widest mb-2">No Playlists Yet</p>
                    <p className="text-[10px]">Create your first playlist to start curating your offline collection.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-4">
                    {playlists.map((playlist) => (
                        <div
                            key={playlist.id}
                            onClick={() => onSelectPlaylist(playlist)}
                            className="group relative aspect-square bg-foreground/5 rounded-2xl border border-foreground/5 overflow-hidden hover:bg-foreground/10 transition-all cursor-pointer"
                        >
                            <div className="absolute inset-0 flex items-center justify-center">
                                {playlist.coverImage ? (
                                    <img src={playlist.coverImage} alt={playlist.name} className="size-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                ) : (
                                    <Music size={48} className="text-foreground/10 group-hover:text-foreground/20 transition-colors duration-500 transform group-hover:scale-110" />
                                )}
                            </div>

                            <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                                <h3 className="text-sm font-bold text-white truncate">{playlist.name}</h3>
                                <p className="text-[10px] text-white/60 font-mono uppercase tracking-wider">{playlist.trackIds.length} Tracks</p>
                            </div>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDeletePlaylist(playlist.id);
                                }}
                                className="absolute top-2 right-2 p-2 rounded-full bg-black/40 text-white/50 hover:text-red-500 hover:bg-black/60 transition-colors opacity-0 group-hover:opacity-100"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PlaylistView;
