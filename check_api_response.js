
async function checkApi() {
    try {
        const res = await fetch('http://localhost:3000/api/nbd-incoming-followup');
        const data = await res.json();
        console.log('API Response Sample:', JSON.stringify(data.followUpData?.[0], null, 2));
        console.log('Records with order_won_count > 0:', data.followUpData?.filter(f => f.order_won_count > 0).length);
    } catch (e) {
        console.error('Fetch failed:', e.message);
    }
}
checkApi();
