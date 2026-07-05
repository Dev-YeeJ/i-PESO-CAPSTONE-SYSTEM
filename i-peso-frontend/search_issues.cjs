const https = require('https');

https.get('https://api.github.com/search/issues?q="Cannot+read+properties+of+undefined+(reading+%27keys%27)"+react-google-maps', {
  headers: {
    'User-Agent': 'Node.js'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const results = JSON.parse(data);
    if (results.items) {
      results.items.slice(0, 3).forEach(item => {
        console.log(`- ${item.title} (${item.html_url})`);
        console.log(`  ${item.body.substring(0, 200).replace(/\n/g, ' ')}...`);
      });
    } else {
      console.log('No results found or rate limited.');
    }
  });
}).on('error', err => console.error(err));
