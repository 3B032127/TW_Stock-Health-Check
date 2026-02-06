// 測試前端 API 調用
import { api } from './services/api.ts';

async function testFrontendAPI() {
    console.log('Testing frontend API call...');
    try {
        const result = await api.getMarketIndicators();
        console.log('API Response:', result);
        console.log('\n=== Indicators ===');
        if (result.data && result.data.indicators) {
            result.data.indicators.forEach((ind: any) => {
                console.log(`\n${ind.name}:`);
                console.log(`  Value: ${ind.value}`);
                console.log(`  Change: ${ind.change}`);
            });
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

testFrontendAPI();
