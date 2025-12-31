"use client";

import Icon from './Icon';

export default function ViewToggle({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange('table')}
        className={`p-2 rounded-md ${value === 'table' ? 'bg-slate-200 dark:bg-slate-700' : 'bg-transparent'}`}
        title="Table view"
      >
        <Icon name="table" />
      </button>
      <button
        onClick={() => onChange('card')}
        className={`p-2 rounded-md ${value === 'card' ? 'bg-slate-200 dark:bg-slate-700' : 'bg-transparent'}`}
        title="Card view"
      >
        <Icon name="card" />
      </button>
      <button
        onClick={() => onChange('grid')}
        className={`p-2 rounded-md ${value === 'grid' ? 'bg-slate-200 dark:bg-slate-700' : 'bg-transparent'}`}
        title="Tile/grid view"
      >
        <Icon name="grid" />
      </button>
      <button
        onClick={() => onChange('list')}
        className={`p-2 rounded-md ${value === 'list' ? 'bg-slate-200 dark:bg-slate-700' : 'bg-transparent'}`}
        title="List view"
      >
        <Icon name="list" />
      </button>
    </div>
  );
}
