import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Settings, X, Plus, CheckCircle2, Download, Upload, Trash2, Play, FileJson, Info } from 'lucide-react';
import { cn } from '../../lib/utils';
import { LevelData, SitemapData, CampaignData } from '../../types';

export const AdminDashboard = ({ 
  onClose, 
  levels, 
  sitemaps, 
  campaigns,
  isSaving,
  onSaveCampaign,
  onUploadLevel,
  onUploadSitemap,
  onDeleteCampaign,
  onDeleteLevel,
  onDeleteSitemap,
  onUpdateSitemap,
  onExport,
  onImport,
  onLoadLevel,
  onPlayCampaign,
  userLevels
}: { 
  onClose: () => void,
  levels: LevelData[],
  userLevels: LevelData[],
  sitemaps: SitemapData[],
  campaigns: CampaignData[],
  isSaving: boolean,
  onSaveCampaign: (campaign: Partial<CampaignData>) => Promise<void>,
  onUploadLevel: (file: File) => Promise<void>,
  onUploadSitemap: (file: File) => Promise<void>,
  onDeleteCampaign: (id: string) => Promise<void>,
  onDeleteLevel: (id: string) => Promise<void>,
  onDeleteSitemap: (id: string) => Promise<void>,
  onUpdateSitemap: (sitemap: SitemapData) => Promise<void>,
  onExport: () => void,
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void,
  onLoadLevel: (level: LevelData) => void,
  onPlayCampaign: (campaign: CampaignData) => void
}) => {
  const [tab, setTab] = useState<'campaigns' | 'levels' | 'sitemaps' | 'import-export'>('campaigns');
  const [editingCampaign, setEditingCampaign] = useState<Partial<CampaignData> | null>(null);
  const [viewingSitemapId, setViewingSitemapId] = useState<string | null>(null);

  const viewingSitemap = sitemaps.find(s => s.id === viewingSitemapId);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-8">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-5xl h-full max-h-[800px] flex flex-col overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-zinc-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <Settings className="text-amber-500" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Campaign Manager</h2>
              <p className="text-xs text-zinc-500">Manage levels, sitemaps, and game flow</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/5 rounded-full text-zinc-500 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/5 bg-zinc-950/30">
          <button 
            onClick={() => setTab('campaigns')}
            className={cn(
              "px-8 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2",
              tab === 'campaigns' ? "border-amber-500 text-amber-500 bg-amber-500/5" : "border-transparent text-zinc-500 hover:text-zinc-300"
            )}
          >
            Campaigns
          </button>
          <button 
            onClick={() => setTab('levels')}
            className={cn(
              "px-8 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2",
              tab === 'levels' ? "border-amber-500 text-amber-500 bg-amber-500/5" : "border-transparent text-zinc-500 hover:text-zinc-300"
            )}
          >
            Levels ({userLevels.length} Mine / {levels.length} Global)
          </button>
          <button 
            onClick={() => setTab('sitemaps')}
            className={cn(
              "px-8 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2",
              tab === 'sitemaps' ? "border-amber-500 text-amber-500 bg-amber-500/5" : "border-transparent text-zinc-500 hover:text-zinc-300"
            )}
          >
            Sitemaps ({sitemaps.length})
          </button>
          <button 
            onClick={() => setTab('import-export')}
            className={cn(
              "px-8 py-4 text-xs font-bold uppercase tracking-widest transition-all border-b-2",
              tab === 'import-export' ? "border-amber-500 text-amber-500 bg-amber-500/5" : "border-transparent text-zinc-500 hover:text-zinc-300"
            )}
          >
            Import / Export
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {tab === 'campaigns' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Active Campaigns</h3>
                <button 
                  onClick={() => setEditingCampaign({ name: 'New Campaign', levelIds: [], sitemapId: '' })}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg transition-all"
                >
                  <Plus size={16} />
                  Create Campaign
                </button>
              </div>

              {editingCampaign && (
                <div className="bg-zinc-800/50 border border-amber-500/30 rounded-xl p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase">Campaign Name</label>
                      <input 
                        type="text" 
                        value={editingCampaign.name}
                        onChange={(e) => setEditingCampaign({ ...editingCampaign, name: e.target.value })}
                        className="w-full bg-zinc-950 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:border-amber-500 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-zinc-500 uppercase">Sitemap UI</label>
                      <select 
                        value={editingCampaign.sitemapId}
                        onChange={(e) => setEditingCampaign({ ...editingCampaign, sitemapId: e.target.value })}
                        className="w-full bg-zinc-950 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:border-amber-500 outline-none"
                      >
                        <option value="">Select a Sitemap</option>
                        {sitemaps.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase">Select Levels for Campaign</label>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                      {[...userLevels, ...levels.filter(l => !userLevels.find(ul => ul.id === l.id))].map(level => {
                        const isSelected = editingCampaign.levelIds?.includes(level.id);
                        return (
                          <button 
                            key={level.id}
                            onClick={() => {
                              const currentIds = editingCampaign.levelIds || [];
                              const newIds = isSelected 
                                ? currentIds.filter(id => id !== level.id)
                                : [...currentIds, level.id];
                              setEditingCampaign({ ...editingCampaign, levelIds: newIds });
                            }}
                            className={cn(
                              "w-full flex items-center justify-between p-3 rounded-lg border transition-all",
                              isSelected ? "bg-amber-500/10 border-amber-500/50 text-amber-500" : "bg-zinc-950/50 border-white/5 text-zinc-500 hover:border-white/10"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn("w-4 h-4 rounded border flex items-center justify-center", isSelected ? "bg-amber-500 border-amber-500" : "border-white/20")}>
                                {isSelected && <CheckCircle2 size={10} className="text-zinc-900" />}
                              </div>
                              <span className="text-xs font-medium">{level.name}</span>
                            </div>
                            {isSelected && (
                              <span className="text-[10px] font-bold">Pos: {editingCampaign.levelIds?.indexOf(level.id)! + 1}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <button 
                      onClick={() => setEditingCampaign(null)}
                      className="px-4 py-2 text-xs font-bold text-zinc-500 hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button 
                      disabled={isSaving || !editingCampaign.name || !editingCampaign.sitemapId || !editingCampaign.levelIds?.length}
                      onClick={async () => {
                        await onSaveCampaign(editingCampaign);
                        setEditingCampaign(null);
                      }}
                      className="px-6 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition-all"
                    >
                      {isSaving ? 'Saving...' : 'Save Campaign'}
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {campaigns.map(campaign => (
                  <div key={campaign.id} className="bg-zinc-950/50 border border-white/5 rounded-xl p-5 flex flex-col gap-4 group hover:border-amber-500/30 transition-all">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-white group-hover:text-amber-500 transition-colors">{campaign.name}</h4>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
                          {campaign.levelIds.length} Levels • {sitemaps.find(s => s.id === campaign.sitemapId)?.name || 'No Sitemap'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => onPlayCampaign(campaign)}
                          className="p-2 bg-amber-500/10 text-amber-500 rounded-lg hover:bg-amber-500 hover:text-white transition-all"
                          title="Play Campaign"
                        >
                          <Play size={16} />
                        </button>
                        <button 
                          onClick={() => setEditingCampaign(campaign)}
                          className="p-2 bg-white/5 text-zinc-400 rounded-lg hover:bg-white/10 hover:text-white transition-all"
                        >
                          <Settings size={16} />
                        </button>
                        <button 
                          onClick={() => onDeleteCampaign(campaign.id)}
                          className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'levels' && (
            <div className="space-y-6">
               <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Level Library</h3>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-all">
                    <Upload size={16} />
                    Upload .json
                    <input 
                      type="file" 
                      accept=".json" 
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) onUploadLevel(file);
                      }}
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...userLevels, ...levels.filter(l => !userLevels.find(ul => ul.id === l.id))].map(level => (
                  <div key={level.id} className="bg-zinc-950/50 border border-white/5 rounded-xl p-5 flex items-center justify-between group hover:border-amber-500/30 transition-all">
                    <div>
                      <h4 className="font-bold text-white group-hover:text-amber-500 transition-colors">{level.name}</h4>
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
                        {level.authorEmail || 'System'} • {level.data.tiles.length} Tiles
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => onLoadLevel(level)}
                        className="p-2 bg-amber-500/10 text-amber-500 rounded-lg hover:bg-amber-500 hover:text-white transition-all"
                        title="Load into Editor"
                      >
                        <Download size={16} />
                      </button>
                      <button 
                        onClick={() => onDeleteLevel(level.id)}
                        className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'sitemaps' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Sitemaps (UI Flow)</h3>
                <label className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-all">
                  <Upload size={16} />
                  Upload Sitemap
                  <input 
                    type="file" 
                    accept=".json" 
                    className="hidden" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) onUploadSitemap(file);
                    }}
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sitemaps.map(sitemap => (
                  <div key={sitemap.id} className="bg-zinc-950/50 border border-white/5 rounded-xl p-5 flex flex-col gap-4 group hover:border-amber-500/30 transition-all">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-white group-hover:text-amber-500 transition-colors">{sitemap.name}</h4>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest">
                          {sitemap.screens.length} Screens
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => setViewingSitemapId(viewingSitemapId === sitemap.id ? null : sitemap.id)}
                          className="p-2 bg-white/5 text-zinc-400 rounded-lg hover:bg-white/10 hover:text-white transition-all"
                        >
                          <Info size={16} />
                        </button>
                        <button 
                          onClick={() => onDeleteSitemap(sitemap.id)}
                          className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {viewingSitemapId === sitemap.id && (
                      <div className="pt-4 border-t border-white/5 space-y-3">
                        {sitemap.screens.map(screen => (
                          <div key={screen.id} className="bg-black/40 p-3 rounded-lg border border-white/5">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] font-bold text-amber-500 uppercase">{screen.type}</span>
                              <span className="text-[10px] text-zinc-500">ID: {screen.id}</span>
                            </div>
                            <h5 className="text-xs font-bold text-white mb-1">{screen.title}</h5>
                            <p className="text-[10px] text-zinc-400 line-clamp-2">{screen.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'import-export' && (
            <div className="space-y-8">
              <div className="bg-zinc-950/50 border border-white/5 rounded-2xl p-8 text-center space-y-4">
                <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FileJson className="text-amber-500" size={32} />
                </div>
                <h3 className="text-xl font-bold text-white">Full Database Sync</h3>
                <p className="text-sm text-zinc-400 max-w-md mx-auto">
                  Export your entire database (Campaigns, Levels, Sitemaps) as a single JSON file for backup or migration.
                </p>
                <div className="flex items-center justify-center gap-4 pt-4">
                  <button 
                    onClick={onExport}
                    className="flex items-center gap-2 px-8 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-amber-900/20"
                  >
                    <Download size={20} />
                    Export Full DB
                  </button>
                  <label className="flex items-center gap-2 px-8 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl cursor-pointer transition-all">
                    <Upload size={20} />
                    Import Full DB
                    <input 
                      type="file" 
                      accept=".json" 
                      className="hidden" 
                      onChange={onImport}
                    />
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
