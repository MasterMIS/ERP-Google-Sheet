
const fs = require('fs');
const path = 'c:\\Users\\maste\\App - Copy\\nextapg\\app\\nbd\\page.tsx';
let content = fs.readFileSync(path, 'utf8');

const target = 'onClick={handleExportCSV}';
const buttonCode = `
                            {nbds.some(nbd => (getEffectiveStatus(nbd) === 'Order Won' || (followUpDataMap.get(nbd.id)?.order_won_count || 0) > 0)) && (
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
    const lines = content.split('\n');
    let targetIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(target)) {
            // Find the <motion.button that precedes this
            let j = i;
            while (j > 0 && !lines[j].includes('<motion.button')) {
                j--;
            }
            targetIndex = j;
            break;
        }
    }

    if (targetIndex !== -1) {
        lines.splice(targetIndex, 0, buttonCode);
        fs.writeFileSync(path, lines.join('\n'));
        console.log('Successfully inserted button at line ' + targetIndex);
    } else {
        console.log('Target not found');
    }
} else {
    console.log('Button already exists');
}
