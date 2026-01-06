import fetch from 'node-fetch';

// Configuration
const SILICONFLOW_API_KEY = 'sk-qfenrkobztqapseexvyynwljnincylbnywplfktfijhuviuv'; // From existing file
const SILICONFLOW_API_URL = 'https://api.siliconflow.cn/v1/chat/completions';
const DEEPLX_API_URL = 'http://127.0.0.1:1189/translate';

const TEST_TEXTS = [
    "Oil on canvas",
    "Portrait of a young man",
    "The quick brown fox jumps over the lazy dog",
    "French painting from the 19th century",
    "Gift of the Avalon Foundation"
];

async function testSiliconFlow() {
    console.log('\n--- Testing SiliconFlow (Chinese LLMs) ---');
    const start = Date.now();
    try {
        const response = await fetch(SILICONFLOW_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SILICONFLOW_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'Qwen/Qwen2.5-7B-Instruct', // Alibaba Cloud Model
                messages: [
                    { role: 'system', content: 'You are a translator. Translate to Chinese. No explanations.' },
                    { role: 'user', content: TEST_TEXTS[0] }
                ],
                max_tokens: 100
            }),
        });

        if (!response.ok) {
            console.error(`SiliconFlow Failed: ${response.status} ${response.statusText}`);
            const txt = await response.text();
            console.error(txt);
            return;
        }

        const data = await response.json();
        const duration = Date.now() - start;
        console.log(`Success! Response time: ${duration}ms`);
        console.log(`Original: "${TEST_TEXTS[0]}"`);
        console.log(`Translation: "${data.choices[0]?.message?.content?.trim()}"`);
        return true;
    } catch (e) {
        console.error('SiliconFlow Error:', e.message);
        return false;
    }
}

async function testDeepLX() {
    console.log('\n--- Testing DeepLX (DeepL Free) ---');
    const start = Date.now();
    try {
        const response = await fetch(DEEPLX_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: TEST_TEXTS[0],
                source_lang: 'EN',
                target_lang: 'ZH'
            })
        });

        if (!response.ok) {
            console.error(`DeepLX Failed: ${response.status}`);
            return;
        }

        const data = await response.json();
        const duration = Date.now() - start;
        console.log(`Success! Response time: ${duration}ms`);
        console.log(`Original: "${TEST_TEXTS[0]}"`);
        console.log(`Translation: "${data.data}"`);
        return true;
    } catch (e) {
        console.error('DeepLX Error (is it running?):', e.message);
        return false;
    }
}

async function run() {
    await testSiliconFlow();
    await testDeepLX();
}

run();