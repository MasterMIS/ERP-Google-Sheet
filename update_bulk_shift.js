
const fs = require('fs');
const path = 'c:\\Users\\maste\\App - Copy\\nextapg\\app\\nbd\\page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add handleBulkShiftToCRR
const bulkShiftLogic = `
    const handleBulkShiftToCRR = async () => {
        const wonOrderIds = nbds.filter(nbd => {
            const followUp = followUpDataMap.get(nbd.id);
            return getEffectiveStatus(nbd) === 'Order Won' || (followUp?.order_won_count || 0) > 0;
        }).map(n => n.id);

        if (wonOrderIds.length === 0) {
            toast.info('No Order Won records found to shift');
            return;
        }

        try {
            loader.showLoader();
            const res = await fetch('/api/shift-to-crr', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: wonOrderIds, source: 'nbd' }),
            });

            if (res.ok) {
                const data = await res.json();
                toast.success(data.message || 'Records shifted to CRR successfully');
                fetchNBDs();
            } else {
                const data = await res.json();
                toast.error(data.error || 'Failed to shift records');
            }
        } catch (error) {
            console.error('Error shifting to CRR:', error);
            toast.error('Error shifting records');
        } finally {
            loader.hideLoader();
        }
    };
`;

if (!content.includes('handleBulkShiftToCRR')) {
    content = content.replace('const handleShiftToCRR', bulkShiftLogic + '\n    const handleShiftToCRR');
}

// 2. Add Bulk Shift Button to Toolbar (near Export/Import CSV)
const bulkShiftButton = `
                            {nbds.some(nbd => (getEffectiveStatus(nbd) === 'Order Won' || (followUpDataMap.get(nbd.id)?.order_won_count || 0) > 0)) && (
                                <motion.button
                                    onClick={handleBulkShiftToCRR}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="px-3 py-2 bg-green-600 text-white hover:bg-green-700 hover:shadow-lg rounded-xl transition-all flex items-center gap-2 font-bold text-xs"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                    <span className="hidden sm:inline">Shift Won to CRR</span>
                                </motion.button>
                            )}
`;

if (!content.includes('handleBulkShiftToCRR') || !content.includes('Shift Won to CRR')) {
    content = content.replace('<motion.button\n                                onClick={handleExportCSV}', bulkShiftButton + '\n                            <motion.button\n                                onClick={handleExportCSV}');
}

// 3. Darken Row Higlighting Color
// Current: bg-green-50/70
// New: bg-green-200/40
content = content.replace(/bg-green-50\/70/g, 'bg-green-200/40');
content = content.replace(/hover:bg-green-100\/70/g, 'hover:bg-green-200/60');

// 4. Remove Individual Shift Buttons from Table
content = content.replace(/\{?\(getEffectiveStatus\(nbd\) === 'Order Won' \|\| \(followUpDataMap\.get\(nbd\.id\)\?\.order_won_count \|\| 0\) > 0\) && \([\s\S]*?<button[\s\S]*?handleShiftToCRR\(nbd\)[\s\S]*?<\/button>[\s\S]*?\)\}?/g, '');

fs.writeFileSync(path, content);
console.log('Successfully updated nbd/page.tsx for bulk shift and darker highlighting');
