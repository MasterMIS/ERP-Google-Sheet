
const fs = require('fs');
const path = 'c:\\Users\\maste\\App - Copy\\nextapg\\app\\nbd-incoming\\page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Update Tile View Highlighting
const oldTileClass = 'className="bg-gradient-to-br from-white to-[var(--theme-light)] dark:from-gray-800 dark:to-gray-850 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 hover:border-[var(--theme-primary)] overflow-hidden"';
const newTileClass = 'className={`bg-gradient-to-br from-white to-[var(--theme-light)] dark:from-gray-800 dark:to-gray-850 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 hover:border-[var(--theme-primary)] overflow-hidden \${(followUpDataMap.get(nbd.id)?.order_won_count || 0) >= 3 ? "bg-green-200/60 dark:bg-green-900/40" : ""}\`}';

if (content.includes(oldTileClass)) {
    content = content.replace(oldTileClass, newTileClass);
    fs.writeFileSync(path, content);
    console.log('Successfully applied Tile View highlighting to NBD Incoming');
} else {
    console.log('Tile View class not found');
}
