
const fs = require('fs');
const path = 'c:\\Users\\maste\\App - Copy\\nextapg\\app\\nbd-incoming\\page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add handleBulkShiftToCRR function near handleViewDetails
const handleBulkShiftFunction = `
    const handleBulkShiftToCRR = async () => {
        const eligibleIds = nbds
            .filter(nbd => (followUpDataMap.get(nbd.id)?.order_won_count || 0) >= 3)
            .map(nbd => nbd.id);

        if (eligibleIds.length === 0) {
            toast.info('No eligible "Order Won" records found to shift (min. 3 counts required)');
            return;
        }

        try {
            loader.showLoader();
            const res = await fetch('/api/shift-to-crr', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: eligibleIds, source: 'nbd-incoming' }),
            });

            if (res.ok) {
                const data = await res.json();
                toast.success(data.message || \`Shifted \${eligibleIds.length} record(s) to CRR successfully\`);
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
    content = content.replace('    const handleViewDetails = (nbd: NBD) => {', handleBulkShiftFunction + '\n    const handleViewDetails = (nbd: NBD) => {');
}

// 2. Add Toolbar Button before Export CSV
const toolbarButton = `
                            {nbds.some(nbd => (followUpDataMap.get(nbd.id)?.order_won_count || 0) >= 3) && (
                                <motion.button
                                    onClick={handleBulkShiftToCRR}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="px-3 py-2 bg-green-600 text-white hover:bg-green-700 hover:shadow-lg rounded-xl transition-all flex items-center gap-2 font-bold text-xs mr-2"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                    <span className="hidden sm:inline">Shift Won to CRR</span>
                                </motion.button>
                            )}
`;

if (!content.includes('Shift Won to CRR')) {
    content = content.replace('<motion.button\n                                onClick={handleExportCSV}', toolbarButton + '\n                            <motion.button\n                                onClick={handleExportCSV}');
}

// 3. Update Table Row Highlighting
const oldRowClass = 'className="hover:bg-[var(--theme-lighter)]/50 dark:hover:bg-gray-700/50 transition cursor-pointer"';
const newRowClass = 'className={`transition cursor-pointer ${(followUpDataMap.get(nbd.id)?.order_won_count || 0) >= 3 ? "bg-green-200/40 hover:bg-green-200/60 dark:bg-green-900/10 dark:hover:bg-green-900/20" : "hover:bg-[var(--theme-lighter)]/50 dark:hover:bg-gray-700/50"}`}';

content = content.replace(oldRowClass, newRowClass);

fs.writeFileSync(path, content);
console.log('Successfully applied all Shift to CRR changes to NBD Incoming');
