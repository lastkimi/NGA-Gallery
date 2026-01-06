import fetch from 'node-fetch';

async function testDeepLX() {
  const url = 'https://deeplx.owo.network/translate';
  const data = {
    text: "Hello World",
    source_lang: "EN",
    target_lang: "ZH"
  };

  try {
    console.log('Testing DeepLX API...');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    console.log('Status:', response.status);
    const result = await response.json();
    console.log('Response:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error);
  }
}

testDeepLX();
