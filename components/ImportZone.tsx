
import React from 'react';

interface ImportZoneProps {
  onFilesSelected: (files: FileList) => void;
}

const ImportZone: React.FC<ImportZoneProps> = ({ onFilesSelected }) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-700 rounded-3xl bg-slate-800/30 hover:bg-slate-800/50 transition-all group">
      <div className="w-16 h-16 rounded-full bg-slate-700/50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
        <i className="fas fa-cloud-upload-alt text-2xl text-blue-400"></i>
      </div>
      <h3 className="text-lg font-semibold mb-2">Your Offline Library</h3>
      <p className="text-slate-400 text-center text-sm mb-6 max-w-xs">
        Select audio files from your phone's storage to build your local playlist.
      </p>
      <label className="cursor-pointer bg-blue-600 hover:bg-blue-500 px-6 py-2.5 rounded-full font-medium transition-colors">
        Choose Files
        <input 
          type="file" 
          multiple 
          accept="audio/*" 
          className="hidden" 
          onChange={handleFileChange}
        />
      </label>
    </div>
  );
};

export default ImportZone;
